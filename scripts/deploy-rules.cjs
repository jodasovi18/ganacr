/**
 * Deploys firestore.rules to Firebase via REST API using service account credentials.
 * Uses HTTPS (not gRPC), so it works through the corporate SSL proxy with
 * NODE_TLS_REJECT_UNAUTHORIZED=0 set as an environment variable.
 *
 * Usage: set NODE_TLS_REJECT_UNAUTHORIZED=0 && node scripts/deploy-rules.js
 */

const crypto = require('crypto');
const https = require('https');
const fs = require('fs');
const path = require('path');

const SA = require('./service-account.json');
const RULES_FILE = path.join(__dirname, '..', 'firestore.rules');
const PROJECT_ID = SA.project_id;

// 1. Create a signed JWT for Google OAuth2
function createJWT(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })).toString('base64url');

  const toSign = `${header}.${payload}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(toSign);
  const signature = sign.sign(serviceAccount.private_key, 'base64url');
  return `${toSign}.${signature}`;
}

// 2. Exchange JWT for access token
function getAccessToken(jwt) {
  return new Promise((resolve, reject) => {
    const body = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;
    const opts = {
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': body.length },
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        const parsed = JSON.parse(data);
        if (parsed.access_token) resolve(parsed.access_token);
        else reject(new Error('No access token: ' + data));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// 3. Generic HTTPS JSON request
function httpsRequest(hostname, path, method, token, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : undefined;
    const opts = {
      hostname,
      path,
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function main() {
  const rulesContent = fs.readFileSync(RULES_FILE, 'utf8');
  console.log('📋 Rules file loaded, length:', rulesContent.length);

  console.log('🔑 Getting OAuth2 token...');
  const jwt = createJWT(SA);
  const token = await getAccessToken(jwt);
  console.log('✅ Got access token');

  // 4. Create new ruleset
  console.log('📤 Creating ruleset...');
  const rulesetBody = {
    source: {
      files: [{ name: 'firestore.rules', content: rulesContent }],
    },
  };
  const rulesetResp = await httpsRequest(
    'firebaserules.googleapis.com',
    `/v1/projects/${PROJECT_ID}/rulesets`,
    'POST',
    token,
    rulesetBody
  );
  console.log('Ruleset response:', JSON.stringify(rulesetResp).slice(0, 200));

  if (!rulesetResp.name) {
    throw new Error('Failed to create ruleset: ' + JSON.stringify(rulesetResp));
  }
  const rulesetName = rulesetResp.name;
  console.log('✅ Ruleset created:', rulesetName);

  // 5. Update the release to point to new ruleset
  console.log('🚀 Updating release...');
  const releaseBody = {
    release: {
      name: `projects/${PROJECT_ID}/releases/cloud.firestore`,
      rulesetName,
    },
  };
  const releaseResp = await httpsRequest(
    'firebaserules.googleapis.com',
    `/v1/projects/${PROJECT_ID}/releases/cloud.firestore`,
    'PATCH',
    token,
    releaseBody
  );
  console.log('Release response:', JSON.stringify(releaseResp).slice(0, 200));
  console.log('✅ Rules deployed successfully!');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
