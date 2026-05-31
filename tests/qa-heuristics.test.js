import test from 'node:test';
import assert from 'node:assert/strict';
import { generateQaAnalysis } from '../src/qa-heuristics.js';

test('generates api scenarios and skeletons for login feature', () => {
  const analysis = generateQaAnalysis({
    feature: 'Login API',
    baseUrl: 'http://localhost:4317',
    mode: 'api'
  });

  assert.equal(analysis.mode, 'api');
  assert.ok(analysis.scenarios.length >= 4);
  assert.ok(analysis.edgeCases.includes('Empty strings and whitespace-only values'));
  assert.match(analysis.skeletons[0].code, /valid login returns success/);
});
