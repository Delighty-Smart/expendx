/**
 * Automated Export Utility: Supabase -> JSON Files
 * 
 * Purpose: Fetch all table records from your Supabase project REST API
 * and save them directly into `scripts/export_data/` JSON files for seamless
 * migration to Firestore.
 * 
 * Usage:
 * npx tsx scripts/export-supabase-data.ts
 */

import * as fs from "fs";
import * as path from "path";

// Load .env file
const envPath = path.resolve("./.env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*["']?(.*?)["']?\s*$/);
    if (match) {
      const key = match[1];
      const value = match[2];
      process.env[key] = value;
    }
  });
}

// Supabase URL & Key — the service role key must be provided at runtime, never hardcoded
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TABLES_TO_EXPORT = [
  "user_profiles",
  "transactions",
  "budget_categories",
  "savings_goals",
  "user_streaks",
  "user_settings",
  "user_subscriptions",
  "alerts",
  "feedback",
  "banners",
  "slideshows",
  "user_categories",
  "recurring_templates",
];

async function fetchTableData(tableName: string) {
  const url = `${SUPABASE_URL}/rest/v1/${tableName}?select=*`;
  console.log(`Fetching records from table: ${tableName}...`);
  
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status} ${response.statusText}: ${errorText}`);
  }

  const data = await response.json();
  return data;
}

async function fetchAuthUsers() {
  const users: any[] = [];
  const perPage = 200;
  let page = 1;

  console.log("Fetching auth users (paginated)...");

  while (page <= 200) {
    const url = `${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=${perPage}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "apikey": SUPABASE_KEY!,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status} ${response.statusText}: ${errorText}`);
    }

    const payload = await response.json();
    const batch = Array.isArray(payload) ? payload : (payload.users || []);
    users.push(...batch);

    if (batch.length < perPage) break;
    page += 1;
  }

  return users;
}

async function runExport() {
  console.log("==================================================");
  console.log("   SUPABASE AUTOMATED TABLE EXPORT UTILITY");
  console.log("==================================================\n");

  const isAnonKey = SUPABASE_KEY.includes('"role":"anon"') || SUPABASE_KEY.includes('"role":"publishable"') || !process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (isAnonKey) {
    console.warn("⚠️ NOTICE: You are using the Supabase public/anon key.");
    console.warn("Supabase Row Level Security (RLS) will block unauthenticated Node.js scripts and return 0 records.");
    console.warn("To export all user data, please set SUPABASE_SERVICE_ROLE_KEY in .env or pass it to the script.\n");
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ Error: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
    console.log("Set them in your shell before running, e.g.:");
    console.log("  $env:VITE_SUPABASE_URL=\"https://<project>.supabase.co\"");
    console.log("  $env:SUPABASE_SERVICE_ROLE_KEY=\"<service-role-key>\"");
    return;
  }

  const exportDir = path.resolve("./scripts/export_data");
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  for (const table of TABLES_TO_EXPORT) {
    try {
      const records = await fetchTableData(table);
      const filePath = path.join(exportDir, `${table}.json`);
      fs.writeFileSync(filePath, JSON.stringify(records, null, 2), "utf-8");
      console.log(`✅ Exported ${records.length} records to ${filePath}`);
    } catch (err: any) {
      console.warn(`⚠️ Could not export table '${table}': ${err.message}`);
    }
  }

  // Auth users are required to recreate accounts in Firebase Auth
  try {
    const authUsers = await fetchAuthUsers();
    const filePath = path.join(exportDir, "auth_users.json");
    fs.writeFileSync(filePath, JSON.stringify(authUsers, null, 2), "utf-8");
    console.log(`✅ Exported ${authUsers.length} auth users to ${filePath}`);
  } catch (err: any) {
    console.warn(`⚠️ Could not export auth users: ${err.message}`);
  }

  console.log("\n==================================================");
  console.log("🎉 Export Complete! Exported files are ready in scripts/export_data/");
  console.log("Next steps:");
  console.log("  1. npx tsx scripts/migrate-supabase-to-firebase.ts   (Firestore data)");
  console.log("  2. node scripts/migrate-supabase-auth-to-firebase.mjs (Firebase Auth users)");
  console.log("==================================================");
}

runExport().catch(console.error);
