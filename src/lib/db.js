const { Pool } = require("pg");
const env = require("../config/env");

const pool = new Pool({
  connectionString: env.databaseUrl,
});

async function ensureResultsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS load_test_results (
      test_id UUID PRIMARY KEY,
      url TEXT NOT NULL,
      method TEXT NOT NULL,
      total_requests INTEGER NOT NULL,
      concurrency INTEGER NOT NULL,
      completed INTEGER NOT NULL,
      errors INTEGER NOT NULL,
      average_response_time DOUBLE PRECISION NOT NULL,
      error_rate DOUBLE PRECISION NOT NULL,
      throughput DOUBLE PRECISION NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function insertLoadTestResult(result) {
  await pool.query(
    `
      INSERT INTO load_test_results (
        test_id,
        url,
        method,
        total_requests,
        concurrency,
        completed,
        errors,
        average_response_time,
        error_rate,
        throughput
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `,
    [
      result.testId,
      result.url,
      result.method,
      result.totalRequests,
      result.concurrency,
      result.completed,
      result.errors,
      result.averageResponseTime,
      result.errorRate,
      result.throughput,
    ]
  );
}

module.exports = {
  pool,
  ensureResultsTable,
  insertLoadTestResult,
};
