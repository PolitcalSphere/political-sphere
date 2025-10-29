import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn, spawnSync } from 'node:child_process';
import https from 'https';
import { setTimeout as delay } from 'node:timers/promises';

// Polyfill fetch for Node.js versions that don't have it
const fetch =
  global.fetch ||
  ((url, options) => {
    return new Promise((resolve, reject) => {
      const req = https.request(url, options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve({
              status: res.statusCode,
              json: () => Promise.resolve(json),
              text: () => Promise.resolve(data),
            });
          } catch {
            resolve({
              status: res.statusCode,
              json: () => Promise.resolve({}),
              text: () => Promise.resolve(data),
            });
          }
        });
      });
      req.on('error', reject);
      if (options.body) {
        req.write(options.body);
      }
      req.end();
    });
  });

const dockerAvailable = (() => {
  try {
    const result = spawnSync('docker', ['info'], { stdio: 'ignore' });
    return result.status === 0;
  } catch {
    return false;
  }
})();

const runIntegration = process.env.RUN_API_INTEGRATION === 'true';

if (!runIntegration) {
  test.skip(
    'API integration tests skipped. Set RUN_API_INTEGRATION=true to enable.',
    () => {}
  );
} else if (!dockerAvailable) {
  test.skip(
    'API integration tests skipped because Docker is not available.',
    () => {}
  );
} else {
  let apiProcess;

  const waitForServer = async (url, maxAttempts = 15, intervalMs = 1000) => {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        const response = await fetch(url);
        if (response.status < 500) {
          return true;
        }
      } catch {
        // Ignored: server is not ready yet
      }
      await delay(intervalMs);
    }
    return false;
  };

  before(async () => {
    apiProcess = spawn('npm', ['run', 'dev:api'], {
      cwd: process.cwd(),
      stdio: 'inherit',
    });

    const ready = await waitForServer('http://localhost:4000/health');
    if (!ready) {
      apiProcess.kill('SIGTERM');
      throw new Error('API dev server did not become ready in time.');
    }
  });

  after(() => {
    if (apiProcess) {
      apiProcess.kill('SIGTERM');
    }
  });

  test('should respond to health check', async () => {
    const response = await fetch('http://localhost:4000/health');
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.status, 'ok');
  });

  test('should handle user authentication', async () => {
    // Test login endpoint with seeded user
    const response = await fetch('http://localhost:4000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'demo@politicalsphere.com',
        password: 'demo123',
      }),
    });

    assert.equal(response.status, 200);
    const data = await response.json();
    assert(data.token, 'Should return auth token');
  });

  test('should access protected endpoints with token', async () => {
    // First login
    const loginResponse = await fetch('http://localhost:4000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'demo@politicalsphere.com',
        password: 'demo123',
      }),
    });
    const { token } = await loginResponse.json();

    // Then access protected endpoint
    const protectedResponse = await fetch(
      'http://localhost:4000/api/protected',
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    assert.equal(protectedResponse.status, 200);
  });
}
