import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser, type Locator, type Page } from '@playwright/test';
import type { TestSkeleton, UiAgentReport, UiCheckResult, UiElementSummary } from './types.js';

interface UiAgentArgs {
  url?: string;
  goal?: string;
  headless?: string;
  out?: string;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const defaultUrl = 'https://www.saucedemo.com/';

function parseArgs(argv: string[]): UiAgentArgs {
  const args: UiAgentArgs = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;

    const key = token.slice(2) as keyof UiAgentArgs;
    const value = argv[index + 1];
    if (value && !value.startsWith('--')) {
      args[key] = value;
      index += 1;
    }
  }
  return args;
}

export async function runUiAgent(rawArgs: string[] = process.argv.slice(2)): Promise<UiAgentReport> {
  const args = parseArgs(rawArgs);
  const targetUrl = args.url || defaultUrl;
  const goal = args.goal || 'Explore SauceDemo login and inventory behavior';
  const outputPath = path.resolve(projectRoot, args.out || 'reports/saucedemo-ui-agent-report.md');
  const screenshotDir = path.resolve(projectRoot, 'reports/screenshots');
  const headless = args.headless !== 'false';

  await mkdir(path.dirname(outputPath), { recursive: true });
  await mkdir(screenshotDir, { recursive: true });

  const browser = await chromium.launch({ headless });
  try {
    const report = await exploreSauceDemo({ browser, targetUrl, goal, screenshotDir });
    await writeFile(outputPath, renderUiAgentReport(report), 'utf8');

    const passed = report.checks.filter((check) => check.status === 'passed').length;
    console.log(`UI agent completed: ${outputPath}`);
    console.log(`UI checks: ${passed}/${report.checks.length} passed`);
    return report;
  } finally {
    await browser.close();
  }
}

async function exploreSauceDemo({
  browser,
  targetUrl,
  goal,
  screenshotDir
}: {
  browser: Browser;
  targetUrl: string;
  goal: string;
  screenshotDir: string;
}): Promise<UiAgentReport> {
  const checks: UiCheckResult[] = [];
  const screenshots: string[] = [];
  const page = await browser.newPage();

  await page.goto(targetUrl);
  await page.waitForLoadState('domcontentloaded');

  const loginScreenshot = path.join(screenshotDir, 'saucedemo-login-page.png');
  await page.screenshot({ path: loginScreenshot, fullPage: true });
  screenshots.push(loginScreenshot);

  const title = await page.title();
  const elements = await summarizeElements(page);

  checks.push(await checkVisible(page.getByPlaceholder('Username'), 'Username field is visible'));
  checks.push(await checkVisible(page.getByPlaceholder('Password'), 'Password field is visible'));
  checks.push(await checkVisible(page.locator('[data-test="login-button"]'), 'Login button is visible'));

  await page.locator('[data-test="username"]').fill('standard_user');
  await page.locator('[data-test="password"]').fill('wrong_password');
  await page.locator('[data-test="login-button"]').click();
  const errorText = await page.locator('[data-test="error"]').textContent().catch(() => null);
  checks.push({
    name: 'Invalid login shows an error',
    status: errorText?.toLowerCase().includes('username and password') ? 'passed' : 'failed',
    detail: errorText || 'No error message was shown.'
  });

  await page.locator('[data-test="username"]').fill('standard_user');
  await page.locator('[data-test="password"]').fill('secret_sauce');
  await page.locator('[data-test="login-button"]').click();
  await page.waitForURL(/inventory\.html/, { timeout: 10_000 }).catch(() => undefined);

  const inventoryReached = page.url().includes('inventory.html');
  checks.push({
    name: 'Valid login reaches inventory page',
    status: inventoryReached ? 'passed' : 'failed',
    detail: `Current URL: ${page.url()}`
  });

  if (inventoryReached) {
    const inventoryScreenshot = path.join(screenshotDir, 'saucedemo-inventory-page.png');
    await page.screenshot({ path: inventoryScreenshot, fullPage: true });
    screenshots.push(inventoryScreenshot);
    const productCount = await page.locator('[data-test="inventory-item"]').count();
    checks.push({
      name: 'Inventory contains products',
      status: productCount > 0 ? 'passed' : 'failed',
      detail: `Product cards found: ${productCount}`
    });
  }

  return {
    goal,
    targetUrl,
    finalUrl: page.url(),
    title,
    elements,
    checks,
    screenshots,
    suggestedTests: buildSuggestedTests(targetUrl),
    risks: [
      'Tests should prefer data-test attributes when available because they are stable automation hooks.',
      'A passing login check should assert both navigation and meaningful inventory content.',
      'Negative login assertions should avoid depending on fragile full-message text.'
    ]
  };
}

