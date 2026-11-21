import type { ForumPost } from '../data/upMandis';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * Safely reads and parses JSON from browser storage, falling back cleanly
 * on missing values, malformed JSON, or storage access restrictions.
 */
export function safeLoadJson<T>(
  key: string,
  fallback: T,
  storage: StorageLike | null = typeof localStorage !== 'undefined' ? localStorage : null
): T {
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch {
    return fallback;
  }
}

/**
 * Safely serializes and persists JSON into browser storage, returning whether
 * persistence succeeded without throwing on quota or privacy-mode errors.
 */
export function safeSaveJson<T>(
  key: string,
  value: T,
  storage: StorageLike | null = typeof localStorage !== 'undefined' ? localStorage : null
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/**
 * Hydrates Hindi localization fields onto seeded forum posts and their comments
 * while preserving user-created posts, replies, votes, and moderation states.
 */
export function hydrateLocalizedForumPosts(
  stored: ForumPost[],
  seedPosts: ForumPost[]
): ForumPost[] {
  const seedById = new Map(seedPosts.map((p) => [p.id, p]));
  return stored.map((post) => {
    const seed = seedById.get(post.id);
    if (!seed) return post;
    const seedCommentById = new Map(seed.comments.map((c) => [c.id, c]));
    return {
      ...post,
      titleHi: post.titleHi ?? seed.titleHi,
      bodyHi: post.bodyHi ?? seed.bodyHi,
      authorNameHi: post.authorNameHi ?? seed.authorNameHi,
      districtHi: post.districtHi ?? seed.districtHi,
      createdAtHi: post.createdAtHi ?? seed.createdAtHi,
      autoFlagReasonHi: post.autoFlagReasonHi ?? seed.autoFlagReasonHi,
      comments: post.comments.map((c) => {
        const sc = seedCommentById.get(c.id);
        if (!sc) return c;
        return {
          ...c,
          authorNameHi: c.authorNameHi ?? sc.authorNameHi,
          districtHi: c.districtHi ?? sc.districtHi,
          createdAtHi: c.createdAtHi ?? sc.createdAtHi,
          bodyHi: c.bodyHi ?? sc.bodyHi,
        };
      }),
    };
  });
}
