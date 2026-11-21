import { ArrowLeft, BellRing, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CommunityForumWorkspace } from './components/CommunityForumWorkspace';
import { CongestionPoolWorkspace } from './components/CongestionPoolWorkspace';
import { DashboardHome } from './components/DashboardHome';
import { FloatingAiChatbot } from './components/FloatingAiChatbot';
import { ForecastMspWorkspace } from './components/ForecastMspWorkspace';
import { MandiMapWorkspace } from './components/MandiMapWorkspace';
import { PriceAlertsPanel } from './components/PriceAlertsPanel';
import { ProfitGradeWorkspace } from './components/ProfitGradeWorkspace';
import { RegionLanguageBar } from './components/RegionLanguageBar';
import { TopBar, type WorkspaceTab } from './components/TopBar';
import { VoiceWhatsAppWorkspace } from './components/VoiceWhatsAppWorkspace';
import {
  CROPS,
  INITIAL_FORUM_POSTS,
  INITIAL_TRANSPORT_POOLS,
  UP_DISTRICTS,
  UP_MANDIS,
  type CropId,
  type CropQualityInput,
  type DistrictId,
  type ForumPost,
  type LanguageCode,
  type TransportPool,
  type VehicleTypeId,
} from './data/upMandis';
import {
  findNearestDistrict,
  getDefaultLanguageForDistrict,
  TRANSLATIONS,
} from './utils/i18n';
import {
  computeSellVsStoreAdvisory,
  rankMandisByNetProfit,
} from './utils/mandiEngine';
import { applyModerationAction, type ModerationAction } from './utils/moderation';
import {
  evaluatePriceAlerts,
  formatPriceAlertCopy,
  getEffectiveMandiPrices,
  type PriceAlertNotification,
  type PriceAlertRule,
} from './utils/priceAlerts';

const STORAGE_POOLS_KEY = 'mandimitra_pools_v1';
const STORAGE_FORUM_KEY = 'mandimitra_forum_v1';
const STORAGE_PREFS_KEY = 'mandimitra_region_prefs_v1';
const STORAGE_ALERT_RULES_KEY = 'mandimitra_price_alerts_v1';
const STORAGE_ALERT_HISTORY_KEY = 'mandimitra_alert_history_v1';
const STORAGE_ALERT_SEEN_KEY = 'mandimitra_alert_seen_v1';

const ALL_CROP_IDS: CropId[] = ['aloo', 'gehu', 'dhaan', 'pyaz', 'sarson'];

interface RegionPrefs {
  district: DistrictId;
  language: LanguageCode;
  autoRegion: boolean;
}

function loadStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Hydrates newly added Hindi localization fields onto seeded INITIAL_FORUM_POSTS
 * even if a returning browser session already cached older post JSON in localStorage.
 */
function hydrateLocalizedForumPosts(stored: ForumPost[]): ForumPost[] {
  const seedById = new Map(INITIAL_FORUM_POSTS.map((p) => [p.id, p]));
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

function getInitialNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return window.Notification.permission;
}

function playGentleAlertChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(784, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.14);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // Ignore autoplay/Web Audio restrictions
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('home');

  // Location & Regional Language preferences (default: Barabanki -> Hindi)
  const initialPrefs = loadStored<RegionPrefs>(STORAGE_PREFS_KEY, {
    district: 'barabanki',
    language: 'hi',
    autoRegion: true,
  });

  const [originDistrict, setOriginDistrict] = useState<DistrictId>(initialPrefs.district);
  const [language, setLanguage] = useState<LanguageCode>(initialPrefs.language);
  const [autoRegionLanguage, setAutoRegionLanguage] = useState<boolean>(initialPrefs.autoRegion);
  const [detectingGps, setDetectingGps] = useState(false);
  const [userGps, setUserGps] = useState<{ lat: number; lng: number } | null>(null);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);

  // Google Maps Platform key & Tier-1/Tier-2 quota defense state
  const [mapsApiKey, setMapsApiKey] = useState<string>(() => {
    const envKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
    return envKey && envKey !== 'MY_GOOGLE_MAPS_API_KEY' ? envKey : '';
  });
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);

  // Shared farmer lot state across all workspaces
  const [cropId, setCropId] = useState<CropId>('aloo');
  const [quantityQtl, setQuantityQtl] = useState<number>(20);
  const [vehicleId, setVehicleId] = useState<VehicleTypeId>('bolero_pickup');
  const [qualityByCrop, setQualityByCrop] = useState<Record<CropId, CropQualityInput>>({
    aloo: { ...CROPS.aloo.defaultQuality },
    gehu: { ...CROPS.gehu.defaultQuality },
    dhaan: { ...CROPS.dhaan.defaultQuality },
    pyaz: { ...CROPS.pyaz.defaultQuality },
    sarson: { ...CROPS.sarson.defaultQuality },
  });

  // Forecast controls
  const [holdDays, setHoldDays] = useState<number>(10);
  const [storageMode, setStorageMode] = useState<'cold_store' | 'farm_godown'>('cold_store');

  // Persisted Transport Pools & Community Forum
  const [pools, setPools] = useState<TransportPool[]>(() =>
    loadStored(STORAGE_POOLS_KEY, INITIAL_TRANSPORT_POOLS)
  );
  const [forumPosts, setForumPosts] = useState<ForumPost[]>(() =>
    hydrateLocalizedForumPosts(loadStored(STORAGE_FORUM_KEY, INITIAL_FORUM_POSTS))
  );

  // Local Price Notification System state
  const [alertRules, setAlertRules] = useState<PriceAlertRule[]>(() =>
    loadStored(STORAGE_ALERT_RULES_KEY, [])
  );
  const [alertHistory, setAlertHistory] = useState<PriceAlertNotification[]>(() =>
    loadStored(STORAGE_ALERT_HISTORY_KEY, [])
  );
  const [alertSeenKeys, setAlertSeenKeys] = useState<string[]>(() =>
    loadStored(STORAGE_ALERT_SEEN_KEY, [])
  );
  const [priceOffsetsByCrop, setPriceOffsetsByCrop] = useState<
    Partial<Record<CropId, Record<string, number>>>
  >({});
  const [alertsPanelOpen, setAlertsPanelOpen] = useState(false);
  const [activeToastNotif, setActiveToastNotif] = useState<PriceAlertNotification | null>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(
    getInitialNotificationPermission
  );
  const toastTimerRef = useRef<number | null>(null);

  const t = TRANSLATIONS[language];

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_PREFS_KEY,
        JSON.stringify({
          district: originDistrict,
          language,
          autoRegion: autoRegionLanguage,
        })
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [originDistrict, language, autoRegionLanguage]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_POOLS_KEY, JSON.stringify(pools));
    } catch {
      // Ignore storage quota errors
    }
  }, [pools]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_FORUM_KEY, JSON.stringify(forumPosts));
    } catch {
      // Ignore storage quota errors
    }
  }, [forumPosts]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ALERT_RULES_KEY, JSON.stringify(alertRules));
    } catch {
      // Ignore storage quota errors
    }
  }, [alertRules]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ALERT_HISTORY_KEY, JSON.stringify(alertHistory));
    } catch {
      // Ignore storage quota errors
    }
  }, [alertHistory]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ALERT_SEEN_KEY, JSON.stringify(alertSeenKeys));
    } catch {
      // Ignore storage quota errors
    }
  }, [alertSeenKeys]);

  // Listen for Google Maps Platform quota events globally at top-level App
  useEffect(() => {
    const handleQuota = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  // Load Google Maps API key from server env if not embedded in Vite env
  useEffect(() => {
    if (mapsApiKey) return;
    let active = true;
    fetch('/api/maps-config')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active && data?.apiKey) {
          setMapsApiKey(String(data.apiKey));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [mapsApiKey]);

  const livePricesByCrop = useMemo(() => {
    const map = {} as Record<CropId, Record<string, number>>;
    for (const id of ALL_CROP_IDS) {
      map[id] = getEffectiveMandiPrices(id, priceOffsetsByCrop[id] ?? {});
    }
    return map;
  }, [priceOffsetsByCrop]);

  const showToastNotification = useCallback((notif: PriceAlertNotification) => {
    setActiveToastNotif(notif);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setActiveToastNotif(null);
      toastTimerRef.current = null;
    }, 9000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const runAlertEvaluation = useCallback(
    (
      rulesToCheck: PriceAlertRule[],
      pricesMap: Record<CropId, Record<string, number>>,
      seenKeys: string[],
      lang: LanguageCode
    ) => {
      const nowLabel = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      const { triggered, updatedDedupeKeys } = evaluatePriceAlerts(
        rulesToCheck,
        pricesMap,
        seenKeys,
        nowLabel
      );

      if (triggered.length === 0) return;

      setAlertSeenKeys(updatedDedupeKeys);
      setAlertHistory((prev) => [...triggered, ...prev].slice(0, 40));
      showToastNotification(triggered[0]);
      playGentleAlertChime();

      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        window.Notification.permission === 'granted'
      ) {
        for (const item of triggered.slice(0, 3)) {
          const copy = formatPriceAlertCopy(item, lang);
          try {
            new window.Notification(copy.title, {
              body: copy.body,
              tag: item.dedupeKey,
            });
          } catch {
            // Ignore browser Notification construction errors in restricted contexts
          }
        }
      }
    },
    [showToastNotification]
  );

  // Periodic background rate check every 45s while rules exist
  useEffect(() => {
    if (alertRules.length === 0) return;
    const intervalId = window.setInterval(() => {
      runAlertEvaluation(alertRules, livePricesByCrop, alertSeenKeys, language);
    }, 45000);
    return () => window.clearInterval(intervalId);
  }, [alertRules, livePricesByCrop, alertSeenKeys, language, runAlertEvaluation]);

  const handleRequestBrowserPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotifPermission('unsupported');
      return;
    }
    try {
      const result = await window.Notification.requestPermission();
      setNotifPermission(result);
    } catch {
      setNotifPermission(window.Notification.permission);
    }
  };

  const handleAddAlertRule = (draft: Omit<PriceAlertRule, 'id' | 'createdAt'>) => {
    const created: PriceAlertRule = {
      ...draft,
      id: `rule-${Date.now()}`,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    const nextRules = [created, ...alertRules];
    setAlertRules(nextRules);
    runAlertEvaluation(nextRules, livePricesByCrop, alertSeenKeys, language);
  };

  const handleToggleAlertRule = (ruleId: string) => {
    const nextRules = alertRules.map((r) =>
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    );
    setAlertRules(nextRules);
    runAlertEvaluation(nextRules, livePricesByCrop, alertSeenKeys, language);
  };

  const handleDeleteAlertRule = (ruleId: string) => {
    setAlertRules((prev) => prev.filter((r) => r.id !== ruleId));
  };

  const handleCheckRatesNow = () => {
    // Allow re-evaluation against current rates cleanly
    runAlertEvaluation(alertRules, livePricesByCrop, [], language);
  };

  const handleSimulatePriceSurge = (targetCropId: CropId, deltaRs: number) => {
    const existingOffsets = priceOffsetsByCrop[targetCropId] ?? {};
    const updatedCropOffsets: Record<string, number> = { ...existingOffsets };
    for (const mandi of UP_MANDIS) {
      updatedCropOffsets[mandi.id] = (updatedCropOffsets[mandi.id] ?? 0) + deltaRs;
    }
    const nextOffsetsByCrop = {
      ...priceOffsetsByCrop,
      [targetCropId]: updatedCropOffsets,
    };
    setPriceOffsetsByCrop(nextOffsetsByCrop);

    const nextLivePrices: Record<CropId, Record<string, number>> = {
      ...livePricesByCrop,
      [targetCropId]: getEffectiveMandiPrices(targetCropId, updatedCropOffsets),
    };
    runAlertEvaluation(alertRules, nextLivePrices, alertSeenKeys, language);
  };

  const handleMarkAllAlertsRead = () => {
    setAlertHistory((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClearAlertHistory = () => {
    setAlertHistory([]);
    setAlertSeenKeys([]);
  };

  // Changing Home District automatically updates the region language when autoRegionLanguage is ON
  const handleSelectHomeDistrict = (nextDistrict: DistrictId) => {
    setOriginDistrict(nextDistrict);
    if (autoRegionLanguage) {
      const nextLang = getDefaultLanguageForDistrict(nextDistrict);
      setLanguage(nextLang);
      const distInfo = UP_DISTRICTS.find((d) => d.id === nextDistrict);
      setLocationNotice(
        `${distInfo?.labelHi ?? nextDistrict} (${distInfo?.label ?? nextDistrict}) → ${TRANSLATIONS[nextLang].languageName}`
      );
    } else {
      setLocationNotice(null);
    }
  };

  // Manual language button selection disables auto-override so user's explicit choice sticks
  const handleSelectLanguage = (nextLang: LanguageCode) => {
    setLanguage(nextLang);
    setAutoRegionLanguage(false);
    setLocationNotice(null);
  };

  const handleToggleAutoRegion = (enabled: boolean) => {
    setAutoRegionLanguage(enabled);
    if (enabled) {
      const nextLang = getDefaultLanguageForDistrict(originDistrict);
      setLanguage(nextLang);
    }
  };

  // Current GPS location -> nearest UP district & regional language
  const handleDetectGps = () => {
    setLocationNotice(null);
    if (!navigator.geolocation) {
      setLocationNotice(t.locationBar.gpsDenied);
      return;
    }
    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        const match = findNearestDistrict(pos.coords.latitude, pos.coords.longitude);
        setOriginDistrict(match.districtId);
        if (autoRegionLanguage) {
          setLanguage(match.language);
        }
        const distInfo = UP_DISTRICTS.find((d) => d.id === match.districtId);
        const nextStrings = TRANSLATIONS[autoRegionLanguage ? match.language : language];
        setLocationNotice(
          match.inUpRegion
            ? `${nextStrings.locationBar.gpsMatched}: ${distInfo?.labelHi} (${distInfo?.label}) · ${nextStrings.languageName}`
            : `${nextStrings.locationBar.gpsOutsideUp}: ${distInfo?.labelHi} (${distInfo?.label})`
        );
        setDetectingGps(false);
      },
      () => {
        setLocationNotice(t.locationBar.gpsDenied);
        setDetectingGps(false);
      },
      { enableHighAccuracy: false, timeout: 7000 }
    );
  };

  const currentQuality = qualityByCrop[cropId];

  const handleChangeQuality = (updated: CropQualityInput) => {
    setQualityByCrop((prev) => ({
      ...prev,
      [cropId]: updated,
    }));
  };

  const handleResetQuality = () => {
    setQualityByCrop((prev) => ({
      ...prev,
      [cropId]: { ...CROPS[cropId].defaultQuality },
    }));
  };

  const rankedMandis = useMemo(
    () =>
      rankMandisByNetProfit({
        cropId,
        originDistrict,
        quantityQtl,
        vehicleId,
        quality: currentQuality,
        pools,
      }),
    [cropId, originDistrict, quantityQtl, vehicleId, currentQuality, pools]
  );

  const topMandi = rankedMandis[0];
  const preferredDefaultMandiIds = useMemo(
    () => rankedMandis.slice(0, 2).map((r) => r.mandi.id),
    [rankedMandis]
  );
  const unreadAlertCount = useMemo(
    () => alertHistory.filter((n) => !n.read).length,
    [alertHistory]
  );
  const activeAlertCount = useMemo(
    () => alertRules.filter((r) => r.enabled).length,
    [alertRules]
  );

  const sellVsStoreAdvisory = useMemo(
    () =>
      computeSellVsStoreAdvisory({
        cropId,
        quantityQtl,
        bestMandiTodayNetProfitRs: topMandi.netProfitRs,
        bestMandiGradeAdjustedPrice: topMandi.gradeAdjustedPricePerQtl,
        holdDays,
        storageMode,
        moisturePercent: currentQuality.moisturePercent,
      }),
    [
      cropId,
      quantityQtl,
      topMandi.netProfitRs,
      topMandi.gradeAdjustedPricePerQtl,
      holdDays,
      storageMode,
      currentQuality.moisturePercent,
    ]
  );

  const handleJoinPool = (poolId: string, qtlToBook: number) => {
    setPools((prev) =>
      prev.map((p) => {
        if (p.id !== poolId || p.joinedByUser) return p;
        const added = Math.min(qtlToBook, Math.max(0, p.totalCapacityQtl - p.bookedQtl));
        if (added <= 0) return p;
        return {
          ...p,
          bookedQtl: p.bookedQtl + added,
          farmersJoined: p.farmersJoined + 1,
          joinedByUser: true,
          userBookedQtl: added,
        };
      })
    );
  };

  const handleCreatePool = (newPool: Omit<TransportPool, 'id'>) => {
    const created: TransportPool = {
      ...newPool,
      id: `pool-user-${Date.now()}`,
    };
    setPools((prev) => [created, ...prev]);
  };

  const handleCreateForumPost = (
    draft: Omit<
      ForumPost,
      'id' | 'createdAt' | 'helpfulCount' | 'reportedCount' | 'reportReasons' | 'comments'
    >
  ) => {
    const created: ForumPost = {
      ...draft,
      id: `post-${Date.now()}`,
      createdAt: 'Just now',
      createdAtHi: 'अभी',
      helpfulCount: 1,
      upvotedByUser: true,
      reportedCount: 0,
      reportReasons: [],
      comments: [],
    };
    setForumPosts((prev) => [created, ...prev]);
  };

  const handleAddForumComment = (
    postId: string,
    authorName: string,
    district: string,
    body: string
  ) => {
    setForumPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              comments: [
                ...p.comments,
                {
                  id: `c-${Date.now()}`,
                  authorName,
                  district,
                  createdAt: 'Just now',
                  createdAtHi: 'अभी',
                  body,
                },
              ],
            }
          : p
      )
    );
  };

  const handleToggleHelpful = (postId: string) => {
    setForumPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              upvotedByUser: !p.upvotedByUser,
              helpfulCount: p.upvotedByUser ? Math.max(0, p.helpfulCount - 1) : p.helpfulCount + 1,
            }
          : p
      )
    );
  };

  const handleModerate = (action: ModerationAction) => {
    setForumPosts((prev) => applyModerationAction(prev, action));
  };

  const activeToastCopy = activeToastNotif
    ? formatPriceAlertCopy(activeToastNotif, language)
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {mapsQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        unreadAlertCount={unreadAlertCount}
        onOpenAlerts={() => setAlertsPanelOpen(true)}
        t={t}
      />

      <RegionLanguageBar
        originDistrict={originDistrict}
        onSelectHomeDistrict={(next) => {
          setUserGps(null);
          handleSelectHomeDistrict(next);
        }}
        language={language}
        onSelectLanguage={handleSelectLanguage}
        autoRegionLanguage={autoRegionLanguage}
        onToggleAutoRegion={handleToggleAutoRegion}
        onDetectGps={handleDetectGps}
        detectingGps={detectingGps}
        locationNotice={locationNotice}
        t={t}
      />

      {/* High-Contrast In-App Local Price Alert Toast */}
      {activeToastNotif && activeToastCopy && (
        <div
          role="status"
          aria-live="polite"
          data-testid="price-alert-toast"
          className="fixed top-16 right-4 z-50 w-[calc(100vw-2rem)] sm:w-[390px] bg-slate-950 text-white border-2 border-amber-400 rounded-2xl p-4 shadow-2xl flex items-start gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
            <BellRing className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-xs font-bold text-amber-300">{t.alerts.modalTitle}</p>
            <p className="text-sm font-bold text-white leading-snug">{activeToastCopy.title}</p>
            <p className="text-xs text-slate-200 leading-relaxed">{activeToastCopy.body}</p>
            <button
              type="button"
              onClick={() => {
                setAlertsPanelOpen(true);
                setActiveToastNotif(null);
              }}
              className="mt-1 text-xs font-bold text-amber-300 underline hover:text-amber-200"
            >
              {t.alerts.historyTitle}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setActiveToastNotif(null)}
            aria-label={t.alerts.dismissToast}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <main className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
        {activeTab !== 'home' && (
          <div className="mb-5 flex items-center justify-between gap-3">
            <button
              type="button"
              data-testid="back-to-dashboard"
              onClick={() => setActiveTab('home')}
              className="min-h-[48px] px-4 py-2.5 rounded-xl bg-white border-2 border-slate-300 hover:border-slate-950 text-slate-950 text-sm sm:text-base font-bold inline-flex items-center gap-2.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
            >
              <ArrowLeft className="w-5 h-5 shrink-0 stroke-[2.25]" aria-hidden="true" />
              <span>{t.nav.backToHome}</span>
            </button>
          </div>
        )}

        {activeTab === 'home' && (
          <DashboardHome
            cropId={cropId}
            onChangeCrop={setCropId}
            originDistrict={originDistrict}
            quantityQtl={quantityQtl}
            topMandi={topMandi}
            advisory={sellVsStoreAdvisory}
            activePoolCount={pools.length}
            communityPostCount={forumPosts.filter((p) => !p.hidden).length}
            activeAlertCount={activeAlertCount}
            unreadAlertCount={unreadAlertCount}
            onOpenAlerts={() => setAlertsPanelOpen(true)}
            language={language}
            t={t}
            onSelectTab={setActiveTab}
          />
        )}

        {activeTab === 'profit' && (
          <ProfitGradeWorkspace
            cropId={cropId}
            onChangeCrop={setCropId}
            originDistrict={originDistrict}
            quantityQtl={quantityQtl}
            onChangeQuantity={setQuantityQtl}
            vehicleId={vehicleId}
            onChangeVehicle={setVehicleId}
            quality={currentQuality}
            onChangeQuality={handleChangeQuality}
            onResetQuality={handleResetQuality}
            rankedMandis={rankedMandis}
            advisory={sellVsStoreAdvisory}
            onNavigateTab={setActiveTab}
            language={language}
            t={t}
          />
        )}

        {activeTab === 'map' && (
          <MandiMapWorkspace
            mapsApiKey={mapsApiKey}
            cropId={cropId}
            originDistrict={originDistrict}
            userGps={userGps}
            rankedMandis={rankedMandis}
            language={language}
            t={t}
          />
        )}

        {activeTab === 'forecast' && (
          <ForecastMspWorkspace
            cropId={cropId}
            originDistrict={originDistrict}
            quantityQtl={quantityQtl}
            holdDays={holdDays}
            onChangeHoldDays={setHoldDays}
            storageMode={storageMode}
            onChangeStorageMode={setStorageMode}
            topMandi={topMandi}
            advisory={sellVsStoreAdvisory}
            t={t}
          />
        )}

        {activeTab === 'pools' && (
          <CongestionPoolWorkspace
            cropId={cropId}
            originDistrict={originDistrict}
            quantityQtl={quantityQtl}
            vehicleId={vehicleId}
            rankedMandis={rankedMandis}
            pools={pools}
            onJoinPool={handleJoinPool}
            onCreatePool={handleCreatePool}
            t={t}
          />
        )}

        {activeTab === 'voice' && (
          <VoiceWhatsAppWorkspace
            cropId={cropId}
            originDistrict={originDistrict}
            quantityQtl={quantityQtl}
            quality={currentQuality}
            rankedMandis={rankedMandis}
            advisory={sellVsStoreAdvisory}
            language={language}
            onChangeLanguage={handleSelectLanguage}
            t={t}
          />
        )}

        {activeTab === 'community' && (
          <CommunityForumWorkspace
            posts={forumPosts}
            onCreatePost={handleCreateForumPost}
            onAddComment={handleAddForumComment}
            onToggleHelpful={handleToggleHelpful}
            onModerate={handleModerate}
            language={language}
            t={t}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>MandiMitra · Uttar Pradesh Farmer Market Price Intelligence</span>
          <span>
            Agmarknet-modeled APMC data ·{' '}
            <a
              href="https://maps.google.com/help/terms_maps/?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-slate-700"
            >
              Google Maps Terms
            </a>
          </span>
        </div>
      </footer>

      <PriceAlertsPanel
        isOpen={alertsPanelOpen}
        onClose={() => setAlertsPanelOpen(false)}
        selectedCropId={cropId}
        preferredDefaultMandiIds={preferredDefaultMandiIds}
        livePricesByCrop={livePricesByCrop}
        rules={alertRules}
        notifications={alertHistory}
        notificationPermission={notifPermission}
        onRequestBrowserPermission={handleRequestBrowserPermission}
        onAddRule={handleAddAlertRule}
        onToggleRule={handleToggleAlertRule}
        onDeleteRule={handleDeleteAlertRule}
        onCheckRatesNow={handleCheckRatesNow}
        onSimulatePriceSurge={handleSimulatePriceSurge}
        onMarkAllRead={handleMarkAllAlertsRead}
        onClearHistory={handleClearAlertHistory}
        language={language}
        t={t}
      />

      <FloatingAiChatbot
        cropId={cropId}
        originDistrict={originDistrict}
        userGps={userGps}
        quantityQtl={quantityQtl}
        quality={currentQuality}
        topMandi={topMandi}
        advisory={sellVsStoreAdvisory}
        language={language}
        t={t}
      />
    </div>
  );
}
