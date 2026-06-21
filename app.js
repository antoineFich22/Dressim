require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();

const MOCK_MODE = process.env.MOCK_MODE === 'true' || !process.env.FASHN_API_KEY;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const PREDICTION_TTL_MS = 15 * 60 * 1000; // 15 minutes

// ── Security middleware ───────────────────────────────────────────────────────

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'", "'unsafe-inline'", "'unsafe-eval'",
        "https://static.sketchfab.com",
        "https://cdn.jsdelivr.net",
        "https://www.googletagmanager.com",
        "https://fonts.googleapis.com",
      ],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
      mediaSrc: ["'self'", "blob:"],
      connectSrc: [
        "'self'",
        "https://cdn.jsdelivr.net",
        "https://tfhub.dev",
        "https://storage.googleapis.com",
        "https://api.fashn.ai",
      ],
      frameSrc: ["'self'", "https://sketchfab.com", "https://*.sketchfab.com"],
      workerSrc: ["'self'", "blob:"],
      objectSrc: ["'none'"],
    },
  },
}));
app.use(cors({ origin: ALLOWED_ORIGINS, methods: ['GET', 'POST'] }));

const tryonLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Trop de requêtes, réessayez dans une minute.' },
});

// ── Multer ────────────────────────────────────────────────────────────────────

const fileFilter = (_req, file, cb) => {
  if (!ALLOWED_MIMES.includes(file.mimetype)) {
    return cb(new Error(`Type de fichier non supporté: ${file.mimetype}`), false);
  }
  cb(null, true);
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter,
});

// ── Static & body ─────────────────────────────────────────────────────────────

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ── In-memory store with TTL ──────────────────────────────────────────────────

const predictions = new Map();

function setPrediction(id, data) {
  predictions.set(id, data);
  setTimeout(() => predictions.delete(id), PREDICTION_TTL_MS);
}

// ── Mock helpers ──────────────────────────────────────────────────────────────

const MOCK_RESULTS = [
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80',
  'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&q=80',
  'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600&q=80',
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=80',
];

function mockPrediction(id) {
  setPrediction(id, { id, status: 'starting', output: null, error: null });

  setTimeout(() => {
    const p = predictions.get(id);
    if (p) p.status = 'processing';
  }, 1200);

  setTimeout(() => {
    const p = predictions.get(id);
    if (p) {
      p.status = 'completed';
      p.output = [MOCK_RESULTS[Math.floor(Math.random() * MOCK_RESULTS.length)]];
    }
  }, 3500);
}

// ── Fetch with timeout ────────────────────────────────────────────────────────

async function fetchWithTimeout(url, options, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

app.post(
  '/api/tryon',
  tryonLimiter,
  upload.fields([
    { name: 'model_image', maxCount: 1 },
    { name: 'garment_image', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const modelFile = req.files?.model_image?.[0];
      const garmentFile = req.files?.garment_image?.[0];

      if (!modelFile || !garmentFile) {
        return res.status(400).json({ error: 'Both model_image and garment_image are required.' });
      }

      if (MOCK_MODE) {
        const id = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        mockPrediction(id);
        return res.json({ id });
      }

      const toBase64 = (buf, mime) => `data:${mime};base64,${buf.toString('base64')}`;

      const payload = {
        model_name: 'tryon-max',
        inputs: {
          model_image: toBase64(modelFile.buffer, modelFile.mimetype),
          product_image: toBase64(garmentFile.buffer, garmentFile.mimetype),
        },
      };

      const runRes = await fetchWithTimeout('https://api.fashn.ai/v1/run', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.FASHN_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!runRes.ok) {
        const err = await runRes.json().catch(() => ({}));
        return res.status(runRes.status).json({ error: err.message || 'Fashn.ai error' });
      }

      const { id } = await runRes.json();
      setPrediction(id, { id, status: 'starting', output: null, error: null });
      return res.json({ id });

    } catch (err) {
      if (err.name === 'AbortError') {
        return res.status(504).json({ error: 'Fashn.ai request timed out' });
      }
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

app.get('/api/status/:id', async (req, res) => {
  const { id } = req.params;

  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) {
    return res.status(400).json({ error: 'Invalid prediction ID' });
  }

  if (MOCK_MODE || id.startsWith('mock_')) {
    const p = predictions.get(id);
    if (!p) return res.status(404).json({ error: 'Prediction not found' });
    return res.json(p);
  }

  try {
    const statusRes = await fetchWithTimeout(`https://api.fashn.ai/v1/status/${id}`, {
      headers: { Authorization: `Bearer ${process.env.FASHN_API_KEY}` },
    });

    if (!statusRes.ok) return res.status(statusRes.status).json({ error: 'Status check failed' });

    const data = await statusRes.json();
    setPrediction(id, data);
    return res.json(data);
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Status check timed out' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Contact / Demo request ────────────────────────────────────────────────────

const contactLimiter = rateLimit({ windowMs: 60 * 1000, max: 5, message: { error: 'Trop de requêtes.' } });

app.post('/api/contact', contactLimiter, async (req, res) => {
  const { prenom, nom, email, boutique, site, plateforme, message } = req.body || {};

  if (!prenom || !nom || !email || !boutique) {
    return res.status(400).json({ error: 'Champs requis manquants.' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Email invalide.' });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const TO_EMAIL = process.env.CONTACT_EMAIL || 'dressim.app@gmail.com';

  if (!RESEND_API_KEY) {
    console.log(`[CONTACT] ${prenom} ${nom} <${email}> — ${boutique}`);
    return res.json({ ok: true });
  }

  try {
    const { Resend } = require('resend');
    const resend = new Resend(RESEND_API_KEY);

    await resend.emails.send({
      from: 'Dressim <onboarding@resend.dev>',
      to: TO_EMAIL,
      reply_to: email,
      subject: `🎯 Nouvelle demande de démo — ${boutique}`,
      html: `
        <h2>Nouvelle demande de démo Dressim</h2>
        <table style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:14px">
          <tr><td style="padding:8px;color:#6b7280;width:140px">Prénom</td><td style="padding:8px;font-weight:600">${prenom}</td></tr>
          <tr><td style="padding:8px;color:#6b7280">Nom</td><td style="padding:8px;font-weight:600">${nom}</td></tr>
          <tr><td style="padding:8px;color:#6b7280">Email</td><td style="padding:8px"><a href="mailto:${email}">${email}</a></td></tr>
          <tr><td style="padding:8px;color:#6b7280">Boutique</td><td style="padding:8px;font-weight:600">${boutique}</td></tr>
          ${site ? `<tr><td style="padding:8px;color:#6b7280">Site</td><td style="padding:8px"><a href="${site}">${site}</a></td></tr>` : ''}
          ${plateforme ? `<tr><td style="padding:8px;color:#6b7280">Plateforme</td><td style="padding:8px">${plateforme}</td></tr>` : ''}
          ${message ? `<tr><td style="padding:8px;color:#6b7280">Message</td><td style="padding:8px">${message}</td></tr>` : ''}
        </table>
        <p style="margin-top:24px;color:#6b7280;font-size:12px">Envoyé depuis dressim.fr</p>
      `,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('[CONTACT]', err);
    res.status(500).json({ error: 'Erreur envoi email.' });
  }
});

module.exports = { app, predictions, MOCK_MODE, mockPrediction, MOCK_RESULTS };
