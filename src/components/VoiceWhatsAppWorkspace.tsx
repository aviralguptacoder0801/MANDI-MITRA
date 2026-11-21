import {
  Check,
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  MapPin,
  Mic,
  PhoneCall,
  Send,
  Square,
  Volume2,
  VolumeX,
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
import type { GroundingSource } from '../utils/grounding';
import { DISTRICT_GEO, type UiStrings } from '../utils/i18n';
import {
  formatINR,
  type RankedMandiProfit,
  type SellVsStoreAdvisory,
} from '../utils/mandiEngine';

interface WhatsAppMessage {
  id: string;
  sender: 'farmer' | 'advisor';
  text: string;
  timestamp: string;
  language: LanguageCode;
  audioUrl?: string;
  groundingUsed?: 'search' | 'maps';
  sources?: GroundingSource[];
}

interface VoiceWhatsAppWorkspaceProps {
  cropId: CropId;
  originDistrict: DistrictId;
  quantityQtl: number;
  quality: CropQualityInput;
  rankedMandis: RankedMandiProfit[];
  advisory: SellVsStoreAdvisory;
  language: LanguageCode;
  onChangeLanguage: (lang: LanguageCode) => void;
  t: UiStrings;
}

const LANGUAGES: { id: LanguageCode; label: string; native: string; sampleQueries: string[] }[] = [
  {
    id: 'hi',
    label: 'Hindi',
    native: 'हिंदी',
    sampleQueries: [
      'क्या आज आलू बेचूं या 10 दिन कोल्ड स्टोर में रुकूं?',
      'मेरे जिले से सबसे ज्यादा शुद्ध मुनाफा किस मंडी में मिलेगा?',
      'क्या मेरी फसल सरकारी MSP खरीद के लिए सही है?',
    ],
  },
  {
    id: 'awadhi',
    label: 'Awadhi',
    native: 'अवधी',
    sampleQueries: [
      'भैया, हमार आलू आज दुबग्गा मंडी में बेचीं कि कुछ दिन रोकीं?',
      'बाराबंकी से कौन मंडी में भाड़ा काट के सबसे जादा फायदा होई?',
      'नमी जादा बा त मंडी में सही भाव कैसे मिली?',
    ],
  },
  {
    id: 'bhojpuri',
    label: 'Bhojpuri',
    native: 'भोजपुरी',
    sampleQueries: [
      'किसान भाई, हमार फसल आज बेचीं कि 8-10 दिन रुक के बेचीं?',
      'सबसे जादा मुनाफा कवन मंडी में मिली आ भाड़ा केतना लागी?',
      'सरकारी MSP केंद्र प धान भा गेहूं बेचे के का नियम बा?',
    ],
  },
  {
    id: 'en',
    label: 'English',
    native: 'English',
    sampleQueries: [
      'Should I sell my crop today or wait 10 days for better profit?',
      'Which UP mandi gives me the highest take-home profit after fuel and commission?',
      'How does my moisture percentage affect my fair price and MSP eligibility?',
    ],
  },
];

function nowTimeString(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function VoiceWhatsAppWorkspace({
  cropId,
  originDistrict,
  quantityQtl,
  quality,
  rankedMandis,
  advisory,
  language,
  onChangeLanguage,
  t,
}: VoiceWhatsAppWorkspaceProps) {
  const [inputText, setInputText] = useState('');
  const [loadingReply, setLoadingReply] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  const [copiedSlip, setCopiedSlip] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Release audio playback and microphone stream cleanly on unmount
  useEffect(() => {
    return () => {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const crop = CROPS[cropId];
  const district = UP_DISTRICTS.find((d) => d.id === originDistrict) ?? UP_DISTRICTS[0];
  const topMandi = rankedMandis[0];
  const localMandi =
    rankedMandis.find((r) => r.mandi.district === originDistrict) ?? rankedMandis[0];

  const [messages, setMessages] = useState<WhatsAppMessage[]>([
    {
      id: 'welcome-1',
      sender: 'advisor',
      language: 'hi',
      timestamp: '08:15 AM',
      text: `नमस्ते किसान भाई! मैं मंडीमित्र सलाहकार हूँ। आप हिंदी, अवधी, भोजपुरी या अंग्रेज़ी में बोलकर या लिखकर पूछ सकते हैं — जैसे "क्या आज ${crop.nameHi} बेचूं या रुकूं?" — और मैं मंडी भाव, भाड़ा, नमी-ग्रेड और सरकारी MSP जोड़कर सही सलाह दूंगा।`,
    },
  ]);

  const activeLangObj = LANGUAGES.find((l) => l.id === language) ?? LANGUAGES[0];

  function buildLiveContext() {
    return {
      crop: `${crop.nameEn} (${crop.nameHi})`,
      originDistrict: `${district.label} (${district.labelHi})`,
      quantityQtl,
      cropQuality: {
        variety: quality.varietyNote,
        moisturePercent: quality.moisturePercent,
        idealFaqMoistureMax: crop.idealMoistureMax,
        sizeGrade: quality.sizeGrade,
        damagePercent: quality.damagePercent,
        foreignMatterPercent: quality.foreignMatterPercent,
      },
      topRankedMandis: rankedMandis.slice(0, 3).map((m) => ({
        mandiName: m.mandi.name,
        distanceKm: m.distanceKm,
        gradeAdjustedPricePerQtl: m.gradeAdjustedPricePerQtl,
        totalDeductionsRs: m.totalDeductionsRs,
        netTakeHomeProfitRs: m.netProfitRs,
        congestionStatus: `${m.congestionStatus} (${m.congestionLoadPct}% load, ${m.mandi.avgWaitHours}h wait)`,
        pooledSavingsAvailableRs: m.pooledSavingsRs ?? 0,
      })),
      localHomeMandi: {
        mandiName: localMandi.mandi.name,
        netTakeHomeProfitRs: localMandi.netProfitRs,
        congestionStatus: `${localMandi.congestionStatus} (${localMandi.congestionLoadPct}%)`,
      },
      sellVsStoreForecast: {
        verdict: advisory.verdict,
        optimalHoldDays: advisory.optimalDay,
        projectedExtraGainRs: advisory.optimalDayGainRs,
        weatherRisk: `${advisory.weatherRiskLabel} — ${crop.weatherRisk.summary}`,
        headline: advisory.headline,
      },
      upMspScheme: {
        hasOfficialMsp: crop.msp.hasOfficialMsp,
        ratePerQtl: crop.msp.ratePerQtl,
        schemeName: crop.msp.schemeName,
        procurementWindow: crop.msp.procurementWindow,
        recommendation: advisory.mspRecommendation,
      },
    };
  }

  async function sendFarmerQuery(queryText: string) {
    const clean = queryText.trim();
    if (!clean || loadingReply) return;

    setErrorMsg(null);
    const userMsg: WhatsAppMessage = {
      id: `farmer-${Date.now()}`,
      sender: 'farmer',
      text: clean,
      timestamp: nowTimeString(),
      language,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoadingReply(true);

    try {
      const originGeo = DISTRICT_GEO[originDistrict];
      const response = await fetch('/api/advisory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: clean,
          language,
          groundingMode: 'auto',
          latLng: { latitude: originGeo.lat, longitude: originGeo.lng },
          context: buildLiveContext(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Advisory service returned an error.');
      }

      const advisorMsg: WhatsAppMessage = {
        id: `advisor-${Date.now()}`,
        sender: 'advisor',
        text: data.reply,
        timestamp: nowTimeString(),
        language,
        groundingUsed: data.groundingUsed,
        sources: Array.isArray(data.sources) ? data.sources : [],
      };
      setMessages((prev) => [...prev, advisorMsg]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to reach MandiMitra advisor.');
    } finally {
      setLoadingReply(false);
    }
  }

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    sendFarmerQuery(inputText);
  }

  async function handlePlayAudio(msg: WhatsAppMessage) {
    // Stop currently playing audio
    if (playingMsgId === msg.id) {
      activeAudioRef.current?.pause();
      activeAudioRef.current = null;
      setPlayingMsgId(null);
      return;
    }

    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
      setPlayingMsgId(null);
    }

    if (msg.audioUrl) {
      const audio = new Audio(msg.audioUrl);
      activeAudioRef.current = audio;
      setPlayingMsgId(msg.id);
      audio.onended = () => setPlayingMsgId(null);
      audio.play().catch(() => setPlayingMsgId(null));
      return;
    }

    setLoadingAudioId(msg.id);
    setErrorMsg(null);
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: msg.text, language: msg.language }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Could not synthesize IVR voice audio.');
      }
      const dataUrl = `data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`;
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, audioUrl: dataUrl } : m))
      );

      const audio = new Audio(dataUrl);
      activeAudioRef.current = audio;
      setPlayingMsgId(msg.id);
      audio.onended = () => setPlayingMsgId(null);
      await audio.play();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'IVR audio playback failed.');
      setPlayingMsgId(null);
    } finally {
      setLoadingAudioId(null);
    }
  }

  async function toggleVoiceRecording() {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }

    setErrorMsg(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMsg('Microphone recording is unavailable in this browser. Type or tap a sample voice query below.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (blob.size < 200) return;

        setTranscribing(true);
        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const str = String(reader.result ?? '');
              resolve(str.split(',')[1] ?? '');
            };
            reader.onerror = () => reject(new Error('Audio read error'));
            reader.readAsDataURL(blob);
          });

          const res = await fetch('/api/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioBase64: base64, mimeType, language }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Voice transcription failed.');
          if (data.transcript) {
            await sendFarmerQuery(data.transcript);
          }
        } catch (err) {
          setErrorMsg(err instanceof Error ? err.message : 'Could not transcribe audio.');
        } finally {
          setTranscribing(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setErrorMsg('Microphone permission denied. You can type or tap any regional question below.');
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <p className="text-xs font-medium text-emerald-800 mb-1">
            Hindi · Awadhi · Bhojpuri · English · Feature-Phone IVR &amp; WhatsApp Interface
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {t.voice.title}
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            {t.voice.subtitle}
          </p>
        </div>

        {/* Language / Dialect Selector */}
        <div
          className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0"
          role="group"
          aria-label="Select regional language or dialect"
        >
          {LANGUAGES.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => onChangeLanguage(l.id)}
              aria-pressed={language === l.id}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                language === l.id
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {l.native}
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Live Grounded Context & One-Tap Voice Queries */}
        <aside className="lg:col-span-4 space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-emerald-700" aria-hidden="true" />
              <h2 className="font-display text-base font-bold text-slate-900">
                Active Farm Context Shared with Advisor
              </h2>
            </div>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-slate-500">Crop &amp; Quantity</dt>
                <dd className="font-semibold text-slate-900">
                  {crop.nameEn} · <span className="font-mono tabular-nums">{quantityQtl} Qtl</span>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Origin District</dt>
                <dd className="font-semibold text-slate-900">{district.label}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Quality Profile</dt>
                <dd className="font-mono tabular-nums font-medium text-slate-800">
                  {quality.moisturePercent}% moist · {quality.sizeGrade}
                </dd>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-100">
                <dt className="text-slate-500">Best Take-Home Mandi</dt>
                <dd className="font-semibold text-emerald-800 text-right">
                  {topMandi.mandi.districtLabel} ({formatINR(topMandi.netProfitRs)})
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">15-Day Trend Signal</dt>
                <dd className="font-semibold text-slate-900">
                  {advisory.verdict === 'STORE_AND_HOLD'
                    ? `Hold ${advisory.optimalDay} days`
                    : 'Sell Now'}
                </dd>
              </div>
            </dl>
            <button
              type="button"
              data-testid="copy-whatsapp-advisory-btn"
              onClick={async () => {
                const isHi = language !== 'en';
                const slip = isHi
                  ? `मंडीमित्र सलाह (${crop.nameHi}, ${quantityQtl} क्विंटल, ${district.labelHi})\n• सबसे अच्छी मंडी: ${topMandi.mandi.nameHi} (${formatINR(topMandi.gradeAdjustedPricePerQtl)}/क्विंटल)\n• खर्च काटकर शुद्ध कमाई: ${formatINR(topMandi.netProfitRs)}\n• 15-दिन सलाह: ${advisory.verdict === 'STORE_AND_HOLD' ? `${advisory.optimalDay} दिन रुकें (+${formatINR(advisory.optimalDayGainRs)})` : 'आज बेचना बेहतर'}\n• सरकारी MSP: ${crop.msp.ratePerQtl > 0 ? `${formatINR(crop.msp.ratePerQtl)}/क्विंटल (${crop.msp.schemeName})` : crop.msp.schemeName}`
                  : `MandiMitra Advisory (${crop.nameEn}, ${quantityQtl} Qtl, ${district.label})\n• Best Mandi: ${topMandi.mandi.name} (${formatINR(topMandi.gradeAdjustedPricePerQtl)}/qtl)\n• Take-Home Net Profit: ${formatINR(topMandi.netProfitRs)}\n• 15-Day Verdict: ${advisory.headline}\n• UP MSP Scheme: ${crop.msp.ratePerQtl > 0 ? `${formatINR(crop.msp.ratePerQtl)}/qtl (${crop.msp.schemeName})` : crop.msp.schemeName}`;
                try {
                  await navigator.clipboard.writeText(slip);
                  setCopiedSlip(true);
                  window.setTimeout(() => setCopiedSlip(false), 2500);
                } catch {
                  // Ignore clipboard restrictions
                }
              }}
              className="w-full min-h-[40px] mt-2 px-3 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-950 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors"
            >
              {copiedSlip ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                  <span>{t.profit.copiedSlip}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                  <span>{t.profit.copySlip}</span>
                </>
              )}
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <h2 className="font-display text-base font-bold text-slate-900">
              Tap to Ask in {activeLangObj.label} ({activeLangObj.native})
            </h2>
            <p className="text-xs text-slate-500">
              Try a real farmer question in {activeLangObj.label}—the advisor calculates from your live crop, quality, and mandi data.
            </p>
            <div className="space-y-2">
              {activeLangObj.sampleQueries.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={loadingReply}
                  onClick={() => sendFarmerQuery(q)}
                  className="w-full text-left px-3.5 py-2.5 text-xs font-medium text-slate-800 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-lg transition-colors disabled:opacity-60"
                >
                  “{q}”
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Right: WhatsApp & IVR Conversational Thread */}
        <section
          aria-label="WhatsApp and IVR advisor conversation"
          className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col min-h-[540px]"
        >
          {/* WhatsApp Header */}
          <div className="px-5 py-3.5 bg-emerald-900 text-white flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold">
                MandiMitra WhatsApp &amp; IVR Sahayak
              </h2>
              <p className="text-xs text-emerald-100">
                Mode: {activeLangObj.label} ({activeLangObj.native}) · Toll-Free IVR 1800-XXX-MANDI Simulation
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-100 whitespace-nowrap">
              {crop.nameHi} · {district.labelHi}
            </span>
          </div>

          {/* Chat Canvas */}
          <div
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            data-testid="whatsapp-thread"
            className="flex-1 p-5 space-y-4 overflow-y-auto max-h-[420px] bg-slate-50/70"
          >
            {messages.map((msg) => {
              const isFarmer = msg.sender === 'farmer';
              const isPlaying = playingMsgId === msg.id;
              const isLoadingAudio = loadingAudioId === msg.id;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isFarmer ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed border ${
                      isFarmer
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-white text-slate-800 border-slate-200'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>
                    {!isFarmer && msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                        {msg.sources.map((src) => (
                          <a
                            key={src.uri}
                            href={src.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-50"
                          >
                            {src.type === 'maps' ? (
                              <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
                            ) : (
                              <Globe className="w-3 h-3 shrink-0" aria-hidden="true" />
                            )}
                            <span>{src.title}</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
                          </a>
                        ))}
                      </div>
                    )}
                    <div
                      className={`mt-2 flex items-center justify-between gap-4 text-[11px] ${
                        isFarmer ? 'text-emerald-100' : 'text-slate-500'
                      }`}
                    >
                      <span>{msg.timestamp}</span>
                      {!isFarmer && (
                        <button
                          type="button"
                          onClick={() => handlePlayAudio(msg)}
                          disabled={isLoadingAudio}
                          className="inline-flex items-center gap-1 font-semibold text-emerald-800 hover:text-emerald-950 disabled:opacity-60"
                        >
                          {isLoadingAudio ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                          ) : isPlaying ? (
                            <VolumeX className="w-3.5 h-3.5" aria-hidden="true" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                          <span>
                            {isLoadingAudio
                              ? 'Preparing IVR Voice...'
                              : isPlaying
                                ? 'Stop Voice'
                                : 'Listen (IVR Audio)'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {(loadingReply || transcribing) && (
              <div className="flex items-center gap-2 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 w-fit">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" aria-hidden="true" />
                <span>
                  {transcribing
                    ? 'Transcribing farmer voice note...'
                    : `Preparing ${activeLangObj.label} advisory with live mandi rates...`}
                </span>
              </div>
            )}

            {errorMsg && (
              <p
                role="alert"
                className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3"
              >
                {errorMsg}
              </p>
            )}
          </div>

          {/* Input Bar + Mic Recording */}
          <form
            onSubmit={handleFormSubmit}
            className="p-3.5 bg-white border-t border-slate-200 flex items-center gap-2"
          >
            <button
              type="button"
              onClick={toggleVoiceRecording}
              disabled={transcribing || loadingReply}
              aria-label={recording ? 'Stop voice recording' : 'Record regional voice note'}
              className={`inline-flex items-center justify-center w-10 h-10 rounded-lg border transition-colors shrink-0 ${
                recording
                  ? 'bg-red-600 text-white border-red-600 hover:bg-red-700'
                  : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              {recording ? (
                <Square className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Mic className="w-4 h-4" aria-hidden="true" />
              )}
            </button>

            <label htmlFor="whatsapp-input" className="sr-only">
              Ask a mandi price question in Hindi, Awadhi, Bhojpuri, or English
            </label>
            <input
              id="whatsapp-input"
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t.voice.askPlaceholder}
              className="flex-1 h-10 px-3.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || loadingReply}
              className="inline-flex items-center gap-1.5 h-10 px-4 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Send className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t.voice.sendBtn}</span>
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
