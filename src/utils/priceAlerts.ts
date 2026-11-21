import { CROPS, UP_MANDIS, type CropId, type LanguageCode } from '../data/upMandis';

export type AlertDirection = 'above' | 'below';

export interface PriceAlertRule {
  id: string;
  cropId: CropId;
  mandiIds: string[];
  thresholdPricePerQtl: number;
  direction: AlertDirection;
  enabled: boolean;
  createdAt: string;
}

export interface PriceAlertNotification {
  id: string;
  ruleId: string;
  dedupeKey: string;
  cropId: CropId;
  mandiId: string;
  mandiName: string;
  mandiNameHi: string;
  currentPricePerQtl: number;
  thresholdPricePerQtl: number;
  direction: AlertDirection;
  triggeredAt: string;
  read: boolean;
}

export interface AlertEvaluationResult {
  triggered: PriceAlertNotification[];
  updatedDedupeKeys: string[];
}

/**
 * Returns live mandi modal prices (Rs/Quintal) for a given crop, applying an optional
 * per-mandi or market-wide price offset (Rs/Quintal) from live ticks.
 */
export function getEffectiveMandiPrices(
  cropId: CropId,
  priceOffsetsByMandi: Record<string, number> = {}
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const mandi of UP_MANDIS) {
    const base = mandi.modalPrices[cropId] ?? 0;
    const delta = priceOffsetsByMandi[mandi.id] ?? 0;
    result[mandi.id] = Math.max(100, Math.round(base + delta));
  }
  return result;
}

/**
 * Evaluates all enabled PriceAlertRules against current mandi prices.
 * Pure & deterministic: prevents duplicate notifications for the exact same
 * rule + mandi + crossed threshold state via `seenDedupeKeys`.
 */
export function evaluatePriceAlerts(
  rules: PriceAlertRule[],
  pricesByCropAndMandi: Record<CropId, Record<string, number>>,
  seenDedupeKeys: string[],
  nowLabel = 'Just now'
): AlertEvaluationResult {
  const seen = new Set(seenDedupeKeys);
  const triggered: PriceAlertNotification[] = [];

  for (const rule of rules) {
    if (!rule.enabled || rule.mandiIds.length === 0) continue;
    const cropPrices = pricesByCropAndMandi[rule.cropId];
    if (!cropPrices) continue;

    for (const mandiId of rule.mandiIds) {
      const currentPrice = cropPrices[mandiId];
      if (typeof currentPrice !== 'number' || !Number.isFinite(currentPrice)) continue;

      const crossed =
        rule.direction === 'above'
          ? currentPrice >= rule.thresholdPricePerQtl
          : currentPrice <= rule.thresholdPricePerQtl;

      const dedupeKey = `${rule.id}:${mandiId}:${rule.direction}:${rule.thresholdPricePerQtl}:${currentPrice}`;

      if (crossed && !seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        const mandi = UP_MANDIS.find((m) => m.id === mandiId);
        triggered.push({
          id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          ruleId: rule.id,
          dedupeKey,
          cropId: rule.cropId,
          mandiId,
          mandiName: mandi?.name ?? mandiId,
          mandiNameHi: mandi?.nameHi ?? mandi?.name ?? mandiId,
          currentPricePerQtl: currentPrice,
          thresholdPricePerQtl: rule.thresholdPricePerQtl,
          direction: rule.direction,
          triggeredAt: nowLabel,
          read: false,
        });
      }
    }
  }

  return {
    triggered,
    updatedDedupeKeys: Array.from(seen).slice(-120),
  };
}

/**
 * Formats a clear, localized title and body for both in-app toasts and Browser Notification API.
 */
export function formatPriceAlertCopy(
  notif: PriceAlertNotification,
  language: LanguageCode
): { title: string; body: string } {
  const crop = CROPS[notif.cropId];
  const priceStr = `₹${notif.currentPricePerQtl.toLocaleString('en-IN')}`;
  const targetStr = `₹${notif.thresholdPricePerQtl.toLocaleString('en-IN')}`;

  if (language === 'en') {
    const verb = notif.direction === 'above' ? 'crossed above' : 'dropped below';
    return {
      title: `Mandi Price Alert · ${crop.nameEn}`,
      body: `${notif.mandiName}: ${priceStr}/qtl (${verb} your ${targetStr}/qtl target).`,
    };
  }

  if (language === 'awadhi') {
    const verb = notif.direction === 'above' ? 'के ऊपर पहुंच गा बा' : 'के नीचे आ गा बा';
    return {
      title: `मंडी भाव अलर्ट · ${crop.nameHi}`,
      body: `${notif.mandiNameHi} मा भाव ${priceStr}/क्विंटल होइ गा (${targetStr} ${verb})।`,
    };
  }

  if (language === 'bhojpuri') {
    const verb = notif.direction === 'above' ? 'से ऊपर चल गइल बा' : 'से नीचे आ गइल बा';
    return {
      title: `मंडी भाव अलर्ट · ${crop.nameHi}`,
      body: `${notif.mandiNameHi} में भाव ${priceStr}/क्विंटल हो गइल (${targetStr} ${verb})।`,
    };
  }

  const verb = notif.direction === 'above' ? 'से ऊपर पहुंच गया है' : 'से नीचे आ गया है';
  return {
    title: `मंडी भाव अलर्ट · ${crop.nameHi}`,
    body: `${notif.mandiNameHi} में भाव ${priceStr}/क्विंटल है (आपके ${targetStr} लक्ष्य ${verb})।`,
  };
}
