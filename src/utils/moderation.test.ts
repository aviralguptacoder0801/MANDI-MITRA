import test from 'node:test';
import assert from 'node:assert/strict';
import { applyModerationAction, getModerationQueue, screenContent } from './moderation';
import { INITIAL_FORUM_POSTS } from '../data/upMandis';

test('screenContent allows constructive farming discussions', () => {
  const res = screenContent(
    'Today Dubagga mandi gave ₹1,650/qtl for dry Kufri Bahar potato. Keep moisture below 14%.'
  );
  assert.equal(res.clean, true);
  assert.equal(res.severity, 'none');
});

test('screenContent blocks advance-fee UPI scams and OTP requests', () => {
  const scam = screenContent('Send ₹500 advance UPI now and share OTP for guaranteed double profit!');
  assert.equal(scam.clean, false);
  assert.equal(scam.severity, 'blocked');
  assert.ok(scam.reasons.length >= 2);
});

test('screenContent blocks abusive language', () => {
  const abusive = screenContent('You are an idiot trader selling bad seeds.');
  assert.equal(abusive.clean, false);
  assert.equal(abusive.severity, 'blocked');
});

test('moderation actions report, approve, hide, pin, and lock posts immutably', () => {
  const initialQueue = getModerationQueue(INITIAL_FORUM_POSTS);
  assert.equal(initialQueue.length, 1, 'Seed spam post should start in moderation queue');

  // Report post-102
  const reported = applyModerationAction(INITIAL_FORUM_POSTS, {
    type: 'report_post',
    postId: 'post-102',
    reason: 'Off-topic',
  });
  assert.equal(getModerationQueue(reported).length, 2);

  // Approve post-102 clears report
  const approved = applyModerationAction(reported, {
    type: 'approve_post',
    postId: 'post-102',
  });
  assert.equal(getModerationQueue(approved).length, 1);

  // Hide scam post-104
  const hidden = applyModerationAction(approved, {
    type: 'hide_post',
    postId: 'post-104',
  });
  assert.equal(hidden.find((p) => p.id === 'post-104')?.hidden, true);

  // Toggle lock on post-101
  const locked = applyModerationAction(hidden, {
    type: 'toggle_lock',
    postId: 'post-101',
  });
  assert.equal(locked.find((p) => p.id === 'post-101')?.locked, true);
});
