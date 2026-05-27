import { POST } from '@/app/api/brands/monitor/route';

describe('Brand Registration Flow (Smoke Test)', () => {
  it('creates a brand monitor job and returns dashboard links', async () => {
    const request = new Request('http://localhost/api/brands/monitor', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        brandName: 'Acme Corp',
        officialDomain: 'acme.com',
        primarySocialHandles: [
          { platform: 'x', handle: 'acmecorp', url: 'https://x.com/acmecorp' },
        ],
        scanMode: 'on_demand',
        scanFrequencyMinutes: 60,
      }),
    });

    const response = await POST(request as never);
    const payload = await response.json();

    expect(response.status).toBe(202);
    expect(payload.brand.brandName).toBe('Acme Corp');
    expect(payload.brand.officialDomain).toBe('acme.com');
    expect(payload.brand.status).toBe('active');
    expect(payload.scan.status).toBe('queued');
    expect(payload.scan.candidateLimit).toBeGreaterThan(0);
    expect(payload.dashboard.liveThreatsUrl).toContain('/dashboard/threats?brand=brand_');
    expect(payload.dashboard.brandDetailUrl).toContain('/dashboard/brands/brand_');
  });

  it('rejects malformed requests', async () => {
    const request = new Request('http://localhost/api/brands/monitor', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ brandName: '', officialDomain: 'acme.com', primarySocialHandles: [] }),
    });

    const response = await POST(request as never);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toMatch(/brandName/i);
  });
});
