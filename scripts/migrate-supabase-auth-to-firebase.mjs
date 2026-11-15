#!/usr/bin/env node
/**
 * Firebase Auth migration: Supabase -> Firebase Authentication
 *
 * Creates a Firebase Auth account for every Supabase user, preserving the original
 * UID so the Firestore documents already migrated by migrate-supabase-to-firebase.ts
 * (user_profiles/{uid}, transactions.user_id, ...) keep resolving to the same person.
 *
 * Prerequisites
 *   npm install --no-save firebase-admin
 *   Place the Firebase service account key at scripts/serviceAccountKey.json
 *   (or set FIREBASE_ADMIN_SERVICE_ACCOUNT to the JSON string / FIREBASE_ADMIN_SERVICE_ACCOUNT_PATH)
 *
 * Input
 *   scripts/export_data/auth_users.json  — array of Supabase auth users, e.g. produced by:
 *     GET {SUPABASE_URL}/auth/v1/admin/users  (paginated) with the service role key
 *   Required fields per record: id, email
 *   Optional: encrypted_password (bcrypt), email_confirmed_at, banned_until, user_metadata
 *
 * Usage
 *   node scripts/migrate-supabase-auth-to-firebase.mjs --dry-run
 *   node scripts/migrate-supabase-auth-to-firebase.mjs
 *   node scripts/migrate-supabase-auth-to-firebase.mjs --import-bcrypt --reset-links
 *
 * Flags
 *   --dry-run          Parse and report only, never write.
 *   --import-bcrypt    Import Supabase bcrypt password hashes (Firebase password hash
 *                      policy must be set to bcrypt in the console first).
 *   --reset-links      Write scripts/export_data/password_reset_links.csv so users can
 *                      be asked to set a new password (used when hashes are not imported).
 *   --users <path>     Alternate path to the exported users JSON.
 */

import fs from 'node:fs';
import path from 'node:path';
import admin from 'firebase-admin';

const args = process.argv.slice(2);
const hasFlag = (name) => args.includes(`--${name}`);
const getArg = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && i < args.length - 1 ? args[i + 1] : undefined;
};

const DRY_RUN = hasFlag('dry-run');
const IMPORT_BCRYPT = hasFlag('import-bcrypt');
const RESET_LINKS = hasFlag('reset-links');
const USERS_FILE = path.resolve(getArg('users') || 'scripts/export_data/auth_users.json');
const OUT_DIR = path.resolve('scripts/export_data');

function loadServiceAccount() {
  const inline = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  if (inline) return JSON.parse(inline);

  const keyPath = path.resolve(
    process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_PATH || 'scripts/serviceAccountKey.json'
  );
  if (!fs.existsSync(keyPath)) {
    throw new Error(
      `Service account key not found at ${keyPath}.\n` +
        'Download it from Firebase Console > Project settings > Service accounts, or set ' +
        'FIREBASE_ADMIN_SERVICE_ACCOUNT / FIREBASE_ADMIN_SERVICE_ACCOUNT_PATH.'
    );
  }
  return JSON.parse(fs.readFileSync(keyPath, 'utf8'));
}

function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    throw new Error(
      `Users file not found: ${USERS_FILE}\n` +
        'Export your Supabase auth users first, e.g.:\n' +
        `  GET ${process.env.VITE_SUPABASE_URL || '<project>.supabase.co'}/auth/v1/admin/users\n` +
        'with the service role key, and save the array of user records.'
    );
  }
  const raw = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  const users = Array.isArray(raw) ? raw : raw.users;
  if (!Array.isArray(users)) {
    throw new Error(`${USERS_FILE} must contain an array of users (or an object with a "users" array).`);
  }
  return users;
}

function buildRecord(supabaseUser) {
  const metadata = supabaseUser.user_metadata || {};
  const nameFromParts = [metadata.first_name, metadata.last_name].filter(Boolean).join(' ');
  const displayName = metadata.full_name || nameFromParts || null;
  const bannedUntil = supabaseUser.banned_until ? new Date(supabaseUser.banned_until) : null;

  return {
    uid: supabaseUser.id,
    email: supabaseUser.email || undefined,
    displayName: displayName || undefined,
    emailVerified: Boolean(supabaseUser.email_confirmed_at),
    disabled: Boolean(bannedUntil && bannedUntil.getTime() > Date.now()),
    passwordHash: supabaseUser.encrypted_password
      ? Buffer.from(supabaseUser.encrypted_password, 'utf8')
      : undefined,
    createdAt: supabaseUser.created_at || undefined,
  };
}

