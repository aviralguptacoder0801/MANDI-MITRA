import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateGradeAdjustment,
  calculatePoolSavings,
  computeSellVsStoreAdvisory,
  rankMandisByNetProfit,
} from './mandiEngine';
import { CROPS, INITIAL_TRANSPORT_POOLS } from '../data/upMandis';

test('high moisture and high damage reduce Grade-Adjusted Fair Price below modal price', () => {
  const modal = 1600;
  const goodLot = calculateGradeAdjustment('aloo', modal, {
    moisturePercent: 12,
    damagePercent: 1,
    foreignMatterPercent: 0.5,
    sizeGrade: 'bold',
    gradeTier: 'premium',
    varietyNote: 'Kufri Bahar',
  });
  const poorLot = calculateGradeAdjustment('aloo', modal, {
    moisturePercent: 21,
    damagePercent: 8,
    foreignMatterPercent: 4,
    sizeGrade: 'small',
    gradeTier: 'commercial',
    varietyNote: 'Kufri Bahar',
  });

  assert.ok(goodLot.adjustedPricePerQtl > modal, 'Premium dry bold lot should earn premium');
  assert.ok(poorLot.adjustedPricePerQtl < modal, 'Wet damaged lot should be discounted');
  assert.equal(goodLot.computedGradeLabel, 'Grade A+ (Export/Premium)');
  assert.equal(poorLot.computedGradeLabel, 'Grade B (Discounted)');
});

test('wheat MSP eligibility flags excess moisture above 12%', () => {
  const wetWheat = calculateGradeAdjustment('gehu', 2450, {
    moisturePercent: 15.5,
    damagePercent: 1,
    foreignMatterPercent: 0.5,
    sizeGrade: 'medium',
    gradeTier: 'faq',
    varietyNote: 'HD-2967',
  });

  assert.equal(wetWheat.mspEligible, false);
  assert.ok(wetWheat.mspWarning && wetWheat.mspWarning.includes('moisture'));
});

test('rankMandisByNetProfit sorts by actual net take-home profit, not raw gross price', () => {
  const quality = CROPS.aloo.defaultQuality;
  const ranked = rankMandisByNetProfit({
    cropId: 'aloo',
    originDistrict: 'barabanki',
    quantityQtl: 20,
    vehicleId: 'bolero_pickup',
    quality,
    pools: INITIAL_TRANSPORT_POOLS,
  });

  assert.ok(ranked.length >= 6);
  for (let i = 1; i < ranked.length; i++) {
    assert.ok(
      ranked[i - 1].netProfitRs >= ranked[i].netProfitRs,
      'Mandis must be sorted strictly descending by netProfitRs'
    );
  }
  // Verify closer Lucknow Dubagga beats distant Agra Sikandra despite Agra having a higher gross modal price
  const dubaggaIdx = ranked.findIndex((r) => r.mandi.id === 'lucknow_dubagga');
  const agraIdx = ranked.findIndex((r) => r.mandi.id === 'agra_sikandra');
  assert.ok(
    dubaggaIdx < agraIdx,
    'Dubagga (34km) should outrank Sikandra Agra (356km) on take-home net profit for a Barabanki farmer'
  );
});

test('changing crop quality directly changes take-home net profit in ranked mandis', () => {
  const highQuality = rankMandisByNetProfit({
    cropId: 'aloo',
    originDistrict: 'barabanki',
    quantityQtl: 25,
    vehicleId: 'bolero_pickup',
    quality: {
      moisturePercent: 12,
      damagePercent: 1,
      foreignMatterPercent: 0.5,
      sizeGrade: 'bold',
      gradeTier: 'premium',
      varietyNote: '3797',
    },
  });
  const lowQuality = rankMandisByNetProfit({
    cropId: 'aloo',
    originDistrict: 'barabanki',
    quantityQtl: 25,
    vehicleId: 'bolero_pickup',
    quality: {
      moisturePercent: 22,
      damagePercent: 7,
      foreignMatterPercent: 3.5,
      sizeGrade: 'small',
      gradeTier: 'commercial',
      varietyNote: '3797',
    },
  });

  assert.ok(
    highQuality[0].netProfitRs > lowQuality[0].netProfitRs + 4000,
    'Higher crop quality must substantially increase projected net profit'
  );
});

test('Sell Now vs Store recommends STORE_AND_HOLD for Aloo (rising curve) and SELL_NOW for wet Dhaan', () => {
  const alooAdvisory = computeSellVsStoreAdvisory({
    cropId: 'aloo',
    quantityQtl: 30,
    bestMandiTodayNetProfitRs: 45000,
    bestMandiGradeAdjustedPrice: 1650,
    holdDays: 10,
    storageMode: 'cold_store',
    moisturePercent: 13,
  });
  assert.equal(alooAdvisory.verdict, 'STORE_AND_HOLD');
  assert.ok(alooAdvisory.optimalDayGainRs > 0);

  const wetDhaanAdvisory = computeSellVsStoreAdvisory({
    cropId: 'dhaan',
    quantityQtl: 30,
    bestMandiTodayNetProfitRs: 64000,
    bestMandiGradeAdjustedPrice: 2280,
    holdDays: 7,
    storageMode: 'farm_godown',
    moisturePercent: 21,
  });
  assert.equal(wetDhaanAdvisory.verdict, 'SELL_NOW');
});

test('calculatePoolSavings computes meaningful cost reduction vs solo transport', () => {
  const pool = INITIAL_TRANSPORT_POOLS[0];
  const result = calculatePoolSavings(pool, 15, 2100);
  assert.ok(result.pooledShareCostRs < 2100);
  assert.ok(result.savingsRs > 0);
  assert.equal(result.remainingCapacityQtl, 22);
});
