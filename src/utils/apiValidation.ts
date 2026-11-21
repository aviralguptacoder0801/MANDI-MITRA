import type { LanguageCode } from '../data/upMandis';
import type { GroundingMode } from './grounding';

const ALLOWED_LANGUAGES = new Set<LanguageCode>(['hi', 'awadhi', 'bhojpuri', 'en']);
const ALLOWED_GROUNDING_MODES = new Set<GroundingMode>(['auto', 'search', 'maps']);
const ALLOWED_AUDIO_MIMES = new Set([
  'audio/webm',
  'audio/mp4',
  'audio/ogg',
  'audio/wav',
  'audio/mpeg',
  'audio/x-m4a',
]);
const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

export const MAX_QUERY_CHARS = 1000;
export const MAX_TTS_CHARS = 1200;
export const MAX_CHAT_MESSAGES = 30;
export const MAX_CHAT_MSG_CHARS = 2000;
export const MAX_MEDIA_BASE64_CHARS = 10_000_000; // ~7.5MB decoded

export interface ValidationOk<T> {
  ok: true;
  data: T;
}

export interface ValidationErr {
  ok: false;
  error: string;
}

export type ValidationResult<T> = ValidationOk<T> | ValidationErr;

/**
 * Validates that an external URL uses strictly http: or https: scheme,
 * preventing javascript:, data:, or file: link injection.
 */
export function isSafeHttpUrl(rawUrl: unknown): rawUrl is string {
  if (typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.length > 2048) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function sanitizeLanguage(raw: unknown): LanguageCode {
  if (typeof raw === 'string' && ALLOWED_LANGUAGES.has(raw as LanguageCode)) {
    return raw as LanguageCode;
  }
  return 'hi';
}

export function sanitizeGroundingMode(raw: unknown): GroundingMode {
  if (typeof raw === 'string' && ALLOWED_GROUNDING_MODES.has(raw as GroundingMode)) {
    return raw as GroundingMode;
  }
  return 'auto';
}

export function sanitizeLatLng(
  raw: unknown,
  fallback: { latitude: number; longitude: number } = { latitude: 26.8467, longitude: 80.9462 }
): { latitude: number; longitude: number } {
  if (!raw || typeof raw !== 'object') return fallback;
  const obj = raw as { latitude?: unknown; longitude?: unknown };
  const lat = typeof obj.latitude === 'number' && Number.isFinite(obj.latitude) ? obj.latitude : null;
  const lng =
    typeof obj.longitude === 'number' && Number.isFinite(obj.longitude) ? obj.longitude : null;
  if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return fallback;
  }
  return { latitude: lat, longitude: lng };
}

export interface ValidatedChatPayload {
  messages: Array<{ role: 'user' | 'assistant'; text: string }>;
  language: LanguageCode;
  localeContext: { languageName?: string; assistantTitle?: string; greeting?: string };
  groundingMode: GroundingMode;
  latLng: { latitude: number; longitude: number };
  context: Record<string, unknown>;
}

