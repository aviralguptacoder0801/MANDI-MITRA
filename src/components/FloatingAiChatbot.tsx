import {
  Bot,
  ExternalLink,
  Globe,
  Loader2,
  MapPin,
  MessageCircle,
  RotateCcw,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  CROPS,
  UP_DISTRICTS,
  type CropId,
  type CropQualityInput,
  type DistrictId,
  type LanguageCode,
} from '../data/upMandis';
import type { GroundingMode, GroundingSource } from '../utils/grounding';
import { triggerHaptic } from '../utils/haptics';
import { DISTRICT_GEO, type UiStrings } from '../utils/i18n';
import {
  formatINR,
  type RankedMandiProfit,
  type SellVsStoreAdvisory,
} from '../utils/mandiEngine';

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  groundingUsed?: 'search' | 'maps' | 'none';
  sources?: GroundingSource[];
}

function renderFormattedChatText(text: string) {
  const lines = text.split('\n');
  return lines.map((rawLine, lineIdx) => {
    const cleanedLine = rawLine.replace(/^\s*[-*]\s+/, '• ');
    const segments = cleanedLine.split(/(\*\*[^*]+\*\*)/g);
    return (
      <span key={lineIdx} className={lineIdx > 0 ? 'block mt-1' : 'block'}>
        {segments.map((segment, segIdx) => {
          if (segment.startsWith('**') && segment.endsWith('**') && segment.length > 4) {
            return (
              <strong key={segIdx} className="font-bold text-slate-950">
                {segment.slice(2, -2)}
              </strong>
            );
          }
          return <span key={segIdx}>{segment}</span>;
        })}
      </span>
    );
  });
}

interface FloatingAiChatbotProps {
  cropId: CropId;
  originDistrict: DistrictId;
  userGps: { lat: number; lng: number } | null;
  quantityQtl: number;
  quality: CropQualityInput;
  topMandi: RankedMandiProfit;
  advisory: SellVsStoreAdvisory;
  language: LanguageCode;
  t: UiStrings;
}

const QUICK_PROMPTS_BY_LANG: Record<LanguageCode, string[]> = {
  hi: [
    'आज यूपी में गेहूं/आलू का ताजा भाव और मौसम क्या है?',
    'मेरे पास नज़दीकी कोल्ड स्टोर और मंडी कहाँ हैं?',
    'मेरी फसल के लिए यह मंडी नंबर-1 क्यों है?',
  ],
  awadhi: [
    'आज यूपी मा आलू-गेहूं के ताजा भाव अउर मौसम का बा?',
    'हमारे पास नज़दीकी कोल्ड स्टोर अउर मंडी कहाँ बा?',
    'ई मंडी हमरे खातिर सबसे बढ़िया काहे बा?',
  ],
  bhojpuri: [
    'आज यूपी में ताजा मंडी भाव आ मौसम के का हाल बा?',
    'हमरे लगले कोल्ड स्टोर आ मंडी कहाँ बाटे?',
    'ई मंडी सबसे बेसी कमाई काहे देत बा?',
  ],
  en: [
    'Latest UP mandi price & weather update today?',
    'Find verified cold storages and mandis near me',
    'Why is this mandi ranked #1 for my crop?',
  ],
};

