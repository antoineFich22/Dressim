/**
 * Tests for GET /api/status/:id
 * Covers: mock predictions lifecycle, 404, real mode fetch forwarding
 */

const request = require('supertest');

const TINY_PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6260000000020001e221bc330000000049454e44ae426082',
  'hex'
);

// ── Mock mode ─────────────────────────────────────────────────────────────────

describe('GET /api/status/:id — mock mode', () => {
  let app, predictions;

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    delete process.env.FASHN_API_KEY;
    process.env.MOCK_MODE = 'true';
    ({ app, predictions } = require('../app'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  async function createMockPrediction() {
    const res = await request(app)
      .post('/api/tryon')
      .attach('model_image', TINY_PNG, { filename: 'model.png', contentType: 'image/png' })
      .attach('garment_image', TINY_PNG, { filename: 'garment.png', contentType: 'image/png' });
    return res.body.id;
  }

  test('returns 404 for an unknown prediction id', async () => {
    const res = await request(app).get('/api/status/mock_does_not_exist');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  test('returns "starting" status immediately after creation', async () => {
    const id = await createMockPrediction();
    const res = await request(app).get(`/api/status/${id}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id, status: 'starting', output: null, error: null });
  });

  test('transitions to "processing" after ~1.2 s', async () => {
    const id = await createMockPrediction();
    jest.advanceTimersByTime(1300);
    const res = await request(app).get(`/api/status/${id}`);
    expect(res.body.status).toBe('processing');
  });

  test('transitions to "completed" with output after ~3.5 s', async () => {
    const id = await createMockPrediction();
    jest.advanceTimersByTime(4000);
    const res = await request(app).get(`/api/status/${id}`);
    expect(res.body.status).toBe('completed');
    expect(Array.isArray(res.body.output)).toBe(true);
    expect(res.body.output.length).toBe(1);
    expect(res.body.output[0]).toMatch(/^https?:\/\//);
  });

  test('output URL is one of the known mock results', async () => {
    const { MOCK_RESULTS } = require('../app');
    const id = await createMockPrediction();
    jest.advanceTimersByTime(4000);
    const res = await request(app).get(`/api/status/${id}`);
    expect(MOCK_RESULTS).toContain(res.body.output[0]);
  });

  test('prediction id is present in the status response', async () => {
    const id = await createMockPrediction();
    const res = await request(app).get(`/api/status/${id}`);
    expect(res.body.id).toBe(id);
  });
});

// ── Real mode ─────────────────────────────────────────────────────────────────

describe('GET /api/status/:id — real mode', () => {
  let app;
  const REAL_ID = 'fashn_real_456';

  beforeEach(() => {
    jest.resetModules();
    process.env.FASHN_API_KEY = 'test-key-xyz';
    process.env.MOCK_MODE = 'false';
    ({ app } = require('../app'));
  });

  afterEach(() => {
    delete global.fetch;
    delete process.env.FASHN_API_KEY;
  });

  test('proxies the Fashn.ai status response', async () => {
    const mockData = { id: REAL_ID, status: 'processing', output: null, error: null };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockData,
    });

    const res = await request(app).get(`/api/status/${REAL_ID}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject(mockData);
  });

  test('calls the correct Fashn.ai status URL', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: REAL_ID, status: 'completed', output: ['https://img.example.com/result.jpg'] }),
    });

    await request(app).get(`/api/status/${REAL_ID}`);
    const [url] = global.fetch.mock.calls[0];
    expect(url).toBe(`https://api.fashn.ai/v1/status/${REAL_ID}`);
  });

  test('forwards non-ok Fashn.ai status code', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    });

    const res = await request(app).get(`/api/status/${REAL_ID}`);
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  test('returns 500 when fetch throws', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('timeout'));
    const res = await request(app).get(`/api/status/${REAL_ID}`);
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error', 'Internal server error');
  });

  test('a mock_ id is served from in-memory store even in real mode', async () => {
    // Simulate a mock prediction manually inserted in the store
    const { predictions } = require('../app');
    const mockId = 'mock_manual_test';
    predictions.set(mockId, { id: mockId, status: 'completed', output: ['https://example.com/img.jpg'], error: null });

    const res = await request(app).get(`/api/status/${mockId}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
  });
});
