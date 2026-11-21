import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRateLimiter,
  isSafeHttpUrl,
  MAX_CHAT_MESSAGES,
  MAX_QUERY_CHARS,
  sanitizeGroundingMode,
  sanitizeLanguage,
  sanitizeLatLng,
  validateAdvisoryPayload,
  validateChatPayload,
  validateGradePhotoPayload,
  validateLiveIntelPayload,
  validateTranscribePayload,
  validateTtsPayload,
} from './apiValidation';

test('isSafeHttpUrl allows http/https and rejects javascript, data, file, and malformed URIs', () => {
  assert.equal(isSafeHttpUrl('https://agmarknet.gov.in/PriceAndArrivals/DatewiseCommodityReport.aspx'), true);
  assert.equal(isSafeHttpUrl('http://maps.google.com/?cid=123'), true);
  assert.equal(isSafeHttpUrl('javascript:alert(1)'), false);
  assert.equal(isSafeHttpUrl('DATA:text/html,<script>alert(1)</script>'), false);
  assert.equal(isSafeHttpUrl('file:///etc/passwd'), false);
  assert.equal(isSafeHttpUrl('not-a-url'), false);
  assert.equal(isSafeHttpUrl(''), false);
  assert.equal(isSafeHttpUrl(null), false);
});

test('sanitize helpers normalize invalid languages, grounding modes, and out-of-range coordinates', () => {
  assert.equal(sanitizeLanguage('awadhi'), 'awadhi');
  assert.equal(sanitizeLanguage('bhojpuri'), 'bhojpuri');
  assert.equal(sanitizeLanguage('fr'), 'hi');
  assert.equal(sanitizeGroundingMode('maps'), 'maps');
  assert.equal(sanitizeGroundingMode('invalid'), 'auto');

  const validCoords = sanitizeLatLng({ latitude: 26.9, longitude: 81.2 });
  assert.deepEqual(validCoords, { latitude: 26.9, longitude: 81.2 });

  const outOfRange = sanitizeLatLng({ latitude: 199, longitude: 81.2 });
  assert.deepEqual(outOfRange, { latitude: 26.8467, longitude: 80.9462 });

  const nanCoords = sanitizeLatLng({ latitude: Number.NaN, longitude: 80 });
  assert.deepEqual(nanCoords, { latitude: 26.8467, longitude: 80.9462 });
});

test('validateChatPayload accepts valid multi-turn chat and rejects empty, malformed, or oversized payloads', () => {
  const ok = validateChatPayload({
    messages: [
      { role: 'assistant', text: 'नमस्ते' },
      { role: 'user', text: 'आलू का भाव क्या है?' },
    ],
    language: 'hi',
    localeContext: { languageName: 'हिंदी', assistantTitle: 'मंडीमित्र AI' },
    groundingMode: 'search',
  });
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.data.messages.length, 2);
    assert.equal(ok.data.localeContext.languageName, 'हिंदी');
    assert.equal(ok.data.groundingMode, 'search');
  }

  assert.equal(validateChatPayload(null).ok, false);
  assert.equal(validateChatPayload({ messages: [] }).ok, false);
  assert.equal(validateChatPayload({ messages: [{ role: 'system', text: 'hack' }] }).ok, false);

  const tooMany = Array.from({ length: MAX_CHAT_MESSAGES + 1 }, () => ({
    role: 'user',
    text: 'hi',
  }));
  assert.equal(validateChatPayload({ messages: tooMany }).ok, false);
});

test('validateAdvisoryPayload enforces non-empty query and max length', () => {
  const ok = validateAdvisoryPayload({ query: '  आज आलू बेचें या रुकें?  ', language: 'bhojpuri' });
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.data.query, 'आज आलू बेचें या रुकें?');
    assert.equal(ok.data.language, 'bhojpuri');
  }

  assert.equal(validateAdvisoryPayload({ query: '   ' }).ok, false);
  assert.equal(validateAdvisoryPayload({ query: 'a'.repeat(MAX_QUERY_CHARS + 1) }).ok, false);
});

test('validateTtsPayload, validateTranscribePayload, validateGradePhotoPayload, and validateLiveIntelPayload enforce rules', () => {
  assert.equal(validateTtsPayload({ text: '' }).ok, false);
  const ttsOk = validateTtsPayload({ text: 'नमस्ते किसान भाई', language: 'hi' });
  assert.equal(ttsOk.ok, true);

  assert.equal(validateTranscribePayload({ audioBase64: '' }).ok, false);
  const transOk = validateTranscribePayload({ audioBase64: 'AAAA', mimeType: 'audio/webm;codecs=opus' });
  assert.equal(transOk.ok, true);
  if (transOk.ok) {
    assert.equal(transOk.data.mimeType, 'audio/webm');
  }

  assert.equal(
    validateGradePhotoPayload({ imageBase64: 'AAAA', mimeType: 'image/svg+xml' }).ok,
    false
  );
  const photoOk = validateGradePhotoPayload({
    imageBase64: 'AAAA',
    mimeType: 'image/jpg',
    cropName: 'Wheat',
  });
  assert.equal(photoOk.ok, true);
  if (photoOk.ok) {
    assert.equal(photoOk.data.mimeType, 'image/jpeg');
  }

  const intelOk = validateLiveIntelPayload({ mode: 'maps', districtName: 'Agra', language: 'en' });
  assert.equal(intelOk.ok, true);
  if (intelOk.ok) {
    assert.equal(intelOk.data.mode, 'maps');
    assert.equal(intelOk.data.districtName, 'Agra');
  }
});

test('createRateLimiter enforces sliding window limit and recovers after window elapses', () => {
  const limiter = createRateLimiter({ windowMs: 10_000, maxRequests: 2 });
  const t0 = 1_000_000;

  assert.equal(limiter.check('127.0.0.1', t0).allowed, true);
  assert.equal(limiter.check('127.0.0.1', t0 + 1000).allowed, true);

  const blocked = limiter.check('127.0.0.1', t0 + 2000);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds >= 8);

  // Different IP is unaffected
  assert.equal(limiter.check('10.0.0.2', t0 + 2000).allowed, true);

  // After window expires, original IP is allowed again
  assert.equal(limiter.check('127.0.0.1', t0 + 10_500).allowed, true);
});
