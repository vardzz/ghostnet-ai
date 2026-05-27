const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

async function main() {
  const samplePath = path.resolve(process.cwd(), 'docs/samples/sample-evidence.json');
  if (!fs.existsSync(samplePath)) {
    console.error('Sample evidence not found:', samplePath);
    process.exit(1);
  }

  const raw = fs.readFileSync(samplePath, 'utf-8');
  const sample = JSON.parse(raw);
  const target = sample.results && sample.results[0];
  if (!target || !target.url) {
    console.error('No target URL in sample evidence');
    process.exit(1);
  }

  const outDir = path.resolve(process.cwd(), 'docs/samples/evidence');
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`Fetching ${target.url} (fallback)...`);
  try {
    const res = await fetch(target.url, { redirect: 'follow' });
    const html = res.ok ? await res.text() : '';
    const id = uuidv4();
    const htmlPath = path.join(outDir, `${id}.html`);
    const pngPath = path.join(outDir, `${id}.png`);

    fs.writeFileSync(htmlPath, html || '');
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
    fs.writeFileSync(pngPath, Buffer.from(pngBase64, 'base64'));

    const evidence = {
      targetUrl: target.url,
      finalUrl: res.url || target.url,
      pageTitle: '',
      screenshotPath: pngPath,
      htmlSnapshotPath: htmlPath,
      visibleText: [],
      formSelectors: [],
      capturedAt: new Date().toISOString(),
      status: html ? 'captured' : 'fetch_failed'
    };

    const recordPath = path.join(outDir, `${id}.evidence.json`);
    fs.writeFileSync(recordPath, JSON.stringify(evidence, null, 2) + '\n');

    const dbPath = path.resolve(process.cwd(), 'docs/samples/db-records.json');
    let db = [];
    if (fs.existsSync(dbPath)) {
      db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    }
    db.push({ id, evidencePath: recordPath, storedAt: new Date().toISOString() });
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2) + '\n');

    console.log('Evidence written:', recordPath);
  } catch (err) {
    console.error('Capture failed:', err && err.message);
    process.exit(1);
  }
}

main();
