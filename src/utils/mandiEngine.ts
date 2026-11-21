import {
  CROPS,
  DISTRICT_DISTANCE_KM,
  UP_MANDIS,
  VEHICLE_OPTIONS,
  type CropId,
  type CropQualityInput,
  type DistrictId,
  type MandiRecord,
  type TransportPool,
  type VehicleTypeId,
} from '../data/upMandis';

export interface GradeAdjustmentItem {
  factor: string;
  deltaPct: number;
  deltaRsPerQtl: number;
  note: string;
}

export interface GradeValuationResult {
  baseModalPrice: number;
  adjustedPricePerQtl: number;
  totalAdjustmentPct: number;
  totalAdjustmentRsPerQtl: number;
  computedGradeLabel: 'Grade A+ (Export/Premium)' | 'Grade A (Superior)' | 'FAQ (Fair Average)' | 'Grade B (Discounted)';
  qualityScore: number; // 0-100 internal quality index
  breakdown: GradeAdjustmentItem[];
  mspEligible: boolean;
  mspWarning: string | null;
}

export interface RankedMandiProfit {
  mandi: MandiRecord;
  distanceKm: number;
  tripsNeeded: number;
  baseModalPrice: number;
  congestionAdjustedModal: number;
  gradeAdjustedPricePerQtl: number;
  grossRevenueRs: number;
  fuelAndHireCostRs: number;
  tollCostRs: number;
  commissionCostRs: number;
  handlingCostRs: number;
  totalDeductionsRs: number;
  netProfitRs: number;
  netProfitPerQtlRs: number;
  congestionLoadPct: number;
  congestionStatus: 'Undersupplied' | 'Balanced' | 'Overcrowded';
  /** Comparison against farmer's local home-district mandi */
  gainVsLocalMandiRs: number;
  /** Optional pooled transport alternative if an active pool exists */
  matchingPool?: TransportPool;
  pooledNetProfitRs?: number;
  pooledSavingsRs?: number;
}

export interface ForecastDayPoint {
  day: number;
  label: string;
  projectedPricePerQtl: number;
  storageCostToDateRs: number;
  spoilageLossToDateRs: number;
  netProjectedRevenueRs: number;
  netGainVsTodayRs: number;
}

export interface SellVsStoreAdvisory {
  verdict: 'SELL_NOW' | 'STORE_AND_HOLD';
  optimalDay: number;
  selectedDay: number;
  todayNetRevenueRs: number;
  selectedDayNetRevenueRs: number;
  selectedDayGainRs: number;
  optimalDayGainRs: number;
  storageCostRs: number;
  spoilageLossRs: number;
  weatherRiskLabel: 'Low' | 'Moderate' | 'High';
  headline: string;
  rationale: string;
  mspComparisonRsPerQtl: number | null;
  mspRecommendation: string;
  dailySeries: ForecastDayPoint[];
}

export interface PoolSavingsResult {
  soloCostRs: number;
  pooledShareCostRs: number;
  savingsRs: number;
  savingsPct: number;
  utilizationPct: number;
  remainingCapacityQtl: number;
}

/**
 * Computes grade-adjusted fair price (₹/qtl) from a crop's live modal price
 * and the farmer's specific quality inputs (moisture, size, damage, foreign matter, grade tier).
 */
