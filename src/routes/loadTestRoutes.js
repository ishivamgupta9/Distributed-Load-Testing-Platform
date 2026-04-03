const express = require("express");
const crypto = require("crypto");
const { loadTestQueue } = require("../lib/queue");
const { getProgress, saveProgress } = require("../lib/redis");

const router = express.Router();

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function validateRequest(body) {
  const validationErrors = [];

  if (!body.url) {
    validationErrors.push("url is required");
  } else {
    try {
      new URL(body.url);
    } catch (error) {
      validationErrors.push("url must be a valid URL");
    }
  }

  if (!body.method || typeof body.method !== "string") {
    validationErrors.push("method is required");
  }

  if (!isPositiveInteger(body.total_requests)) {
    validationErrors.push("total_requests must be a positive integer");
  }

  if (!isPositiveInteger(body.concurrency)) {
    validationErrors.push("concurrency must be a positive integer");
  }

  if (
    isPositiveInteger(body.total_requests) &&
    isPositiveInteger(body.concurrency) &&
    body.concurrency > body.total_requests
  ) {
    validationErrors.push("concurrency cannot be greater than total_requests");
  }

  if (
    body.headers !== undefined &&
    (typeof body.headers !== "object" || Array.isArray(body.headers))
  ) {
    validationErrors.push("headers must be an object");
  }

  return validationErrors;
}

router.post("/load-test", async (req, res, next) => {
  try {
    const validationErrors = validateRequest(req.body);

    if (validationErrors.length > 0) {
      return res.status(400).json({ errors: validationErrors });
    }

    const testId = crypto.randomUUID();
    const jobData = {
      testId,
      url: req.body.url,
      method: req.body.method.toUpperCase(),
      totalRequests: req.body.total_requests,
      concurrency: req.body.concurrency,
      headers: req.body.headers || {},
      payload: req.body.payload,
    };

    // Store initial progress in Redis so the client can poll status right away.
    await saveProgress(testId, {
      status: "queued",
      completed: 0,
      total: jobData.totalRequests,
      errors: 0,
    });

    await loadTestQueue.add("load-test", jobData, {
      jobId: testId,
      removeOnComplete: 100,
      removeOnFail: 100,
    });

    return res.status(202).json({ testId });
  } catch (error) {
    return next(error);
  }
});

router.get("/load-test/:testId", async (req, res, next) => {
  try {
    const testProgress = await getProgress(req.params.testId);

    if (!testProgress) {
      return res.status(404).json({ error: "Test not found" });
    }

    const response = {
      status: testProgress.status,
      completed: testProgress.completed,
      total: testProgress.total,
      errors: testProgress.errors,
    };

    if (testProgress.status === "completed") {
      response.average_response_time = testProgress.average_response_time;
      response.error_rate = testProgress.error_rate;
      response.throughput = testProgress.throughput;
    }

    return res.json(response);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
