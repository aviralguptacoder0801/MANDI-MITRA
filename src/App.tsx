import { ArrowLeft } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { CommunityForumWorkspace } from './components/CommunityForumWorkspace';
import { CongestionPoolWorkspace } from './components/CongestionPoolWorkspace';
import { DashboardHome } from './components/DashboardHome';
import { FloatingAiChatbot } from './components/FloatingAiChatbot';
import { ForecastMspWorkspace } from './components/ForecastMspWorkspace';
import { MandiMapWorkspace } from './components/MandiMapWorkspace';
import { ProfitGradeWorkspace } from './components/ProfitGradeWorkspace';
import { RegionLanguageBar } from './components/RegionLanguageBar';
import { TopBar, type WorkspaceTab } from './components/TopBar';
import { VoiceWhatsAppWorkspace } from './components/VoiceWhatsAppWorkspace';
import {
  CROPS,
  INITIAL_FORUM_POSTS,
  INITIAL_TRANSPORT_POOLS,
  UP_DISTRICTS,
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

const STORAGE_POOLS_KEY = 'mandimitra_pools_v1';
const STORAGE_FORUM_KEY = 'mandimitra_forum_v1';
const STORAGE_PREFS_KEY = 'mandimitra_region_prefs_v1';

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

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('home');

  // Location & Regional Language preferences (default: Barabanki -> Awadhi/Hindi auto-region)
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
    loadStored(STORAGE_FORUM_KEY, INITIAL_FORUM_POSTS)
  );

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

      <TopBar activeTab={activeTab} onSelectTab={setActiveTab} t={t} />

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