export function calculateGradeAdjustment(
  cropId: CropId,
  baseModalPrice: number,
  quality: CropQualityInput
): GradeValuationResult {
  const crop = CROPS[cropId];
  const breakdown: GradeAdjustmentItem[] = [];

  // 1. Moisture adjustment (excess moisture hurts price; optimal dry lot gets mild bonus)
  const excessMoisture = quality.moisturePercent - crop.idealMoistureMax;
  let moisturePct = 0;
  let moistureNote = `Within FAQ limit (≤ ${crop.idealMoistureMax}%)`;
  if (excessMoisture > 0) {
    // 1.4% deduction per 1% excess moisture, capped at -18%
    moisturePct = -Math.min(18, Number((excessMoisture * 1.4).toFixed(2)));
    moistureNote = `${excessMoisture.toFixed(1)}% above FAQ limit (${crop.idealMoistureMax}%)`;
  } else if (excessMoisture <= -1.5) {
    moisturePct = 1.5;
    moistureNote = 'Well-dried lot (lower storage risk)';
  }
  breakdown.push({
    factor: 'Moisture Content',
    deltaPct: moisturePct,
    deltaRsPerQtl: Math.round((baseModalPrice * moisturePct) / 100),
    note: moistureNote,
  });

  // 2. Size & Uniformity adjustment
  let sizePct = 0;
  let sizeNote = 'Standard uniform medium lot';
  if (quality.sizeGrade === 'bold') {
    sizePct = 4.0;
    sizeNote = 'Bold, uniform size attracts wholesale premium';
  } else if (quality.sizeGrade === 'small') {
    sizePct = -4.5;
    sizeNote = 'Small / uneven grading discount';
  }
  breakdown.push({
    factor: 'Size & Uniformity',
    deltaPct: sizePct,
    deltaRsPerQtl: Math.round((baseModalPrice * sizePct) / 100),
    note: sizeNote,
  });

  // 3. Damage / Discoloration / Sprouting adjustment (threshold 2%)
  const excessDamage = Math.max(0, quality.damagePercent - 2);
  let damagePct = 0;
  let damageNote = 'Minimal visible defects (≤ 2%)';
  if (excessDamage > 0) {
    damagePct = -Math.min(16, Number((excessDamage * 1.25).toFixed(2)));
    damageNote = `${quality.damagePercent.toFixed(1)}% bruised/discolored/broken`;
  } else if (quality.damagePercent <= 1) {
    damagePct = 1.0;
    damageNote = 'Clean, blemish-free lot';
  }
  breakdown.push({
    factor: 'Damage & Blemishes',
    deltaPct: damagePct,
    deltaRsPerQtl: Math.round((baseModalPrice * damagePct) / 100),
    note: damageNote,
  });

  // 4. Foreign Matter (soil, chaff, stones — threshold 1%)
  const excessForeign = Math.max(0, quality.foreignMatterPercent - 1);
  let foreignPct = 0;
  let foreignNote = 'Clean sieved lot (≤ 1% inert matter)';
  if (excessForeign > 0) {
    foreignPct = -Math.min(10, Number((excessForeign * 1.3).toFixed(2)));
    foreignNote = `${quality.foreignMatterPercent.toFixed(1)}% soil/chaff deduction`;
  }
  breakdown.push({
    factor: 'Cleanliness / Foreign Matter',
    deltaPct: foreignPct,
    deltaRsPerQtl: Math.round((baseModalPrice * foreignPct) / 100),
    note: foreignNote,
  });

  // 5. Grade Tier / Variety Selection
  let tierPct = 0;
  let tierNote = 'Standard FAQ commercial grade';
  if (quality.gradeTier === 'premium') {
    tierPct = 3.5;
    tierNote = 'Sorted Grade-A / sought-after variety premium';
  } else if (quality.gradeTier === 'commercial') {
    tierPct = -3.0;
    tierNote = 'Unsorted commercial lot';
  }
  breakdown.push({
    factor: 'Variety & Sorting Tier',
    deltaPct: tierPct,
    deltaRsPerQtl: Math.round((baseModalPrice * tierPct) / 100),
    note: tierNote,
  });

  const rawTotalPct = breakdown.reduce((sum, b) => sum + b.deltaPct, 0);
  // Guardrails: never drop below -35% or exceed +14% from base modal
  const totalAdjustmentPct = Number(Math.max(-35, Math.min(14, rawTotalPct)).toFixed(2));
  const adjustedPricePerQtl = Math.max(
    100,
    Math.round(baseModalPrice * (1 + totalAdjustmentPct / 100))
  );
  const totalAdjustmentRsPerQtl = adjustedPricePerQtl - baseModalPrice;

  let computedGradeLabel: GradeValuationResult['computedGradeLabel'] = 'FAQ (Fair Average)';
  if (totalAdjustmentPct >= 6) {
    computedGradeLabel = 'Grade A+ (Export/Premium)';
  } else if (totalAdjustmentPct >= 1.5) {
    computedGradeLabel = 'Grade A (Superior)';
  } else if (totalAdjustmentPct < -4) {
    computedGradeLabel = 'Grade B (Discounted)';
  }

  const qualityScore = Math.max(
    25,
    Math.min(100, Math.round(78 + totalAdjustmentPct * 1.8))
  );

  // Check MSP FAQ eligibility for MSP crops
  const mspEligible =
    crop.msp.hasOfficialMsp &&
    quality.moisturePercent <= crop.idealMoistureMax + 0.5 &&
    quality.damagePercent <= 4 &&
    quality.foreignMatterPercent <= 2;

  let mspWarning: string | null = null;
  if (crop.msp.hasOfficialMsp && !mspEligible) {
    const reasons: string[] = [];
    if (quality.moisturePercent > crop.idealMoistureMax + 0.5) {
      reasons.push(`moisture (${quality.moisturePercent}%) exceeds ${crop.idealMoistureMax}% FAQ limit`);
    }
    if (quality.damagePercent > 4) {
      reasons.push(`damage (${quality.damagePercent}%) exceeds 4%`);
    }
    if (quality.foreignMatterPercent > 2) {
      reasons.push(`foreign matter (${quality.foreignMatterPercent}%) exceeds 2%`);
    }
    mspWarning = `Sun-dry or clean before govt MSP center: ${reasons.join(', ')}.`;
  }

  return {
    baseModalPrice,
    adjustedPricePerQtl,
    totalAdjustmentPct,
    totalAdjustmentRsPerQtl,
    computedGradeLabel,
    qualityScore,
    breakdown,
    mspEligible,
    mspWarning,
  };
}

