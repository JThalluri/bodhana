#!/usr/bin/env node
/**
 * build-constructs.mjs
 *
 * CLI wrapper: reads constructs/phonics-constructs.yaml, validates it against
 * the fixture corpus, compiles to the JSON shape, and writes to
 * src/phonics/generated/phonics-constructs.json.
 *
 * Contains NO transform or validation logic — delegates to:
 *   scripts/constructs-compile-core.mjs  (pure transform)
 *   scripts/constructs-validate.mjs      (pure validation)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { load as yamlLoad } from 'js-yaml';

import { compileConstructs } from './constructs-compile-core.mjs';
import { validateAll, ValidationError } from './constructs-validate.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const yamlPath    = join(root, 'constructs', 'phonics-constructs.yaml');
const fixturePath = join(root, 'constructs', 'fixtures', 'phonics-regression-fixtures.v2.yaml');
const outDir      = join(root, 'src', 'phonics', 'generated');
const outPath     = join(outDir, 'phonics-constructs.json');

const EXPECTED_SCHEMA_VERSION = '1.0.0';

// ---- Read ----
const yamlText = readFileSync(yamlPath, 'utf8');
const raw = yamlLoad(yamlText);

const fixtureText = readFileSync(fixturePath, 'utf8');
const fixtures = yamlLoad(fixtureText);

// ---- Compute source hash ----
const sourceHash = 'sha256:' + createHash('sha256').update(yamlText).digest('hex');

// ---- Compile ----
let compiled;
try {
  compiled = compileConstructs(raw, {
    sourceHash,
    generatedAt: new Date().toISOString(),
  });
} catch (err) {
  console.error('[build-constructs] Compile failed:', err.message);
  process.exit(1);
}

// ---- Validate ----
try {
  validateAll(compiled, fixtures);
} catch (err) {
  if (err instanceof ValidationError) {
    console.error('[build-constructs] Validation failed:\n' + err.message);
  } else {
    console.error('[build-constructs] Unexpected error during validation:', err);
  }
  // Never write partial output on failure
  process.exit(1);
}

// ---- Write ----
mkdirSync(outDir, { recursive: true });

// Stable JSON output: sorted top-level keys, 2-space indent
const output = JSON.stringify(compiled, stableReplacer(), 2);
writeFileSync(outPath, output, 'utf8');

console.log(`[build-constructs] wrote ${outPath} (${output.length} bytes, hash=${sourceHash.slice(0,18)}...)`);

/**
 * JSON.stringify replacer that sorts object keys alphabetically.
 * Arrays are left in declaration order (YAML order preserved).
 * This guarantees byte-identical output for the same YAML input.
 */
function stableReplacer() {
  return function (key, value) {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      return Object.fromEntries(
        Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
      );
    }
    return value;
  };
}
