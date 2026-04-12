// Run this script to apply migrations to Supabase
// Usage: node scripts/run-migration.js
//
// NOTE: This requires connecting to the Supabase database directly.
// If this fails, copy the SQL files and paste them in the Supabase SQL Editor:
// https://supabase.com/dashboard/project/mjvusvhyugcckfxxednp/sql

const fs = require("fs");
const path = require("path");

const MIGRATIONS_DIR = path.join(__dirname, "..", "supabase", "migrations");

// Read all migration files
const files = fs.readdirSync(MIGRATIONS_DIR).sort();

console.log("\n=== CONDOAPP MIGRATIONS ===\n");
console.log("Copy and paste each migration into the Supabase SQL Editor:");
console.log("https://supabase.com/dashboard/project/mjvusvhyugcckfxxednp/sql\n");

files.forEach((file, i) => {
  console.log(`--- Migration ${i + 1}: ${file} ---`);
  console.log(`File: ${path.join(MIGRATIONS_DIR, file)}`);
  console.log("");
});

console.log("\nOr copy the combined SQL below:\n");
console.log("=".repeat(60));

files.forEach((file) => {
  const content = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
  console.log(`\n-- FILE: ${file}`);
  console.log(content);
});

console.log("\n" + "=".repeat(60));
console.log("\nPaste ALL of the above SQL into the SQL Editor and click Run.");
