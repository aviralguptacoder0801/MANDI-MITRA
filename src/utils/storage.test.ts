import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_FORUM_POSTS, type ForumPost } from '../data/upMandis';
import { hydrateLocalizedForumPosts, safeLoadJson, safeSaveJson, type StorageLike } from './storage';

function createMemoryStorage(initial: Record<string, string> = {}): StorageLike {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}

test('safeLoadJson returns parsed value, or fallback for missing, corrupt, or throwing storage', () => {
  const store = createMemoryStorage({
    valid: JSON.stringify({ district: 'agra', count: 3 }),
    corrupt: '{not-json',
    nullVal: 'null',
  });

  assert.deepEqual(safeLoadJson('valid', { district: 'barabanki', count: 0 }, store), {
    district: 'agra',
    count: 3,
  });
  assert.deepEqual(safeLoadJson('missing', ['default'], store), ['default']);
  assert.deepEqual(safeLoadJson('corrupt', ['fallback'], store), ['fallback']);
  assert.deepEqual(safeLoadJson('nullVal', ['fallback'], store), ['fallback']);

  const throwingStorage: StorageLike = {
    getItem() {
      throw new Error('SecurityError');
    },
    setItem() {
      throw new Error('QuotaExceededError');
    },
  };
  assert.equal(safeLoadJson('any', 42, throwingStorage), 42);
  assert.equal(safeSaveJson('any', { a: 1 }, throwingStorage), false);
});

test('safeSaveJson persists valid JSON cleanly', () => {
  const store = createMemoryStorage();
  const saved = safeSaveJson('alerts', [{ id: 'r1', price: 1700 }], store);
  assert.equal(saved, true);
  assert.deepEqual(safeLoadJson('alerts', [], store), [{ id: 'r1', price: 1700 }]);
});

test('hydrateLocalizedForumPosts restores Hindi translations onto legacy cached seed posts while keeping user posts intact', () => {
  const legacyCachedSeed: ForumPost = {
    ...INITIAL_FORUM_POSTS[0],
    titleHi: undefined,
    bodyHi: undefined,
    authorNameHi: undefined,
    districtHi: undefined,
    helpfulCount: 99,
    comments: INITIAL_FORUM_POSTS[0].comments.map((c) => ({
      ...c,
      bodyHi: undefined,
      authorNameHi: undefined,
    })),
  };

  const userPost: ForumPost = {
    id: 'post-custom-1',
    authorName: 'Suresh',
    district: 'Barabanki',
    category: 'Market Rates',
    cropTag: 'aloo',
    title: 'Today Barabanki potato arrival update',
    body: 'Arrivals are lighter this morning.',
    createdAt: 'Just now',
    helpfulCount: 1,
    reportedCount: 0,
    reportReasons: [],
    comments: [],
  };

  const hydrated = hydrateLocalizedForumPosts([userPost, legacyCachedSeed], INITIAL_FORUM_POSTS);
  assert.equal(hydrated.length, 2);
  assert.equal(hydrated[0].id, 'post-custom-1');
  assert.equal(hydrated[0].title, 'Today Barabanki potato arrival update');

  const restoredSeed = hydrated[1];
  assert.equal(restoredSeed.helpfulCount, 99, 'Must preserve user vote count');
  assert.ok(restoredSeed.titleHi && restoredSeed.titleHi.length > 0, 'Must hydrate Hindi title');
  assert.ok(restoredSeed.bodyHi && restoredSeed.bodyHi.length > 0, 'Must hydrate Hindi body');
  if (restoredSeed.comments.length > 0) {
    assert.ok(
      restoredSeed.comments[0].bodyHi && restoredSeed.comments[0].bodyHi.length > 0,
      'Must hydrate Hindi comment body'
    );
  }
});
