/*
Simple utility to generate a long-lived admin token.
Usage: node generate-token.js [expiryDays]
Example: node generate-token.js 30
Output: A signed JWT token that you can save and use to access protected routes.
*/

import crypto from 'crypto';

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function generateToken(payload, expiresInSeconds = null) {
  const HMAC_SECRET = process.env.SESSION_SECRET || 'admin-secret-change-in-production';
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  
  // If no expiry, don't include exp field
  const body = expiresInSeconds
    ? base64url(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + expiresInSeconds, iat: Math.floor(Date.now() / 1000) }))
    : base64url(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000) }));
  
  const sig = crypto
    .createHmac('sha256', HMAC_SECRET)
    .update(`${header}.${body}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${header}.${body}.${sig}`;
}

const args = process.argv.slice(2);
const expiryDays = args[0] ? parseInt(args[0]) : null; // null = no expiration
const expirySeconds = expiryDays ? expiryDays * 24 * 60 * 60 : null;

const token = generateToken({ clientId: 'admin', role: 'admin' }, expirySeconds);

console.log('\n========================================');
console.log('ADMIN TOKEN GENERATED');
console.log('========================================');
console.log(`Expiration: ${expirySeconds ? `${expiryDays} days` : 'NEVER EXPIRES'}`);
if (expirySeconds) {
  console.log(`Expires: ${new Date(Date.now() + expirySeconds * 1000).toISOString()}`);
}
console.log('--------');
console.log('TOKEN:');
console.log(token);
console.log('--------');
console.log('\nSave this token securely. Use it in the Authorization header:');
console.log('Authorization: Bearer <token>');
console.log('\nTo use in your frontend or API calls, store this in an environment variable or secure storage.');
console.log('========================================\n');
