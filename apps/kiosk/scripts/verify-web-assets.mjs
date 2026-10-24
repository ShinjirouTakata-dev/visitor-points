import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../web/', import.meta.url));
const required = ['index.html', 'styles.css', 'app.js', 'platform-bridge.js'];
const missing = required.filter((file) => !existsSync(resolve(root, file)));
if (missing.length) {
  console.error(`Web assets are missing: ${missing.join(', ')}`);
  process.exit(1);
}
console.log(`Web assets verified: ${root}`);
