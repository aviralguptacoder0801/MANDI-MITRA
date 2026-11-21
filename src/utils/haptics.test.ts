import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HAPTIC_PATTERNS,
  isVibrationSupported,
  prefersReducedMotion,
  stopHaptic,
  triggerHaptic,
  type NavigatorVibrateLike,
} from './haptics';

test('triggerHaptic dispatches exact subtle Vibration API patterns for tap, confirm, alert, and warning', () => {
  const calls: Array<number | number[]> = [];
  const mockNav: NavigatorVibrateLike = {
    vibrate(pattern) {
      calls.push(pattern);
      return true;
    },
  };

  assert.equal(isVibrationSupported(mockNav), true);
  assert.equal(triggerHaptic('tap', { nav: mockNav, matchMedia: null }), true);
  assert.equal(triggerHaptic('confirm', { nav: mockNav, matchMedia: null }), true);
  assert.equal(triggerHaptic('alert', { nav: mockNav, matchMedia: null }), true);
  assert.equal(triggerHaptic('warning', { nav: mockNav, matchMedia: null }), true);

  assert.deepEqual(calls, [
    HAPTIC_PATTERNS.tap,
    [...(HAPTIC_PATTERNS.confirm as readonly number[])],
    [...(HAPTIC_PATTERNS.alert as readonly number[])],
    [...(HAPTIC_PATTERNS.warning as readonly number[])],
  ]);
});

test('triggerHaptic gracefully no-ops when Vibration API is unsupported or throws', () => {
  assert.equal(isVibrationSupported(null), false);
  assert.equal(isVibrationSupported({}), false);
  assert.equal(triggerHaptic('tap', { nav: null, matchMedia: null }), false);
  assert.equal(triggerHaptic('confirm', { nav: {}, matchMedia: null }), false);

  const throwingNav: NavigatorVibrateLike = {
    vibrate() {
      throw new Error('Blocked before user gesture');
    },
  };
  assert.equal(triggerHaptic('tap', { nav: throwingNav, matchMedia: null }), false);
  assert.equal(stopHaptic(throwingNav), false);
});

test('triggerHaptic respects prefers-reduced-motion unless explicitly overridden', () => {
  let vibrateCount = 0;
  const mockNav: NavigatorVibrateLike = {
    vibrate() {
      vibrateCount += 1;
      return true;
    },
  };
  const reducedMatcher = (query: string) => ({
    matches: query === '(prefers-reduced-motion: reduce)',
  });

  assert.equal(prefersReducedMotion(reducedMatcher), true);
  assert.equal(triggerHaptic('tap', { nav: mockNav, matchMedia: reducedMatcher }), false);
  assert.equal(vibrateCount, 0);

  assert.equal(
    triggerHaptic('confirm', {
      nav: mockNav,
      matchMedia: reducedMatcher,
      ignoreReducedMotion: true,
    }),
    true
  );
  assert.equal(vibrateCount, 1);
});

test('stopHaptic cancels active vibration with vibrate(0)', () => {
  const calls: Array<number | number[]> = [];
  const mockNav: NavigatorVibrateLike = {
    vibrate(pattern) {
      calls.push(pattern);
      return true;
    },
  };

  assert.equal(stopHaptic(mockNav), true);
  assert.deepEqual(calls, [0]);
});