export function validateChatPayload(body: unknown): ValidationResult<ValidatedChatPayload> {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Request body must be a JSON object.' };
  }
  const b = body as Record<string, unknown>;
  if (!Array.isArray(b.messages) || b.messages.length === 0) {
    return { ok: false, error: 'Chat messages are required.' };
  }
  if (b.messages.length > MAX_CHAT_MESSAGES) {
    return { ok: false, error: `Too many chat messages (maximum ${MAX_CHAT_MESSAGES}).` };
  }

  const sanitizedMessages: Array<{ role: 'user' | 'assistant'; text: string }> = [];
  for (const item of b.messages) {
    if (!item || typeof item !== 'object') {
      return { ok: false, error: 'Each chat message must be an object with role and text.' };
    }
    const msg = item as { role?: unknown; text?: unknown };
    const role = msg.role === 'assistant' ? 'assistant' : msg.role === 'user' ? 'user' : null;
    if (!role || typeof msg.text !== 'string') {
      return { ok: false, error: 'Invalid chat message role or text.' };
    }
    const trimmed = msg.text.trim();
    if (trimmed.length > MAX_CHAT_MSG_CHARS) {
      return {
        ok: false,
        error: `Chat message exceeds maximum length of ${MAX_CHAT_MSG_CHARS} characters.`,
      };
    }
    if (trimmed) {
      sanitizedMessages.push({ role, text: trimmed });
    }
  }

  if (sanitizedMessages.length === 0) {
    return { ok: false, error: 'Chat messages cannot be empty.' };
  }

  const rawLocale =
    b.localeContext && typeof b.localeContext === 'object'
      ? (b.localeContext as Record<string, unknown>)
      : {};
  const localeContext = {
    languageName:
      typeof rawLocale.languageName === 'string' ? rawLocale.languageName.trim().slice(0, 60) : undefined,
    assistantTitle:
      typeof rawLocale.assistantTitle === 'string'
        ? rawLocale.assistantTitle.trim().slice(0, 80)
        : undefined,
    greeting:
      typeof rawLocale.greeting === 'string' ? rawLocale.greeting.trim().slice(0, 300) : undefined,
  };

  return {
    ok: true,
    data: {
      messages: sanitizedMessages,
      language: sanitizeLanguage(b.language),
      localeContext,
      groundingMode: sanitizeGroundingMode(b.groundingMode),
      latLng: sanitizeLatLng(b.latLng),
      context: b.context && typeof b.context === 'object' ? (b.context as Record<string, unknown>) : {},
    },
  };
}

export interface ValidatedAdvisoryPayload {
  query: string;
  language: LanguageCode;
  groundingMode: GroundingMode;
  latLng: { latitude: number; longitude: number };
  context: Record<string, unknown>;
}

export function validateAdvisoryPayload(body: unknown): ValidationResult<ValidatedAdvisoryPayload> {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Request body must be a JSON object.' };
  }
  const b = body as Record<string, unknown>;
  if (typeof b.query !== 'string' || !b.query.trim()) {
    return { ok: false, error: 'Please provide a farmer query.' };
  }
  const query = b.query.trim();
  if (query.length > MAX_QUERY_CHARS) {
    return { ok: false, error: `Query exceeds maximum length of ${MAX_QUERY_CHARS} characters.` };
  }

  return {
    ok: true,
    data: {
      query,
      language: sanitizeLanguage(b.language),
      groundingMode: sanitizeGroundingMode(b.groundingMode),
      latLng: sanitizeLatLng(b.latLng),
      context: b.context && typeof b.context === 'object' ? (b.context as Record<string, unknown>) : {},
    },
  };
}

export function validateTtsPayload(
  body: unknown
): ValidationResult<{ text: string; language: LanguageCode }> {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Request body must be a JSON object.' };
  }
  const b = body as Record<string, unknown>;
  if (typeof b.text !== 'string' || !b.text.trim()) {
    return { ok: false, error: 'Text is required for audio synthesis.' };
  }
  return {
    ok: true,
    data: {
      text: b.text.trim().slice(0, MAX_TTS_CHARS),
      language: sanitizeLanguage(b.language),
    },
  };
}

export function validateTranscribePayload(
  body: unknown
): ValidationResult<{ audioBase64: string; mimeType: string; language: LanguageCode }> {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Request body must be a JSON object.' };
  }
  const b = body as Record<string, unknown>;
  if (typeof b.audioBase64 !== 'string' || !b.audioBase64.trim()) {
    return { ok: false, error: 'Audio data is required.' };
  }
  if (b.audioBase64.length > MAX_MEDIA_BASE64_CHARS) {
    return { ok: false, error: 'Audio recording is too large (max ~7.5 MB).' };
  }
  const rawMime = typeof b.mimeType === 'string' ? b.mimeType.split(';')[0].trim().toLowerCase() : 'audio/webm';
  const mimeType = ALLOWED_AUDIO_MIMES.has(rawMime) ? rawMime : 'audio/webm';

  return {
    ok: true,
    data: {
      audioBase64: b.audioBase64.trim(),
      mimeType,
      language: sanitizeLanguage(b.language),
    },
  };
}

