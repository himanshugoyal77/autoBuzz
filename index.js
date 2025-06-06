"use strict";

require("dotenv").config();
const app = require("./server");
const port = process.env.BACKEND_PORT || 8080;
const sqlite3 = require("sqlite3").verbose();
const sqliteInstance = new sqlite3.Database("session_storage.db");

app.listen(port, () => {
  // CREATE TABLE IF NOT EXISTS token_store (
  //   company_id TEXT,
  //   application_id TEXT,
  //   token TEXT,
  //   PRIMARY KEY (company_id, application_id)
  // )

  sqlite3.run(
    `CREATE TABLE IF NOT EXISTS token_store (
      company_id TEXT,
      token TEXT,
      key TEXT,
    )`,
    (err) => {
      if (err) {
        console.error("Error creating table:", err.message);
      } else {
        console.log("Token store table is ready.");
      }
    }
  );

  console.log(`Example app listening at http://localhost:${port}`);
});
