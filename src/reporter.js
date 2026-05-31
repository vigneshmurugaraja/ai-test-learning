export function renderReport({ analysis, liveResults }) {
  const lines = [];
  const generatedAt = new Date().toISOString();

  lines.push(`# QA Agent Report`);
  lines.push('');
  lines.push(`Generated: ${generatedAt}`);
  lines.push(`Feature: ${analysis.feature}`);
  lines.push(`Mode: ${analysis.mode}`);
  if (analysis.baseUrl) lines.push(`Target: ${analysis.baseUrl}`);
  lines.push('');

  lines.push(`## Test Scenarios`);
  for (const scenario of analysis.scenarios) {
    lines.push(`- **${scenario.title}:** ${scenario.objective}`);
  }
  lines.push('');

  lines.push(`## Edge Cases`);
  for (const edgeCase of analysis.edgeCases) {
    lines.push(`- ${edgeCase}`);
  }
  lines.push('');

  lines.push(`## Risks`);
  for (const risk of analysis.risks) {
    lines.push(`- ${risk}`);
  }
  lines.push('');

  if (liveResults.length > 0) {
    lines.push(`## Live API Check Results`);
    lines.push('');
    lines.push(`| Check | Result | Method | Path | Expected | Actual | Duration |`);
    lines.push(`| --- | --- | --- | --- | ---: | ---: | ---: |`);
    for (const result of liveResults) {
      lines.push(
        `| ${escapeCell(result.name)} | ${result.status.toUpperCase()} | ${result.method} | ${result.path} | ${result.expectedStatus} | ${result.actualStatus ?? 'n/a'} | ${result.durationMs}ms |`
      );
    }
    lines.push('');

    const failures = liveResults.filter((result) => result.status === 'failed');
    if (failures.length > 0) {
      lines.push(`### Failure Details`);
      for (const failure of failures) {
        lines.push(`- ${failure.name}: ${failure.error || JSON.stringify(failure.body)}`);
      }
      lines.push('');
    }
  }

  lines.push(`## Suggested Automated Test Skeletons`);
  for (const skeleton of analysis.skeletons) {
    lines.push('');
    lines.push(`### ${skeleton.name}`);
    lines.push('');
    lines.push('```js');
    lines.push(skeleton.code);
    lines.push('```');
  }
  lines.push('');

  lines.push(`## Next QA Improvements`);
  lines.push(`- Add environment-specific test data setup and cleanup.`);
  lines.push(`- Promote stable generated skeletons into committed automated tests.`);
  lines.push(`- Add browser exploration with Playwright for UI flows once the API workflow feels comfortable.`);
  lines.push('');

  return lines.join('\n');
}

function escapeCell(value) {
  return String(value).replaceAll('|', '\\|');
}
