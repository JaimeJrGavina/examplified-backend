// Simple file-based mailer emulator for local testing.
// In production you would use an SMTP provider or transactional email service (SendGrid, SES, etc.).

const fs = require('fs');
const path = require('path');

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

module.exports = {
  sendVerification(email, link) {
    const body = `To: ${email}\nSubject: Verify your account\n\nClick to verify: ${link}`;
    writeMail(`verify-${Date.now()}.txt`, body);
  },
  sendRecovery(email, link) {
    const body = `To: ${email}\nSubject: Recovery link\n\nUse this link to recover and register a new key: ${link}`;
    writeMail(`recovery-${Date.now()}.txt`, body);
  }
};
