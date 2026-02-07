// In vitest we run server-side code in a node environment; the production
// `server-only` package throws when imported, which is fine in Next but
// blocks unit tests. This shim is a no-op.
export {};
