import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Flag,
  Lock,
  MessageSquare,
  Pin,
  Plus,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  ThumbsUp,
  Unlock,
  X,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import {
  CROPS,
  UP_DISTRICTS,
  type CropId,
  type ForumCategory,
  type ForumPost,
} from '../data/upMandis';
import {
  getModerationQueue,
  screenContent,
  type ModerationAction,
} from '../utils/moderation';
import type { UiStrings } from '../utils/i18n';

const FORUM_CATEGORIES: ('All' | ForumCategory)[] = [
  'All',
  'Market Rates',
  'Crop Care',
  'Storage & Cold Store',
  'MSP & Schemes',
  'Transport',
];

const REPORT_REASONS = [
  'Middleman Scam / Advance Fee Fraud',
  'Abusive or Disrespectful Language',
  'Misleading Price or MSP Information',
  'Spam / Off-Topic Advertisement',
];

interface CommunityForumWorkspaceProps {
  posts: ForumPost[];
  onCreatePost: (post: Omit<ForumPost, 'id' | 'createdAt' | 'helpfulCount' | 'reportedCount' | 'reportReasons' | 'comments'>) => void;
  onAddComment: (postId: string, authorName: string, district: string, body: string) => void;
  onToggleHelpful: (postId: string) => void;
  onModerate: (action: ModerationAction) => void;
  t: UiStrings;
}

