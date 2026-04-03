const express = require("express");
const env = require("./config/env");
const { ensureResultsTable } = require("./lib/db");
const loadTestRoutes = require("./routes/loadTestRoutes");

async function startServer() {
  await ensureResultsTable();

  const app = express();

  app.use(express.json());
  app.use(loadTestRoutes);

  app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  });

  app.listen(env.port, () => {
    console.log(`API server listening on port ${env.port}`);
  });
}

startServer().catch((error) => {
  console.error("Unable to start server", error);
  process.exit(1);
});
