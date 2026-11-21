import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluatePriceAlerts,
  formatPriceAlertCopy,
  getEffectiveMandiPrices,
  type PriceAlertRule,
} from './priceAlerts';
import type { CropId } from '../data/upMandis';

test('evaluatePriceAlerts triggers when price crosses above threshold in preferred mandi only', () => {
  const rules: PriceAlertRule[] = [
    {
      id: 'rule-1',
      cropId: 'aloo',
      mandiIds: ['lucknow_dubagga', 'agra_sikandra'],
      thresholdPricePerQtl: 1650,
      direction: 'above',
      enabled: true,
      createdAt: 'Today',
    },
  ];

  const pricesByCrop: Record<CropId, Record<string, number>> = {
    aloo: {
      lucknow_dubagga: 1680,
      agra_sikandra: 1600,
      barabanki_nawabganj: 1900, // NOT in preferred mandis -> must NOT trigger
    },
    gehu: {},
    dhaan: {},
    pyaz: {},
    sarson: {},
  };

  const first = evaluatePriceAlerts(rules, pricesByCrop, [], '10:05 AM');
  assert.equal(first.triggered.length, 1);
  assert.equal(first.triggered[0].mandiId, 'lucknow_dubagga');
  assert.equal(first.triggered[0].currentPricePerQtl, 1680);

  // Running again with the same price does NOT duplicate the notification
  const second = evaluatePriceAlerts(rules, pricesByCrop, first.updatedDedupeKeys, '10:06 AM');
  assert.equal(second.triggered.length, 0);
});

test('evaluatePriceAlerts supports below-threshold drop alerts and ignores disabled rules', () => {
  const rules: PriceAlertRule[] = [
    {
      id: 'rule-below',
      cropId: 'gehu',
      mandiIds: ['kanpur_naubasta'],
      thresholdPricePerQtl: 2500,
      direction: 'below',
      enabled: true,
      createdAt: 'Today',
    },
    {
      id: 'rule-disabled',
      cropId: 'gehu',
      mandiIds: ['lucknow_dubagga'],
      thresholdPricePerQtl: 3000,
      direction: 'below',
      enabled: false,
      createdAt: 'Today',
    },
  ];

  const pricesByCrop: Record<CropId, Record<string, number>> = {
    aloo: {},
    gehu: { kanpur_naubasta: 2440, lucknow_dubagga: 2400 },
    dhaan: {},
    pyaz: {},
    sarson: {},
  };

  const res = evaluatePriceAlerts(rules, pricesByCrop, []);
  assert.equal(res.triggered.length, 1);
  assert.equal(res.triggered[0].ruleId, 'rule-below');
  assert.equal(res.triggered[0].direction, 'below');
});

test('getEffectiveMandiPrices applies live delta offsets cleanly and formatPriceAlertCopy localizes Hindi & English', () => {
  const base = getEffectiveMandiPrices('aloo');
  const bumped = getEffectiveMandiPrices('aloo', { lucknow_dubagga: 120 });
  assert.equal(bumped.lucknow_dubagga, base.lucknow_dubagga + 120);

  const sampleNotif = {
    id: 'n1',
    ruleId: 'r1',
    dedupeKey: 'k1',
    cropId: 'aloo' as CropId,
    mandiId: 'lucknow_dubagga',
    mandiName: 'Dubagga Mandi, Lucknow',
    mandiNameHi: 'दुबग्गा मंडी, लखनऊ',
    currentPricePerQtl: 1700,
    thresholdPricePerQtl: 1650,
    direction: 'above' as const,
    triggeredAt: 'Just now',
    read: false,
  };

  const hiCopy = formatPriceAlertCopy(sampleNotif, 'hi');
  const enCopy = formatPriceAlertCopy(sampleNotif, 'en');
  assert.ok(hiCopy.title.includes('आलू'));
  assert.ok(hiCopy.body.includes('दुबग्गा मंडी'));
  assert.ok(enCopy.title.includes('Potato'));
  assert.ok(enCopy.body.includes('crossed above'));
});
