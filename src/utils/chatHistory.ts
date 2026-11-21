export type GroundingToolChoice = 'search' | 'maps' | 'none';

export interface RawChatMessage {
  role: string;
  text: string;
}

export interface GeminiHistoryEntry {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

export interface NormalizedChatPayload {
  history: GeminiHistoryEntry[];
  latestUserMessage: string;
}

export interface GeminiAttempt {
  model: 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite';
  tool: GroundingToolChoice;
}

/**
 * Normalizes a frontend chat message list into valid Gemini `ai.chats.create({ history })`
 * plus the latest user message to pass to `chat.sendMessage({ message })`.
 *
 * Guarantees:
 * - Empty messages are removed
 * - History starts with a 'user' turn
 * - Consecutive turns with the same role are merged (strict user/model alternation)
 * - History ends with a 'model' turn so the subsequent `sendMessage` (a 'user' turn)
 *   never creates two adjacent 'user' turns.
 */
export function normalizeChatForGemini(
  messages: RawChatMessage[],
  maxTurns = 12
): NormalizedChatPayload {
  const cleaned = messages
    .slice(-maxTurns)
    .map((m) => ({
      role: (m?.role === 'assistant' || m?.role === 'model' ? 'model' : 'user') as 'user' | 'model',
      text: String(m?.text ?? '').trim(),
    }))
    .filter((m) => m.text.length > 0);

  // Locate the last user message as the current prompt
  let lastUserIdx = -1;
  for (let i = cleaned.length - 1; i >= 0; i--) {
    if (cleaned[i].role === 'user') {
      lastUserIdx = i;
      break;
    }
  }

  if (lastUserIdx === -1) {
    return { history: [], latestUserMessage: '' };
  }

  const latestUserMessage = cleaned[lastUserIdx].text;
  const prior = cleaned.slice(0, lastUserIdx);

  // Drop leading model greeting(s) so history starts with a user turn
  const firstUserIdx = prior.findIndex((m) => m.role === 'user');
  if (firstUserIdx === -1) {
    return { history: [], latestUserMessage };
  }

  const sliced = prior.slice(firstUserIdx);

  // Merge consecutive messages from the same role so alternation is strictly user <-> model
  const merged: GeminiHistoryEntry[] = [];
  for (const item of sliced) {
    const prev = merged[merged.length - 1];
    if (prev && prev.role === item.role) {
      prev.parts[0].text = `${prev.parts[0].text}\n${item.text}`;
    } else {
      merged.push({
        role: item.role,
        parts: [{ text: item.text }],
      });
    }
  }

  // Ensure history ends on a 'model' turn so sendMessage (user) won't collide with a trailing user turn
  while (merged.length > 0 && merged[merged.length - 1].role === 'user') {
    merged.pop();
  }

  return {
    history: merged,
    latestUserMessage,
  };
}

/**
 * Produces an ordered list of real Gemini model + tool attempts so that if a
 * grounding tool quota or primary model RPM limit is hit, the server gracefully
 * retries using a valid active Gemini model without faking responses.
 */
export function buildGeminiAttemptPlan(
  preferredTool: GroundingToolChoice
): GeminiAttempt[] {
  if (preferredTool === 'none') {
    return [
      { model: 'gemini-4-hydrogen', tool: 'none' },
      { model: 'gemini-3.1-flash-lite', tool: 'none' },
    ];
  }

  return [
    { model: 'gemini-4-hydrogen', tool: preferredTool },
    { model: 'gemini-3.1-flash-lite', tool: preferredTool },
    { model: 'gemini-4-hydrogen', tool: 'none' },
    { model: 'gemini-3.1-flash-lite', tool: 'none' },
  ];
}

/**
 * Determines whether a Gemini SDK error is eligible for fallback/retry on an
 * alternate model or without optional grounding tools.
 * Authentication / missing-key errors are never retried.
 */
export function isRetryableGeminiError(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : String(err);
  if (
    raw.includes('GEMINI_API_KEY') ||
    raw.includes('API_KEY_INVALID') ||
    raw.includes('PERMISSION_DENIED') ||
    raw.includes('403')
  ) {
    return false;
  }

  return (
    raw.includes('429') ||
    raw.includes('RESOURCE_EXHAUSTED') ||
    raw.includes('503') ||
    raw.includes('UNAVAILABLE') ||
    raw.includes('500') ||
    raw.includes('INTERNAL') ||
    raw.includes('400') ||
    raw.includes('INVALID_ARGUMENT') ||
    raw.includes('NOT_FOUND') ||
    raw.includes('404') ||
    raw.includes('EMPTY_RESPONSE')
  );
}
