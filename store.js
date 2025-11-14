// In-memory store for demo purposes. Replace with a persistent DB in production.
const clients = new Map(); // clientId -> { publicKeyPem, email, verified }
const challenges = new Map(); // clientId -> { nonce, exp }
const recoveryTokens = new Map(); // token -> { clientId, exp }
const verificationTokens = new Map(); // token -> { clientId, exp }

module.exports = {
  clients,
  challenges,
  recoveryTokens,
  verificationTokens,
};
