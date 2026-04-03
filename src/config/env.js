const dotenv = require("dotenv");

dotenv.config();

function readNumber(name, fallback) {
  const value = process.env[name];

  if (value === undefined) {
    return fallback;
  }

  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a number`);
  }

  return parsed;
}

module.exports = {
  port: readNumber("PORT", 3000),
  redisUrl: process.env.REDIS_URL || "redis://127.0.0.1:6379",
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgres://postgres:postgres@127.0.0.1:5432/load_testing",
  requestTimeoutMs: readNumber("REQUEST_TIMEOUT_MS", 10000),
  progressUpdateBatchSize: readNumber("PROGRESS_UPDATE_BATCH_SIZE", 10),
  progressTtlSeconds: readNumber("PROGRESS_TTL_SECONDS", 86400),
  queueName: process.env.QUEUE_NAME || "load-tests",
};