export function getCongestionStatus(loadPct: number): 'Undersupplied' | 'Balanced' | 'Overcrowded' {
  if (loadPct >= 85) return 'Overcrowded';
  if (loadPct <= 60) return 'Undersupplied';
  return 'Balanced';
}

export function calculateSoloTransportCost(
  distanceKm: number,
  quantityQtl: number,
  vehicleId: VehicleTypeId
): { tripsNeeded: number; fuelAndHireCostRs: number; tollCostRs: number } {
  const vehicle = VEHICLE_OPTIONS.find((v) => v.id === vehicleId) ?? VEHICLE_OPTIONS[1];
  const safeQty = Math.max(1, quantityQtl);
  const tripsNeeded = Math.max(1, Math.ceil(safeQty / vehicle.capacityQtl));
  // Round-trip fuel + base hire per trip
  const fuelAndHireCostRs = Math.round(
    tripsNeeded * (vehicle.baseHireRs + distanceKm * 1.85 * vehicle.fuelPerKmRs)
  );
  // Toll plazas scale roughly every 50km one-way (round-trip discounted 1.5x return pass)
  const tollPlazas = Math.floor(distanceKm / 45);
  const tollCostRs = Math.round(tripsNeeded * tollPlazas * vehicle.tollPer50KmRs * 1.5);
  return { tripsNeeded, fuelAndHireCostRs, tollCostRs };
}

