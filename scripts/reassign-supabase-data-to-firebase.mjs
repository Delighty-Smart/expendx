#!/usr/bin/env node
/**
 * Reassign migrated Supabase data to the correct Firebase Auth user.
 *
 * The Supabase -> Firestore migration keyed every document by the Supabase user id
 * (user_profiles/{supabaseUid}, transactions.user_id, user_settings/{supabaseUid}, ...).
 * Firebase Auth issues its own uid, so unless the auth migration preserved the old uid,
 * every query scoped to auth.currentUser.uid comes back empty.
 *
 * This script matches on email address (present on both sides) and rewrites:
 *   - user_profiles/{legacyUid}          -> merged into user_profiles/{firebaseUid}
 *   - <collection> where user_id == ...  -> user_id = firebaseUid
 *   - user_settings / user_streaks / monthly_income_estimates /
 *     notification_preferences / push_subscriptions / user_subscriptions
 *                                        -> copied from /{legacyUid} to /{firebaseUid}
 *
 * Prerequisites
 *   npm install --no-save firebase-admin
 *   Firebase service account key at scripts/serviceAccountKey.json
 *   (or FIREBASE_ADMIN_SERVICE_ACCOUNT / FIREBASE_ADMIN_SERVICE_ACCOUNT_PATH)
 *
 * Usage
 *   node scripts/reassign-supabase-data-to-firebase.mjs           # dry run, prints the plan
 *   node scripts/reassign-supabase-data-to-firebase.mjs --apply   # writes changes
 *   node scripts/reassign-supabase-data-to-firebase.mjs --apply --report
 *
 * Safety
 *   - Dry run by default; nothing is written without --apply.
 *   - Only documents whose user_id equals a legacy id are touched.
 *   - If both the legacy and the target profile exist, the target wins and the
 *     legacy document is deleted only after a successful merge.
 */

import fs from 'node:fs';
import path from 'node:path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const WRITE_REPORT = args.includes('--report');

const OUT_DIR = path.resolve('scripts/export_data');

const COLLECTIONS_WITH_USER_ID = [
  'transactions',
  'budget_categories',
  'savings_goals',
  'alerts',
  'subscriptions',
  'user_subscriptions',
  'user_categories',
  'recurring_templates',
  'user_feedback',
];

const DOC_ID_COLLECTIONS = [
  'user_settings',
  'user_streaks',
  'monthly_income_estimates',
  'notification_preferences',
  'push_subscriptions',
];

function loadServiceAccount() {
  const inline = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  if (inline) return JSON.parse(inline);

  const keyPath = path.resolve(
    process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_PATH || 'scripts/serviceAccountKey.json'
  );
  if (!fs.existsSync(keyPath)) {
    throw new Error(
      `Service account key not found at ${keyPath}.\n` +
        'Download it from Firebase Console > Project settings > Service accounts.'
    );
  }
  return JSON.parse(fs.readFileSync(keyPath, 'utf8'));
}

function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

const isEmptyValue = (value) => value === undefined || value === null || value === '';

// Legacy data wins; the target document only fills fields the legacy one lacks.
// This keeps the original role (e.g. admin), name and streak instead of letting
// an empty stub profile created after the migration overwrite them.
function mergeRecords(legacyData, targetData) {
  const merged = { ...targetData, ...legacyData };
  for (const [key, value] of Object.entries(targetData)) {
    if (isEmptyValue(merged[key])) merged[key] = value;
  }
  return merged;
}

