import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function outboxPath() {
  const dir = path.join(__dirname, 'outbox');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function writeMail(filename, body) {
  const p = path.join(outboxPath(), filename);
  fs.writeFileSync(p, body, { encoding: 'utf8' });
  console.log('--- MAIL OUTBOX ---');
  console.log(p);
  console.log(body);
  console.log('-------------------');
}

export function sendWelcome(email, token) {
  const link = `Token: ${token}`;
  const body = `To: ${email}\nSubject: Welcome\n\nWelcome! Your access token: ${link}`;
  writeMail(`welcome-${Date.now()}.txt`, body);
}

export function sendRecovery(email, link) {
  const body = `To: ${email}\nSubject: Recovery link\n\nUse this link to recover your token: ${link}`;
  writeMail(`recovery-${Date.now()}.txt`, body);
}
