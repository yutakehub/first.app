import { mkdir, copyFile, cp, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
for (const file of ['app.js', 'model.js']) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
await mkdir('dist', { recursive: true });
for (const file of ['index.html', 'style.css', 'app.js', 'model.js']) await copyFile(file, `dist/${file}`);
await cp('public', 'dist/public', { recursive: true });
// A single HTML file also runs when opened directly in a browser, without module imports.
let html = await readFile('index.html', 'utf8');
const css = (await readFile('style.css', 'utf8')).replace(/@import[^;]+;/g, '');
const model = (await readFile('model.js', 'utf8')).replace(/^export /gm, '');
let app = (await readFile('app.js', 'utf8')).replace(/^import[^;]+;\n/, '');
const image = Buffer.from(await readFile('public/memory.svg')).toString('base64');
app = app.replaceAll('/public/memory.svg', `data:image/svg+xml;base64,${image}`);
const hero = Buffer.from(await readFile('public/memoir-hero.png')).toString('base64');
app = app.replaceAll('/public/memoir-hero.png', `data:image/png;base64,${hero}`);
html = html.replace('<link rel="stylesheet" href="/style.css">', `<style>${css}</style>`);
html = html.replace('<script type="module" src="/app.js"></script>', `<script type="module">${model}\n${app}</script>`);
await writeFile('dist/tsuzuri.html', html);
await mkdir('docs', { recursive: true });
await writeFile('docs/index.html', html);
await writeFile('docs/.nojekyll', '');
console.log('Built static app into dist/');