async function main() {
  initializeApp({ credential: cert(loadServiceAccount()) });
  const db = getFirestore();
  const auth = getAuth();

  console.log('==================================================');
  console.log('   FIREBASE UID REASSIGNMENT (Supabase legacy ids)');
  console.log('==================================================');
  console.log(`Mode: ${APPLY ? 'APPLY (writes enabled)' : 'DRY RUN (no writes)'}\n`);

  // 1. Firebase Auth users indexed by email
  const firebaseUidByEmail = new Map();
  let pageToken;
  do {
    const result = await auth.listUsers(1000, pageToken);
    for (const user of result.users) {
      if (user.email) firebaseUidByEmail.set(user.email.toLowerCase(), user.uid);
    }
    pageToken = result.pageToken;
  } while (pageToken);
  console.log(`Firebase Auth users: ${firebaseUidByEmail.size}`);

  // 2. Existing profiles and the legacy -> firebase mapping
  const profileSnapshot = await db.collection('user_profiles').get();
  const mappings = [];
  const orphans = [];
  const upToDate = [];

  for (const doc of profileSnapshot.docs) {
    const data = doc.data();
    const email = typeof data.email === 'string' ? data.email.toLowerCase() : '';
    const targetUid = email ? firebaseUidByEmail.get(email) : undefined;

    if (!targetUid) {
      orphans.push({ profileId: doc.id, email: data.email || null });
    } else if (targetUid === doc.id) {
      upToDate.push({ profileId: doc.id, email: data.email || null });
    } else {
      mappings.push({ legacyUid: doc.id, firebaseUid: targetUid, email: data.email || null });
    }
  }

  console.log(`Profiles: ${profileSnapshot.size}`);
  console.log(`  already keyed by Firebase uid : ${upToDate.length}`);
  console.log(`  need reassignment             : ${mappings.length}`);
  console.log(`  no matching Firebase account  : ${orphans.length}\n`);

  // Never merge two different legacy accounts into one Firebase user: that would
  // hand one person's data to another. Flag these for manual handling instead.
  const byTarget = new Map();
  for (const m of mappings) {
    if (!byTarget.has(m.firebaseUid)) byTarget.set(m.firebaseUid, []);
    byTarget.get(m.firebaseUid).push(m);
  }

  const ambiguous = [];
  const safeMappings = [];
  for (const [firebaseUid, list] of byTarget) {
    if (list.length === 1) {
      safeMappings.push(list[0]);
    } else {
      ambiguous.push({
        firebaseUid,
        legacyUids: list.map((m) => m.legacyUid),
        emails: list.map((m) => m.email),
      });
    }
  }

  if (ambiguous.length > 0) {
    console.log('\n⚠ Ambiguous matches — skipped to avoid mixing data between users:');
    ambiguous.forEach((a) =>
      console.log(`  ${a.firebaseUid} <- ${a.legacyUids.join(', ')} (${a.emails.join(', ')})`)
    );
    console.log('');
  }

  if (safeMappings.length === 0) {
    console.log('Nothing to reassign — every profile is already keyed by its Firebase uid.');
    if (orphans.length) {
      console.log('\nProfiles without a Firebase Auth account (data left untouched):');
      orphans.forEach((o) => console.log(`  ${o.profileId}  ${o.email || '(no email)'}`));
    }
    return;
  }

  safeMappings.forEach((m) =>
    console.log(`  ${m.legacyUid} -> ${m.firebaseUid}  ${m.email || '(no email)'}`)
  );
  console.log('');

  const legacyToFirebase = new Map(safeMappings.map((m) => [m.legacyUid, m.firebaseUid]));
  const stats = { profilesMoved: 0, userIdsUpdated: 0, docIdsMoved: 0, deleted: 0, errors: [] };

  // Detect user ids that cannot be matched to a Firebase account. Their data would
  // stay orphaned, so surface them instead of silently skipping.
  const firebaseUids = new Set(firebaseUidByEmail.values());
  const legacyIds = new Set(legacyToFirebase.keys());
  const unmappedCounts = new Map();

  for (const collectionName of COLLECTIONS_WITH_USER_ID) {
    const snap = await db.collection(collectionName).get();
    snap.forEach((d) => {
      const uid = d.data().user_id;
      if (uid && !firebaseUids.has(uid) && !legacyIds.has(uid)) {
        unmappedCounts.set(uid, (unmappedCounts.get(uid) || 0) + 1);
      }
    });
  }
  for (const collectionName of DOC_ID_COLLECTIONS) {
    const snap = await db.collection(collectionName).get();
    snap.forEach((d) => {
      if (!firebaseUids.has(d.id) && !legacyIds.has(d.id)) {
        unmappedCounts.set(d.id, (unmappedCounts.get(d.id) || 0) + 1);
      }
    });
  }

  if (unmappedCounts.size > 0) {
    console.log('\n⚠ Unmatched user ids (no Firebase account / no profile email):');
    [...unmappedCounts.entries()].forEach(([uid, count]) =>
      console.log(`  ${uid}  (${count} document${count === 1 ? '' : 's'})`)
    );
    console.log('  These need a Firebase Auth account with this uid, or a manual mapping.');
    console.log('');
  }

  if (!APPLY) {
    // Report what would change
    for (const collectionName of COLLECTIONS_WITH_USER_ID) {
      for (const legacyUid of legacyToFirebase.keys()) {
        const snap = await db.collection(collectionName).where('user_id', '==', legacyUid).get();
        if (!snap.empty) {
          console.log(`  would update ${snap.size} doc(s) in ${collectionName} (user_id ${legacyUid})`);
          stats.userIdsUpdated += snap.size;
        }
      }
    }
    for (const collectionName of DOC_ID_COLLECTIONS) {
      for (const legacyUid of legacyToFirebase.keys()) {
        const snap = await db.collection(collectionName).doc(legacyUid).get();
        if (snap.exists) {
          console.log(`  would move ${collectionName}/${legacyUid}`);
          stats.docIdsMoved += 1;
        }
      }
    }
    console.log('\nDry run complete. Re-run with --apply to write these changes.');
    return;
  }

  // 3. Reassign user_id fields
  for (const collectionName of COLLECTIONS_WITH_USER_ID) {
    for (const [legacyUid, firebaseUid] of legacyToFirebase) {
      const snap = await db.collection(collectionName).where('user_id', '==', legacyUid).get();
      if (snap.empty) continue;

      for (const batchDocs of chunk(snap.docs, 400)) {
        const batch = db.batch();
        for (const doc of batchDocs) {
          batch.update(doc.ref, { user_id: firebaseUid, reassigned_from: legacyUid });
        }
        await batch.commit();
      }
      stats.userIdsUpdated += snap.size;
      console.log(`  ${collectionName}: ${snap.size} doc(s) reassigned to ${firebaseUid}`);
    }
  }

  // 4. Move doc-per-user collections
  for (const collectionName of DOC_ID_COLLECTIONS) {
    for (const [legacyUid, firebaseUid] of legacyToFirebase) {
      const legacyRef = db.collection(collectionName).doc(legacyUid);
      const legacySnap = await legacyRef.get();
      if (!legacySnap.exists) continue;

      const targetRef = db.collection(collectionName).doc(firebaseUid);
      const targetSnap = await targetRef.get();
      await targetRef.set(
        {
          ...mergeRecords(legacySnap.data(), targetSnap.exists ? targetSnap.data() : {}),
          reassigned_from: legacyUid,
        },
        { merge: true }
      );
      await legacyRef.delete();
      stats.docIdsMoved += 1;
      stats.deleted += 1;
      console.log(`  ${collectionName}: ${legacyUid} -> ${firebaseUid}`);
    }
  }

  // 5. Merge profiles, then remove the legacy profile document
  for (const [legacyUid, firebaseUid] of legacyToFirebase) {
    const legacyRef = db.collection('user_profiles').doc(legacyUid);
    const targetRef = db.collection('user_profiles').doc(firebaseUid);
    const [legacySnap, targetSnap] = await Promise.all([legacyRef.get(), targetRef.get()]);
    if (!legacySnap.exists) continue;

    const merged = {
      ...mergeRecords(legacySnap.data(), targetSnap.exists ? targetSnap.data() : {}),
      id: firebaseUid,
      reassigned_from: legacyUid,
      updated_at: new Date().toISOString(),
    };
    await targetRef.set(merged, { merge: true });
    await legacyRef.delete();
    stats.profilesMoved += 1;
    stats.deleted += 1;
  }

  console.log('\n==================================================');
  console.log(`Profiles merged        : ${stats.profilesMoved}`);
  console.log(`user_id fields updated : ${stats.userIdsUpdated}`);
  console.log(`Doc-id documents moved : ${stats.docIdsMoved}`);
  console.log(`Legacy docs deleted    : ${stats.deleted}`);
  console.log('==================================================');

  if (WRITE_REPORT) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const reportPath = path.join(OUT_DIR, 'reassignment-report.json');
    fs.writeFileSync(
      reportPath,
      JSON.stringify(
        {
          generated_at: new Date().toISOString(),
          mappings: safeMappings,
          ambiguous,
          orphans,
          unmapped: [...unmappedCounts.entries()].map(([uid, documents]) => ({ uid, documents })),
          stats,
        },
        null,
        2
      ),
      'utf8'
    );
    console.log(`Report written to ${reportPath}`);
  }
}

main().catch((err) => {
  console.error('Reassignment failed:', err);
  process.exit(1);
});