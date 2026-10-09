const tables = {
  events: 'id,received,time,visitor,session,page,seq,name,path,variant,language,active,scroll,details',
  checkout_intents: 'id,time,updated,version,language,flavor,bars,price,currency,market,revision,email,consent_time,consent_version,visitor,session,page,campaign',
};
const pageSize = 1000;

// Bound each scan to rows present when the export starts. Never export token hashes
// or rate-limit records. Keyset pagination avoids dashboard limits and large arrays.
export async function fullExport(db, headers) {
  const started = new Date().toISOString();
  const bounds = await db.batch(Object.keys(tables).map(table =>
    db.prepare(`SELECT COALESCE(MAX(rowid),0) last_row, COUNT(*) count FROM ${table}`)));
  const expected = Object.fromEntries(Object.keys(tables).map((table, i) => [table, bounds[i].results[0]]));
  const counts = {};
  async function* chunks() {
    yield JSON.stringify({format:'fiberboom-raw-analytics',schema_version:1,export_started_at:started,
      scope:'All retained analytics; dashboard filters are not applied',
      timestamps:'Unix milliseconds, UTC',price_units:'Minor currency units',
      json_columns:['events.details','checkout_intents.campaign'],
      note:'Order intent is a restock-popup click, not a completed purchase. Records may be updated during export.'}).slice(0,-1);
    for (const [table, columns] of Object.entries(tables)) {
      yield `,\"${table}\":[`;
      let cursor = 0, count = 0;
      for (;;) {
        const result = await db.prepare(`SELECT rowid AS export_row,${columns} FROM ${table} WHERE rowid>? AND rowid<=? ORDER BY rowid LIMIT ?`)
          .bind(cursor, expected[table].last_row, pageSize).all();
        if (!result.results.length) break;
        for (const {export_row, ...row} of result.results) {
          yield (count++ ? ',' : '') + JSON.stringify(row);
          cursor = export_row;
        }
      }
      if (count !== expected[table].count) throw Error('Analytics changed during export. Please retry.');
      counts[table] = count;
      yield ']';
    }
    yield ',"counts":' + JSON.stringify(counts) + ',"complete":true}';
  }
  const iterator = chunks(), encoder = new TextEncoder();
  const body = new ReadableStream({
    async pull(controller) {
      try {
        const {value, done} = await iterator.next();
        if (done) controller.close();
        else controller.enqueue(encoder.encode(value));
      } catch (error) { controller.error(error); }
    },
    async cancel() { await iterator.return(); },
  });
  return new Response(body, {headers:{...headers,'Content-Type':'application/json; charset=utf-8',
    'Content-Disposition':`attachment; filename="fiberboom-full-data-${started.slice(0,10)}.json"`}});
}
