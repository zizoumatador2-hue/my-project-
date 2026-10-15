/** Thin, typed helpers over D1. All SQL uses bound parameters — never string-interpolated user input. */
export type Params = (string | number | null)[];

export async function all<T>(db: D1Database, sql: string, params: Params = []): Promise<T[]> {
  const res = await db.prepare(sql).bind(...params).all<T>();
  return res.results ?? [];
}

export async function first<T>(db: D1Database, sql: string, params: Params = []): Promise<T | null> {
  return (await db.prepare(sql).bind(...params).first<T>()) ?? null;
}

export async function run(db: D1Database, sql: string, params: Params = []): Promise<D1Result> {
  return db.prepare(sql).bind(...params).run();
}

export async function insert(db: D1Database, sql: string, params: Params = []): Promise<number> {
  const res = await db.prepare(sql).bind(...params).run();
  return Number(res.meta.last_row_id);
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function addDays(days: number, from = new Date()): string {
  return new Date(from.getTime() + days * 86_400_000).toISOString();
}

export async function audit(
  db: D1Database,
  actorId: number | null,
  action: string,
  entity: string,
  entityId: string | number | null,
  detail?: unknown,
): Promise<void> {
  await run(db, 'INSERT INTO audit_log (actor_id, action, entity, entity_id, detail) VALUES (?,?,?,?,?)', [
    actorId,
    action,
    entity,
    entityId === null ? null : String(entityId),
    detail === undefined ? null : JSON.stringify(detail).slice(0, 2000),
  ]);
}
