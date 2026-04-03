const IORedis = require("ioredis");
const env = require("../config/env");

const redis = new IORedis(env.redisUrl, {
  maxRetriesPerRequest: null,
});

function getProgressKey(testId) {
  return `progress:${testId}`;
}

async function saveProgress(testId, progress) {
  const key = getProgressKey(testId);
  const redisFields = {};

  Object.entries(progress).forEach(([field, value]) => {
    redisFields[field] = String(value);
  });

  await redis.hset(key, redisFields);
  await redis.expire(key, env.progressTtlSeconds);
}

async function getProgress(testId) {
  const storedProgress = await redis.hgetall(getProgressKey(testId));

  if (!storedProgress || Object.keys(storedProgress).length === 0) {
    return null;
  }

  return {
    status: storedProgress.status,
    completed: Number(storedProgress.completed || 0),
    total: Number(storedProgress.total || 0),
    errors: Number(storedProgress.errors || 0),
    average_response_time: storedProgress.average_response_time
      ? Number(storedProgress.average_response_time)
      : undefined,
    error_rate: storedProgress.error_rate
      ? Number(storedProgress.error_rate)
      : undefined,
    throughput: storedProgress.throughput
      ? Number(storedProgress.throughput)
      : undefined,
  };
}

module.exports = {
  redis,
  saveProgress,
  getProgress,
  getProgressKey,
};
