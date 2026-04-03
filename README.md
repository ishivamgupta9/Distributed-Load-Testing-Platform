# Distributed Load Testing Platform

## Description

This is a small backend project for running load tests against any API.

A user can start a load test by sending a target URL, HTTP method, total number of requests, and concurrency level. The system then processes that job in the background, sends concurrent requests to the target API, and tracks useful metrics like response time, error count, and throughput.

The API does not run the load test directly. It only accepts the request, creates a job, and returns a `testId`. A worker picks up the job and runs the test separately.

## Tech Stack

- Node.js
- Express
- Redis
- BullMQ
- PostgreSQL

## Architecture Overview

The flow is simple:

- The API receives a load test request and pushes it to a BullMQ queue.
- A worker process picks up the job and runs the load test.
- Redis stores live progress so the client can check status while the test is running.
- PostgreSQL stores the final result once the test is completed.

This keeps the API responsive and makes the worker responsible for the actual execution.

## API Endpoints

### `POST /load-test`

Creates a new load test job and returns a `testId` immediately.

Sample request body:

```json
{
  "url": "https://httpbin.org/get",
  "method": "GET",
  "total_requests": 10,
  "concurrency": 2,
  "headers": {
    "x-test": "demo"
  },
  "payload": {
    "name": "sample"
  }
}
```

Sample response:

```json
{
  "testId": "6ed1acbd-506e-438a-aaf4-f907590cfbc5"
}
```

### `GET /load-test/:testId`

Returns the current status of the load test.

If the test is still running, it returns progress fields like:

- `status`
- `completed`
- `total`
- `errors`

If the test is completed, it also returns:

- `average_response_time`
- `error_rate`
- `throughput`

## How To Run Locally

### 1. Clone the repo

```bash
git clone https://github.com/ishivamgupta9/Distributed-Load-Testing-Platform.git
cd Traya
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file from `.env.example`.

Required values:

- `PORT`
- `REDIS_URL`
- `DATABASE_URL`
- `REQUEST_TIMEOUT_MS`
- `PROGRESS_UPDATE_BATCH_SIZE`
- `PROGRESS_TTL_SECONDS`
- `QUEUE_NAME`

Example:

```env
PORT=3000
REDIS_URL=redis://127.0.0.1:6379
DATABASE_URL=postgres://127.0.0.1:5433/load_testing
REQUEST_TIMEOUT_MS=10000
PROGRESS_UPDATE_BATCH_SIZE=10
PROGRESS_TTL_SECONDS=86400
QUEUE_NAME=load-tests
```

### 4. Start Redis

Make sure Redis is running locally.

Example:

```bash
brew services start redis
```

### 5. Start PostgreSQL

Make sure PostgreSQL is running and the `load_testing` database exists.

### 6. Start the worker

```bash
npm run worker
```

### 7. Start the API server

```bash
npm start
```

Once both are running, you can test the endpoints using Postman or curl.

## Project Structure

```text
src/
  config/
    env.js
  lib/
    db.js
    queue.js
    redis.js
  routes/
    loadTestRoutes.js
  services/
    loadTestRunner.js
  workers/
    loadTestWorker.js
  server.js
postman/
  load-testing.postman_collection.json
```

What each part does:

- `config/` holds environment configuration
- `lib/` contains shared setup for Redis, queue, and database
- `routes/` contains the API endpoints
- `services/` contains the load test execution logic
- `workers/` contains the BullMQ worker process
- `server.js` starts the Express app

## Notes / Decisions

### Why a queue is used

Load testing can take time, so it should not run inside the API request itself. The queue lets the API respond immediately and keeps the heavy work in a separate worker.

### Why Redis is used

Redis is used for two things here:

- BullMQ uses Redis for the queue
- The app stores live progress in Redis using `progress:{testId}`

This makes status checks fast and simple.

### Why PostgreSQL is used

PostgreSQL is used only for final result storage. Once the load test is finished, the worker inserts one row with the final metrics.

## Postman Collection

A Postman collection is included in the project for quick testing:

```text
postman/load-testing.postman_collection.json
```

You can import it into Postman and use it to:

- create a load test
- automatically save the returned `testId`
- check the load test status