export function validateGradePhotoPayload(
  body: unknown
): ValidationResult<{ imageBase64: string; mimeType: string; cropName: string }> {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Request body must be a JSON object.' };
  }
  const b = body as Record<string, unknown>;
  if (typeof b.imageBase64 !== 'string' || !b.imageBase64.trim()) {
    return { ok: false, error: 'Crop image is required for quality inspection.' };
  }
  if (b.imageBase64.length > MAX_MEDIA_BASE64_CHARS) {
    return { ok: false, error: 'Crop image exceeds maximum allowed size (~7.5 MB).' };
  }
  const rawMime = typeof b.mimeType === 'string' ? b.mimeType.split(';')[0].trim().toLowerCase() : 'image/jpeg';
  if (!ALLOWED_IMAGE_MIMES.has(rawMime)) {
    return { ok: false, error: 'Unsupported image format. Please upload JPEG, PNG, or WebP.' };
  }
  const cropName =
    typeof b.cropName === 'string' && b.cropName.trim()
      ? b.cropName.trim().slice(0, 80)
      : 'Potato (Aloo)';

  return {
    ok: true,
    data: {
      imageBase64: b.imageBase64.trim(),
      mimeType: rawMime === 'image/jpg' ? 'image/jpeg' : rawMime,
      cropName,
    },
  };
}

export function validateLiveIntelPayload(body: unknown): ValidationResult<{
  mode: 'search' | 'maps';
  cropName: string;
  districtName: string;
  language: LanguageCode;
  latLng: { latitude: number; longitude: number };
}> {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Request body must be a JSON object.' };
  }
  const b = body as Record<string, unknown>;
  const mode = b.mode === 'maps' ? 'maps' : 'search';
  const cropName =
    typeof b.cropName === 'string' && b.cropName.trim()
      ? b.cropName.trim().slice(0, 80)
      : 'Potato (Aloo)';
  const districtName =
    typeof b.districtName === 'string' && b.districtName.trim()
      ? b.districtName.trim().slice(0, 80)
      : 'Barabanki';

  return {
    ok: true,
    data: {
      mode,
      cropName,
      districtName,
      language: sanitizeLanguage(b.language),
      latLng: sanitizeLatLng(b.latLng),
    },
  };
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Pure sliding-window in-memory rate limiter for protecting server-side AI routes.
 */
export function createRateLimiter(options: { windowMs: number; maxRequests: number }) {
  const { windowMs, maxRequests } = options;
  const buckets = new Map<string, number[]>();

  return {
    check(key: string, nowMs = Date.now()): RateLimitResult {
      const cutoff = nowMs - windowMs;
      const existing = buckets.get(key) ?? [];
      const active = existing.filter((ts) => ts > cutoff);

      if (active.length >= maxRequests) {
        const oldest = active[0] ?? nowMs;
        const retryAfterMs = Math.max(1000, oldest + windowMs - nowMs);
        buckets.set(key, active);
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
        };
      }

      active.push(nowMs);
      buckets.set(key, active);

      // Periodic bound on tracked client keys to prevent unbounded memory growth
      if (buckets.size > 1000) {
        for (const [k, timestamps] of buckets) {
          const fresh = timestamps.filter((ts) => ts > cutoff);
          if (fresh.length === 0) buckets.delete(k);
        }
      }

      return {
        allowed: true,
        remaining: Math.max(0, maxRequests - active.length),
        retryAfterSeconds: 0,
      };
    },
    reset() {
      buckets.clear();
    },
  };
}