export function calculatePoolSavings(
  pool: TransportPool,
  farmerQtyQtl: number,
  soloTransportCostRs: number
): PoolSavingsResult {
  const safeQty = Math.max(1, farmerQtyQtl);
  const remainingCapacityQtl = Math.max(0, pool.totalCapacityQtl - pool.bookedQtl);
  const effectiveUtilizationQtl = Math.min(pool.totalCapacityQtl, pool.bookedQtl + safeQty);
  const shareRatio = safeQty / Math.max(safeQty, effectiveUtilizationQtl);
  const pooledShareCostRs = Math.round(pool.totalTruckCostRs * shareRatio);
  const savingsRs = Math.max(0, soloTransportCostRs - pooledShareCostRs);
  const savingsPct =
    soloTransportCostRs > 0 ? Math.round((savingsRs / soloTransportCostRs) * 100) : 0;
  const utilizationPct = Math.min(
    100,
    Math.round((pool.bookedQtl / pool.totalCapacityQtl) * 100)
  );
  return {
    soloCostRs: soloTransportCostRs,
    pooledShareCostRs,
    savingsRs,
    savingsPct,
    utilizationPct,
    remainingCapacityQtl,
  };
}

/**
 * Ranks all UP mandis by actual take-home net profit (after grade-adjusted pricing,
 * live congestion price shifts, transport fuel/hire, tolls, mandi commissions, and handling fees).
 */
export function rankMandisByNetProfit(params: {
  cropId: CropId;
  originDistrict: DistrictId;
  quantityQtl: number;
  vehicleId: VehicleTypeId;
  quality: CropQualityInput;
  pools?: TransportPool[];
  priceOffsetsByMandi?: Record<string, number>;
}): RankedMandiProfit[] {
  const {
    cropId,
    originDistrict,
    quantityQtl,
    vehicleId,
    quality,
    pools = [],
    priceOffsetsByMandi = {},
  } = params;
  const safeQty = Math.max(1, quantityQtl);

  const rows: RankedMandiProfit[] = UP_MANDIS.map((mandi) => {
    const distanceKm = DISTRICT_DISTANCE_KM[originDistrict]?.[mandi.district] ?? 90;
    const rawOffset = priceOffsetsByMandi[mandi.id] ?? 0;
    const baseModalPrice = Math.max(100, Math.round(mandi.modalPrices[cropId] + rawOffset));
    const congestionLoadPct = Math.round(
      (mandi.todayArrivalTonnes / mandi.dailyCapacityTonnes) * 100
    );
    const congestionStatus = getCongestionStatus(congestionLoadPct);

    // Congestion slightly lifts undersupplied mandis and depresses overcrowded mandis
    const congestionAdjustedModal = Math.round(
      baseModalPrice * (1 + mandi.congestionPriceShiftPct / 100)
    );

    const gradeResult = calculateGradeAdjustment(cropId, congestionAdjustedModal, quality);
    const gradeAdjustedPricePerQtl = gradeResult.adjustedPricePerQtl;

    const grossRevenueRs = Math.round(gradeAdjustedPricePerQtl * safeQty);
    const { tripsNeeded, fuelAndHireCostRs, tollCostRs } = calculateSoloTransportCost(
      distanceKm,
      safeQty,
      vehicleId
    );
    const commissionCostRs = Math.round((grossRevenueRs * mandi.commissionPct) / 100);
    const handlingCostRs = Math.round(mandi.handlingPerQtl * safeQty);
    const totalDeductionsRs =
      fuelAndHireCostRs + tollCostRs + commissionCostRs + handlingCostRs;
    const netProfitRs = grossRevenueRs - totalDeductionsRs;
    const netProfitPerQtlRs = Math.round(netProfitRs / safeQty);

    const matchingPool = pools.find(
      (p) =>
        p.cropId === cropId &&
        p.originDistrict === originDistrict &&
        p.destinationMandiId === mandi.id &&
        p.totalCapacityQtl - p.bookedQtl >= Math.min(safeQty, 5)
    );

    let pooledNetProfitRs: number | undefined;
    let pooledSavingsRs: number | undefined;
    if (matchingPool) {
      const soloTransport = fuelAndHireCostRs + tollCostRs;
      const savings = calculatePoolSavings(matchingPool, safeQty, soloTransport);
      if (savings.savingsRs > 0) {
        pooledSavingsRs = savings.savingsRs;
        pooledNetProfitRs = netProfitRs + savings.savingsRs;
      }
    }

    return {
      mandi,
      distanceKm,
      tripsNeeded,
      baseModalPrice,
      congestionAdjustedModal,
      gradeAdjustedPricePerQtl,
      grossRevenueRs,
      fuelAndHireCostRs,
      tollCostRs,
      commissionCostRs,
      handlingCostRs,
      totalDeductionsRs,
      netProfitRs,
      netProfitPerQtlRs,
      congestionLoadPct,
      congestionStatus,
      gainVsLocalMandiRs: 0,
      matchingPool,
      pooledNetProfitRs,
      pooledSavingsRs,
    };
  });

  const localRow = rows.find((r) => r.mandi.district === originDistrict) ?? rows[0];
  const localNetProfit = localRow.netProfitRs;

  for (const row of rows) {
    row.gainVsLocalMandiRs = row.netProfitRs - localNetProfit;
  }

  return rows.sort((a, b) => b.netProfitRs - a.netProfitRs);
}

