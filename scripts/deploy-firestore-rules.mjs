/**
 * Deploy firestore.rules to the Firebase project using the service account key.
 *
 *   node scripts/deploy-firestore-rules.mjs            # dry run (summary only)
 *   node scripts/deploy-firestore-rules.mjs --apply    # create ruleset + release
 *
 * Uses the Firebase Rules REST API:
 *   POST /v1/projects/{project}/rulesets
 *   POST /v1/projects/{project}/releases?releaseId=cloud.firestore
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RULES_PATH = path.join(ROOT, 'firestore.rules');
const KEY_PATH = path.join(ROOT, 'scripts', 'serviceAccountKey.json');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'lucent-43a45';
const RELEASE_ID = 'cloud.firestore';
const RULES_FILE_NAME = 'firestore.rules';

const apply = process.argv.includes('--apply');

const log = (...args) => console.log(...args);

const content = await fs.readFile(RULES_PATH, 'utf8');
const matchCollections = [...content.matchAll(/match \/([a-z_]+)\//g)].map((m) => m[1]);
const denyAll = /match \/\{document=\*\*\} \{\s*allow read, write: if false;/.test(content);

if (!apply) {
  log('[dry-run] Would deploy firestore.rules');
  log(`  project:        ${PROJECT_ID}`);
  log(`  release:        ${RELEASE_ID}`);
  log(`  source:         ${RULES_PATH}`);
  log(`  bytes:          ${Buffer.byteLength(content)}`);
  log(`  collections:    ${[...new Set(matchCollections)].join(', ')}`);
  log(`  deny-all tail:  ${denyAll ? 'yes' : 'NO'}`);
  log('');
  log('Re-run with --apply to create the ruleset and release.');
  process.exit(0);
}

const key = JSON.parse(await fs.readFile(KEY_PATH, 'utf8'));

const base64url = (input) =>
  Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64url(
    JSON.stringify({
      iss: key.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
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

async function call(url, init) {
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

  if (!res.ok) {
    const detail = body?.error?.details?.[0]?.errorDetails?.[0]?.detail;
    throw new Error(
      `${res.status} ${res.statusText} ${url}\n${detail ? `  detail: ${detail}\n` : ''}  ${text.slice(0, 800)}`
    );
  }

  return body;
}

log(`[apply] Uploading ruleset to ${PROJECT_ID}...`);
const ruleset = await call(`https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/rulesets`, {
  method: 'POST',
  body: JSON.stringify({
    source: { files: [{ name: RULES_FILE_NAME, content }] },
  }),
});
log(`  ruleset: ${ruleset.name}`);

log(`[apply] Creating release ${RELEASE_ID}...`);
const release = await call(
  `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases`,
  {
    method: 'POST',
    body: JSON.stringify({
      name: `projects/${PROJECT_ID}/releases/${RELEASE_ID}`,
      rulesetName: ruleset.name,
    }),
  }
);
log(`  release: ${release.name}`);
log(`  ruleset: ${release.rulesetName}`);
log(`  update:  ${release.updateTime}`);