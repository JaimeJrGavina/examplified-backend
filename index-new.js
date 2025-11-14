/*
Backend dashboard and admin API server.
- Protected admin routes using Bearer token authentication.
- Signed-challenge auth for customer accounts (future).
- Email-based recovery for admin.
*/

import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import adminAuth from './middleware/adminAuth.js';
import db from './db.js';
import customers from './customers.js';
import * as mailer from './mailer-esm.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());
// Simple CORS for local development (adjust in production)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
// Simple in-memory stores (replace with DB in production)
const admin = {
  verified: true,
  email: 'admin@smartbarexam.com'
};

// Health check (public)
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// Protected admin dashboard endpoint
app.get('/admin', adminAuth, (req, res) => {
  res.json({
    ok: true,
    message: `Welcome to admin dashboard`,
    admin: req.admin,
    timestamp: new Date().toISOString(),
  });
});

// Protected: Get all exams
app.get('/admin/exams', adminAuth, (req, res) => {
  const exams = db.getAllExams();
  res.json({
    ok: true,
    count: exams.length,
    exams,
  });
});

// Protected: Get single exam by ID
app.get('/admin/exams/:id', adminAuth, (req, res) => {
  const exam = db.getExamById(req.params.id);
  if (!exam) {
    return res.status(404).json({ error: 'Exam not found' });
  }
  res.json({ ok: true, exam });
});

// Protected: Create new exam (save from dashboard)
app.post('/admin/exams', adminAuth, (req, res) => {
  const { title, subject, description, durationMinutes, questions } = req.body || {};
  if (!title) {
    return res.status(400).json({ error: 'title required' });
  }

  try {
    console.log('[admin] createExam request by', req.admin?.clientId, 'body:', { title, subject });
    const exam = db.createExam({
      title,
      subject: subject || 'General',
      description: description || '',
      durationMinutes: durationMinutes || 60,
      questions: questions || [],
      createdBy: req.admin.clientId,
    });
    console.log('[admin] exam saved with id', exam.id);
    res.status(201).json({ ok: true, exam });
  } catch (err) {
    console.error('[admin] createExam failed:', err);
    res.status(500).json({ error: 'Failed to save exam' });
  }
});