async function summarizeElements(page: Page): Promise<UiElementSummary[]> {
  const inputs = await summarizeLocator(page.locator('input'), 'input');
  const buttons = await summarizeLocator(page.locator('button, input[type="submit"]'), 'button');
  const links = await summarizeLocator(page.locator('a'), 'link');
  return [...inputs, ...buttons, ...links];
}

async function summarizeLocator(locator: Locator, role: UiElementSummary['role']): Promise<UiElementSummary[]> {
  const count = Math.min(await locator.count(), 12);
  const summaries: UiElementSummary[] = [];

  for (let index = 0; index < count; index += 1) {
    const item = locator.nth(index);
    const [visible, placeholder, text, testId, id, name, type] = await Promise.all([
      item.isVisible().catch(() => false),
      item.getAttribute('placeholder').catch(() => null),
      item.textContent().catch(() => null),
      item.getAttribute('data-test').catch(() => null),
      item.getAttribute('id').catch(() => null),
      item.getAttribute('name').catch(() => null),
      item.getAttribute('type').catch(() => null)
    ]);

    const label = cleanLabel(placeholder || text || testId || id || name || type || `${role}-${index + 1}`);
    const selectorHint = testId ? `[data-test="${testId}"]` : id ? `#${id}` : name ? `[name="${name}"]` : role;

    summaries.push({ role, label, selectorHint, visible });
  }

  return summaries;
}

async function checkVisible(locator: Locator, name: string): Promise<UiCheckResult> {
  const visible = await locator.isVisible().catch(() => false);
  return {
    name,
    status: visible ? 'passed' : 'failed',
    detail: visible ? 'Element was visible.' : 'Element was not visible.'
  };
}

function buildSuggestedTests(baseUrl: string): TestSkeleton[] {
  return [
    {
      name: 'login page loads',
      code: `test('login page loads', async ({ page }) => {
  await page.goto('${baseUrl}');
  await expect(page.locator('[data-test="username"]')).toBeVisible();
  await expect(page.locator('[data-test="password"]')).toBeVisible();
  await expect(page.locator('[data-test="login-button"]')).toBeVisible();
});`
    },
    {
      name: 'invalid login shows error',
      code: `test('invalid login shows error', async ({ page }) => {
  await page.goto('${baseUrl}');
  await page.locator('[data-test="username"]').fill('standard_user');
  await page.locator('[data-test="password"]').fill('wrong_password');
  await page.locator('[data-test="login-button"]').click();
  await expect(page.locator('[data-test="error"]')).toBeVisible();
});`
    },
    {
      name: 'valid login reaches inventory',
      code: `test('valid login reaches inventory', async ({ page }) => {
  await page.goto('${baseUrl}');
  await page.locator('[data-test="username"]').fill('standard_user');
  await page.locator('[data-test="password"]').fill('secret_sauce');
  await page.locator('[data-test="login-button"]').click();
  await expect(page).toHaveURL(/inventory\\.html/);
  await expect(page.locator('[data-test="inventory-item"]')).not.toHaveCount(0);
});`
    }
  ];
}

function renderUiAgentReport(report: UiAgentReport): string {
  const lines: string[] = [];
  lines.push('# SauceDemo UI Agent Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Goal: ${report.goal}`);
  lines.push(`Target URL: ${report.targetUrl}`);
  lines.push(`Final URL: ${report.finalUrl}`);
  lines.push(`Title: ${report.title}`);
  lines.push('');

  lines.push('## Observed Elements');
  for (const element of report.elements) {
    lines.push(`- ${element.role}: ${element.label} (${element.selectorHint}) - ${element.visible ? 'visible' : 'hidden'}`);
  }
  lines.push('');

  lines.push('## UI Checks');
  lines.push('');
  lines.push('| Check | Result | Detail |');
  lines.push('| --- | --- | --- |');
  for (const check of report.checks) {
    lines.push(`| ${escapeCell(check.name)} | ${check.status.toUpperCase()} | ${escapeCell(check.detail)} |`);
  }
  lines.push('');

  lines.push('## Screenshots');
  for (const screenshot of report.screenshots) {
    lines.push(`- ${screenshot}`);
  }
  lines.push('');

  lines.push('## Suggested Playwright Tests');
  for (const skeleton of report.suggestedTests) {
    lines.push('');
    lines.push(`### ${skeleton.name}`);
    lines.push('');
    lines.push('```ts');
    lines.push(skeleton.code);
    lines.push('```');
  }
  lines.push('');

  lines.push('## Risks');
  for (const risk of report.risks) {
    lines.push(`- ${risk}`);
  }
  lines.push('');

  return lines.join('\n');
}

function cleanLabel(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function escapeCell(value: string): string {
  return value.replaceAll('|', '\\|');
}

function isDirectRun(): boolean {
  return process.argv[1] ? fileURLToPath(import.meta.url) === path.resolve(process.argv[1]) : false;
}

if (isDirectRun()) {
  runUiAgent().catch((error: unknown) => {
    const message = error instanceof Error ? error.stack || error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
