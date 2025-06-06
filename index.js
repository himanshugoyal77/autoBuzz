"use strict";

require("dotenv").config();
const app = require("./server");
const port = process.env.BACKEND_PORT || 8080;
const sqlite3 = require("sqlite3").verbose();
const sqliteInstance = new sqlite3.Database("session_storage.db");

app.listen(port, () => {
  sqliteInstance.run(
    `CREATE TABLE IF NOT EXISTS token_store (
      company_id TEXT,
      token TEXT,
      key TEXT,
    )`
  );
  console.log(`Example app listening at http://localhost:${port}`);
});
