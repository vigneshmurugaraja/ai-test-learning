# First QA Agent

This is a small TypeScript first milestone for learning how agents can help QA work.

The agent does three things:

1. Takes a feature description.
2. Generates QA scenarios, edge cases, risks, and automated test skeletons.
3. Optionally runs live checks against a dummy local API and includes results in a report.

## Run the Real-Time Demo

From this folder:

```powershell
npm.cmd install
npm.cmd run demo
```

The demo starts a local dummy login API, runs the QA agent against it, then writes:

```text
reports/demo-login-api-report.md
```

## Run the API Manually

Terminal 1:

```powershell
npm.cmd run demo-api
```

Terminal 2:

```powershell
npm.cmd run agent -- --feature "Login API with username and password" --url http://localhost:4317 --mode api
```

## Run Unit Tests

```powershell
npm.cmd test
```

## Type Check

```powershell
npm.cmd run build
```

## What to Learn From This Version

This is a deliberately simple agent loop:

```text
Goal -> Generate QA thinking -> Act through live checks -> Observe responses -> Report
```

The next milestone is to add Playwright so the agent can inspect and interact with a real browser UI.

## Milestone 2: Playwright UI Agent

Install dependencies and the Chromium browser:

```powershell
npm.cmd install
npm.cmd run playwright:install
```

Run the SauceDemo UI agent:

```powershell
npm.cmd run agent:ui
```

The UI agent writes:

```text
reports/saucedemo-ui-agent-report.md
reports/screenshots/saucedemo-login-page.png
reports/screenshots/saucedemo-inventory-page.png
```

Run executable Playwright UI tests:

```powershell
npm.cmd run test:ui
```
