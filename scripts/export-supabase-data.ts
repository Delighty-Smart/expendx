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

// Supabase URL & Key (ALWAYS prioritize SUPABASE_SERVICE_ROLE_KEY over public keys)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://wulhjbwijgbticuslygm.supabase.co";
const SUPABASE_KEY = 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1bGhqYndpamdidGljdXNseWdtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzExNDk4MiwiZXhwIjoyMDUyNjkwOTgyfQ.-LtWEKQfoSLCcyaJhVRhUTFDv7oiIVdv4B8HnkK1jtw";

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

  if (!SUPABASE_KEY) {
    console.error("❌ Error: SUPABASE_KEY (VITE_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY) is missing.");
    console.log("Please pass your key or set VITE_SUPABASE_ANON_KEY in .env");
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

  console.log("\n==================================================");
  console.log("🎉 Export Complete! Exported files are ready in scripts/export_data/");
  console.log("Next step: Run `npx tsx scripts/migrate-supabase-to-firebase.ts` to import into Firestore.");
  console.log("==================================================");
}

runExport().catch(console.error);
