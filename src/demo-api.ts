import http from 'node:http';

const port = Number(process.env.PORT || 4317);
const validUser = {
  username: 'qa@example.com',
  password: 'Password123!'
};

function sendJson(response: http.ServerResponse, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  response.end(JSON.stringify(payload, null, 2));
}

async function readJson(request: http.IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const rawBody = Buffer.concat(chunks).toString('utf8');
  return rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : {};
}

export function createDemoApiServer(): http.Server {
  return http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url || '/', `http://${request.headers.host}`);

      if (request.method === 'GET' && url.pathname === '/health') {
        sendJson(response, 200, { ok: true, service: 'dummy-login-api' });
        return;
      }

      if (request.method === 'POST' && url.pathname === '/login') {
        const body = await readJson(request);
        if (!body.username || !body.password) {
          sendJson(response, 400, {
            ok: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Username and password are required.'
            }
          });
          return;
        }

        if (body.username === validUser.username && body.password === validUser.password) {
          sendJson(response, 200, {
            ok: true,
            token: 'demo-token-for-local-learning',
            user: { id: 'user-1', username: validUser.username }
          });
          return;
        }

        sendJson(response, 401, {
          ok: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid username or password.'
          }
        });
        return;
      }

      sendJson(response, 404, {
        ok: false,
        error: { code: 'NOT_FOUND', message: 'Route not found.' }
      });
    } catch (error: unknown) {
      sendJson(response, 500, {
        ok: false,
        error: { code: 'SERVER_ERROR', message: error instanceof Error ? error.message : String(error) }
      });
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const server = createDemoApiServer();
  server.listen(port, () => {
    console.log(`Dummy test API listening on http://localhost:${port}`);
    console.log('Try GET /health or POST /login');
  });
}
