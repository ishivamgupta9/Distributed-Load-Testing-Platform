const { Queue } = require("bullmq");
const env = require("../config/env");
const { redis } = require("./redis");

const loadTestQueue = new Queue(env.queueName, {
  connection: redis,
});

module.exports = {
  loadTestQueue,
};
