import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGeminiAttemptPlan,
  isRetryableGeminiError,
  normalizeChatForGemini,
  shouldCooldownAttempt,
} from './chatHistory';

test('normalizeChatForGemini strips initial assistant greeting and extracts latest user turn', () => {
  const res = normalizeChatForGemini([
    { role: 'assistant', text: 'Namaste! How can I help?' },
    { role: 'user', text: 'Why is Dubagga Mandi #1?' },
  ]);

  assert.equal(res.latestUserMessage, 'Why is Dubagga Mandi #1?');
  assert.deepEqual(res.history, []);
});

test('normalizeChatForGemini merges consecutive user turns from earlier failed attempts and ends history on model', () => {
  const res = normalizeChatForGemini([
    { role: 'assistant', text: 'Namaste!' },
    { role: 'user', text: 'First question' },
    { role: 'assistant', text: 'First answer' },
    { role: 'user', text: 'Failed previous question' },
    { role: 'user', text: 'Retry question' },
  ]);

  assert.equal(res.latestUserMessage, 'Retry question');
  assert.equal(res.history.length, 2);
  assert.equal(res.history[0].role, 'user');
  assert.equal(res.history[0].parts[0].text, 'First question');
  assert.equal(res.history[1].role, 'model');
  assert.equal(res.history[1].parts[0].text, 'First answer');
});

test('normalizeChatForGemini merges consecutive messages inside mid-conversation history', () => {
  const res = normalizeChatForGemini([
    { role: 'user', text: 'Part 1' },
    { role: 'user', text: 'Part 2' },
    { role: 'assistant', text: 'Combined reply' },
    { role: 'user', text: 'Follow up' },
  ]);

  assert.equal(res.latestUserMessage, 'Follow up');
  assert.equal(res.history.length, 2);
  assert.equal(res.history[0].parts[0].text, 'Part 1\nPart 2');
  assert.equal(res.history[1].role, 'model');
});

test('buildGeminiAttemptPlan tries grounded primary and flash-lite models before ungrounded fallback', () => {
  const plan = buildGeminiAttemptPlan('search');
  assert.deepEqual(plan, [
    { model: 'gemini-4-hydrogen', tool: 'search' },
    { model: 'gemini-3.1-flash-lite', tool: 'search' },
    { model: 'gemini-4-hydrogen', tool: 'none' },
    { model: 'gemini-3.1-flash-lite', tool: 'none' },
  ]);

  const plainPlan = buildGeminiAttemptPlan('none');
  assert.deepEqual(plainPlan, [
    { model: 'gemini-4-hydrogen', tool: 'none' },
    { model: 'gemini-3.1-flash-lite', tool: 'none' },
  ]);
});

test('isRetryableGeminiError retries quota/server/tool/timeout errors but does not retry auth errors', () => {
  assert.equal(isRetryableGeminiError(new Error('429 RESOURCE_EXHAUSTED')), true);
  assert.equal(isRetryableGeminiError(new Error('503 UNAVAILABLE')), true);
  assert.equal(isRetryableGeminiError(new Error('400 INVALID_ARGUMENT')), true);
  assert.equal(isRetryableGeminiError(new Error('ATTEMPT_TIMEOUT after 5500ms')), true);
  assert.equal(isRetryableGeminiError(new Error('403 PERMISSION_DENIED')), false);
  assert.equal(isRetryableGeminiError(new Error('GEMINI_API_KEY is not configured')), false);
});

test('shouldCooldownAttempt flags 429 quota and timeout failures for cooldown', () => {
  assert.equal(shouldCooldownAttempt(new Error('429 RESOURCE_EXHAUSTED')), true);
  assert.equal(shouldCooldownAttempt(new Error('ATTEMPT_TIMEOUT after 5500ms')), true);
  assert.equal(shouldCooldownAttempt(new Error('503 UNAVAILABLE')), false);
});