// Protected: Update exam
app.put('/admin/exams/:id', adminAuth, (req, res) => {
  try {
    const updated = db.updateExam(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Exam not found' });
    console.log('[admin] exam updated:', req.params.id);
    res.json({ ok: true, exam: updated });
  } catch (err) {
    console.error('[admin] updateExam failed:', err);
    res.status(500).json({ error: 'Failed to update exam' });
  }
});

// Protected: Delete exam
app.delete('/admin/exams/:id', adminAuth, (req, res) => {
  try {
    console.log('[admin] deleteExam request by', req.admin?.clientId, 'id:', req.params.id);
    const deleted = db.deleteExam(req.params.id);
    if (!deleted) {
      console.log('[admin] deleteExam not found:', req.params.id);
      return res.status(404).json({ error: 'Exam not found' });
    }
    console.log('[admin] exam deleted:', req.params.id);
    res.json({ ok: true, message: 'Exam deleted' });
  } catch (err) {
    console.error('[admin] deleteExam failed:', err);
    res.status(500).json({ error: 'Failed to delete exam' });
  }
});

// Protected admin API: fetch dashboard stats
app.get('/admin/stats', adminAuth, (req, res) => {
  const exams = db.getAllExams();
  res.json({
    ok: true,
    stats: {
      totalExams: exams.length,
      totalStudents: 0,
      totalSubmissions: 0,
      pendingReview: 0,
    },
    timestamp: new Date().toISOString(),
  });
});

// Protected admin API: manage codes (for customer access)
app.post('/admin/codes', adminAuth, (req, res) => {
  const { email, expiresInDays } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email required' });
  
  // Generate a simple access code
  const code = crypto.randomBytes(6).toString('hex').toUpperCase();
  
  res.json({
    ok: true,
    code,
    email,
    expiresInDays: expiresInDays || 30,
    message: 'Code generated. Share this code with the customer.',
  });
});

// Protected: Manage customers (admin)
app.post('/admin/customers', adminAuth, (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email required' });
  try {
    const customer = customers.createCustomer({ email });
    // send welcome email with token
    try { mailer.sendWelcome(customer.email, customer.token); } catch (e) { /* ignore mail errors */ }
    res.status(201).json({ ok: true, customer });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/admin/customers', adminAuth, (req, res) => {
  const all = customers.getAllCustomers();
  res.json({ ok: true, count: all.length, customers: all });
});

app.delete('/admin/customers/:id', adminAuth, (req, res) => {
  const deleted = customers.deleteCustomer(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Customer not found' });
  res.json({ ok: true, message: 'Customer deleted' });
});

app.post('/admin/customers/:id/regenerate-token', adminAuth, (req, res) => {
  const updated = customers.regenerateToken(req.params.id);
  if (!updated) return res.status(404).json({ error: 'Customer not found' });
  try { mailer.sendWelcome(updated.email, updated.token); } catch (e) {}
  res.json({ ok: true, customer: updated });
});

// Public: customer login using token
app.post('/customer-login', (req, res) => {
  const { token: rawToken } = req.body || {};
  const token = rawToken?.trim();
  if (!token) return res.status(400).json({ error: 'token required' });
  const cust = customers.getCustomerByToken(token);
  if (!cust) return res.status(404).json({ error: 'Invalid token' });
  // update last login
  try { customers.regenerateToken; } catch (e) {}
  res.json({ ok: true, customer: { id: cust.id, email: cust.email } });
});

// Public: request recovery
app.post('/customer-recover', (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email required' });
  const cust = customers.getCustomerByEmail(email);
  if (!cust) return res.status(404).json({ error: 'Email not found' });
  const rec = customers.createRecoveryToken(email, 60);
  const link = `http://localhost:3001/#/recover/${rec.recoveryToken}`;
  try { mailer.sendRecovery(email, link); } catch (e) {}
  res.json({ ok: true, message: 'Recovery email sent' });
});

// Public: verify recovery token
app.get('/customer-recover/:token', (req, res) => {
  const rec = customers.getRecoveryToken(req.params.token);
  if (!rec) return res.status(404).json({ error: 'Invalid or expired token' });
  if (new Date(rec.expiresAt) < new Date() || rec.used) return res.status(410).json({ error: 'Token expired or used' });
  res.json({ ok: true, email: rec.email });
});

// Public: consume recovery token and generate new customer token
app.post('/customer-recover/:token/reset', (req, res) => {
  const rec = customers.consumeRecoveryToken(req.params.token);
  if (!rec) return res.status(404).json({ error: 'Invalid or expired token' });
  const cust = customers.getCustomerByEmail(rec.email);
  if (!cust) return res.status(404).json({ error: 'Customer not found' });
  const updated = customers.regenerateToken(cust.id);
  try { mailer.sendWelcome(updated.email, updated.token); } catch (e) {}
  res.json({ ok: true, token: updated.token });
});

// Customer code verification (public, will add rate-limiting)
app.post('/customer-access', (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: 'code required' });
  
  // In production: verify code from DB, check expiry, mark as used
  res.json({
    ok: true,
    message: 'Code accepted (demo). Customer can now access exam.',
    accessToken: 'customer-token-' + crypto.randomBytes(16).toString('hex'),
  });
});

// Public: Get all exams (for frontend dashboard - no auth)
app.get('/exams', (req, res) => {
  const exams = db.getAllExams();
  res.json({
    ok: true,
    exams,
  });
});

// Public: Get single exam (for taking exam - no auth)
app.get('/exams/:id', (req, res) => {
  const exam = db.getExamById(req.params.id);
  if (!exam) {
    return res.status(404).json({ error: 'Exam not found' });
  }
  res.json({ ok: true, exam });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`\n✓ Backend server running on http://localhost:${port}`);
  console.log(`\nProtected routes (require Bearer token):`);
  console.log(`  GET    /admin`);
  console.log(`  GET    /admin/exams`);
  console.log(`  GET    /admin/exams/:id`);
  console.log(`  POST   /admin/exams`);
  console.log(`  PUT    /admin/exams/:id`);
  console.log(`  DELETE /admin/exams/:id`);
  console.log(`  GET    /admin/stats`);
  console.log(`  POST   /admin/codes`);
  console.log(`  GET    /admin/customers`);
  console.log(`  POST   /admin/customers`);
  console.log(`  DELETE /admin/customers/:id`);
  console.log(`  POST   /admin/customers/:id/regenerate-token`);
  console.log(`\nPublic routes (no auth):`);
  console.log(`  GET    /health`);
  console.log(`  GET    /exams`);
  console.log(`  GET    /exams/:id`);
  console.log(`  POST   /customer-access`);
  console.log(`  POST   /customer-login`);
  console.log(`  POST   /customer-recover`);
  console.log(`  GET    /customer-recover/:token`);
  console.log(`  POST   /customer-recover/:token/reset`);
  console.log(`\nTo access protected routes, include header:`);
  console.log(`  Authorization: Bearer <your-admin-token>`);
  console.log(`\nExams stored in: ${path.join(__dirname, 'data', 'exams.json')}`);
  console.log('\n');
});
