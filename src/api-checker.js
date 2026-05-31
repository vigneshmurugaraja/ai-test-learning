const defaultChecks = [
  {
    name: 'Health endpoint is available',
    method: 'GET',
    path: '/health',
    expectedStatus: 200,
    validate: (body) => body.ok === true
  },
  {
    name: 'Valid login succeeds',
    method: 'POST',
    path: '/login',
    body: { username: 'qa@example.com', password: 'Password123!' },
    expectedStatus: 200,
    validate: (body) => body.ok === true && typeof body.token === 'string'
  },
  {
    name: 'Invalid login fails',
    method: 'POST',
    path: '/login',
    body: { username: 'qa@example.com', password: 'wrong' },
    expectedStatus: 401,
    validate: (body) => body.ok === false && body.error?.code === 'INVALID_CREDENTIALS'
  },
  {
    name: 'Missing password is rejected',
    method: 'POST',
    path: '/login',
    body: { username: 'qa@example.com' },
    expectedStatus: 400,
    validate: (body) => body.ok === false && body.error?.code === 'VALIDATION_ERROR'
  }
];

export async function runApiChecks(baseUrl, checks = defaultChecks) {
  const results = [];

  for (const check of checks) {
    const startedAt = performance.now();
    try {
      const response = await fetch(new URL(check.path, baseUrl), {
        method: check.method,
        headers: check.body ? { 'content-type': 'application/json' } : undefined,
        body: check.body ? JSON.stringify(check.body) : undefined
      });
      const contentType = response.headers.get('content-type') || '';
      const body = contentType.includes('application/json') ? await response.json() : await response.text();
      const hasExpectedStatus = response.status === check.expectedStatus;
      const hasExpectedBody = typeof check.validate === 'function' ? check.validate(body) : true;

      results.push({
        name: check.name,
        status: hasExpectedStatus && hasExpectedBody ? 'passed' : 'failed',
        method: check.method,
        path: check.path,
        expectedStatus: check.expectedStatus,
        actualStatus: response.status,
        durationMs: Math.round(performance.now() - startedAt),
        body
      });
    } catch (error) {
      results.push({
        name: check.name,
        status: 'failed',
        method: check.method,
        path: check.path,
        expectedStatus: check.expectedStatus,
        actualStatus: null,
        durationMs: Math.round(performance.now() - startedAt),
        error: error.message
      });
    }
  }

  return results;
}
