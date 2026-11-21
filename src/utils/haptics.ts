/**
 * Field-calibrated Vibration API helper for MandiMitra.
 *
 * Provides subtle tactile confirmation on mobile devices when farmers tap
 * primary actions (e.g., Check Profit, Join Pool, Save Alert) in bright,
 * noisy mandi and field environments.
 *
 * - Gracefully no-ops on browsers/devices without `navigator.vibrate`.
 * - Automatically respects the user's `prefers-reduced-motion: reduce` setting.
 * - Never throws if the browser blocks vibration prior to user gesture.
 */

export type HapticPatternName = 'tap' | 'confirm' | 'alert' | 'warning';

export const HAPTIC_PATTERNS: Record<HapticPatternName, number | readonly number[]> = {
  /** Brief, crisp 18ms pulse for primary navigation cards, crop switches, and tab buttons */
  tap: 18,
  /** Distinct double-pulse confirmation for state-changing commits (Join Pool, Save Alert, Send) */
  confirm: [18, 35, 28],
  /** Noticeable rhythmic pulse when a local mandi price alert triggers */
  alert: [35, 45, 35],
  /** Longer trailing pulse for validation warnings, moderation blocks, or destructive deletes */
  warning: [25, 30, 50],
};

export interface NavigatorVibrateLike {
  vibrate?: (pattern: number | number[]) => boolean;
}

export type MediaQueryMatcher = (query: string) => { matches: boolean };

export interface HapticOptions {
  /** Override navigator (useful for deterministic unit tests) */
  nav?: NavigatorVibrateLike | null;
  /** Override matchMedia (useful for deterministic unit tests) */
  matchMedia?: MediaQueryMatcher | null;
  /** Bypass prefers-reduced-motion check when explicitly requested */
  ignoreReducedMotion?: boolean;
}

function getDefaultNavigator(): NavigatorVibrateLike | null {
  if (typeof navigator === 'undefined') return null;
  return navigator as NavigatorVibrateLike;
}

function getDefaultMatchMedia(): MediaQueryMatcher | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return null;
  }
  return window.matchMedia.bind(window);
}

/**
 * Returns true if the current runtime exposes the standard Vibration API.
 */
export function isVibrationSupported(nav: NavigatorVibrateLike | null = getDefaultNavigator()): boolean {
  return Boolean(nav && typeof nav.vibrate === 'function');
}

/**
 * Returns true when the user has enabled Reduced Motion at the OS/browser level.
 */
export function prefersReducedMotion(
  matchMediaFn: MediaQueryMatcher | null = getDefaultMatchMedia()
): boolean {
  if (!matchMediaFn) return false;
  try {
    return Boolean(matchMediaFn('(prefers-reduced-motion: reduce)')?.matches);
  } catch {
    return false;
  }
}

/**
 * Triggers a subtle haptic vibration pattern via the Web Vibration API.
 * Returns `true` if `navigator.vibrate` accepted the pattern, otherwise `false`.
 */
export function triggerHaptic(
  pattern: HapticPatternName = 'tap',
  options: HapticOptions = {}
): boolean {
  const nav = options.nav !== undefined ? options.nav : getDefaultNavigator();
  if (!isVibrationSupported(nav)) return false;

  const matcher =
    options.matchMedia !== undefined ? options.matchMedia : getDefaultMatchMedia();
  if (!options.ignoreReducedMotion && prefersReducedMotion(matcher)) {
    return false;
  }

  const rawPattern = HAPTIC_PATTERNS[pattern];
  const payload = Array.isArray(rawPattern) ? [...rawPattern] : (rawPattern as number);

  try {
    const result = nav!.vibrate!(payload);
    return result !== false;
  } catch {
    return false;
  }
}

/**
 * Stops any ongoing vibration immediately (`navigator.vibrate(0)`).
 */
export function stopHaptic(nav: NavigatorVibrateLike | null = getDefaultNavigator()): boolean {
  if (!isVibrationSupported(nav)) return false;
  try {
    const result = nav!.vibrate!(0);
    return result !== false;
  } catch {
    return false;
  }
}