/**
 * Evaluates 15-day price forecast against cold-storage / godown cost and weather-adjusted spoilage
 * to generate a deterministic "Sell Now vs. Store & Hold" advisory.
 */
export function computeSellVsStoreAdvisory(params: {
  cropId: CropId;
  quantityQtl: number;
  bestMandiTodayNetProfitRs: number;
  bestMandiGradeAdjustedPrice: number;
  holdDays: number; // 1..14
  storageMode: 'cold_store' | 'farm_godown';
  moisturePercent: number;
}): SellVsStoreAdvisory {
  const {
    cropId,
    quantityQtl,
    bestMandiTodayNetProfitRs,
    bestMandiGradeAdjustedPrice,
    holdDays,
    storageMode,
    moisturePercent,
  } = params;

  const crop = CROPS[cropId];
  const safeQty = Math.max(1, quantityQtl);
  const clampedDays = Math.max(1, Math.min(14, Math.round(holdDays)));

  const dailyStorageRate =
    storageMode === 'cold_store' ? crop.coldStoragePerQtlDay : crop.godownPerQtlDay;

  // High moisture or farm godown under risky weather increases daily spoilage
  const excessMoisture = Math.max(0, moisturePercent - crop.idealMoistureMax);
  const weatherExtra =
    storageMode === 'cold_store'
      ? crop.weatherRisk.extraSpoilagePctPerDay * 0.25
      : crop.weatherRisk.extraSpoilagePctPerDay;
  const effectiveDailyShrinkagePct =
    crop.dailyShrinkagePct * (storageMode === 'cold_store' ? 0.65 : 1.15) +
    weatherExtra +
    excessMoisture * 0.08;

  const fixedDeductionsApprox = Math.max(
    0,
    Math.round(bestMandiGradeAdjustedPrice * safeQty - bestMandiTodayNetProfitRs)
  );

  const dailySeries: ForecastDayPoint[] = crop.forecastIndex15d.map((idx, day) => {
    const projectedPricePerQtl = Math.round(bestMandiGradeAdjustedPrice * idx);
    const storageCostToDateRs = Math.round(day * dailyStorageRate * safeQty);
    const shrinkageFraction = Math.min(0.28, (day * effectiveDailyShrinkagePct) / 100);
    const sellableQty = safeQty * (1 - shrinkageFraction);
    const spoilageLossToDateRs = Math.round(
      (safeQty - sellableQty) * projectedPricePerQtl
    );
    const netProjectedRevenueRs = Math.round(
      sellableQty * projectedPricePerQtl - fixedDeductionsApprox - storageCostToDateRs
    );
    const netGainVsTodayRs = netProjectedRevenueRs - bestMandiTodayNetProfitRs;

    return {
      day,
      label: day === 0 ? 'Today' : `Day +${day}`,
      projectedPricePerQtl,
      storageCostToDateRs,
      spoilageLossToDateRs,
      netProjectedRevenueRs,
      netGainVsTodayRs,
    };
  });

  // Identify optimal day across days 1..14
  let optimalPoint = dailySeries[0];
  for (const pt of dailySeries) {
    if (pt.netProjectedRevenueRs > optimalPoint.netProjectedRevenueRs) {
      optimalPoint = pt;
    }
  }

  const selectedPoint = dailySeries[clampedDays] ?? dailySeries[7];
  // Require at least ₹35/qtl net gain (or >= 2% uplift) to justify storage risk
  const minThresholdGain = Math.round(safeQty * 35);
  const verdict: 'SELL_NOW' | 'STORE_AND_HOLD' =
    optimalPoint.day > 0 && optimalPoint.netGainVsTodayRs >= minThresholdGain
      ? 'STORE_AND_HOLD'
      : 'SELL_NOW';

  const weatherRiskLabel =
    crop.weatherRisk.severity === 'high'
      ? 'High'
      : crop.weatherRisk.severity === 'moderate'
        ? 'Moderate'
        : 'Low';

  const headline =
    verdict === 'STORE_AND_HOLD'
      ? `Hold ${optimalPoint.day} days in ${storageMode === 'cold_store' ? 'Cold Storage' : 'PACS / Farm Godown'} for +₹${optimalPoint.netGainVsTodayRs.toLocaleString('en-IN')} extra net profit`
      : `Sell Today — Holding risks ₹${Math.abs(Math.min(0, selectedPoint.netGainVsTodayRs)).toLocaleString('en-IN')} in storage fees & weather loss`;

  const rationale =
    verdict === 'STORE_AND_HOLD'
      ? `Projected modal price rises to ₹${optimalPoint.projectedPricePerQtl.toLocaleString('en-IN')}/qtl by Day +${optimalPoint.day}, outpacing ₹${optimalPoint.storageCostToDateRs.toLocaleString('en-IN')} storage fee and ₹${optimalPoint.spoilageLossToDateRs.toLocaleString('en-IN')} weight shrinkage.`
      : `Short-term arrival pressure and ${weatherRiskLabel.toLowerCase()} weather spoilage risk outweigh modest price gains over ${clampedDays} days. Locking today's top mandi rate protects your take-home cash.`;

  const mspComparisonRsPerQtl = crop.msp.hasOfficialMsp
    ? crop.msp.ratePerQtl - bestMandiGradeAdjustedPrice
    : null;

  let mspRecommendation = crop.msp.portalNote;
  if (crop.msp.hasOfficialMsp && mspComparisonRsPerQtl !== null) {
    if (mspComparisonRsPerQtl > 0) {
      mspRecommendation = `UP Govt MSP (₹${crop.msp.ratePerQtl.toLocaleString('en-IN')}/qtl) beats open mandi rate by ₹${mspComparisonRsPerQtl.toLocaleString('en-IN')}/qtl. Prioritize e-Kharid purchase center if moisture ≤ ${crop.idealMoistureMax}%.`;
    } else {
      mspRecommendation = `Open mandi fair price beats UP Govt MSP (₹${crop.msp.ratePerQtl.toLocaleString('en-IN')}/qtl) by ₹${Math.abs(mspComparisonRsPerQtl).toLocaleString('en-IN')}/qtl. Sell in top-ranked private mandi for higher cash flow.`;
    }
  }

  return {
    verdict,
    optimalDay: optimalPoint.day,
    selectedDay: clampedDays,
    todayNetRevenueRs: bestMandiTodayNetProfitRs,
    selectedDayNetRevenueRs: selectedPoint.netProjectedRevenueRs,
    selectedDayGainRs: selectedPoint.netGainVsTodayRs,
    optimalDayGainRs: optimalPoint.netGainVsTodayRs,
    storageCostRs: selectedPoint.storageCostToDateRs,
    spoilageLossRs: selectedPoint.spoilageLossToDateRs,
    weatherRiskLabel,
    headline,
    rationale,
    mspComparisonRsPerQtl,
    mspRecommendation,
    dailySeries,
  };
}

export function formatINR(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  return `${sign}₹${Math.abs(Math.round(amount)).toLocaleString('en-IN')}`;
}
