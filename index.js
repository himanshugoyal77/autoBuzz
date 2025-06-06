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
      key TEXT
    )`
  );

  sqliteInstance.run(
    `CREATE TABLE IF NOT EXISTS accepted_permissions (company_id INTEGER PRIMARY KEY, accepted BOOLEAN)`,
    (err) => {
      if (err) {
        console.error("Error creating accepted_permissions table:", err);
      } else {
        console.log("accepted_permissions table is ready.");
      }
    }
  );
  console.log(`Example app listening at http://localhost:${port}`);
});
