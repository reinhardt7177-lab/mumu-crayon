'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');
const files = require('./site-files.cjs');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
fs.mkdirSync(output, {recursive: true});
const entries = [];
for (const file of files) {
  const source = path.join(root, file);
  const destination = path.join(output, file);
  fs.mkdirSync(path.dirname(destination), {recursive: true});
  fs.copyFileSync(source, destination);
  const data = fs.readFileSync(destination);
  entries.push({path: file, bytes: data.length, sha256: crypto.createHash('sha256').update(data).digest('hex')});
}
fs.writeFileSync(path.join(output, '.nojekyll'), '');
const revision = spawnSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'});
const commit = revision.status === 0 ? revision.stdout.trim() : null;
fs.writeFileSync(path.join(output, 'release.json'), JSON.stringify({name: 'Mumu Crayon', version: '1.0.0', commit, files: entries}, null, 2) + '\n');
console.log(JSON.stringify({output: 'dist', files: entries.length + 2, bytes: entries.reduce((n, f) => n + f.bytes, 0), commit}));
