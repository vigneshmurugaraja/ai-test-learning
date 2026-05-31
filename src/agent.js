import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateQaAnalysis } from './qa-heuristics.js';
import { runApiChecks } from './api-checker.js';
import { renderReport } from './reporter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;

    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      index += 1;
    }
  }

  return args;
}

function usage() {
  return [
    'Usage:',
    '  npm run agent -- --feature "Login API" --url http://localhost:4317 --mode api',
    '',
    'Options:',
    '  --feature   Feature or product area under test',
    '  --url       Optional base URL for live API checks',
    '  --mode      api or plan-only. Defaults to plan-only unless --url is supplied',
    '  --out       Optional report path. Defaults to reports/qa-report.md'
  ].join('\n');
}

export async function runAgent(rawArgs = process.argv.slice(2)) {
  const args = parseArgs(rawArgs);

  if (args.help || args.h) {
    console.log(usage());
    return { reportPath: null, liveResults: [] };
  }

  const feature = args.feature || 'User login API with username, password, session, and validation errors';
  const mode = args.mode || (args.url ? 'api' : 'plan-only');
  const baseUrl = args.url;
  const outputPath = path.resolve(projectRoot, args.out || 'reports/qa-report.md');

  const analysis = generateQaAnalysis({ feature, baseUrl, mode });
  const liveResults = mode === 'api' && baseUrl ? await runApiChecks(baseUrl) : [];
  const report = renderReport({ analysis, liveResults });

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, report, 'utf8');

  console.log(`QA agent completed: ${outputPath}`);
  if (liveResults.length > 0) {
    const passed = liveResults.filter((result) => result.status === 'passed').length;
    console.log(`Live checks: ${passed}/${liveResults.length} passed`);
  }

  return { reportPath: outputPath, liveResults };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runAgent().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
