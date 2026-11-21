import test from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createApiApp } from '../../server';

async function withTestServer(
  rateLimitMax: number,
  fn: (baseUrl: string) => Promise<void>
) {
  const app = createApiApp({ rateLimitMax, rateLimitWindowMs: 60_000 });
  const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const addr = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  try {
    await fn(baseUrl);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

test('GET /api/health returns 200 OK with hardened security headers and hides x-powered-by', async () => {
  await withTestServer(20, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.equal(res.headers.get('x-powered-by'), null);
    const body = (await res.json()) as { ok: boolean; service: string };
    assert.equal(body.ok, true);
    assert.equal(body.service, 'mandimitra-api');
  });
});

test('GET /api/maps-config returns JSON apiKey field cleanly', async () => {
  await withTestServer(20, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/maps-config`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as { apiKey: unknown };
    assert.equal(typeof body.apiKey, 'string');
  });
});

test('POST AI endpoints enforce 400 validation errors on malformed or disallowed inputs', async () => {
  await withTestServer(20, async (baseUrl) => {
    const chatRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [] }),
    });
    assert.equal(chatRes.status, 400);

    const advisoryRes = await fetch(`${baseUrl}/api/advisory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '   ' }),
    });
    assert.equal(advisoryRes.status, 400);

    const ttsRes = await fetch(`${baseUrl}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '' }),
    });
    assert.equal(ttsRes.status, 400);

    const photoRes = await fetch(`${baseUrl}/api/grade-photo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: 'abc', mimeType: 'image/svg+xml' }),
    });
    assert.equal(photoRes.status, 400);

    const brokenJsonRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{invalid-json',
    });
    assert.equal(brokenJsonRes.status, 400);
    const errJson = (await brokenJsonRes.json()) as { error?: string };
    assert.match(errJson.error ?? '', /Invalid JSON/i);
  });
});

test('AI endpoints enforce per-IP rate limiting with 429 and Retry-After header', async () => {
  await withTestServer(2, async (baseUrl) => {
    // Two invalid requests count toward the sliding window without calling external Gemini API
    const r1 = await fetch(`${baseUrl}/api/advisory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '' }),
    });
    const r2 = await fetch(`${baseUrl}/api/advisory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '' }),
    });
    const r3 = await fetch(`${baseUrl}/api/advisory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '' }),
    });

    assert.equal(r1.status, 400);
    assert.equal(r2.status, 400);
    assert.equal(r3.status, 429);
    assert.ok(Number(r3.headers.get('retry-after')) >= 1);
  });
});
