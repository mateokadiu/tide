// Test bootstrap — ensure required env vars exist for code paths that import env.
process.env.AUTH_SECRET ??= 'test-secret-32-bytes-of-padding-xxx';
process.env.DATABASE_DRIVER ??= 'sqlite';
process.env.DATABASE_FILE ??= ':memory:';
process.env.NODE_ENV ??= 'test';
