export const schema=[
`CREATE TABLE IF NOT EXISTS checkout_intents (id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, time INTEGER NOT NULL, updated INTEGER NOT NULL, version TEXT NOT NULL, language TEXT NOT NULL, flavor TEXT NOT NULL, bars INTEGER NOT NULL, price INTEGER NOT NULL, currency TEXT NOT NULL, market TEXT NOT NULL, revision TEXT NOT NULL, email TEXT NOT NULL DEFAULT '', consent_time INTEGER, consent_version TEXT, visitor TEXT NOT NULL, session TEXT NOT NULL, page TEXT NOT NULL, campaign TEXT NOT NULL)`,
`CREATE INDEX IF NOT EXISTS checkout_intents_time ON checkout_intents(time)`,
`CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, received INTEGER NOT NULL, time INTEGER NOT NULL, visitor TEXT NOT NULL, session TEXT NOT NULL, page TEXT NOT NULL, seq INTEGER NOT NULL, name TEXT NOT NULL, path TEXT NOT NULL, variant TEXT NOT NULL, language TEXT NOT NULL, active INTEGER NOT NULL, scroll INTEGER NOT NULL, details TEXT NOT NULL)`,
`CREATE INDEX IF NOT EXISTS events_time ON events(time)`,
`CREATE INDEX IF NOT EXISTS events_visitor ON events(visitor,time)`,
`CREATE INDEX IF NOT EXISTS events_page ON events(page)`,
`CREATE TABLE IF NOT EXISTS limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL)`
];
