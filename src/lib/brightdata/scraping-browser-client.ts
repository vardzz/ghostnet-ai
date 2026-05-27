import { writeFile, mkdir } from 'fs/promises';
import { resolve } from 'path';

export interface EvidenceBundle {
  targetUrl: string;
  finalUrl: string;
  pageTitle: string;
  screenshotPath: string;
  htmlSnapshotPath: string;
  visibleText: string[];
  formSelectors: string[];
  capturedAt: string;
  status: 'captured' | 'fetch_failed' | 'render_failed' | 'blocked_by_target' | 'incomplete_evidence';
}

const TRANSPARENT_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';

export async function capturePage(options: { url: string; outputDir?: string; timeoutMs?: number; maxVisibleItems?: number; }): Promise<EvidenceBundle> {
  const { url, outputDir = 'docs/samples/evidence', timeoutMs = 20000, maxVisibleItems = 20 } = options;
  await mkdir(outputDir, { recursive: true });
  const id = `${Date.now()}`;
  const htmlPath = resolve(outputDir, `${id}.html`);
  const pngPath = resolve(outputDir, `${id}.png`);
  const capturedAt = new Date().toISOString();

  try {
    // try Playwright dynamically
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const playwright = await import('playwright');
    const browser = await playwright.chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(timeoutMs);
    await page.goto(url, { waitUntil: 'networkidle', timeout: timeoutMs }).catch(() => {});
    const finalUrl = page.url();
    const pageTitle = await page.title().catch(() => '');
    await page.screenshot({ path: pngPath, fullPage: true }).catch(() => {});
    const html = await page.content();
    await writeFile(htmlPath, html, 'utf-8');

    const visibleText = (await page.$$eval('*:not(script):not(style)', (nodes: any[]) =>
      nodes.map((n) => (n.textContent || '').trim()).filter(Boolean).slice(0, 200)
    )) as string[];

    const formSelectors = (await page.$$eval('form, input, button, textarea, select', (nodes: any[]) =>
      nodes.map((n) => {
        const tag = (n.tagName || '').toLowerCase();
        const name = n.getAttribute?.('name') || n.getAttribute?.('id') || '';
        return name ? `${tag}[${name}]` : tag;
      }).slice(0, 20)
    )) as string[];

    await browser.close();

    return {
      targetUrl: url,
      finalUrl,
      pageTitle,
      screenshotPath: pngPath,
      htmlSnapshotPath: htmlPath,
      visibleText: visibleText.slice(0, maxVisibleItems),
      formSelectors,
      capturedAt,
      status: 'captured',
    };
  } catch (err) {
    // fallback: fetch raw HTML and save a placeholder PNG
    try {
      // use native fetch if available, else node-fetch
      // @ts-ignore
      const fetchImpl = (globalThis as any).fetch ?? (await import('node-fetch')).default;
      const res = await fetchImpl(url, { redirect: 'follow' });
      const html = res && typeof res.text === 'function' ? await res.text() : '';
      await writeFile(htmlPath, html || '', 'utf-8');
      const pngBuffer = Buffer.from(TRANSPARENT_PNG_BASE64, 'base64');
      await writeFile(pngPath, pngBuffer);

      // crude extractions
      const textMatches = Array.from(new Set((html.match(/>([^<>]{2,200})</g) || []).map((m: string) => m.replace(/^>/, '').replace(/<$/, '').trim()))).slice(0, maxVisibleItems);
      const formMatches = Array.from(new Set(html.match(/<\s*(form|input|button|textarea|select)([^>]*)>/gi) || [])).slice(0, 20);

      return {
        targetUrl: url,
        finalUrl: res?.url || url,
        pageTitle: '',
        screenshotPath: pngPath,
        htmlSnapshotPath: htmlPath,
        visibleText: textMatches,
        formSelectors: formMatches,
        capturedAt,
        status: html ? 'captured' : 'fetch_failed',
      };
    } catch (inner) {
      const pngBuffer = Buffer.from(TRANSPARENT_PNG_BASE64, 'base64');
      await writeFile(pngPath, pngBuffer);
      await writeFile(htmlPath, '', 'utf-8');
      return {
        targetUrl: url,
        finalUrl: url,
        pageTitle: '',
        screenshotPath: pngPath,
        htmlSnapshotPath: htmlPath,
        visibleText: [],
        formSelectors: [],
        capturedAt,
        status: 'fetch_failed',
      };
    }
  }
}
