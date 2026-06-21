/**
 * Tests for POST /api/tryon
 * Covers: validation, mock mode, real mode (fetch mocked), file size limits
 */

const request = require('supertest');
const path = require('path');

// ── Fixtures ──────────────────────────────────────────────────────────────────

// Minimal valid 1×1 PNG (67 bytes)
const TINY_PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6260000000020001e221bc330000000049454e44ae426082',
  'hex'
);

// ── Helpers ───────────────────────────────────────────────────────────────────

function attachImages(req) {
  return req
    .attach('model_image', TINY_PNG, { filename: 'model.png', contentType: 'image/png' })
    .attach('garment_image', TINY_PNG, { filename: 'garment.png', contentType: 'image/png' });
}

// ── Mock mode (default — no FASHN_API_KEY) ────────────────────────────────────

describe('POST /api/tryon — mock mode', () => {
  let app;

  beforeEach(() => {
    jest.resetModules();
    delete process.env.FASHN_API_KEY;
    process.env.MOCK_MODE = 'true';
    ({ app } = require('../app'));
  });

  test('returns 200 with a prediction id when both images are provided', async () => {
    const res = await attachImages(request(app).post('/api/tryon'));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(typeof res.body.id).toBe('string');
  });

  test('prediction id starts with "mock_"', async () => {
    const res = await attachImages(request(app).post('/api/tryon'));
    expect(res.body.id).toMatch(/^mock_/);
  });

  test('returns 400 when model_image is missing', async () => {
    const res = await request(app)
      .post('/api/tryon')
      .attach('garment_image', TINY_PNG, { filename: 'garment.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toMatch(/model_image/i);
  });

  test('returns 400 when garment_image is missing', async () => {
    const res = await request(app)
      .post('/api/tryon')
      .attach('model_image', TINY_PNG, { filename: 'model.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toMatch(/garment_image/i);
  });

  test('returns 400 when no files are provided', async () => {
    const res = await request(app).post('/api/tryon');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('each call generates a unique id', async () => {
    const [r1, r2] = await Promise.all([
      attachImages(request(app).post('/api/tryon')),
      attachImages(request(app).post('/api/tryon')),
    ]);
    expect(r1.body.id).not.toBe(r2.body.id);
  });

  test('rejects a file larger than 10 MB', async () => {
    const bigBuffer = Buffer.alloc(11 * 1024 * 1024); // 11 MB
    const res = await request(app)
      .post('/api/tryon')
      .attach('model_image', bigBuffer, { filename: 'big.png', contentType: 'image/png' })
      .attach('garment_image', TINY_PNG, { filename: 'garment.png', contentType: 'image/png' });
    // multer emits a 500 by default for limit errors; the important thing is it is NOT 200
    expect(res.status).not.toBe(200);
  });
});

// ── Real mode (fetch stubbed) ─────────────────────────────────────────────────

describe('POST /api/tryon — real mode', () => {
  let app;
  const FAKE_ID = 'fashn_abc123';

  beforeEach(() => {
    jest.resetModules();
    process.env.FASHN_API_KEY = 'test-key-xyz';
    process.env.MOCK_MODE = 'false';

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: FAKE_ID }),
    });

    ({ app } = require('../app'));
  });

  afterEach(() => {
    delete global.fetch;
    delete process.env.FASHN_API_KEY;
  });

  test('calls Fashn.ai /v1/run and returns the prediction id', async () => {
    const res = await attachImages(request(app).post('/api/tryon'));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: FAKE_ID });
  });

  test('sends Authorization header with the API key', async () => {
    await attachImages(request(app).post('/api/tryon'));
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('https://api.fashn.ai/v1/run');
    expect(options.headers['Authorization']).toBe('Bearer test-key-xyz');
  });

  test('sends model_image and product_image as base64 data URIs', async () => {
    await attachImages(request(app).post('/api/tryon'));
    const [, options] = global.fetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.inputs.model_image).toMatch(/^data:image\/png;base64,/);
    expect(body.inputs.product_image).toMatch(/^data:image\/png;base64,/);
  });

  test('forwards non-ok Fashn.ai status to the client', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ message: 'Invalid image' }),
    });

    const res = await attachImages(request(app).post('/api/tryon'));
    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('error', 'Invalid image');
  });

  test('returns 500 when fetch throws a network error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network failure'));

    const res = await attachImages(request(app).post('/api/tryon'));
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error', 'Internal server error');
  });

  test('uses model_name "tryon-max" in the payload', async () => {
    await attachImages(request(app).post('/api/tryon'));
    const [, options] = global.fetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.model_name).toBe('tryon-max');
  });
});