export function CommunityForumWorkspace({
  posts,
  onCreatePost,
  onAddComment,
  onToggleHelpful,
  onModerate,
  t,
}: CommunityForumWorkspaceProps) {
  const [selectedCategory, setSelectedCategory] = useState<'All' | ForumCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'helpful'>('newest');
  const [moderatorMode, setModeratorMode] = useState(false);

  // New Post Composer state
  const [showComposer, setShowComposer] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');
  const [postCategory, setPostCategory] = useState<ForumCategory>('Market Rates');
  const [postCrop, setPostCrop] = useState<CropId | 'general'>('aloo');
  const [postAuthor, setPostAuthor] = useState('');
  const [postDistrict, setPostDistrict] = useState('Barabanki');
  const [postError, setPostError] = useState<string | null>(null);

  // Expanded comments & comment drafts per post
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({
    'post-101': true,
  });
  const [commentDrafts, setCommentDrafts] = useState<Record<string, { author: string; body: string; error?: string }>>({});

  // Report Modal state
  const [reportTarget, setReportTarget] = useState<{ postId: string; commentId?: string; title: string } | null>(null);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);

  const moderationQueue = getModerationQueue(posts);

  // Visible posts for community feed (hide moderated-hidden posts unless in moderator mode)
  const visiblePosts = posts
    .filter((p) => (moderatorMode ? true : !p.hidden && !p.autoFlagged))
    .filter((p) => (selectedCategory === 'All' ? true : p.category === selectedCategory))
    .filter((p) => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.body.toLowerCase().includes(q) ||
        p.district.toLowerCase().includes(q) ||
        p.authorName.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      if (sortBy === 'helpful') return b.helpfulCount - a.helpfulCount;
      return 0;
    });

  function handleCreatePostSubmit(e: FormEvent) {
    e.preventDefault();
    setPostError(null);

    if (!postAuthor.trim() || !postTitle.trim() || !postBody.trim()) {
      setPostError('Please fill in your name, post title, and discussion details.');
      return;
    }

    const screen = screenContent(`${postTitle} ${postBody}`);
    if (screen.severity === 'blocked') {
      setPostError(`Moderation Guard blocked this post: ${screen.reasons.join(' ')}`);
      return;
    }

    onCreatePost({
      title: postTitle.trim(),
      body: postBody.trim(),
      category: postCategory,
      cropTag: postCrop,
      authorName: postAuthor.trim(),
      district: postDistrict,
      autoFlagged: screen.severity === 'warning',
      autoFlagReason: screen.severity === 'warning' ? screen.reasons.join(' ') : undefined,
    });

    setPostTitle('');
    setPostBody('');
    setPostAuthor('');
    setShowComposer(false);
  }

  function handleCommentSubmit(e: FormEvent, postId: string) {
    e.preventDefault();
    const draft = commentDrafts[postId] ?? { author: '', body: '' };
    const cleanBody = draft.body.trim();
    const cleanAuthor = draft.author.trim() || 'UP Farmer';

    if (!cleanBody) {
      setCommentDrafts((prev) => ({
        ...prev,
        [postId]: { ...draft, error: 'Please write a comment before posting.' },
      }));
      return;
    }

    const screen = screenContent(cleanBody);
    if (screen.severity === 'blocked') {
      setCommentDrafts((prev) => ({
        ...prev,
        [postId]: {
          ...draft,
          error: `Moderation Guard: ${screen.reasons.join(' ')}`,
        },
      }));
      return;
    }

    onAddComment(postId, cleanAuthor, postDistrict, cleanBody);
    setCommentDrafts((prev) => ({
      ...prev,
      [postId]: { author: draft.author, body: '', error: undefined },
    }));
    setExpandedComments((prev) => ({ ...prev, [postId]: true }));
  }

  function handleConfirmReport(e: FormEvent) {
    e.preventDefault();
    if (!reportTarget) return;
    if (reportTarget.commentId) {
      onModerate({
        type: 'report_comment',
        postId: reportTarget.postId,
        commentId: reportTarget.commentId,
        reason: reportReason,
      });
    } else {
      onModerate({
        type: 'report_post',
        postId: reportTarget.postId,
        reason: reportReason,
      });
    }
    setReportTarget(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <p className="text-xs font-medium text-emerald-800 mb-1">
            Kisan Chaupal (किसान चौपाल) · Verified UP Farmer Discussions &amp; Anti-Scam Moderation
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {t.community.title}
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            {t.community.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setModeratorMode((prev) => !prev)}
            aria-pressed={moderatorMode}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              moderatorMode
                ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
                : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
            <span>
              {t.community.modDesk} ({moderationQueue.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowComposer((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>{showComposer ? 'Close' : t.community.newPost}</span>
          </button>
        </div>
      </section>

      {/* Moderator Desk Panel (when toggled ON) */}
      {moderatorMode && (
        <section
          aria-label="Community moderation queue"
          data-testid="moderator-desk"
          className="bg-slate-900 text-slate-100 rounded-xl p-5 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" aria-hidden="true" />
              <div>
                <h2 className="font-display text-base font-bold text-white">
                  Community Moderation Queue
                </h2>
                <p className="text-xs text-slate-300">
                  Review auto-flagged scam posts and farmer reports. You can also Pin, Lock, or Hide any post in the feed below.
                </p>
              </div>
            </div>
            <span className="font-mono tabular-nums text-xs text-amber-300">
              {moderationQueue.length} item{moderationQueue.length === 1 ? '' : 's'} requiring review
            </span>
          </div>

          {moderationQueue.length === 0 ? (
            <p className="text-xs text-emerald-300">
              All clear — no pending flagged or reported posts in the moderation queue.
            </p>
          ) : (
            <div className="space-y-3">
              {moderationQueue.map((item) => (
                <div
                  key={item.id}
                  data-testid={`mod-item-${item.id}`}
                  className="bg-slate-800/80 border border-slate-700 rounded-lg p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-amber-300 font-medium">
                      {item.autoFlagged && <span>Auto-Flagged: {item.autoFlagReason}</span>}
                      {item.reportedCount > 0 && (
                        <span>
                          Reported {item.reportedCount}x ({item.reportReasons.join(', ')})
                        </span>
                      )}
                      {item.hidden && <span className="text-red-300">Currently Hidden</span>}
                    </div>
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="text-xs text-slate-300 line-clamp-2">{item.body}</p>
                    <p className="text-[11px] text-slate-400">
                      Posted by {item.authorName} ({item.district}) · {item.createdAt}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onModerate({ type: 'approve_post', postId: item.id })}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 rounded-md whitespace-nowrap"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Approve &amp; Publish</span>
                    </button>
                    {item.hidden ? (
                      <button
                        type="button"
                        onClick={() => onModerate({ type: 'restore_post', postId: item.id })}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-100 bg-slate-700 hover:bg-slate-600 rounded-md whitespace-nowrap"
                      >
                        <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Restore</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onModerate({ type: 'hide_post', postId: item.id })}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md whitespace-nowrap"
                      >
                        <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Remove / Hide</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* New Post Composer */}
      {showComposer && (
        <section
          aria-label="Create a new community post"
          className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-slate-900">
              Start a Discussion on Kisan Chaupal
            </h2>
            <span className="text-xs text-slate-500">
              Protected by automated anti-scam &amp; respectful language screening
            </span>
          </div>

          <form onSubmit={handleCreatePostSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label htmlFor="post-author" className="block text-xs font-semibold text-slate-700 mb-1">
                  Your Name
                </label>
                <input
                  id="post-author"
                  type="text"
                  required
                  placeholder="e.g., Manoj Tiwari"
                  value={postAuthor}
                  onChange={(e) => setPostAuthor(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label htmlFor="post-district" className="block text-xs font-semibold text-slate-700 mb-1">
                  District
                </label>
                <select
                  id="post-district"
                  value={postDistrict}
                  onChange={(e) => setPostDistrict(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-sm bg-white"
                >
                  {UP_DISTRICTS.map((d) => (
                    <option key={d.id} value={d.label}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="post-category" className="block text-xs font-semibold text-slate-700 mb-1">
                  Topic Category
                </label>
                <select
                  id="post-category"
                  value={postCategory}
                  onChange={(e) => setPostCategory(e.target.value as ForumCategory)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-sm bg-white"
                >
                  {FORUM_CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="post-crop" className="block text-xs font-semibold text-slate-700 mb-1">
                  Related Crop
                </label>
                <select
                  id="post-crop"
                  value={postCrop}
                  onChange={(e) => setPostCrop(e.target.value as CropId | 'general')}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-sm bg-white"
                >
                  <option value="general">General Farming</option>
                  {Object.values(CROPS).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameEn}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="post-title" className="block text-xs font-semibold text-slate-700 mb-1">
                Headline
              </label>
              <input
                id="post-title"
                type="text"
                required
                placeholder="e.g., Sikandra Mandi Agra morning rates for Chipsona potato"
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label htmlFor="post-body" className="block text-xs font-semibold text-slate-700 mb-1">
                Details (mandi rates, moisture experience, storage or farming tip)
              </label>
              <textarea
                id="post-body"
                rows={3}
                required
                placeholder="Share helpful, factual observations for fellow farmers..."
                value={postBody}
                onChange={(e) => setPostBody(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            {postError && (
              <div
                role="alert"
                data-testid="moderation-block-alert"
                className="flex items-start gap-2 text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg p-3"
              >
                <AlertTriangle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{postError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowComposer(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
              >
                Publish Post
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Search, Category Filter & Sort Toolbar */}
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div
          className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg"
          role="group"
          aria-label="Filter forum discussions by category"
        >
          {FORUM_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              aria-pressed={selectedCategory === cat}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <label htmlFor="forum-search" className="sr-only">
              Search farmer posts
            </label>
            <input
              id="forum-search"
              type="search"
              placeholder="Search crop, mandi, or topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <label htmlFor="forum-sort" className="sr-only">
            Sort posts
          </label>
          <select
            id="forum-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'helpful')}
            className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700"
          >
            <option value="newest">Latest</option>
            <option value="helpful">Most Helpful</option>
          </select>
        </div>
      </section>

      {/* Forum Posts Feed */}
      <section aria-label="Community discussion feed" className="space-y-4">
        {visiblePosts.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-800">
              No discussions match your current search or category.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('All');
                setSearchQuery('');
              }}
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              Reset filters
            </button>
          </div>
        ) : (
          visiblePosts.map((post) => {
            const isCommentsOpen = Boolean(expandedComments[post.id]);
            const visibleComments = post.comments.filter((c) => moderatorMode || !c.hidden);
            const draft = commentDrafts[post.id] ?? { author: '', body: '' };

            return (
              <article
                key={post.id}
                data-testid={`forum-post-${post.id}`}
                className={`bg-white border rounded-xl p-5 space-y-3.5 ${
                  post.hidden
                    ? 'border-red-200 opacity-70'
                    : post.pinned
                      ? 'border-emerald-300'
                      : 'border-slate-200'
                }`}
              >
                {/* Unboxed quiet metadata line */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {post.pinned && (
                      <>
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-800">
                          <Pin className="w-3.5 h-3.5" aria-hidden="true" />
                          Verified Advisory
                        </span>
                        <span aria-hidden="true">·</span>
                      </>
                    )}
                    <span className="font-semibold text-slate-700">{post.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {post.cropTag === 'general' ? 'General' : CROPS[post.cropTag].nameEn}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {post.authorName} ({post.district})
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{post.createdAt}</span>
                    {post.locked && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-amber-700 font-semibold">Locked</span>
                      </>
                    )}
                    {post.hidden && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-red-700 font-semibold">Hidden by Moderator</span>
                      </>
                    )}
                  </div>

                  {/* Moderator inline quick actions */}
                  {moderatorMode && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onModerate({ type: 'toggle_pin', postId: post.id })}
                        className="text-xs font-medium text-slate-700 hover:text-emerald-800 inline-flex items-center gap-1"
                      >
                        <Pin className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{post.pinned ? 'Unpin' : 'Pin'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onModerate({ type: 'toggle_lock', postId: post.id })}
                        className="text-xs font-medium text-slate-700 hover:text-amber-800 inline-flex items-center gap-1"
                      >
                        {post.locked ? (
                          <Unlock className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : (
                          <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        <span>{post.locked ? 'Unlock' : 'Lock'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onModerate({
                            type: post.hidden ? 'restore_post' : 'hide_post',
                            postId: post.id,
                          })
                        }
                        className="text-xs font-medium text-red-700 hover:text-red-900 inline-flex items-center gap-1"
                      >
                        {post.hidden ? (
                          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        <span>{post.hidden ? 'Restore' : 'Hide'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Title & Body */}
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-900">
                    {post.title}
                  </h3>
                  <p className="text-sm text-slate-700 mt-1.5 leading-relaxed whitespace-pre-line">
                    {post.body}
                  </p>
                </div>

                {/* Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => onToggleHelpful(post.id)}
                      aria-pressed={Boolean(post.upvotedByUser)}
                      className={`inline-flex items-center gap-1.5 font-semibold transition-colors ${
                        post.upvotedByUser
                          ? 'text-emerald-800'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" aria-hidden="true" />
                      <span className="font-mono tabular-nums">{post.helpfulCount}</span>
                      <span>Helpful</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedComments((prev) => ({
                          ...prev,
                          [post.id]: !prev[post.id],
                        }))
                      }
                      aria-expanded={isCommentsOpen}
                      className="inline-flex items-center gap-1.5 font-semibold text-slate-600 hover:text-slate-900"
                    >
                      <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                      <span className="font-mono tabular-nums">{visibleComments.length}</span>
                      <span>
                        {visibleComments.length === 1 ? 'Comment' : 'Comments'}
                      </span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setReportTarget({ postId: post.id, title: post.title })
                    }
                    className="inline-flex items-center gap-1 text-slate-500 hover:text-red-700 font-medium"
                  >
                    <Flag className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Report</span>
                  </button>
                </div>

                {/* Comments Thread */}
                {isCommentsOpen && (
                  <div className="pt-3 border-t border-slate-200/80 space-y-3">
                    {visibleComments.length === 0 ? (
                      <p className="text-xs text-slate-500">
                        No comments yet. Share your experience or ask a follow-up question.
                      </p>
                    ) : (
                      <ul className="space-y-2.5">
                        {visibleComments.map((c) => (
                          <li
                            key={c.id}
                            className={`bg-slate-50 border border-slate-200/80 rounded-lg px-3.5 py-2.5 text-xs space-y-1 ${
                              c.hidden ? 'opacity-60' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 text-slate-500">
                              <span>
                                <strong className="text-slate-800">{c.authorName}</strong> · {c.district} · {c.createdAt}
                              </span>
                              <div className="flex items-center gap-2">
                                {moderatorMode && !c.hidden && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onModerate({
                                        type: 'hide_comment',
                                        postId: post.id,
                                        commentId: c.id,
                                      })
                                    }
                                    className="text-red-700 hover:underline font-medium"
                                  >
                                    Hide
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setReportTarget({
                                      postId: post.id,
                                      commentId: c.id,
                                      title: `Comment by ${c.authorName}`,
                                    })
                                  }
                                  className="text-slate-400 hover:text-red-700"
                                  aria-label={`Report comment by ${c.authorName}`}
                                >
                                  <Flag className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            <p className="text-slate-700 leading-relaxed">{c.body}</p>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Add Comment Form */}
                    {post.locked ? (
                      <p className="text-xs text-amber-800 font-medium">
                        Comments are locked by a moderator on this thread.
                      </p>
                    ) : (
                      <form
                        onSubmit={(e) => handleCommentSubmit(e, post.id)}
                        className="space-y-2 pt-1"
                      >
                        <div className="flex flex-col sm:flex-row gap-2">
                          <label htmlFor={`comment-author-${post.id}`} className="sr-only">
                            Your name
                          </label>
                          <input
                            id={`comment-author-${post.id}`}
                            type="text"
                            placeholder="Your name"
                            value={draft.author}
                            onChange={(e) =>
                              setCommentDrafts((prev) => ({
                                ...prev,
                                [post.id]: { ...draft, author: e.target.value, error: undefined },
                              }))
                            }
                            className="sm:w-40 h-9 px-3 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                          />
                          <label htmlFor={`comment-body-${post.id}`} className="sr-only">
                            Write a comment on {post.title}
                          </label>
                          <input
                            id={`comment-body-${post.id}`}
                            type="text"
                            placeholder="Add a helpful reply or mandi update..."
                            value={draft.body}
                            onChange={(e) =>
                              setCommentDrafts((prev) => ({
                                ...prev,
                                [post.id]: { ...draft, body: e.target.value, error: undefined },
                              }))
                            }
                            className="flex-1 h-9 px-3 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                          />
                          <button
                            type="submit"
                            className="inline-flex items-center justify-center gap-1 h-9 px-3.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg whitespace-nowrap shrink-0"
                          >
                            <Send className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Reply</span>
                          </button>
                        </div>
                        {draft.error && (
                          <p role="alert" className="text-xs text-red-700">
                            {draft.error}
                          </p>
                        )}
                      </form>
                    )}
                  </div>
                )}
              </article>
            );
          })
        )}
      </section>

      {/* Report Modal */}
      {reportTarget && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-modal-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 id="report-modal-title" className="font-display text-base font-bold text-slate-900">
                Report to Community Moderators
              </h3>
              <button
                type="button"
                onClick={() => setReportTarget(null)}
                aria-label="Close report dialog"
                className="p-1 rounded hover:bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Flagging: <strong className="text-slate-900">{reportTarget.title}</strong>
            </p>
            <form onSubmit={handleConfirmReport} className="space-y-3">
              <fieldset className="space-y-2">
                <legend className="text-xs font-semibold text-slate-700 mb-1">
                  Reason for reporting
                </legend>
                {REPORT_REASONS.map((reason) => (
                  <label
                    key={reason}
                    className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="report-reason"
                      value={reason}
                      checked={reportReason === reason}
                      onChange={() => setReportReason(reason)}
                      className="accent-emerald-700"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </fieldset>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReportTarget(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg"
                >
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
