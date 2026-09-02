import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from './app';

describe('Backend API Health & Route Integrity', () => {
  it('GET /api/v1/health returns HEALTHY status', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('HEALTHY');
    expect(res.body.service).toBe('FBCPOS Cloud Backend');
  });

  it('POST /api/v1/auth/login with missing body returns 401/400 validation error', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({});
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body.success).toBe(false);
  });
});
