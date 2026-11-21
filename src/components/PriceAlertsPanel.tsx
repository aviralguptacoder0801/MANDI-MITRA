import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Plus,
  RefreshCw,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  CROPS,
  UP_MANDIS,
  type CropId,
  type LanguageCode,
} from '../data/upMandis';
import { triggerHaptic } from '../utils/haptics';
import type { UiStrings } from '../utils/i18n';
import { formatINR } from '../utils/mandiEngine';
import type {
  AlertDirection,
  PriceAlertNotification,
  PriceAlertRule,
} from '../utils/priceAlerts';

interface PriceAlertsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCropId: CropId;
  preferredDefaultMandiIds: string[];
  livePricesByCrop: Record<CropId, Record<string, number>>;
  rules: PriceAlertRule[];
  notifications: PriceAlertNotification[];
  notificationPermission: NotificationPermission | 'unsupported';
  onRequestBrowserPermission: () => Promise<void>;
  onAddRule: (rule: Omit<PriceAlertRule, 'id' | 'createdAt'>) => void;
  onToggleRule: (ruleId: string) => void;
  onDeleteRule: (ruleId: string) => void;
  onCheckRatesNow: () => void;
  onSimulatePriceSurge: (cropId: CropId, deltaRs: number) => void;
  onMarkAllRead: () => void;
  onClearHistory: () => void;
  language: LanguageCode;
  t: UiStrings;
}

const CROP_IDS: CropId[] = ['aloo', 'gehu', 'dhaan', 'pyaz', 'sarson'];

