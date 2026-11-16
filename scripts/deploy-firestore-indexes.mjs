/**
 * Create the composite indexes the client queries require.
 *
 *   node scripts/deploy-firestore-indexes.mjs            # dry run: show missing
 *   node scripts/deploy-firestore-indexes.mjs --apply    # create missing indexes
 *
 * Firestore rejects any query that combines equality filters with orderBy
 * unless a matching composite index exists; without these the transactions,
 * subscriptions, recurring templates and slideshow queries fail with
 * FAILED_PRECONDITION / "The query requires an index".
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KEY_PATH = path.join(ROOT, 'scripts', 'serviceAccountKey.json');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'lucent-43a45';
const apply = process.argv.includes('--apply');

const ASC = 'ASCENDING';
const DESC = 'DESCENDING';

const INDEXES = [
  // transactions — the main list query (user_id + archived + date sort)
  {
    collection: 'transactions',
    fields: [
      { fieldPath: 'user_id', order: ASC },
      { fieldPath: 'archived', order: ASC },
      { fieldPath: 'date', order: DESC },
    ],
  },
  // transactions — filtered by type
  {
    collection: 'transactions',
    fields: [
      { fieldPath: 'user_id', order: ASC },
      { fieldPath: 'archived', order: ASC },
      { fieldPath: 'type', order: ASC },
      { fieldPath: 'date', order: DESC },
    ],
  },
  // transactions — filtered by category
  {
    collection: 'transactions',
    fields: [
      { fieldPath: 'user_id', order: ASC },
      { fieldPath: 'archived', order: ASC },
      { fieldPath: 'category', order: ASC },
      { fieldPath: 'date', order: DESC },
    ],
  },
  // transactions — filtered by type and category
  {
    collection: 'transactions',
    fields: [
      { fieldPath: 'user_id', order: ASC },
      { fieldPath: 'archived', order: ASC },
      { fieldPath: 'type', order: ASC },
      { fieldPath: 'category', order: ASC },
      { fieldPath: 'date', order: DESC },
    ],
  },
  // subscriptions — user_id + newest first
  {
    collection: 'subscriptions',
    fields: [
      { fieldPath: 'user_id', order: ASC },
      { fieldPath: 'created_at', order: DESC },
    ],
  },
  // recurring_templates — user_id + type + name sort
  {
    collection: 'recurring_templates',
    fields: [
      { fieldPath: 'user_id', order: ASC },
      { fieldPath: 'type', order: ASC },
      { fieldPath: 'name', order: ASC },
    ],
  },
  // slideshow_banners — active banners in display order
  {
    collection: 'slideshow_banners',
    fields: [
      { fieldPath: 'active', order: ASC },
      { fieldPath: 'display_order', order: ASC },
    ],
  },
];

const key = JSON.parse(await fs.readFile(KEY_PATH, 'utf8'));

const b64 = (x) =>
  Buffer.from(x).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = b64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64(
    JSON.stringify({
      iss: key.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/datastore',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })
  );
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${header}.${claim}`);
  const assertion = `${header}.${claim}.${signer.sign(key.private_key, 'base64')}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const body = await res.json();
  if (!res.ok || !body.access_token) {
    throw new Error(`Token request failed: ${res.status} ${JSON.stringify(body).slice(0, 400)}`);
  }
  return body.access_token;
}

const token = await getAccessToken();
const ROOT_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/collectionGroups`;

async function api(url, init) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  return { ok: res.ok, status: res.status, body };
}

const signature = (fields) => fields.map((f) => `${f.fieldPath}:${f.order || ''}`).join(',');

const existing = new Map();
for (const { collection } of INDEXES) {
  const res = await api(`${ROOT_URL}/${collection}/indexes`);
  if (!res.ok) {
    console.warn(`! could not list indexes for ${collection}: ${res.status} ${JSON.stringify(res.body).slice(0, 200)}`);
    continue;
  }
  for (const idx of res.body.indexes || []) {
    if (idx.queryScope === 'COLLECTION' && idx.fields?.length > 1) {
      existing.set(`${collection}|${signature(idx.fields)}`, idx);
    }
  }
}

console.log(`[info] existing composite indexes: ${existing.size}`);
const missing = INDEXES.filter((i) => !existing.has(`${i.collection}|${signature(i.fields)}`));

if (missing.length === 0) {
  console.log('[ok] all required composite indexes already exist');
  process.exit(0);
}

console.log(`[${apply ? 'apply' : 'dry-run'}] missing composite indexes: ${missing.length}`);
for (const idx of missing) {
  console.log(`  - ${idx.collection}: ${signature(idx.fields)}`);
}

if (!apply) {
  console.log('\nRe-run with --apply to create them.');
  process.exit(0);
}

const created = [];
for (const idx of missing) {
  const res = await api(`${ROOT_URL}/${idx.collection}/indexes`, {
    method: 'POST',
    body: JSON.stringify({ fields: idx.fields, queryScope: 'COLLECTION' }),
  });

  if (!res.ok) {
    console.error(`  x ${idx.collection}: ${res.status} ${JSON.stringify(res.body).slice(0, 300)}`);
    continue;
  }

  const name = res.body.name?.split('/').pop();
  console.log(`  + ${idx.collection}: ${signature(idx.fields)} -> ${name} (${res.body.state || 'CREATING'})`);
  created.push(name);
}

if (created.length > 0) {
  console.log('\n[info] waiting for indexes to become READY (this can take a few minutes)...');
  const deadline = Date.now() + 10 * 60 * 1000;

  while (Date.now() < deadline) {
    const pending = [];

    for (const name of created) {
      const res = await api(
        `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/collectionGroups/${name.split('/')[4]}/indexes/${name.split('/').pop()}`
      );
      const state = res.body.state || 'CREATING';
      if (state !== 'READY') pending.push(`${name} (${state})`);
    }

    if (pending.length === 0) {
      console.log('[ok] all created indexes are READY');
      break;
    }

    console.log(`  ...still building: ${pending.join(', ')}`);
    await new Promise((resolve) => setTimeout(resolve, 20000));
  }
}