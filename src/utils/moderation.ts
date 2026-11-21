import type { ForumPost } from '../data/upMandis';

export interface ModerationScreenResult {
  clean: boolean;
  severity: 'none' | 'warning' | 'blocked';
  reasons: string[];
}

const ABUSIVE_PATTERNS: RegExp[] = [
  /\b(idiot|stupid|moron|bastard|scum|cheat|foolish)\b/i,
  /\b(bewakoof|gadha|harami|pagal)\b/i,
];

const SCAM_PATTERNS: { pattern: RegExp; reason: string }[] = [
  {
    pattern: /(send|pay|transfer).{0,25}(advance|upi|fee|rs\.?\s*\d+|₹\s*\d+)/i,
    reason: 'Potential advance-fee or UPI payment scam detected.',
  },
  {
    pattern: /(share|send).{0,15}\botp\b/i,
    reason: 'Requests for OTP are prohibited to protect farmers from fraud.',
  },
  {
    pattern: /(guaranteed\s+double|100%\s+guaranteed\s+profit|lottery|instant\s+loan)/i,
    reason: 'Misleading financial guarantee / spam phrasing detected.',
  },
  {
    pattern: /(bit\.ly|tinyurl\.com|t\.me\/|wa\.me\/)/i,
    reason: 'Unverified external shortened or off-platform payment links are flagged.',
  },
];

/**
 * Screens farmer forum posts & comments for abusive language, middleman advance-fee scams,
 * OTP fraud, or spam links to keep Kisan Chaupal safe and trustworthy.
 */
export function screenContent(text: string): ModerationScreenResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { clean: false, severity: 'blocked', reasons: ['Content cannot be empty.'] };
  }

  const reasons: string[] = [];
  let severity: ModerationScreenResult['severity'] = 'none';

  for (const regex of ABUSIVE_PATTERNS) {
    if (regex.test(trimmed)) {
      reasons.push('Contains disrespectful or abusive language. Please keep discussions constructive.');
      severity = 'blocked';
      break;
    }
  }

  for (const item of SCAM_PATTERNS) {
    if (item.pattern.test(trimmed)) {
      reasons.push(item.reason);
      severity = 'blocked';
    }
  }

  // Excessive shouting caps check (for Latin script posts > 25 chars)
  const latinLetters = trimmed.replace(/[^a-zA-Z]/g, '');
  if (latinLetters.length >= 25) {
    const upperCount = latinLetters.replace(/[^A-Z]/g, '').length;
    if (upperCount / latinLetters.length > 0.78) {
      reasons.push('Excessive all-caps text detected (flagged for review).');
      if (severity === 'none') severity = 'warning';
    }
  }

  return {
    clean: reasons.length === 0,
    severity,
    reasons,
  };
}

export type ModerationAction =
  | { type: 'report_post'; postId: string; reason: string }
  | { type: 'approve_post'; postId: string }
  | { type: 'hide_post'; postId: string }
  | { type: 'restore_post'; postId: string }
  | { type: 'toggle_pin'; postId: string }
  | { type: 'toggle_lock'; postId: string }
  | { type: 'hide_comment'; postId: string; commentId: string }
  | { type: 'report_comment'; postId: string; commentId: string; reason: string };

export function applyModerationAction(
  posts: ForumPost[],
  action: ModerationAction
): ForumPost[] {
  return posts.map((post) => {
    if (post.id !== action.postId) return post;

    switch (action.type) {
      case 'report_post':
        return {
          ...post,
          reportedCount: post.reportedCount + 1,
          reportReasons: post.reportReasons.includes(action.reason)
            ? post.reportReasons
            : [...post.reportReasons, action.reason],
        };
      case 'approve_post':
        return {
          ...post,
          reportedCount: 0,
          reportReasons: [],
          autoFlagged: false,
          autoFlagReason: undefined,
          hidden: false,
        };
      case 'hide_post':
        return {
          ...post,
          hidden: true,
        };
      case 'restore_post':
        return {
          ...post,
          hidden: false,
        };
      case 'toggle_pin':
        return {
          ...post,
          pinned: !post.pinned,
        };
      case 'toggle_lock':
        return {
          ...post,
          locked: !post.locked,
        };
      case 'hide_comment':
        return {
          ...post,
          comments: post.comments.map((c) =>
            c.id === action.commentId ? { ...c, hidden: true } : c
          ),
        };
      case 'report_comment':
        return {
          ...post,
          comments: post.comments.map((c) =>
            c.id === action.commentId
              ? {
                  ...c,
                  reportedCount: (c.reportedCount ?? 0) + 1,
                  reportReason: action.reason,
                }
              : c
          ),
        };
      default:
        return post;
    }
  });
}

export function getModerationQueue(posts: ForumPost[]): ForumPost[] {
  return posts.filter(
    (p) =>
      p.reportedCount > 0 ||
      p.autoFlagged ||
      p.hidden ||
      p.comments.some((c) => (c.reportedCount ?? 0) > 0 && !c.hidden)
  );
}
