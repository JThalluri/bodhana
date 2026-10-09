/**
 * build-standalone.mjs
 *
 * Assembles workbench-standalone.html — a single self-contained file with all
 * JS inlined, so it opens from file:// without a local server.
 *
 * Usage: node tools/constructs-workbench/build-standalone.mjs
 *
 * Re-run whenever any of the source files below change.
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const root  = join(__dir, '../..');

function read(relToRoot) {
  return readFileSync(join(root, relToRoot), 'utf8');
}

/**
 * Remove ES module import/export syntax so the code can run in a plain script.
 * - Strips all `import { ... } from '...'` statements (single-line and multi-line).
 * - Strips the `export` keyword before function/class/const declarations.
 * - Strips bare `export { ... }` re-export lines.
 */
function stripModuleSyntax(code) {
  const lines = code.split('\n');
  const out   = [];
  let inImport = false;

  for (const line of lines) {
    // Still inside a multi-line import block
    if (inImport) {
      if (/from\s+['"]/.test(line)) inImport = false; // last line of multi-line import
      continue; // skip the line regardless
    }

    const trimmed = line.trimStart();

    // Start of an import statement
    if (trimmed.startsWith('import ')) {
      if (/from\s+['"]/.test(line)) continue; // single-line import — skip
      inImport = true;                          // multi-line import — begin skip
      continue;
    }

    // Bare re-export: `export { foo, bar }` or `export { foo } from '...'`
    if (/^export\s+\{/.test(trimmed)) continue;

    // Strip `export` keyword before a declaration
    const stripped = line.replace(/^(export\s+default\s+|export\s+)/, '');
    out.push(stripped);
  }

  return out.join('\n');
}

// ── Collect JS sources ────────────────────────────────────────────────────────

const jsyaml      = read('tools/constructs-workbench/vendor/js-yaml.min.js');
const compileCore = stripModuleSyntax(read('scripts/constructs-compile-core.mjs'));
const validate    = stripModuleSyntax(read('scripts/constructs-validate.mjs'));
const vowelSounds = stripModuleSyntax(read('src/phonics/core/vowelSounds.mjs'));
const tokenizeJs  = stripModuleSyntax(read('src/phonics/core/tokenize.mjs'));
const coreJs      = stripModuleSyntax(read('tools/constructs-workbench/workbench-core.mjs'));
const appJs       = stripModuleSyntax(read('tools/constructs-workbench/app.js'));

// ── Build the inline script block ────────────────────────────────────────────

const inlineScript = [
  '// ── constructs-compile-core.mjs ──────────────────────────────────────────',
  compileCore,
  '// ── constructs-validate.mjs ──────────────────────────────────────────────',
  validate,
  '// ── src/phonics/core/vowelSounds.mjs ─────────────────────────────────────',
  vowelSounds,
  '// ── src/phonics/core/tokenize.mjs ───────────────────────────────────────',
  tokenizeJs,
  '// ── tools/constructs-workbench/workbench-core.mjs ────────────────────────',
  coreJs,
  '// ── tools/constructs-workbench/app.js ────────────────────────────────────',
  appJs,
].join('\n\n');

// ── Patch index.html ─────────────────────────────────────────────────────────

const template = read('tools/constructs-workbench/index.html');

// Replace the two script tags at the bottom with inlined versions.
// Use a function replacement (not a string) so that $` and $' sequences inside
// the minified jsyaml UMD are not interpreted as special replacement patterns.
const replacement =
  `  <!-- All JS inlined for file:// compatibility -->\n` +
  `  <script>\n${jsyaml}\n  </script>\n` +
  `  <script type="module">\n${inlineScript}\n  </script>`;
const patched = template.replace(
  /[ \t]*<!-- Vendor YAML parser[^]*?<\/script>\n[ \t]*<!-- App logic[^]*?<\/script>/,
  () => replacement
);

if (patched === template) {
  console.error('ERROR: replacement anchor not found in index.html — update the regex in build-standalone.mjs');
  process.exit(1);
}

// ── Write output ──────────────────────────────────────────────────────────────

const outPath = join(__dir, 'workbench-standalone.html');
writeFileSync(outPath, patched);

const kb = Math.round(Buffer.byteLength(patched) / 1024);
console.log(`✓  Built tools/constructs-workbench/workbench-standalone.html  (${kb} KB)`);
console.log('   Open directly from file:// — no server required.');