export function PriceAlertsPanel({
  isOpen,
  onClose,
  selectedCropId,
  preferredDefaultMandiIds,
  livePricesByCrop,
  rules,
  notifications,
  notificationPermission,
  onRequestBrowserPermission,
  onAddRule,
  onToggleRule,
  onDeleteRule,
  onCheckRatesNow,
  onSimulatePriceSurge,
  onMarkAllRead,
  onClearHistory,
  language,
  t,
}: PriceAlertsPanelProps) {
  const isHindiFamily = language !== 'en';
  const [formCropId, setFormCropId] = useState<CropId>(selectedCropId);
  const [direction, setDirection] = useState<AlertDirection>('above');
  const [selectedMandiIds, setSelectedMandiIds] = useState<string[]>(
    preferredDefaultMandiIds.slice(0, 2)
  );
  const [thresholdInput, setThresholdInput] = useState<number>(() => {
    const firstId = preferredDefaultMandiIds[0] ?? UP_MANDIS[0].id;
    const base = livePricesByCrop[selectedCropId]?.[firstId] ?? 1600;
    return Math.round((base + 50) / 10) * 10;
  });

  // Sync default crop & suggested threshold whenever modal opens
  useEffect(() => {
    if (!isOpen) return;
    setFormCropId(selectedCropId);
    const defaultIds = preferredDefaultMandiIds.slice(0, 2);
    setSelectedMandiIds(defaultIds.length > 0 ? defaultIds : [UP_MANDIS[0].id]);
    const firstId = defaultIds[0] ?? UP_MANDIS[0].id;
    const current = livePricesByCrop[selectedCropId]?.[firstId] ?? 1600;
    setThresholdInput(Math.round((current + 50) / 10) * 10);
  }, [isOpen, selectedCropId]);

  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    closeBtnRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const cropPrices = livePricesByCrop[formCropId] ?? {};

  function handleCropChange(nextCrop: CropId) {
    setFormCropId(nextCrop);
    const firstId = selectedMandiIds[0] ?? UP_MANDIS[0].id;
    const base = livePricesByCrop[nextCrop]?.[firstId] ?? 1600;
    setThresholdInput(Math.round((base + 50) / 10) * 10);
  }

  function toggleMandi(mandiId: string) {
    setSelectedMandiIds((prev) =>
      prev.includes(mandiId)
        ? prev.length > 1
          ? prev.filter((id) => id !== mandiId)
          : prev
        : [...prev, mandiId]
    );
  }

  function handleCreateRule(e: FormEvent) {
    e.preventDefault();
    if (selectedMandiIds.length === 0 || !Number.isFinite(thresholdInput) || thresholdInput < 100) {
      triggerHaptic('warning');
      return;
    }
    triggerHaptic('confirm');
    onAddRule({
      cropId: formCropId,
      mandiIds: selectedMandiIds,
      thresholdPricePerQtl: Math.round(thresholdInput),
      direction,
      enabled: true,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-[1px] flex items-center justify-center p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="price-alerts-title"
      data-testid="price-alerts-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border-2 border-slate-300 rounded-2xl w-full max-w-2xl max-h-[min(90dvh,780px)] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950 text-white flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
              <BellRing className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="price-alerts-title" className="font-display text-lg sm:text-xl font-bold">
                {t.alerts.modalTitle}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                {t.alerts.modalSubtitle}
              </p>
            </div>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label={t.alerts.dismissToast}
            data-testid="close-price-alerts-btn"
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-6">
          {/* Browser Notification Permission Strip */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-800">
              <Bell className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
              <span>
                {notificationPermission === 'granted'
                  ? t.alerts.browserNotifGranted
                  : notificationPermission === 'denied'
                    ? t.alerts.browserNotifDenied
                    : notificationPermission === 'unsupported'
                      ? t.alerts.browserNotifUnsupported
                      : t.alerts.browserNotifEnable}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {notificationPermission === 'default' && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('tap');
                    onRequestBrowserPermission();
                  }}
                  data-testid="enable-browser-notif-btn"
                  className="px-3.5 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition-colors whitespace-nowrap"
                >
                  {t.alerts.browserNotifEnable}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('tap');
                  onCheckRatesNow();
                }}
                data-testid="check-rates-now-btn"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-300 hover:border-slate-900 text-slate-900 text-xs font-semibold transition-colors whitespace-nowrap"
              >
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t.alerts.checkLiveNowBtn}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('tap');
                  onSimulatePriceSurge(formCropId, 100);
                }}
                data-testid="simulate-price-surge-btn"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-100 border border-amber-300 hover:bg-amber-200 text-amber-950 text-xs font-bold transition-colors whitespace-nowrap"
              >
                <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t.alerts.simulateSurgeBtn}</span>
              </button>
            </div>
          </div>

          {/* Create New Alert Rule Form */}
          <form
            onSubmit={handleCreateRule}
            className="rounded-xl border-2 border-slate-200 bg-white p-4 sm:p-5 space-y-4"
          >
            <h3 className="font-display text-base font-bold text-slate-950">
              {t.alerts.createTitle}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Crop Selector */}
              <div>
                <label
                  htmlFor="alert-crop-select"
                  className="block text-xs font-bold text-slate-700 mb-1"
                >
                  {t.alerts.cropLabel}
                </label>
                <select
                  id="alert-crop-select"
                  data-testid="alert-crop-select"
                  value={formCropId}
                  onChange={(e) => handleCropChange(e.target.value as CropId)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-900"
                >
                  {CROP_IDS.map((id) => (
                    <option key={id} value={id}>
                      {isHindiFamily ? CROPS[id].nameHi : CROPS[id].nameEn}
                    </option>
                  ))}
                </select>
              </div>

              {/* Condition Direction */}
              <div>
                <span className="block text-xs font-bold text-slate-700 mb-1">
                  {t.alerts.directionLabel}
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    data-testid="alert-dir-above"
                    aria-pressed={direction === 'above'}
                    title={t.alerts.aboveLabel}
                    onClick={() => setDirection('above')}
                    className={`h-11 px-2 rounded-xl text-xs font-bold border transition-colors inline-flex items-center justify-center gap-1 whitespace-nowrap ${
                      direction === 'above'
                        ? 'bg-emerald-800 text-white border-emerald-800'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{isHindiFamily ? 'ऊपर (≥)' : 'Above (≥)'}</span>
                  </button>
                  <button
                    type="button"
                    data-testid="alert-dir-below"
                    aria-pressed={direction === 'below'}
                    title={t.alerts.belowLabel}
                    onClick={() => setDirection('below')}
                    className={`h-11 px-2 rounded-xl text-xs font-bold border transition-colors inline-flex items-center justify-center gap-1 whitespace-nowrap ${
                      direction === 'below'
                        ? 'bg-amber-700 text-white border-amber-700'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <TrendingDown className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{isHindiFamily ? 'नीचे (≤)' : 'Below (≤)'}</span>
                  </button>
                </div>
              </div>

              {/* Threshold Price */}
              <div>
                <label
                  htmlFor="alert-threshold-input"
                  className="block text-xs font-bold text-slate-700 mb-1"
                >
                  {t.alerts.thresholdLabel}
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setThresholdInput((v) => Math.max(100, v - 50))}
                    aria-label="Decrease threshold by 50"
                    className="h-11 w-10 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 font-bold text-slate-900 shrink-0"
                  >
                    -
                  </button>
                  <input
                    id="alert-threshold-input"
                    data-testid="alert-threshold-input"
                    type="number"
                    min={100}
                    step={10}
                    required
                    value={thresholdInput}
                    onChange={(e) => setThresholdInput(Number(e.target.value))}
                    className="w-full h-11 px-3 rounded-xl border border-slate-300 font-mono tabular-nums text-sm font-bold text-slate-900 text-center"
                  />
                  <button
                    type="button"
                    onClick={() => setThresholdInput((v) => v + 50)}
                    aria-label="Increase threshold by 50"
                    className="h-11 w-10 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 font-bold text-slate-900 shrink-0"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Preferred Mandis Multi-Select Grid */}
            <div>
              <span className="block text-xs font-bold text-slate-700 mb-2">
                {t.alerts.preferredMandisLabel}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {UP_MANDIS.map((mandi) => {
                  const selected = selectedMandiIds.includes(mandi.id);
                  const liveRate = cropPrices[mandi.id] ?? mandi.modalPrices[formCropId];
                  return (
                    <button
                      key={mandi.id}
                      type="button"
                      data-testid={`alert-mandi-${mandi.id}`}
                      aria-pressed={selected}
                      onClick={() => toggleMandi(mandi.id)}
                      className={`min-h-[44px] px-3 py-2 rounded-xl border text-left flex items-center justify-between gap-2 transition-colors ${
                        selected
                          ? 'bg-emerald-50 border-emerald-700 text-emerald-950'
                          : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border ${
                            selected
                              ? 'bg-emerald-800 border-emerald-800 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {selected && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
                        </span>
                        <span className="text-xs font-bold truncate">
                          {isHindiFamily ? mandi.nameHi : mandi.name}
                        </span>
                      </div>
                      <span className="font-mono tabular-nums text-xs font-bold text-slate-700 shrink-0">
                        {formatINR(liveRate)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                data-testid="save-alert-rule-btn"
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-bold inline-flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>{t.alerts.saveAlertBtn}</span>
              </button>
            </div>
          </form>

          {/* Active Rules List */}
          <section className="space-y-3">
            <h3 className="font-display text-base font-bold text-slate-950">
              {t.alerts.activeRulesTitle} ({rules.length})
            </h3>
            {rules.length === 0 ? (
              <p className="text-xs sm:text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-4">
                {t.alerts.noRulesText}
              </p>
            ) : (
              <ul className="space-y-2.5">
                {rules.map((rule) => {
                  const crop = CROPS[rule.cropId];
                  const mandiLabels = rule.mandiIds
                    .map((id) => {
                      const m = UP_MANDIS.find((u) => u.id === id);
                      return m ? (isHindiFamily ? m.nameHi : m.name) : id;
                    })
                    .join(', ');
                  return (
                    <li
                      key={rule.id}
                      data-testid={`alert-rule-${rule.id}`}
                      className={`rounded-xl border p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        rule.enabled
                          ? 'bg-white border-slate-300'
                          : 'bg-slate-50 border-slate-200 opacity-70'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-950">
                          <span>{isHindiFamily ? crop.nameHi : crop.nameEn}</span>
                          <span className="font-mono tabular-nums text-emerald-800">
                            {rule.direction === 'above' ? '≥' : '≤'}{' '}
                            {formatINR(rule.thresholdPricePerQtl)}/qtl
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 truncate">{mandiLabels}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onToggleRule(rule.id)}
                          aria-pressed={rule.enabled}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                            rule.enabled
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                              : 'bg-white border-slate-300 text-slate-600'
                          }`}
                        >
                          {rule.enabled ? 'ON' : 'OFF'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic('warning');
                            onDeleteRule(rule.id);
                          }}
                          aria-label={t.alerts.deleteRule}
                          className="p-2 rounded-lg text-slate-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Triggered Notification History */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-base font-bold text-slate-950">
                {t.alerts.historyTitle} ({notifications.length})
              </h3>
              {notifications.length > 0 && (
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={onMarkAllRead}
                    className="inline-flex items-center gap-1 text-emerald-800 hover:underline"
                  >
                    <CheckCheck className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t.alerts.markAllRead}</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClearHistory}
                    className="text-slate-600 hover:text-red-700 hover:underline"
                  >
                    {t.alerts.clearHistory}
                  </button>
                </div>
              )}
            </div>

            {notifications.length === 0 ? (
              <p className="text-xs sm:text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-4">
                {t.alerts.noHistoryText}
              </p>
            ) : (
              <ul className="space-y-2" data-testid="alert-history-list">
                {notifications.map((n) => {
                  const crop = CROPS[n.cropId];
                  return (
                    <li
                      key={n.id}
                      className={`rounded-xl border p-3.5 flex items-start justify-between gap-3 ${
                        n.read
                          ? 'bg-white border-slate-200'
                          : 'bg-amber-50 border-amber-300'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-slate-950">
                          {isHindiFamily ? crop.nameHi : crop.nameEn} ·{' '}
                          {isHindiFamily ? n.mandiNameHi : n.mandiName}
                        </p>
                        <p className="text-xs text-slate-700 font-mono tabular-nums">
                          {t.alerts.currentRateLabel}: {formatINR(n.currentPricePerQtl)}/qtl (
                          {n.direction === 'above' ? '≥' : '≤'}{' '}
                          {formatINR(n.thresholdPricePerQtl)})
                        </p>
                      </div>
                      <span className="text-[11px] font-medium text-slate-500 shrink-0">
                        {n.triggeredAt}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
