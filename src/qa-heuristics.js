const loginSignals = ['login', 'password', 'username', 'email', 'session', 'auth'];
const apiSignals = ['api', 'endpoint', 'json', 'token', 'status', 'http'];

function containsAny(text, words) {
  const normalized = text.toLowerCase();
  return words.some((word) => normalized.includes(word));
}

export function generateQaAnalysis({ feature, baseUrl, mode }) {
  const isLoginLike = containsAny(feature, loginSignals);
  const isApiLike = mode === 'api' || containsAny(feature, apiSignals);

  const scenarios = [
    {
      title: 'Happy path',
      objective: isLoginLike
        ? 'Verify a valid user can authenticate and receive a success response.'
        : 'Verify the primary user flow succeeds with valid input.'
    },
    {
      title: 'Required field validation',
      objective: 'Verify missing required data returns a clear validation failure.'
    },
    {
      title: 'Invalid input handling',
      objective: isLoginLike
        ? 'Verify invalid credentials are rejected without exposing sensitive details.'
        : 'Verify malformed or invalid input is rejected predictably.'
    },
    {
      title: 'Contract consistency',
      objective: isApiLike
        ? 'Verify response status codes, JSON shape, and content type remain stable.'
        : 'Verify visible labels, states, and messages match expected behavior.'
    }
  ];

  const edgeCases = [
    'Empty strings and whitespace-only values',
    'Very long input values',
    'Case sensitivity where relevant',
    'Repeated requests in quick succession',
    'Unexpected HTTP methods or unsupported routes'
  ];

  const risks = [
    'False positives if tests assert only status codes and not response body semantics',
    'Brittle checks if tests depend on exact wording instead of stable contracts',
    'Missing negative coverage around authorization and validation boundaries'
  ];

  const skeletons = isApiLike
    ? buildApiSkeletons(baseUrl || 'http://localhost:4317')
    : buildPlaywrightSkeletons(baseUrl || 'https://example.com');

  return {
    feature,
    mode,
    baseUrl,
    scenarios,
    edgeCases,
    risks,
    skeletons
  };
}

function buildApiSkeletons(baseUrl) {
  return [
    {
      name: 'valid login returns success',
      code: `test('valid login returns success', async () => {
  const response = await fetch('${baseUrl}/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'qa@example.com', password: 'Password123!' })
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.ok(body.token);
});`
    },
    {
      name: 'invalid login returns unauthorized',
      code: `test('invalid login returns unauthorized', async () => {
  const response = await fetch('${baseUrl}/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'qa@example.com', password: 'wrong' })
  });

  assert.equal(response.status, 401);
  const body = await response.json();
  assert.equal(body.ok, false);
});`
    },
    {
      name: 'missing password returns validation error',
      code: `test('missing password returns validation error', async () => {
  const response = await fetch('${baseUrl}/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'qa@example.com' })
  });

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.error.code, 'VALIDATION_ERROR');
});`
    }
  ];
}

function buildPlaywrightSkeletons(baseUrl) {
  return [
    {
      name: 'page loads and exposes primary action',
      code: `test('page loads and exposes primary action', async ({ page }) => {
  await page.goto('${baseUrl}');
  await expect(page).toHaveTitle(/.+/);
  await expect(page.getByRole('button').first()).toBeVisible();
});`
    }
  ];
}
