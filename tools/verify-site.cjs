'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const files = require('./site-files.cjs');
const root = path.resolve(__dirname, '..', 'dist');
const allowed = new Set([...files, '.nojekyll', 'release.json']);
function walk(directory) {
  return fs.readdirSync(directory, {withFileTypes: true}).flatMap(entry => {
    const child = path.join(directory, entry.name);
    assert.ok(!entry.isSymbolicLink(), 'Deployment must not contain links.');
    return entry.isDirectory() ? walk(child) : [path.relative(root, child).split(path.sep).join('/')];
  });
}
assert.deepEqual(walk(root).sort(), [...allowed].sort(), 'Deployment must contain only the approved runtime files.');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'release.json'), 'utf8'));
assert.deepEqual(manifest.files.map(f => f.path), files);
for (const file of manifest.files) {
  const data = fs.readFileSync(path.join(root, file.path));
  assert.equal(data.length, file.bytes);
  assert.equal(crypto.createHash('sha256').update(data).digest('hex'), file.sha256);
}
function resolveLocal(reference, from) {
  if (/^(?:data:|#)/.test(reference)) return;
  assert.ok(!/^(?:https?:|\/|file:)/i.test(reference), 'Runtime assets must work under a GitHub Pages project path: ' + reference);
  const target = path.posix.normalize(path.posix.join(path.posix.dirname(from), reference));
  assert.ok(allowed.has(target), 'Missing runtime asset: ' + target);
}
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const match of html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/g)) resolveLocal(match[1], 'index.html');
for (const css of files.filter(f => f.endsWith('.css'))) {
  for (const match of fs.readFileSync(path.join(root, css), 'utf8').matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g)) resolveLocal(match[1], css);
}
const sandbox = {console};
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const source of ['vendor/matter.min.js', 'src/campaign-levels.js', 'src/campaign-examples.js', 'src/core.js', 'src/canvas-input.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, source), 'utf8'), sandbox, {filename: source});
}
assert.equal(sandbox.window.MUMU_LEVELS.length, 100);
assert.equal(sandbox.window.MUMU_CHAPTERS.length, 10);
assert.equal(sandbox.window.MUMU_EXAMPLES.length, 100);
assert.equal(typeof sandbox.window.MumuCanvasInput.bind, 'function');
for (const example of sandbox.window.MUMU_EXAMPLES) assert.ok(example && example.actions.length, 'Every stage needs a playable example.');
const art = fs.readFileSync(path.join(root, 'src/mumu-art.js'), 'utf8');
assert.ok(art.includes("paper.src='assets/mumu/paper-garden-v1.png'"));
for (const file of files.filter(f => /\.(?:js|css|html)$/.test(f))) {
  assert.ok(!/assets\/original|127\.0\.0\.1|localhost|[A-Z]:\\Users\\/.test(fs.readFileSync(path.join(root, file), 'utf8')), 'Local-only or research dependency: ' + file);
}
console.log(JSON.stringify({valid: true, files: allowed.size, stages: 100, examples: 100, projectSubpathCompatible: true}));
