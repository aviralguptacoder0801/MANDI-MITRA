import { isSafeHttpUrl } from './apiValidation';

export type GroundingMode = 'auto' | 'search' | 'maps';

export interface GroundingSource {
  type: 'web' | 'maps';
  title: string;
  uri: string;
  snippet?: string;
}

const MAPS_KEYWORDS = [
  'map',
  'maps',
  'nearby',
  'near me',
  'closest',
  'nearest',
  'route',
  'direction',
  'directions',
  'distance',
  'address',
  'location',
  'cold store',
  'cold storage',
  'godown',
  'warehouse',
  'petrol',
  'diesel',
  'weighbridge',
  'dharmkanta',
  'kvk',
  'krishi vigyan',
  'fertilizer shop',
  'seed shop',
  'where is',
  'how far',
  // Hindi / Awadhi / Bhojpuri / Hinglish location terms
  'नज़दीक',
  'नजदीक',
  'पास में',
  'रास्ता',
  'दूरी',
  'पता',
  'लोकेशन',
  'नक्शा',
  'कहाँ',
  'कहां',
  'कोल्ड स्टोर',
  'धर्मकांटा',
  'गोदाम',
  'kahan',
  'rasta',
  'nazdeek',
  'paas',
  'kitni door',
  'kitna door',
];

/**
 * Decides whether a user prompt should use Google Maps Grounding or Google Search Grounding.
 * Note: Gemini built-in googleMaps and googleSearch cannot be combined in the same call,
 * so each turn selects the single best grounding tool.
 */
export function selectGroundingTool(
  query: string,
  requestedMode: GroundingMode = 'auto'
): 'search' | 'maps' {
  if (requestedMode === 'maps') return 'maps';
  if (requestedMode === 'search') return 'search';

  const normalized = query.toLowerCase();
  const matchesMaps = MAPS_KEYWORDS.some((kw) => normalized.includes(kw));
  return matchesMaps ? 'maps' : 'search';
}

interface RawGroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
  maps?: {
    uri?: string;
    title?: string;
    placeAnswerSources?: {
      reviewSnippets?: Array<{
        content?: string;
        googleMapsUri?: string;
      }>;
    };
  };
}

/**
 * Extracts deduplicated, URL-sanitized web and Google Maps source links from Gemini groundingChunks.
 * Rejects any non-HTTP(S) URI (such as javascript: or data:) before returning links to the client.
 */
export function extractGroundingSources(chunks: unknown): GroundingSource[] {
  if (!Array.isArray(chunks)) return [];
  const seen = new Set<string>();
  const sources: GroundingSource[] = [];

  for (const raw of chunks as RawGroundingChunk[]) {
    if (isSafeHttpUrl(raw?.web?.uri) && !seen.has(raw.web.uri)) {
      seen.add(raw.web.uri);
      sources.push({
        type: 'web',
        title: raw.web.title?.trim() || raw.web.uri,
        uri: raw.web.uri.trim(),
      });
    }

    if (isSafeHttpUrl(raw?.maps?.uri) && !seen.has(raw.maps.uri)) {
      seen.add(raw.maps.uri);
      const firstSnippet =
        raw.maps.placeAnswerSources?.reviewSnippets?.[0]?.content?.trim() || undefined;
      sources.push({
        type: 'maps',
        title: raw.maps.title?.trim() || 'View on Google Maps',
        uri: raw.maps.uri.trim(),
        snippet: firstSnippet,
      });
    }

    const reviewSnippets = raw?.maps?.placeAnswerSources?.reviewSnippets;
    if (Array.isArray(reviewSnippets)) {
      for (const review of reviewSnippets) {
        if (isSafeHttpUrl(review?.googleMapsUri) && !seen.has(review.googleMapsUri)) {
          seen.add(review.googleMapsUri);
          sources.push({
            type: 'maps',
            title: raw?.maps?.title ? `${raw.maps.title} (Review)` : 'Google Maps Review',
            uri: review.googleMapsUri.trim(),
            snippet: review.content?.trim() || undefined,
          });
        }
      }
    }
  }

  return sources.slice(0, 8);
}