function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

async function main() {
  if (!DRY_RUN) {
    admin.initializeApp({ credential: admin.credential.cert(loadServiceAccount()) });
  }

  const users = loadUsers();
  const records = users.map(buildRecord).filter((r) => r.uid && r.email);

  console.log('==================================================');
  console.log('   SUPABASE -> FIREBASE AUTH MIGRATION');
  console.log('==================================================');
  console.log(`Users in export file : ${users.length}`);
  console.log(`Importable records   : ${records.length}`);
  console.log(`Mode                 : ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}`);
  console.log(`Password strategy    : ${IMPORT_BCRYPT ? 'import bcrypt hashes' : 'no passwords (reset required)'}`);
  console.log('');

  if (DRY_RUN) {
    records.slice(0, 5).forEach((r) =>
      console.log(`  ${r.uid}  ${r.email}  verified=${r.emailVerified}  disabled=${r.disabled}`)
    );
    if (records.length > 5) console.log(`  ... and ${records.length - 5} more`);
    console.log('\nDry run complete. Re-run without --dry-run to apply.');
    return;
  }

  const auth = admin.auth();
  let created = 0;
  let updated = 0;
  let failed = 0;
  let skipped = 0;
  const failures = [];

  if (IMPORT_BCRYPT) {
    console.log('Importing users with bcrypt password hashes...');
    for (const batch of chunk(records, 900)) {
      const parsed = batch.map((r) => ({
        uid: r.uid,
        email: r.email,
        displayName: r.displayName,
        emailVerified: r.emailVerified,
        disabled: r.disabled,
        passwordHash: r.passwordHash,
      }));
      try {
        await auth.importUsers(parsed);
        created += parsed.length;
      } catch (err) {
        failed += parsed.length;
        failures.push({ batch: parsed.map((p) => p.email), error: err.message });
      }
    }
  } else {
    for (const record of records) {
      try {
        await auth.createUser({
          uid: record.uid,
          email: record.email,
          displayName: record.displayName,
          emailVerified: record.emailVerified,
          disabled: record.disabled,
        });
        created += 1;
      } catch (err) {
        if (err.code === 'auth/uid-already-exists' || err.code === 'auth/email-already-exists') {
          try {
            await auth.updateUser(record.uid, {
              email: record.email,
              displayName: record.displayName,
              emailVerified: record.emailVerified,
              disabled: record.disabled,
            });
            updated += 1;
          } catch (updateErr) {
            failed += 1;
            failures.push({ email: record.email, error: updateErr.message });
          }
        } else {
          failed += 1;
          failures.push({ email: record.email, error: err.message });
        }
      }
    }
  }

  if (RESET_LINKS && !IMPORT_BCRYPT) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const csvPath = path.join(OUT_DIR, 'password_reset_links.csv');
    const lines = ['email,reset_link'];
    for (const record of records) {
      try {
        const link = await auth.generatePasswordResetLink(record.email);
        lines.push(`${record.email},${link}`);
      } catch (err) {
        skipped += 1;
        failures.push({ email: record.email, error: `reset link: ${err.message}` });
      }
    }
    fs.writeFileSync(csvPath, lines.join('\n'), 'utf8');
    console.log(`Password reset links written to ${csvPath}`);
  }

  console.log('');
  console.log(`Created : ${created}`);
  console.log(`Updated : ${updated}`);
  console.log(`Failed  : ${failed}`);
  if (skipped) console.log(`No link: ${skipped}`);
  if (failures.length) {
    console.log('\nFailures:');
    failures.slice(0, 20).forEach((f) => console.log(`  ${f.email || '(batch)'}: ${f.error}`));
    if (failures.length > 20) console.log(`  ... and ${failures.length - 20} more`);
  }
  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});