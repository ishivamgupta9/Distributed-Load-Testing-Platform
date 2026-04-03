const { Worker } = require("bullmq");
const env = require("../config/env");
const { redis, saveProgress, getProgress } = require("../lib/redis");
const { ensureResultsTable, insertLoadTestResult } = require("../lib/db");
const { runLoadTest } = require("../services/loadTestRunner");

async function startWorker() {
  await ensureResultsTable();

  const worker = new Worker(
    env.queueName,
    async (job) => {
      const jobData = job.data;
      const finalMetrics = await runLoadTest(jobData);

      await insertLoadTestResult({
        testId: jobData.testId,
        url: jobData.url,
        method: jobData.method,
        totalRequests: jobData.totalRequests,
        concurrency: jobData.concurrency,
        completed: finalMetrics.completed,
        errors: finalMetrics.errors,
        averageResponseTime: finalMetrics.averageResponseTime,
        errorRate: finalMetrics.errorRate,
        throughput: finalMetrics.throughput,
      });
    },
    {
      connection: redis,
      concurrency: 1,
    }
  );

  worker.on("failed", async (job, error) => {
    if (!job) {
      return;
    }

    const jobData = job.data;
    const currentProgress = await getProgress(jobData.testId);

    await saveProgress(jobData.testId, {
      status: "completed",
      completed: currentProgress ? currentProgress.completed : 0,
      total: jobData.totalRequests,
      errors: currentProgress ? currentProgress.errors : jobData.totalRequests,
      average_response_time:
        currentProgress && currentProgress.average_response_time !== undefined
          ? currentProgress.average_response_time
          : 0,
      error_rate:
        currentProgress && currentProgress.total > 0
          ? currentProgress.errors / currentProgress.total
          : 1,
      throughput: 0,
    });

    console.error(`Load test ${jobData.testId} failed`, error);
  });

  worker.on("ready", () => {
    console.log("Load test worker is ready");
  });
}

startWorker().catch((error) => {
  console.error("Unable to start load test worker", error);
  process.exit(1);
});