export function FloatingAiChatbot({
  cropId,
  originDistrict,
  userGps,
  quantityQtl,
  quality,
  topMandi,
  advisory,
  language,
  t,
}: FloatingAiChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedText, setLastFailedText] = useState<string | null>(null);
  const [groundingMode, setGroundingMode] = useState<GroundingMode>('auto');
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: 'init-1',
      role: 'assistant',
      text: t.chatbot.greeting,
    },
  ]);

  useEffect(() => {
    setMessages((prev) =>
      prev.length === 1 && prev[0].id === 'init-1'
        ? [{ id: 'init-1', role: 'assistant', text: t.chatbot.greeting }]
        : prev
    );
  }, [t.chatbot.greeting]);

  const scrollEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (isOpen) {
      scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, loading, error]);

  useEffect(() => {
    if (isOpen && window.innerWidth >= 640) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  const crop = CROPS[cropId];
  const district = UP_DISTRICTS.find((d) => d.id === originDistrict) ?? UP_DISTRICTS[0];
  const activeCoords = userGps ?? {
    lat: DISTRICT_GEO[originDistrict].lat,
    lng: DISTRICT_GEO[originDistrict].lng,
  };
  const quickPrompts = QUICK_PROMPTS_BY_LANG[language] ?? QUICK_PROMPTS_BY_LANG.hi;

  async function sendMessage(text: string, isRetry = false) {
    const clean = text.trim();
    if (!clean || loading) return;

    setError(null);
    setLastFailedText(null);

    // Avoid duplicating a trailing unanswered user bubble on retry
    const baseMessages =
      isRetry && messages.length > 0 && messages[messages.length - 1].role === 'user'
        ? messages.slice(0, -1)
        : messages;

    const nextMessages: ChatMsg[] = [
      ...baseMessages,
      { id: `u-${Date.now()}`, role: 'user', text: clean },
    ];
    setMessages(nextMessages);
    if (!isRetry) {
      setInput('');
    }
    setLoading(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const timeoutId = window.setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, text: m.text })),
          language,
          localeContext: {
            languageName: t.languageName,
            assistantTitle: t.chatbot.title,
            greeting: t.chatbot.greeting,
          },
          groundingMode,
          latLng: {
            latitude: activeCoords.lat,
            longitude: activeCoords.lng,
          },
          context: {
            crop: `${crop.nameEn} (${crop.nameHi})`,
            originDistrict: `${district.label} (${district.labelHi})`,
            quantityQtl,
            quality,
            topMandiName: `${topMandi.mandi.name} (${topMandi.mandi.nameHi})`,
            topMandiNetProfitRs: topMandi.netProfitRs,
            topMandiGradeAdjustedPricePerQtl: topMandi.gradeAdjustedPricePerQtl,
            sellVsStoreVerdict: advisory.verdict,
            sellVsStoreHeadline: advisory.headline,
            mspRatePerQtl: crop.msp.ratePerQtl,
            mspScheme: crop.msp.schemeName,
          },
        }),
      });

      const rawBody = await response.text();
      let data: {
        reply?: string;
        error?: string;
        groundingUsed?: 'search' | 'maps' | 'none';
        modelUsed?: string;
        sources?: GroundingSource[];
      } = {};
      try {
        data = rawBody ? JSON.parse(rawBody) : {};
      } catch (parseErr) {
        console.error('[FloatingAiChatbot] Failed to parse /api/chat JSON response:', {
          status: response.status,
          rawBody: rawBody.slice(0, 300),
          parseErr,
        });
        throw new Error('Server returned an unexpected response. Please try again.');
      }

      if (!response.ok || !data.reply) {
        console.error('[FloatingAiChatbot] /api/chat request failed:', {
          status: response.status,
          error: data.error,
          body: data,
        });
        throw new Error(data.error || 'AI Assistant could not respond. Please try again.');
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: data.reply!,
          groundingUsed: data.groundingUsed,
          sources: Array.isArray(data.sources) ? data.sources : [],
        },
      ]);
    } catch (err) {
      const isTimeout = err instanceof DOMException && err.name === 'AbortError';
      console.error('[FloatingAiChatbot] Error while contacting Gemini chat API:', {
        isTimeout,
        language,
        groundingMode,
        error: err,
      });
      setLastFailedText(clean);
      setError(
        isTimeout
          ? t.chatbot.timeoutError
          : err instanceof Error
            ? err.message
            : 'Unable to connect to AI Assistant.'
      );
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (input.trim()) {
      triggerHaptic('confirm');
    }
    sendMessage(input);
  }

  function handleClearChat() {
    abortRef.current?.abort();
    setLoading(false);
    setError(null);
    setLastFailedText(null);
    setMessages([
      {
        id: 'init-1',
        role: 'assistant',
        text: t.chatbot.greeting,
      },
    ]);
  }

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-40 flex flex-col items-end gap-3">
      {/* Chat Drawer Panel */}
      {isOpen && (
        <section
          aria-label="MandiMitra AI Help Chatbot"
          data-testid="floating-ai-chat-panel"
          className="w-[calc(100vw-2rem)] sm:w-[390px] bg-white border-2 border-slate-300 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[min(560px,calc(100dvh-6.5rem))]"
        >
          {/* Header */}
          <div className="px-4 py-3 bg-emerald-800 text-white flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-white" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2 className="font-display text-sm font-bold leading-tight truncate">
                  {t.chatbot.title}
                </h2>
                <p className="text-[11px] text-emerald-100 truncate">
                  {language !== 'en' ? crop.nameHi : crop.nameEn} ·{' '}
                  {language !== 'en' ? topMandi.mandi.nameHi : topMandi.mandi.districtLabel} (
                  {formatINR(topMandi.netProfitRs)})
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleClearChat}
                aria-label="Start new chat"
                title="Start new chat"
                className="p-1.5 rounded-lg text-emerald-100 hover:bg-emerald-700/70 hover:text-white"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label={t.chatbot.closeAria}
                className="p-1.5 rounded-lg text-emerald-100 hover:bg-emerald-700/70 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Grounding Mode Selector (Auto / Google Search / Google Maps) */}
          <div
            className="px-3.5 py-2 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between gap-2 shrink-0"
            role="group"
            aria-label={t.chatbot.liveDataLabel}
          >
            <span className="text-[11px] font-semibold text-emerald-950">
              {t.chatbot.liveDataLabel}
            </span>
            <div className="inline-flex items-center gap-1">
              {(
                [
                  { id: 'auto', label: t.chatbot.autoLabel, icon: Sparkles },
                  { id: 'search', label: t.chatbot.searchLabel, icon: Globe },
                  { id: 'maps', label: t.chatbot.mapsLabel, icon: MapPin },
                ] as const
              ).map(({ id, label, icon: Icon }) => {
                const active = groundingMode === id;
                return (
                  <button
                    key={id}
                    type="button"
                    data-testid={`chat-grounding-${id}`}
                    aria-pressed={active}
                    onClick={() => setGroundingMode(id)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                      active
                        ? 'bg-emerald-800 text-white'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-3 h-3" aria-hidden="true" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scrollable Conversation Thread */}
          <div
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            data-testid="chat-messages-list"
            className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3 bg-slate-50/70"
          >
            {messages.map((m) => (
              <div
                key={m.id}
                data-testid={m.role === 'assistant' ? 'chat-msg-assistant' : 'chat-msg-user'}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed whitespace-pre-line ${
                    m.role === 'user'
                      ? 'bg-emerald-800 text-white'
                      : 'bg-white text-slate-900 border border-slate-200'
                  }`}
                >
                  {m.role === 'assistant' ? renderFormattedChatText(m.text) : m.text}

                  {/* Grounded Google Search & Google Maps Sources */}
                  {m.role === 'assistant' && m.sources && m.sources.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1.5">
                      <p className="text-[10px] font-semibold text-slate-500">
                        {m.groundingUsed === 'maps'
                          ? t.chatbot.mapsSourcesLabel
                          : t.chatbot.webSourcesLabel}
                      </p>
                      <div className="flex flex-col gap-1">
                        {m.sources.map((src) => (
                          <a
                            key={src.uri}
                            href={src.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-start gap-1.5 text-[11px] font-semibold text-emerald-800 hover:underline break-words"
                          >
                            {src.type === 'maps' ? (
                              <MapPin className="w-3 h-3 mt-0.5 shrink-0 text-emerald-700" aria-hidden="true" />
                            ) : (
                              <Globe className="w-3 h-3 mt-0.5 shrink-0 text-sky-700" aria-hidden="true" />
                            )}
                            <span className="flex-1">
                              {src.title}
                              {src.snippet && (
                                <span className="block font-normal text-[10px] text-slate-500 mt-0.5">
                                  “{src.snippet.slice(0, 100)}”
                                </span>
                              )}
                            </span>
                            <ExternalLink className="w-3 h-3 mt-0.5 shrink-0" aria-hidden="true" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div
                data-testid="chat-loading"
                className="flex items-center gap-2 text-xs text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 w-fit"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" aria-hidden="true" />
                <span>
                  {groundingMode === 'maps'
                    ? t.chatbot.checkingMapsLabel
                    : t.chatbot.thinkingLabel}
                </span>
              </div>
            )}

            {error && (
              <div
                role="alert"
                data-testid="chat-error-alert"
                className="text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg p-2.5 flex items-start justify-between gap-2"
              >
                <span className="flex-1 leading-relaxed">{error}</span>
                {lastFailedText && (
                  <button
                    type="button"
                    data-testid="chat-retry-btn"
                    onClick={() => sendMessage(lastFailedText, true)}
                    className="px-2.5 py-1 rounded-md bg-red-700 hover:bg-red-800 text-white font-semibold shrink-0 transition-colors"
                  >
                    {t.chatbot.retryBtn}
                  </button>
                )}
              </div>
            )}
            <div ref={scrollEndRef} />
          </div>

          {/* Quick Help Prompts (shown before first user question to keep replies roomy) */}
          {messages.length <= 1 && (
            <div className="px-3.5 py-2 bg-white border-t border-slate-100 flex flex-wrap gap-1.5 shrink-0">
              {quickPrompts.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={loading}
                  onClick={() => sendMessage(q)}
                  className="text-[11px] font-medium text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md px-2.5 py-1.5 transition-colors text-left disabled:opacity-60"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Composer */}
          <form
            onSubmit={handleSubmit}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
          >
            <label htmlFor="floating-chat-input" className="sr-only">
              Ask MandiMitra AI anything
            </label>
            <input
              ref={inputRef}
              id="floating-chat-input"
              data-testid="floating-chat-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.chatbot.placeholder}
              className="flex-1 h-11 px-3.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
            <button
              type="submit"
              data-testid="floating-chat-send"
              disabled={!input.trim() || loading}
              aria-label="Send chat message"
              className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-emerald-800 hover:bg-emerald-900 disabled:bg-slate-300 text-white shrink-0 transition-colors"
            >
              <Send className="w-4 h-4" aria-hidden="true" />
            </button>
          </form>
        </section>
      )}

      {/* Floating Corner Icon Trigger */}
      <button
        type="button"
        onClick={() => {
          triggerHaptic('tap');
          setIsOpen((prev) => !prev);
        }}
        aria-label={isOpen ? t.chatbot.closeAria : t.chatbot.openAria}
        aria-expanded={isOpen}
        data-testid="floating-ai-chat-trigger"
        className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-800 hover:bg-emerald-900 text-white ring-2 ring-white shadow-xl transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
      >
        {isOpen ? (
          <X className="w-6 h-6" aria-hidden="true" />
        ) : (
          <MessageCircle className="w-6 h-6" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
