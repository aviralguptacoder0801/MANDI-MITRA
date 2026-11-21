import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { UP_MANDIS, type CropId, type LanguageCode } from '../data/upMandis';
import {
  evaluatePriceAlerts,
  formatPriceAlertCopy,
  getEffectiveMandiPrices,
  type PriceAlertNotification,
  type PriceAlertRule,
} from '../utils/priceAlerts';
import { triggerHaptic } from '../utils/haptics';
import { safeLoadJson, safeSaveJson } from '../utils/storage';

const STORAGE_ALERT_RULES_KEY = 'mandimitra_price_alerts_v1';
const STORAGE_ALERT_HISTORY_KEY = 'mandimitra_alert_history_v1';
const STORAGE_ALERT_SEEN_KEY = 'mandimitra_alert_seen_v1';

const ALL_CROP_IDS: CropId[] = ['aloo', 'gehu', 'dhaan', 'pyaz', 'sarson'];

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

export function usePriceAlerts(language: LanguageCode) {
  const [alertRules, setAlertRules] = useState<PriceAlertRule[]>(() =>
    safeLoadJson(STORAGE_ALERT_RULES_KEY, [])
  );
  const [alertHistory, setAlertHistory] = useState<PriceAlertNotification[]>(() =>
    safeLoadJson(STORAGE_ALERT_HISTORY_KEY, [])
  );
  const [alertSeenKeys, setAlertSeenKeys] = useState<string[]>(() =>
    safeLoadJson(STORAGE_ALERT_SEEN_KEY, [])
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

  useEffect(() => {
    safeSaveJson(STORAGE_ALERT_RULES_KEY, alertRules);
  }, [alertRules]);

  useEffect(() => {
    safeSaveJson(STORAGE_ALERT_HISTORY_KEY, alertHistory);
  }, [alertHistory]);

  useEffect(() => {
    safeSaveJson(STORAGE_ALERT_SEEN_KEY, alertSeenKeys);
  }, [alertSeenKeys]);

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
      triggerHaptic('alert');

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
            // Ignore browser Notification errors in restricted contexts
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

  const requestBrowserPermission = useCallback(async () => {
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
  }, []);

  const addAlertRule = useCallback(
    (draft: Omit<PriceAlertRule, 'id' | 'createdAt'>) => {
      const created: PriceAlertRule = {
        ...draft,
        id: `rule-${Date.now()}`,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      const nextRules = [created, ...alertRules];
      setAlertRules(nextRules);
      runAlertEvaluation(nextRules, livePricesByCrop, alertSeenKeys, language);
    },
    [alertRules, livePricesByCrop, alertSeenKeys, language, runAlertEvaluation]
  );

  const toggleAlertRule = useCallback(
    (ruleId: string) => {
      const nextRules = alertRules.map((r) =>
        r.id === ruleId ? { ...r, enabled: !r.enabled } : r
      );
      setAlertRules(nextRules);
      runAlertEvaluation(nextRules, livePricesByCrop, alertSeenKeys, language);
    },
    [alertRules, livePricesByCrop, alertSeenKeys, language, runAlertEvaluation]
  );

  const deleteAlertRule = useCallback((ruleId: string) => {
    setAlertRules((prev) => prev.filter((r) => r.id !== ruleId));
  }, []);

  const checkRatesNow = useCallback(() => {
    runAlertEvaluation(alertRules, livePricesByCrop, [], language);
  }, [alertRules, livePricesByCrop, language, runAlertEvaluation]);

  const simulatePriceSurge = useCallback(
    (targetCropId: CropId, deltaRs: number) => {
      const existingOffsets = priceOffsetsByCrop[targetCropId] ?? {};
      const updatedCropOffsets: Record<string, number> = { ...existingOffsets };
      for (const mandi of UP_MANDIS) {
        updatedCropOffsets[mandi.id] = (updatedCropOffsets[mandi.id] ?? 0) + deltaRs;
      }
      setPriceOffsetsByCrop((prev) => ({
        ...prev,
        [targetCropId]: updatedCropOffsets,
      }));

      const nextLivePrices: Record<CropId, Record<string, number>> = {
        ...livePricesByCrop,
        [targetCropId]: getEffectiveMandiPrices(targetCropId, updatedCropOffsets),
      };
      runAlertEvaluation(alertRules, nextLivePrices, alertSeenKeys, language);
    },
    [priceOffsetsByCrop, livePricesByCrop, alertRules, alertSeenKeys, language, runAlertEvaluation]
  );

  const markAllRead = useCallback(() => {
    setAlertHistory((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearHistory = useCallback(() => {
    setAlertHistory([]);
    setAlertSeenKeys([]);
  }, []);

  const unreadAlertCount = useMemo(
    () => alertHistory.filter((n) => !n.read).length,
    [alertHistory]
  );

  const activeAlertCount = useMemo(
    () => alertRules.filter((r) => r.enabled).length,
    [alertRules]
  );

  const activeToastCopy = useMemo(
    () => (activeToastNotif ? formatPriceAlertCopy(activeToastNotif, language) : null),
    [activeToastNotif, language]
  );

  return {
    alertRules,
    alertHistory,
    priceOffsetsByCrop,
    livePricesByCrop,
    alertsPanelOpen,
    setAlertsPanelOpen,
    activeToastNotif,
    activeToastCopy,
    dismissToast: () => setActiveToastNotif(null),
    notifPermission,
    unreadAlertCount,
    activeAlertCount,
    requestBrowserPermission,
    addAlertRule,
    toggleAlertRule,
    deleteAlertRule,
    checkRatesNow,
    simulatePriceSurge,
    markAllRead,
    clearHistory,
  };
}
