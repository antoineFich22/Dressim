/**
 * Tests for GET /api/mode
 * Covers: mock flag reported correctly in both modes
 */

const request = require('supertest');

describe('GET /api/mode', () => {
  afterEach(() => {
    delete process.env.FASHN_API_KEY;
    delete process.env.MOCK_MODE;
    jest.resetModules();
  });

  test('reports mock: true when MOCK_MODE=true', async () => {
    process.env.MOCK_MODE = 'true';
    delete process.env.FASHN_API_KEY;
    const { app } = require('../app');
    const res = await request(app).get('/api/mode');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ mock: true });
  });

  test('reports mock: true when no FASHN_API_KEY is set', async () => {
    delete process.env.FASHN_API_KEY;
    process.env.MOCK_MODE = 'false'; // explicit false but no key → still mock
    const { app } = require('../app');
    const res = await request(app).get('/api/mode');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ mock: true });
  });

  test('reports mock: false when FASHN_API_KEY is set and MOCK_MODE is not true', async () => {
    process.env.FASHN_API_KEY = 'real-key-abc';
    process.env.MOCK_MODE = 'false';
    const { app } = require('../app');
    const res = await request(app).get('/api/mode');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ mock: false });
  });

  test('response Content-Type is application/json', async () => {
    process.env.MOCK_MODE = 'true';
    const { app } = require('../app');
    const res = await request(app).get('/api/mode');
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });
});
