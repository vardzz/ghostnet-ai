import { POST } from '@/app/api/takedown/generate/route';

describe('Report Generation Gating (Smoke Test)', () => {
  it('queues a report job for a threat id', async () => {
    const request = new Request('http://localhost/api/takedown/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ threatId: 'threat_123' }),
    });

    const response = await POST(request as never);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.jobId).toMatch(/^job_/);
    expect(payload.message).toContain('threat_123');
  });

  it('rejects empty generation requests', async () => {
    const request = new Request('http://localhost/api/takedown/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await POST(request as never);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toMatch(/threatId or context/i);
  });
});
