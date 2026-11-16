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
 *   node scripts/migrate-supabase-auth-to-firebase.mjs                    # dry run (default)
 *   node scripts/migrate-supabase-auth-to-firebase.mjs --apply
 *   node scripts/migrate-supabase-auth-to-firebase.mjs --apply --import-bcrypt --reset-links
 *
 * Flags
 *   --apply            Write to Firebase Auth (without this the script is a dry run).
 *   --dry-run          Force dry run even when --apply is present.
 *   --import-bcrypt    Import Supabase bcrypt password hashes (Firebase password hash
 *                      policy must be set to bcrypt in the console first).
 *   --reset-links      Write scripts/export_data/password_reset_links.csv so users can
 *                      be asked to set a new password (used when hashes are not imported).
 *   --users <path>     Alternate path to the exported users JSON.
 */

import fs from 'node:fs';
import path from 'node:path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const args = process.argv.slice(2);
const hasFlag = (name) => args.includes(`--${name}`);
const getArg = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && i < args.length - 1 ? args[i + 1] : undefined;
};

const APPLY = hasFlag('apply');
const DRY_RUN = !APPLY || hasFlag('dry-run');
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
  if (fs.existsSync(USERS_FILE)) {
    const raw = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const users = Array.isArray(raw) ? raw : raw.users;
    if (!Array.isArray(users)) {
      throw new Error(`${USERS_FILE} must contain an array of users (or an object with a "users" array).`);
    }
    return users;
  }

  // Fallback: build accounts from the exported profiles. This preserves UIDs (so the
  // migrated Firestore data resolves) but cannot carry passwords — users must reset them.
  const profilesFile = path.resolve('scripts/export_data/user_profiles.json');
  if (fs.existsSync(profilesFile)) {
    console.warn(`⚠ ${path.basename(USERS_FILE)} not found — using ${path.basename(profilesFile)} instead.`);
    console.warn('⚠ Passwords cannot be migrated from profiles. Run with --reset-links so users can set one.\n');

    const profiles = JSON.parse(fs.readFileSync(profilesFile, 'utf8'));
    return profiles
      .filter((p) => p && p.id && p.email)
      .map((p) => ({
        id: p.id,
        email: p.email,
        email_confirmed_at: p.email_confirmed_at || null,
        user_metadata: {
          first_name: p.first_name || undefined,
          last_name: p.last_name || undefined,
          full_name: [p.first_name, p.last_name].filter(Boolean).join(' ') || undefined,
        },
      }));
  }

  throw new Error(
    `Users file not found: ${USERS_FILE}\n` +
      'Export your Supabase auth users first, e.g.:\n' +
      `  GET ${process.env.VITE_SUPABASE_URL || '<project>.supabase.co'}/auth/v1/admin/users\n` +
      'with the service role key, and save the array of user records.'
  );
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
    initializeApp({ credential: cert(loadServiceAccount()) });
  }

  const users = loadUsers();
  const records = users.map(buildRecord).filter((r) => r.uid && r.email);

  // Existing Firebase accounts must never be overwritten — skip them by uid or email.
  const existingUids = new Set();
  const existingEmails = new Set();
  if (!DRY_RUN) {
    const auth = getAuth();
    let pageToken;
    do {
      const result = await auth.listUsers(1000, pageToken);
      for (const user of result.users) {
        existingUids.add(user.uid);
        if (user.email) existingEmails.add(user.email.toLowerCase());
      }
      pageToken = result.pageToken;
    } while (pageToken);
  }

  const pending = records.filter(
    (r) => !existingUids.has(r.uid) && !existingEmails.has(r.email.toLowerCase())
  );
  const alreadyPresent = records.length - pending.length;

  console.log('==================================================');
  console.log('   SUPABASE -> FIREBASE AUTH MIGRATION');
  console.log('==================================================');
  console.log(`Users in export file : ${users.length}`);
  console.log(`Importable records   : ${records.length}`);
  console.log(`Already in Firebase  : ${alreadyPresent}`);
  console.log(`To create            : ${pending.length}`);
  console.log(`Mode                 : ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}`);
  console.log(`Password strategy    : ${IMPORT_BCRYPT ? 'import bcrypt hashes' : 'no passwords (reset required)'}`);
  console.log('');

  if (DRY_RUN) {
    pending.slice(0, 5).forEach((r) =>
      console.log(`  ${r.uid}  ${r.email}  verified=${r.emailVerified}  disabled=${r.disabled}`)
    );
    if (pending.length > 5) console.log(`  ... and ${pending.length - 5} more`);
    if (alreadyPresent > 0) {
      console.log(`\n${alreadyPresent} account(s) already exist in Firebase and will be left untouched.`);
    }
    console.log('\nDry run complete. Re-run without --dry-run to apply.');
    return;
  }

  const auth = getAuth();
  let created = 0;
  let updated = 0;
  let failed = 0;
  let skipped = alreadyPresent;
  const failures = [];

  if (IMPORT_BCRYPT) {
    console.log('Importing users with bcrypt password hashes...');
    for (const batch of chunk(pending, 900)) {
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
        // Import is retried one-by-one so a single conflict doesn't sink the batch
        for (const entry of parsed) {
          try {
            await auth.importUsers([entry]);
            created += 1;
          } catch (entryErr) {
            failed += 1;
            failures.push({ email: entry.email, error: entryErr.message });
          }
        }
      }
    }
  } else {
    for (const record of pending) {
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
    // Generate links for every account that exists in Firebase — including ones that
    // were created by a previous run (they are skipped as "already present").
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
  console.log(`Created            : ${created}`);
  console.log(`Updated            : ${updated}`);
  console.log(`Already existed    : ${alreadyPresent}`);
  console.log(`Failed             : ${failed}`);
  if (skipped) console.log(`No reset link      : ${skipped}`);
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