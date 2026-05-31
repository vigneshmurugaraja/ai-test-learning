import { runAgent } from './agent.js';
import { createDemoApiServer } from './demo-api.js';

const port = 4317;
const baseUrl = `http://localhost:${port}`;
const server = createDemoApiServer();

server.listen(port, async () => {
  try {
    await runAgent([
      '--feature',
      'Login API with username, password, validation errors, and session token',
      '--url',
      baseUrl,
      '--mode',
      'api',
      '--out',
      'reports/demo-login-api-report.md'
    ]);
  } finally {
    server.close();
  }
});
