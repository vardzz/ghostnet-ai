import { POST } from '@/app/api/takedown/generate/route';

describe('Report Generation Gating (Smoke Test)', () => {
  it('returns 404 when the threat does not exist in the store', async () => {
    const request = new Request('http://localhost/api/takedown/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        threatId: 'threat_nonexistent',
        brandId: 'brand_123',
        jurisdiction: 'US',
        legalEntityName: 'Acme Corp',
        contactEmail: 'legal@acme.com',
        includeCeaseAndDesist: true,
      }),
    });

    const response = await POST(request as never);
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.error).toMatch(/threat not found/i);
  });

  it('rejects requests with missing required fields', async () => {
    const request = new Request('http://localhost/api/takedown/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await POST(request as never);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toMatch(/threatId/i);
  });
});
