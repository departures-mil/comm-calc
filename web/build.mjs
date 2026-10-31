// Arayüz için Firebase AI paketini tek dosyaya derler: src/vendor/firebase-ai.js
import { build } from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await build({ entryPoints: [path.join(ROOT, 'web/firebase-entry.js')], bundle: true, minify: true, format: 'iife', target: 'chrome120', outfile: path.join(ROOT, 'src/vendor/firebase-ai.js'), logLevel: 'info' });
