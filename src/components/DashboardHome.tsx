import {
  ArrowRight,
  BellRing,
  IndianRupee,
  MapPin,
  Mic,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react';
import {
  CROPS,
  UP_DISTRICTS,
  type CropId,
  type DistrictId,
  type LanguageCode,
} from '../data/upMandis';
import type { UiStrings } from '../utils/i18n';
import {
  formatINR,
  type RankedMandiProfit,
  type SellVsStoreAdvisory,
} from '../utils/mandiEngine';
import type { WorkspaceTab } from './TopBar';

interface DashboardHomeProps {
  cropId: CropId;
  onChangeCrop: (crop: CropId) => void;
  originDistrict: DistrictId;
  quantityQtl: number;
  topMandi: RankedMandiProfit;
  advisory: SellVsStoreAdvisory;
  activePoolCount: number;
  communityPostCount: number;
  activeAlertCount: number;
  unreadAlertCount: number;
  onOpenAlerts: () => void;
  language: LanguageCode;
  t: UiStrings;
  onSelectTab: (tab: WorkspaceTab) => void;
}

const CROP_LIST: CropId[] = ['aloo', 'gehu', 'dhaan', 'pyaz', 'sarson'];

export function DashboardHome({
  cropId,
  onChangeCrop,
  originDistrict,
  quantityQtl,
  topMandi,
  advisory,
  activePoolCount,
  communityPostCount,
  activeAlertCount,
  unreadAlertCount,
  onOpenAlerts,
  language,
  t,
  onSelectTab,
}: DashboardHomeProps) {
  const crop = CROPS[cropId];
  const district = UP_DISTRICTS.find((d) => d.id === originDistrict) ?? UP_DISTRICTS[0];
  const isHindiFamily = language !== 'en';
  const bestMandiDisplayName = isHindiFamily ? topMandi.mandi.nameHi : topMandi.mandi.name;

  const holdSummary =
    advisory.verdict === 'STORE_AND_HOLD'
      ? isHindiFamily
        ? `${advisory.optimalDay} दिन रुकें (+${formatINR(Math.max(0, advisory.optimalDayGainRs))})`
        : `Hold ${advisory.optimalDay} days (+${formatINR(Math.max(0, advisory.optimalDayGainRs))})`
      : isHindiFamily
        ? 'आज बेचना बेहतर'
        : 'Sell Today';

  const actionCards: Array<{
    id: Exclude<WorkspaceTab, 'home'>;
    title: string;
    description: string;
    liveMetricLabel: string;
    liveMetricValue: string;
    icon: typeof IndianRupee;
    iconBgClass: string;
    metricClass: string;
  }> = [
    {
      id: 'profit',
      title: t.dashboard.cards.profitTitle,
      description: t.dashboard.cards.profitDesc,
      liveMetricLabel: bestMandiDisplayName,
      liveMetricValue: formatINR(topMandi.netProfitRs),
      icon: IndianRupee,
      iconBgClass: 'bg-emerald-800 text-white',
      metricClass: 'text-emerald-900',
    },
    {
      id: 'forecast',
      title: t.dashboard.cards.forecastTitle,
      description: t.dashboard.cards.forecastDesc,
      liveMetricLabel:
        crop.msp.ratePerQtl > 0
          ? `MSP ${formatINR(crop.msp.ratePerQtl)}/qtl`
          : isHindiFamily
            ? '15 दिन का रुझान'
            : '15-Day Signal',
      liveMetricValue: holdSummary,
      icon: TrendingUp,
      iconBgClass: 'bg-amber-700 text-white',
      metricClass: 'text-amber-900',
    },
    {
      id: 'map',
      title: t.dashboard.cards.mapTitle,
      description: t.dashboard.cards.mapDesc,
      liveMetricLabel: `${district.label} → ${topMandi.mandi.districtLabel}`,
      liveMetricValue: `${topMandi.distanceKm} km`,
      icon: MapPin,
      iconBgClass: 'bg-sky-800 text-white',
      metricClass: 'text-sky-900',
    },
    {
      id: 'pools',
      title: t.dashboard.cards.poolsTitle,
      description: t.dashboard.cards.poolsDesc,
      liveMetricLabel: isHindiFamily
        ? `${activePoolCount} साझा ट्रक सक्रिय`
        : `${activePoolCount} active pools`,
      liveMetricValue:
        topMandi.pooledSavingsRs && topMandi.pooledSavingsRs > 0
          ? `+${formatINR(topMandi.pooledSavingsRs)}`
          : `${topMandi.congestionLoadPct}%`,
      icon: Truck,
      iconBgClass: 'bg-teal-800 text-white',
      metricClass: 'text-teal-900',
    },
    {
      id: 'voice',
      title: t.dashboard.cards.voiceTitle,
      description: t.dashboard.cards.voiceDesc,
      liveMetricLabel: 'WhatsApp · IVR Audio',
      liveMetricValue: t.languageName,
      icon: Mic,
      iconBgClass: 'bg-indigo-800 text-white',
      metricClass: 'text-indigo-900',
    },
    {
      id: 'community',
      title: t.dashboard.cards.communityTitle,
      description: t.dashboard.cards.communityDesc,
      liveMetricLabel: isHindiFamily ? 'किसान चर्चा व सलाह' : 'UP Farmer Discussions',
      liveMetricValue: `${communityPostCount} ${isHindiFamily ? 'पोस्ट' : 'posts'}`,
      icon: Users,
      iconBgClass: 'bg-slate-900 text-white',
      metricClass: 'text-slate-900',
    },
  ];

  return (
    <div data-testid="dashboard-home" className="space-y-6">
      {/* High-Contrast Field Summary Banner (Single Focal Anchor) */}
      <section
        aria-label={t.dashboard.headline}
        className="bg-slate-950 text-white rounded-2xl p-4 sm:p-7 space-y-3.5 sm:space-y-5"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 sm:gap-5">
          <div className="space-y-1 sm:space-y-1.5 max-w-2xl">
            <p className="text-xs sm:text-sm font-medium text-emerald-300">
              {isHindiFamily ? district.labelHi : district.label} · {district.weatherTempC}°C{' '}
              {district.weatherCondition}
            </p>
            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white [text-wrap:balance]">
              {t.dashboard.headline}
            </h1>
            <p className="hidden sm:block text-sm text-slate-300 leading-relaxed">
              {t.dashboard.subline}
            </p>
          </div>

          {/* Instant Cash-in-Hand Summary Box (High-Contrast Daylight Readout) */}
          <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 sm:px-5 sm:py-4 flex flex-row lg:flex-col items-center lg:items-end justify-between gap-2 shrink-0 sm:min-w-[240px]">
            <div>
              <p className="text-xs font-medium text-slate-200">
                {bestMandiDisplayName} · {quantityQtl} Qtl
              </p>
              <p
                data-testid="dashboard-hero-profit"
                className="font-mono tabular-nums text-2xl sm:text-4xl font-bold text-emerald-300 mt-0.5"
              >
                {formatINR(topMandi.netProfitRs)}
              </p>
            </div>
            <p className="text-xs font-semibold text-amber-200 text-right">{holdSummary}</p>
          </div>
        </div>

        {/* Large Touch-Friendly Crop Switcher Row (>= 44px hitboxes) */}
        <div className="pt-3 sm:pt-4 border-t border-white/15 flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3">
          <span className="text-xs sm:text-sm font-semibold text-slate-200 shrink-0">
            {t.dashboard.quickCropLabel}
          </span>
          <div
            className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2 flex-1"
            role="group"
            aria-label="Select crop"
          >
            {CROP_LIST.map((id) => {
              const item = CROPS[id];
              const active = cropId === id;
              return (
                <button
                  key={id}
                  type="button"
                  data-testid={`dash-crop-${id}`}
                  aria-pressed={active}
                  onClick={() => onChangeCrop(id)}
                  className={`min-h-[44px] px-3 sm:px-4 py-2 rounded-xl text-sm font-bold transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 ${
                    active
                      ? 'bg-emerald-400 text-slate-950'
                      : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
                  }`}
                >
                  {isHindiFamily ? item.nameHi : item.nameEn.split(' ')[0]}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            data-testid="dashboard-alerts-btn"
            onClick={onOpenAlerts}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
          >
            <BellRing className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{t.alerts.buttonLabel}</span>
            {(unreadAlertCount > 0 || activeAlertCount > 0) && (
              <span className="font-mono tabular-nums text-xs px-1.5 py-0.5 rounded-md bg-slate-950 text-amber-300">
                {unreadAlertCount > 0 ? unreadAlertCount : activeAlertCount}
              </span>
            )}
          </button>
        </div>
      </section>

      {/* Primary Card-Based Field Navigation Grid */}
      <section aria-label={t.dashboard.chooseAction} className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-lg sm:text-xl font-bold text-slate-950">
            {t.dashboard.chooseAction}
          </h2>
          <span className="text-xs sm:text-sm font-medium text-slate-600 hidden sm:inline">
            {isHindiFamily ? crop.nameHi : crop.nameEn} · {quantityQtl} Qtl
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {actionCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                type="button"
                data-testid={`dash-card-${card.id}`}
                onClick={() => onSelectTab(card.id)}
                className="group text-left bg-white border-2 border-slate-300 hover:border-slate-950 active:scale-[0.99] rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-4 sm:gap-5 min-h-[184px] sm:min-h-[196px] transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
              >
                {/* Top Row: High-Contrast Solid Icon + Live Key Value */}
                <div className="flex items-start justify-between gap-3 w-full">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${card.iconBgClass}`}
                  >
                    <Icon className="w-7 h-7 stroke-[2.25]" aria-hidden="true" />
                  </div>

                  <div className="flex flex-col items-end text-right min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-600 truncate max-w-full">
                      {card.liveMetricLabel}
                    </p>
                    <p
                      className={`font-mono tabular-nums text-base sm:text-xl font-bold mt-0.5 ${card.metricClass}`}
                    >
                      {card.liveMetricValue}
                    </p>
                  </div>
                </div>

                {/* Middle: Large High-Contrast Action Title & Plain Explanation */}
                <div className="space-y-1.5">
                  <h3 className="font-display text-xl sm:text-2xl font-bold text-slate-950 leading-snug">
                    {card.title}
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {card.description}
                  </p>
                </div>

                {/* Bottom Action Affordance */}
                <div className="pt-3 border-t border-slate-200 flex items-center justify-between w-full text-sm font-bold text-slate-950">
                  <span>{t.dashboard.openTool}</span>
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-slate-950 group-hover:text-white transition-colors">
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
