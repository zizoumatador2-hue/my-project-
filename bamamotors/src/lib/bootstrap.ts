import referenceSql from '../../migrations/0002_reference_data.sql?raw';
import contentSql from '../../migrations/0003_editorial_content.sql?raw';
import moreGuidesSql from '../../migrations/0004_more_guides.sql?raw';
import copyRefreshSql from '../../migrations/0005_copy_refresh.sql?raw';

/**
 * Applies the seed migrations (reference data, editorial content, copy refreshes) the first time a
 * database is used, when the deploy pipeline could not run `wrangler d1 migrations apply`
 * (e.g. a CI token without D1 permission). Idempotent: every INSERT becomes INSERT OR IGNORE,
 * and each file is recorded in d1_migrations exactly like wrangler would, so wrangler skips it later.
 */
const SEEDS: [string, string][] = [
  ['0002_reference_data.sql', referenceSql],
  ['0003_editorial_content.sql', contentSql],
  ['0004_more_guides.sql', moreGuidesSql],
  ['0005_copy_refresh.sql', copyRefreshSql],
];

let done = false;

export function splitStatements(sql: string): string[] {
  const body = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (const ch of body) {
    cur += ch;
    if (ch === "'") quoted = !quoted;
    else if (ch === ';' && !quoted) {
      if (cur.trim().length > 1) out.push(cur.trim());
      cur = '';
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

export async function ensureSeeded(db: D1Database): Promise<void> {
  if (done) return;
  await db.prepare('CREATE TABLE IF NOT EXISTS d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)').run();
  const applied = new Set(((await db.prepare('SELECT name FROM d1_migrations').all<{ name: string }>()).results ?? []).map((r) => r.name));
  for (const [name, sql] of SEEDS) {
    if (applied.has(name)) continue;
    const stmts = splitStatements(sql).map((s) => s.replace(/^INSERT INTO/i, 'INSERT OR IGNORE INTO'));
    for (let i = 0; i < stmts.length; i += 40) {
      await db.batch(stmts.slice(i, i + 40).map((s) => db.prepare(s)));
    }
    await db.prepare('INSERT OR IGNORE INTO d1_migrations (name) VALUES (?)').bind(name).run();
  }
  done = true;
}
