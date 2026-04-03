const env = require("../config/env");
const { saveProgress } = require("../lib/redis");

async function sendRequest(jobData) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.requestTimeoutMs);
  const startedAt = Date.now();
  const requestHeaders = { ...jobData.headers };
  let requestBody;

  if (
    jobData.payload !== undefined &&
    jobData.method !== "GET" &&
    jobData.method !== "HEAD"
  ) {
    if (
      jobData.payload !== null &&
      typeof jobData.payload === "object" &&
      !Buffer.isBuffer(jobData.payload)
    ) {
      requestBody = JSON.stringify(jobData.payload);

      if (!requestHeaders["content-type"] && !requestHeaders["Content-Type"]) {
        requestHeaders["content-type"] = "application/json";
      }
    } else {
      requestBody = jobData.payload;
    }
  }

  try {
    const response = await fetch(jobData.url, {
      method: jobData.method,
      headers: requestHeaders,
      body: requestBody,
      signal: controller.signal,
    });

    return {
      durationMs: Date.now() - startedAt,
      isError: !response.ok,
    };
  } catch (error) {
    return {
      durationMs: Date.now() - startedAt,
      isError: true,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function runLoadTest(jobData) {
  const progress = {
    status: "running",
    completed: 0,
    total: jobData.totalRequests,
    errors: 0,
    totalResponseTime: 0,
  };

  await saveProgress(jobData.testId, {
    status: progress.status,
    completed: progress.completed,
    total: progress.total,
    errors: progress.errors,
  });

  const startedAt = Date.now();
  let nextRequestIndex = 0;

  async function runRequestLoop() {
    // Keep only a limited number of requests in flight based on the given concurrency.
    while (nextRequestIndex < jobData.totalRequests) {
      nextRequestIndex += 1;

      const requestResult = await sendRequest(jobData);

      progress.completed += 1;
      progress.totalResponseTime += requestResult.durationMs;

      if (requestResult.isError) {
        progress.errors += 1;
      }

      if (
        progress.completed % env.progressUpdateBatchSize === 0 ||
        progress.completed === progress.total
      ) {
        await saveProgress(jobData.testId, {
          status: progress.status,
          completed: progress.completed,
          total: progress.total,
          errors: progress.errors,
        });
      }
    }
  }

  const activeWorkers = Math.min(jobData.concurrency, jobData.totalRequests);
  const runningLoops = Array.from({ length: activeWorkers }, () => runRequestLoop());

  await Promise.all(runningLoops);

  const totalDurationMs = Date.now() - startedAt;
  const averageResponseTime =
    progress.completed === 0
      ? 0
      : progress.totalResponseTime / progress.completed;
  const errorRate = progress.total === 0 ? 0 : progress.errors / progress.total;
  const throughput =
    totalDurationMs === 0 ? 0 : progress.completed / (totalDurationMs / 1000);

  progress.status = "completed";

  await saveProgress(jobData.testId, {
    status: progress.status,
    completed: progress.completed,
    total: progress.total,
    errors: progress.errors,
    average_response_time: averageResponseTime,
    error_rate: errorRate,
    throughput,
  });

  return {
    completed: progress.completed,
    errors: progress.errors,
    averageResponseTime,
    errorRate,
    throughput,
  };
}

module.exports = {
  runLoadTest,
};
