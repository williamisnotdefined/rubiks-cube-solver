export type Queryable = {
  query: <TRow = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<{ rows: TRow[] }>
}
