// Simple file-based persistent storage for exams
// In production: replace with a real database (MongoDB, PostgreSQL, etc.)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const EXAMS_FILE = path.join(DATA_DIR, 'exams.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadExams() {
  try {
    if (fs.existsSync(EXAMS_FILE)) {
      const data = fs.readFileSync(EXAMS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading exams:', err);
  }
  return [];
}

function saveExams(exams) {
  try {
    fs.writeFileSync(EXAMS_FILE, JSON.stringify(exams, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving exams:', err);
    return false;
  }
}

function getAllExams() {
  return loadExams();
}

function getExamById(id) {
  const exams = loadExams();
  return exams.find(e => e.id === id) || null;
}

function createExam(exam) {
  const exams = loadExams();
  const newExam = {
    ...exam,
    id: exam.id || `exam-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  exams.push(newExam);
  saveExams(exams);
  return newExam;
}

function updateExam(id, updates) {
  const exams = loadExams();
  const index = exams.findIndex(e => e.id === id);
  if (index === -1) return null;
  
  exams[index] = {
    ...exams[index],
    ...updates,
    id, // don't allow id change
    updatedAt: new Date().toISOString(),
  };
  saveExams(exams);
  return exams[index];
}

function deleteExam(id) {
  const exams = loadExams();
  const filtered = exams.filter(e => e.id !== id);
  if (filtered.length === exams.length) return false; // not found
  saveExams(filtered);
  return true;
}

export default {
  getAllExams,
  getExamById,
  createExam,
  updateExam,
  deleteExam,
};
