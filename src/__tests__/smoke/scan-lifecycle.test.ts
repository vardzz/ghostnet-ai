import { capturePage } from '@/lib/brightdata/scraping-browser-client';
import { runGeminiAnalysis } from '@/lib/gemini/analysis-service';

jest.mock('playwright', () => {
  const html = `
    <html>
      <head><title>GhostNet AI Login</title></head>
      <body>
        <h1>GhostNet AI Login</h1>
        <form id="login-form"><input name="email" /><button type="submit">Continue</button></form>
      </body>
    </html>
  `;

  const page = {
    setDefaultNavigationTimeout: jest.fn(),
    goto: jest.fn().mockResolvedValue(undefined),
    url: jest.fn().mockReturnValue('http://ghostnet.test/login'),
    title: jest.fn().mockResolvedValue('GhostNet AI Login'),
    screenshot: jest.fn().mockResolvedValue(undefined),
    content: jest.fn().mockResolvedValue(html),
    $$eval: jest.fn((selector: string) => {
      if (selector === '*:not(script):not(style)') {
        return Promise.resolve(['GhostNet AI Login', 'Continue']);
      }

      if (selector === 'form, input, button, textarea, select') {
        return Promise.resolve([
          '<form id="login-form">',
          '<input name="email">',
          '<button type="submit">',
        ]);
      }

      return Promise.resolve([]);
    }),
  };

  const context = {
    newPage: jest.fn().mockResolvedValue(page),
  };

  const browser = {
    newContext: jest.fn().mockResolvedValue(context),
    close: jest.fn().mockResolvedValue(undefined),
  };

  return {
    chromium: {
      launch: jest.fn().mockResolvedValue(browser),
    },
  };
}, { virtual: true });

describe('Scan Lifecycle (Smoke Test)', () => {
  it('captures evidence from a page and falls back to review when Gemini is unavailable', async () => {
    const originalApiKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    try {
      const capture = await capturePage({
        url: 'https://ghostnet.test/login',
        outputDir: 'docs/samples/evidence-tests',
      });

      expect(capture.status).toBe('captured');
      expect(capture.pageTitle).toBe('GhostNet AI Login');
      expect(capture.visibleText.join(' ')).toContain('GhostNet AI Login');
      expect(capture.formSelectors.join(' ')).toContain('<form id="login-form">');

      const analysis = await runGeminiAnalysis({
        collectionId: 'scan-lifecycle-smoke',
        collectedAt: capture.capturedAt,
        items: [
          {
            label: 'Captured page title',
            content: `Title: ${capture.pageTitle}\nURL: ${capture.finalUrl}`,
          },
        ],
      });

      expect(analysis.analysisState).toBe('needs_review');
      expect(analysis.reason).toMatch(/GEMINI_API_KEY|timed out|Gemini API error/i);
    } finally {
      if (originalApiKey === undefined) {
        delete process.env.GEMINI_API_KEY;
      } else {
        process.env.GEMINI_API_KEY = originalApiKey;
      }
    }
  });
});
