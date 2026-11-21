import {
  AlertTriangle,
  ArrowRight,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  FileCheck2,
  Globe,
  Loader2,
  MapPin,
  Minus,
  Plus,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Truck,
  Upload,
} from 'lucide-react';
import { useState, type ChangeEvent } from 'react';
import {
  CROPS,
  UP_DISTRICTS,
  VEHICLE_OPTIONS,
  type CropId,
  type CropQualityInput,
  type DistrictId,
  type GradeTier,
  type LanguageCode,
  type SizeGrade,
  type VehicleTypeId,
} from '../data/upMandis';
import type { GroundingSource } from '../utils/grounding';
import type { UiStrings } from '../utils/i18n';
import {
  calculateGradeAdjustment,
  formatINR,
  type RankedMandiProfit,
  type SellVsStoreAdvisory,
} from '../utils/mandiEngine';

interface PhotoInspectionResult {
  moisturePercent: number;
  damagePercent: number;
  foreignMatterPercent: number;
  sizeGrade: SizeGrade;
  gradeTier: GradeTier;
  visualSummary: string;
  negotiationTip: string;
}

type QualityPresetId = 'good' | 'normal' | 'weak';

interface ProfitGradeWorkspaceProps {
  cropId: CropId;
  onChangeCrop: (crop: CropId) => void;
  originDistrict: DistrictId;
  quantityQtl: number;
  onChangeQuantity: (qty: number) => void;
  vehicleId: VehicleTypeId;
  onChangeVehicle: (vehicle: VehicleTypeId) => void;
  quality: CropQualityInput;
  onChangeQuality: (quality: CropQualityInput) => void;
  onResetQuality: () => void;
  rankedMandis: RankedMandiProfit[];
  advisory: SellVsStoreAdvisory;
  onNavigateTab: (tab: 'map' | 'forecast' | 'pools' | 'voice') => void;
  language: LanguageCode;
  t: UiStrings;
}

export function ProfitGradeWorkspace({
  cropId,
  onChangeCrop,
  originDistrict,
  quantityQtl,
  onChangeQuantity,
  vehicleId,
  onChangeVehicle,
  quality,
  onChangeQuality,
  onResetQuality,
  rankedMandis,
  advisory,
  onNavigateTab,
  language,
  t,
}: ProfitGradeWorkspaceProps) {
  const [expandedMandiId, setExpandedMandiId] = useState<string | null>(null);
  const [showAllMandis, setShowAllMandis] = useState(false);
  const [showDetailedQuality, setShowDetailedQuality] = useState(false);
  const [showPhotoInspector, setShowPhotoInspector] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [inspectingPhoto, setInspectingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoResult, setPhotoResult] = useState<PhotoInspectionResult | null>(null);
  const [copiedSlip, setCopiedSlip] = useState(false);
  const [liveSearchLoading, setLiveSearchLoading] = useState(false);
  const [liveSearchError, setLiveSearchError] = useState<string | null>(null);
  const [liveSearchData, setLiveSearchData] = useState<{
    summary: string;
    sources: GroundingSource[];
  } | null>(null);

  const crop = CROPS[cropId];
  const topMandi = rankedMandis[0];
  const originInfo = UP_DISTRICTS.find((d) => d.id === originDistrict) ?? UP_DISTRICTS[0];
  const gradeValuation = calculateGradeAdjustment(
    cropId,
    topMandi?.congestionAdjustedModal ?? 1500,
    quality
  );
  const displayedMandis = showAllMandis ? rankedMandis : rankedMandis.slice(0, 3);
  const isHindiFamily = language !== 'en';

  // Identify which simple preset best matches current quality inputs
  const activePreset: QualityPresetId | null =
    quality.gradeTier === 'premium' &&
    quality.sizeGrade === 'bold' &&
    quality.moisturePercent <= crop.idealMoistureMax - 1
      ? 'good'
      : quality.gradeTier === 'commercial' ||
          quality.moisturePercent >= crop.idealMoistureMax + 4 ||
          quality.damagePercent >= 6
        ? 'weak'
        : 'normal';

  const applyQualityPreset = (preset: QualityPresetId) => {
    if (preset === 'good') {
      onChangeQuality({
        ...quality,
        moisturePercent: Math.max(crop.moistureMin, crop.idealMoistureMax - 2),
        damagePercent: 1.0,
        foreignMatterPercent: 0.5,
        sizeGrade: 'bold',
        gradeTier: 'premium',
      });
    } else if (preset === 'normal') {
      onResetQuality();
    } else {
      onChangeQuality({
        ...quality,
        moisturePercent: Math.min(crop.moistureMax, crop.idealMoistureMax + 5),
        damagePercent: 7.0,
        foreignMatterPercent: 3.0,
        sizeGrade: 'small',
        gradeTier: 'commercial',
      });
    }
  };

  const updateQualityField = <K extends keyof CropQualityInput>(
    field: K,
    value: CropQualityInput[K]
  ) => {
    onChangeQuality({
      ...quality,
      [field]: value,
    });
  };

  async function inspectBase64Image(base64Data: string, mimeType: string) {
    setInspectingPhoto(true);
    setPhotoError(null);
    setPhotoResult(null);
    try {
      const response = await fetch('/api/grade-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType,
          cropName: `${crop.nameEn} (${crop.nameHi})`,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Could not inspect crop photo.');
      }

      const validSize: SizeGrade =
        data.sizeGrade === 'bold' || data.sizeGrade === 'small' ? data.sizeGrade : 'medium';
      const validTier: GradeTier =
        data.gradeTier === 'premium' || data.gradeTier === 'commercial'
          ? data.gradeTier
          : 'faq';

      const parsed: PhotoInspectionResult = {
        moisturePercent: Number(
          Math.max(
            crop.moistureMin,
            Math.min(crop.moistureMax, Number(data.moisturePercent) || crop.idealMoistureMax)
          ).toFixed(1)
        ),
        damagePercent: Number(
          Math.max(0, Math.min(20, Number(data.damagePercent) || 2)).toFixed(1)
        ),
        foreignMatterPercent: Number(
          Math.max(0, Math.min(10, Number(data.foreignMatterPercent) || 1)).toFixed(1)
        ),
        sizeGrade: validSize,
        gradeTier: validTier,
        visualSummary: String(data.visualSummary || ''),
        negotiationTip: String(data.negotiationTip || ''),
      };

      setPhotoResult(parsed);
      onChangeQuality({
        ...quality,
        moisturePercent: parsed.moisturePercent,
        damagePercent: parsed.damagePercent,
        foreignMatterPercent: parsed.foreignMatterPercent,
        sizeGrade: parsed.sizeGrade,
        gradeTier: parsed.gradeTier,
      });
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Photo inspection failed.');
    } finally {
      setInspectingPhoto(false);
    }
  }

  async function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '');
      setPreviewSrc(dataUrl);
      const [, base64 = ''] = dataUrl.split(',');
      if (base64) {
        inspectBase64Image(base64, file.type || 'image/jpeg');
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleInspectSampleImage() {
    setShowPhotoInspector(true);
    setPreviewSrc(crop.sampleImage);
    setPhotoError(null);
    setInspectingPhoto(true);
    try {
      const res = await fetch(crop.sampleImage);
      if (!res.ok) throw new Error('Unable to load sample crop image.');
      const blob = await res.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => {
          const url = String(r.result ?? '');
          resolve(url.split(',')[1] ?? '');
        };
        r.onerror = () => reject(new Error('Failed to encode sample image.'));
        r.readAsDataURL(blob);
      });
      await inspectBase64Image(base64, blob.type || 'image/jpeg');
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Could not analyze sample photo.');
      setInspectingPhoto(false);
    }
  }

  function handleCopyGateSlip() {
    if (!topMandi) return;
    const slip = [
      `MandiMitra Fair Price Slip (${crop.nameEn} / ${crop.nameHi})`,
      `District: ${originInfo.label} | Qty: ${quantityQtl} Qtl | Variety: ${quality.varietyNote}`,
      `Quality: ${gradeValuation.computedGradeLabel} | Moisture: ${quality.moisturePercent}% | Size: ${quality.sizeGrade} | Damage: ${quality.damagePercent}%`,
      `Best Mandi: ${topMandi.mandi.name} (${topMandi.distanceKm} km)`,
      `Fair Rate: ₹${topMandi.gradeAdjustedPricePerQtl}/qtl | Take-Home Cash: ${formatINR(topMandi.netProfitRs)}`,
    ].join('\n');
    navigator.clipboard?.writeText(slip).catch(() => {});
    setCopiedSlip(true);
    setTimeout(() => setCopiedSlip(false), 2200);
  }

  async function handleFetchLiveSearchNews() {
    setLiveSearchLoading(true);
    setLiveSearchError(null);
    try {
      const res = await fetch('/api/live-intel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'search',
          cropName: `${crop.nameEn} (${crop.nameHi})`,
          districtName: originInfo.label,
          language,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not fetch live market update.');
      }
      setLiveSearchData({
        summary: data.summary,
        sources: Array.isArray(data.sources) ? data.sources : [],
      });
    } catch (err) {
      setLiveSearchError(err instanceof Error ? err.message : 'Unable to fetch live search update.');
    } finally {
      setLiveSearchLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Clean Simple Header */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <p className="text-xs font-medium text-emerald-800 mb-1">
            {isHindiFamily ? originInfo.labelHi : originInfo.label} · {originInfo.weatherTempC}°C {originInfo.weatherCondition}
          </p>
          <h1
            data-testid="profit-page-heading"
            className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900"
          >
            {t.profit.title}
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">{t.profit.subtitle}</p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleCopyGateSlip}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            {copiedSlip ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                <span>{t.profit.copiedSlip}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t.profit.copySlip}</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('forecast')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <span>{t.profit.checkSellOrWait}</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* STEP 1: Simple Visual Crop Picker + Quantity Stepper + Vehicle */}
      <section
        aria-label={t.profit.step1Title}
        className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
      >
        <h2 className="font-display text-base font-bold text-slate-900">
          {t.profit.step1Title}
        </h2>

        {/* One-Tap Crop Selector Buttons */}
        <div
          className="grid grid-cols-2 sm:grid-cols-5 gap-2"
          role="group"
          aria-label="Choose crop"
        >
          {Object.values(CROPS).map((c) => {
            const active = cropId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                data-testid={`crop-btn-${c.id}`}
                onClick={() => onChangeCrop(c.id)}
                aria-pressed={active}
                className={`px-3 py-2.5 rounded-lg border text-left transition-colors ${
                  active
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-950'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="block text-sm font-bold leading-tight">
                  {isHindiFamily ? c.nameHi : c.nameEn.split(' ')[0]}
                </span>
                <span className="block text-[11px] text-slate-500 mt-0.5">
                  {isHindiFamily ? c.nameEn.split(' ')[0] : c.nameHi}
                </span>
              </button>
            );
          })}
        </div>

        {/* Quantity Stepper + Vehicle Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <div>
            <label
              htmlFor="quantity-input"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              {t.profit.quantityLabel}
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Decrease quantity by 5 quintals"
                onClick={() => onChangeQuantity(Math.max(1, quantityQtl - 5))}
                className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shrink-0"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                id="quantity-input"
                type="number"
                min={1}
                max={500}
                value={quantityQtl}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (!Number.isNaN(n)) onChangeQuantity(Math.max(1, Math.min(500, n)));
                }}
                className="w-full h-10 px-3 text-center rounded-lg border border-slate-300 bg-white font-mono tabular-nums text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              <button
                type="button"
                aria-label="Increase quantity by 5 quintals"
                onClick={() => onChangeQuantity(Math.min(500, quantityQtl + 5))}
                className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shrink-0"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="vehicle-select"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              {t.profit.vehicleLabel}
            </label>
            <select
              id="vehicle-select"
              value={vehicleId}
              onChange={(e) => onChangeVehicle(e.target.value as VehicleTypeId)}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              {VEHICLE_OPTIONS.map((v) => (
                <option key={v.id} value={v.id}>
                  {isHindiFamily ? v.labelHi : v.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Main Split: STEP 2 (Simple Quality Presets + Optional Fine-Tune) & STEP 3 (Best Mandi Verdict) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* STEP 2: Crop Quality (Simple First, Detailed On-Demand) */}
        <section
          aria-label={t.profit.step2Title}
          className="xl:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-base font-bold text-slate-900">
              {t.profit.step2Title}
            </h2>
            <button
              type="button"
              onClick={onResetQuality}
              aria-label="Reset crop quality to standard FAQ defaults"
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Reset</span>
            </button>
          </div>

          {/* 3 One-Tap Easy Quality Cards */}
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Quick crop quality presets">
            <button
              type="button"
              data-testid="quality-preset-good"
              onClick={() => applyQualityPreset('good')}
              aria-pressed={activePreset === 'good'}
              className={`p-3 rounded-lg border text-left transition-colors ${
                activePreset === 'good'
                  ? 'bg-emerald-50 border-emerald-600 text-emerald-950'
                  : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
              }`}
            >
              <span className="block text-xs font-bold leading-snug">
                {t.profit.qualityGood}
              </span>
              <span className="block text-[11px] text-slate-500 mt-1 leading-tight">
                {t.profit.qualityGoodSub}
              </span>
            </button>

            <button
              type="button"
              data-testid="quality-preset-normal"
              onClick={() => applyQualityPreset('normal')}
              aria-pressed={activePreset === 'normal'}
              className={`p-3 rounded-lg border text-left transition-colors ${
                activePreset === 'normal'
                  ? 'bg-emerald-50 border-emerald-600 text-emerald-950'
                  : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
              }`}
            >
              <span className="block text-xs font-bold leading-snug">
                {t.profit.qualityNormal}
              </span>
              <span className="block text-[11px] text-slate-500 mt-1 leading-tight">
                {t.profit.qualityNormalSub}
              </span>
            </button>

            <button
              type="button"
              data-testid="quality-preset-weak"
              onClick={() => applyQualityPreset('weak')}
              aria-pressed={activePreset === 'weak'}
              className={`p-3 rounded-lg border text-left transition-colors ${
                activePreset === 'weak'
                  ? 'bg-amber-50 border-amber-600 text-amber-950'
                  : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
              }`}
            >
              <span className="block text-xs font-bold leading-snug">
                {t.profit.qualityWeak}
              </span>
              <span className="block text-[11px] text-slate-500 mt-1 leading-tight">
                {t.profit.qualityWeakSub}
              </span>
            </button>
          </div>

          {/* Fair Price Result Strip */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate-600">{t.profit.fairRateLabel}</p>
              <p
                data-testid="grade-adjusted-price"
                className="font-mono tabular-nums text-2xl font-bold text-slate-900 mt-0.5"
              >
                {formatINR(gradeValuation.adjustedPricePerQtl)}
                <span className="text-xs font-sans font-normal text-slate-500"> / qtl</span>
              </p>
            </div>
            <div className="text-right">
              <p
                data-testid="computed-grade-label"
                className="text-xs font-bold text-emerald-800"
              >
                {gradeValuation.computedGradeLabel}
              </p>
              <p
                className={`font-mono tabular-nums text-xs font-semibold mt-0.5 ${
                  gradeValuation.totalAdjustmentPct > 0
                    ? 'text-emerald-700'
                    : gradeValuation.totalAdjustmentPct < 0
                      ? 'text-amber-700'
                      : 'text-slate-500'
                }`}
              >
                {gradeValuation.totalAdjustmentPct > 0 ? '+' : ''}
                {gradeValuation.totalAdjustmentPct}% ({gradeValuation.totalAdjustmentRsPerQtl >= 0 ? '+' : ''}
                {formatINR(gradeValuation.totalAdjustmentRsPerQtl)})
              </p>
            </div>
          </div>

          {/* MSP Warning if applicable */}
          {crop.msp.hasOfficialMsp && (
            <div
              className={`text-xs rounded-lg p-3 border flex items-start gap-2 ${
                gradeValuation.mspEligible
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              {gradeValuation.mspEligible ? (
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
              )}
              <div>
                <p className="font-semibold">
                  {gradeValuation.mspEligible
                    ? `MSP OK · ${formatINR(crop.msp.ratePerQtl)}/qtl`
                    : `MSP Alert · ${formatINR(crop.msp.ratePerQtl)}/qtl`}
                </p>
                <p className="mt-0.5 opacity-90">
                  {gradeValuation.mspWarning ?? crop.msp.faqRule}
                </p>
              </div>
            </div>
          )}

          {/* Progressive Disclosure Toggle: Fine-Tune Moisture / Size / Damage / Photo */}
          <button
            type="button"
            data-testid="toggle-detailed-quality"
            onClick={() => setShowDetailedQuality((prev) => !prev)}
            aria-expanded={showDetailedQuality}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
          >
            <span className="inline-flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
              <span>
                {showDetailedQuality ? t.profit.hideQualityBtn : t.profit.moreQualityBtn}
              </span>
            </span>
            {showDetailedQuality ? (
              <ChevronUp className="w-4 h-4 text-slate-400" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" aria-hidden="true" />
            )}
          </button>

          {showDetailedQuality && (
            <div className="space-y-4 pt-2 border-t border-slate-200">
              <div>
                <label htmlFor="variety-select" className="block text-xs font-semibold text-slate-700 mb-1">
                  Crop Variety (किस्म)
                </label>
                <select
                  id="variety-select"
                  value={quality.varietyNote}
                  onChange={(e) => updateQualityField('varietyNote', e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
                >
                  {crop.sampleVarieties.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <label htmlFor="moisture-slider" className="font-semibold text-slate-700">
                    Moisture (नमी %)
                  </label>
                  <span className="font-mono tabular-nums font-semibold text-slate-900">
                    {quality.moisturePercent.toFixed(1)}% (FAQ ≤ {crop.idealMoistureMax}%)
                  </span>
                </div>
                <input
                  id="moisture-slider"
                  type="range"
                  min={crop.moistureMin}
                  max={crop.moistureMax}
                  step={0.5}
                  value={quality.moisturePercent}
                  onChange={(e) => updateQualityField('moisturePercent', Number(e.target.value))}
                  className="w-full accent-emerald-700 cursor-pointer"
                />
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Grain / Tuber Size (आकार)
                </span>
                <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg" role="group" aria-label="Crop size uniformity">
                  {(
                    [
                      { id: 'bold', label: 'Bold (+4%)' },
                      { id: 'medium', label: 'Medium' },
                      { id: 'small', label: 'Small (-4.5%)' },
                    ] as { id: SizeGrade; label: string }[]
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateQualityField('sizeGrade', opt.id)}
                      aria-pressed={quality.sizeGrade === opt.id}
                      className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                        quality.sizeGrade === opt.id
                          ? 'bg-white text-slate-900 shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <label htmlFor="damage-input" className="font-semibold text-slate-700">
                      Damage / Cuts
                    </label>
                    <span className="font-mono tabular-nums font-semibold text-slate-900">
                      {quality.damagePercent.toFixed(1)}%
                    </span>
                  </div>
                  <input
                    id="damage-input"
                    type="range"
                    min={0}
                    max={15}
                    step={0.5}
                    value={quality.damagePercent}
                    onChange={(e) => updateQualityField('damagePercent', Number(e.target.value))}
                    className="w-full accent-emerald-700 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <label htmlFor="foreign-input" className="font-semibold text-slate-700">
                      Soil / Chaff
                    </label>
                    <span className="font-mono tabular-nums font-semibold text-slate-900">
                      {quality.foreignMatterPercent.toFixed(1)}%
                    </span>
                  </div>
                  <input
                    id="foreign-input"
                    type="range"
                    min={0}
                    max={8}
                    step={0.5}
                    value={quality.foreignMatterPercent}
                    onChange={(e) =>
                      updateQualityField('foreignMatterPercent', Number(e.target.value))
                    }
                    className="w-full accent-emerald-700 cursor-pointer"
                  />
                </div>
              </div>

              {/* Photo Grader */}
              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                <button
                  type="button"
                  onClick={() => setShowPhotoInspector((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{t.profit.photoCheckBtn}</span>
                </button>

                {showPhotoInspector && (
                  <div className="space-y-2.5">
                    <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-100 aspect-[4/3]">
                      <img
                        src={previewSrc || crop.sampleImage}
                        alt={`Sample ${crop.nameEn} mandi lot`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={inspectingPhoto}
                        onClick={handleInspectSampleImage}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg"
                      >
                        {inspectingPhoto ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                        ) : (
                          <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        <span>{inspectingPhoto ? 'Grading...' : 'Grade Sample'}</span>
                      </button>

                      <label className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer">
                        <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Upload Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="sr-only"
                        />
                      </label>
                    </div>

                    {photoError && (
                      <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5">
                        {photoError}
                      </p>
                    )}

                    {photoResult && (
                      <div className="text-xs bg-emerald-50/70 border border-emerald-200 rounded-lg p-3 space-y-1 text-slate-800">
                        <div className="flex items-center gap-1.5 font-semibold text-emerald-900">
                          <FileCheck2 className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                          <span>AI Photo Grade Applied</span>
                        </div>
                        <p>{photoResult.visualSummary}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* STEP 3: Crystal-Clear Winner Card + Simple Top 3 Mandis (Expandable to All 8) */}
        <section
          aria-label={t.profit.step3Title}
          className="xl:col-span-7 space-y-5"
        >
          {topMandi && (
            <div className="bg-white border-2 border-emerald-600/80 rounded-xl p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-emerald-800">
                    {t.profit.bestMandiLabel}
                  </p>
                  <h2
                    data-testid="top-mandi-name"
                    className="font-display text-2xl font-bold text-slate-900 mt-1"
                  >
                    {isHindiFamily ? topMandi.mandi.nameHi : topMandi.mandi.name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {isHindiFamily ? topMandi.mandi.name : topMandi.mandi.nameHi} · {topMandi.distanceKm} km ·{' '}
                    <span
                      className={
                        topMandi.congestionStatus === 'Undersupplied'
                          ? 'text-emerald-700 font-semibold'
                          : topMandi.congestionStatus === 'Overcrowded'
                            ? 'text-red-700 font-semibold'
                            : 'text-slate-700 font-medium'
                      }
                    >
                      {topMandi.congestionStatus} ({topMandi.congestionLoadPct}%)
                    </span>
                  </p>
                </div>

                <div className="text-left sm:text-right shrink-0">
                  <p className="text-xs font-medium text-slate-500">
                    {t.profit.cashInHandLabel} ({quantityQtl} Qtl)
                  </p>
                  <p
                    data-testid="top-mandi-net-profit"
                    className="font-mono tabular-nums text-3xl sm:text-4xl font-bold text-emerald-800 mt-0.5"
                  >
                    {formatINR(topMandi.netProfitRs)}
                  </p>
                  <p className="font-mono tabular-nums text-xs text-slate-600 mt-0.5">
                    {formatINR(topMandi.netProfitPerQtlRs)} {t.profit.perQuintalNet}
                  </p>
                </div>
              </div>

              {/* Clean 3-Metric Strip */}
              <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-slate-200">
                <div>
                  <p className="text-xs text-slate-500">{t.profit.deductionsLabel}</p>
                  <p className="font-mono tabular-nums text-base font-bold text-red-700 mt-0.5">
                    -{formatINR(topMandi.totalDeductionsRs)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">{t.profit.extraVsLocal}</p>
                  <p className="font-mono tabular-nums text-base font-bold text-emerald-700 mt-0.5">
                    {topMandi.gainVsLocalMandiRs >= 0 ? '+' : ''}
                    {formatINR(topMandi.gainVsLocalMandiRs)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">{t.profit.mspRateLabel}</p>
                  <p className="font-mono tabular-nums text-base font-bold text-slate-900 mt-0.5">
                    {crop.msp.ratePerQtl > 0 ? `${formatINR(crop.msp.ratePerQtl)}/qtl` : 'Spot'}
                  </p>
                </div>
              </div>

              {/* Shared Truck Savings Tip */}
              {topMandi.matchingPool && topMandi.pooledSavingsRs && (
                <div className="mt-4 pt-3.5 border-t border-slate-200 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Truck className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                    <span>
                      <strong>{t.profit.sharedTruckPrompt}:</strong>{' '}
                      <span className="font-mono tabular-nums font-bold text-emerald-800">
                        +{formatINR(topMandi.pooledSavingsRs)}
                      </span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('pools')}
                    className="font-semibold text-emerald-800 hover:underline whitespace-nowrap shrink-0"
                  >
                    {t.profit.viewPoolBtn} →
                  </button>
                </div>
              )}

              {/* One-Glance Sell Today vs Hold + Quick Action Strip */}
              <div className="mt-4 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
                <div className="text-xs font-semibold text-slate-800">
                  <span className={advisory.verdict === 'STORE_AND_HOLD' ? 'text-amber-800' : 'text-emerald-800'}>
                    {advisory.verdict === 'STORE_AND_HOLD'
                      ? `${t.forecast.holdBadge} (${advisory.optimalDay}d · +${formatINR(Math.max(0, advisory.optimalDayGainRs))})`
                      : t.forecast.sellNowBadge}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    data-testid="open-mandi-map-btn"
                    onClick={() => onNavigateTab('map')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors whitespace-nowrap"
                  >
                    <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t.nav.map}</span>
                  </button>

                  <button
                    type="button"
                    data-testid="live-google-search-btn"
                    onClick={handleFetchLiveSearchNews}
                    disabled={liveSearchLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-colors whitespace-nowrap disabled:opacity-60"
                  >
                    {liveSearchLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" aria-hidden="true" />
                    ) : (
                      <Globe className="w-3.5 h-3.5 text-sky-700" aria-hidden="true" />
                    )}
                    <span>{isHindiFamily ? 'ताज़ा भाव व मौसम (Google)' : 'Live Market News (Google)'}</span>
                  </button>
                </div>
              </div>

              {/* Inline Google Search Grounded News & Weather Card */}
              {(liveSearchData || liveSearchError) && (
                <div className="mt-4 pt-3.5 border-t border-slate-200 bg-sky-50/50 -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 px-5 sm:px-6 py-4 rounded-b-xl space-y-2">
                  {liveSearchError ? (
                    <p role="alert" className="text-xs text-red-700">
                      {liveSearchError}
                    </p>
                  ) : (
                    liveSearchData && (
                      <>
                        <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-sky-700" aria-hidden="true" />
                          <span>
                            {isHindiFamily
                              ? `Google Search से ताज़ा मंडी व मौसम अपडेट (${originInfo.labelHi})`
                              : `Live Google Search Market & Weather Update (${originInfo.label})`}
                          </span>
                        </p>
                        <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-line leading-relaxed">
                          {liveSearchData.summary}
                        </p>
                        {liveSearchData.sources.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {liveSearchData.sources.map((src) => (
                              <a
                                key={src.uri}
                                href={src.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-sky-200 text-[11px] font-semibold text-sky-900 hover:bg-sky-50"
                              >
                                <span>{src.title}</span>
                                <ExternalLink className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
                              </a>
                            ))}
                          </div>
                        )}
                      </>
                    )
                  )}
                </div>
              )}
            </div>
          )}

          {/* Clean Top 3 Mandis Comparison (Expandable to All 8) */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-2">
              <h3 className="font-display text-base font-bold text-slate-900">
                {t.profit.step3Title}
              </h3>
              <button
                type="button"
                data-testid="toggle-all-mandis"
                onClick={() => setShowAllMandis((prev) => !prev)}
                className="text-xs font-semibold text-emerald-800 hover:underline whitespace-nowrap"
              >
                {showAllMandis ? t.profit.showTopMandis : t.profit.showAllMandis}
              </button>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[600px]" role="table" aria-label={t.profit.step3Title}>
                <div
                  role="row"
                  className="grid grid-cols-[minmax(190px,2.2fr)_72px_94px_92px_124px] items-center bg-slate-50 border-b border-slate-200 px-5 py-2 text-[11px] font-semibold text-slate-600"
                >
                  <div role="columnheader">{t.profit.tableMandi}</div>
                  <div role="columnheader" className="text-right">{t.profit.tableDist}</div>
                  <div role="columnheader" className="text-right">{t.profit.tableRate}</div>
                  <div role="columnheader" className="text-right">{t.profit.tableCosts}</div>
                  <div role="columnheader" className="text-right">{t.profit.tableProfit}</div>
                </div>

                <div className="divide-y divide-slate-200 text-sm" role="rowgroup">
                  {displayedMandis.map((row, idx) => {
                    const isExpanded = expandedMandiId === row.mandi.id;
                    const isWinner = idx === 0;
                    return (
                      <div key={row.mandi.id} role="row">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedMandiId(isExpanded ? null : row.mandi.id)
                          }
                          aria-expanded={isExpanded}
                          className={`w-full text-left grid grid-cols-[minmax(190px,2.2fr)_72px_94px_92px_124px] items-center py-3 px-5 hover:bg-slate-50/90 transition-colors ${
                            isWinner ? 'bg-emerald-50/40' : ''
                          }`}
                        >
                          <div role="cell" className="pr-2 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-mono tabular-nums text-xs font-bold shrink-0 ${
                                  isWinner ? 'text-emerald-700' : 'text-slate-400'
                                }`}
                              >
                                #{idx + 1}
                              </span>
                              <span className="font-semibold text-slate-900 truncate">
                                {isHindiFamily ? row.mandi.nameHi : row.mandi.name}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {row.congestionStatus} ({row.congestionLoadPct}%)
                              {row.mandi.district === originDistrict ? ' · Home' : ''}
                            </p>
                          </div>

                          <div role="cell" className="text-right font-mono tabular-nums text-xs text-slate-600">
                            {row.distanceKm} km
                          </div>

                          <div role="cell" className="text-right font-mono tabular-nums text-xs font-semibold text-slate-900">
                            {formatINR(row.gradeAdjustedPricePerQtl)}/qtl
                          </div>

                          <div role="cell" className="text-right font-mono tabular-nums text-xs text-red-700">
                            -{formatINR(row.totalDeductionsRs)}
                          </div>

                          <div role="cell" className="text-right flex items-center justify-end gap-1.5">
                            <span
                              className={`font-mono tabular-nums font-bold ${
                                isWinner ? 'text-emerald-800' : 'text-slate-900'
                              }`}
                            >
                              {formatINR(row.netProfitRs)}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                            )}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="space-y-1">
                              <div className="flex justify-between text-slate-600">
                                <span>Gross Sales ({quantityQtl} Qtl)</span>
                                <span className="font-mono tabular-nums font-semibold text-slate-900">
                                  {formatINR(row.grossRevenueRs)}
                                </span>
                              </div>
                              <div className="flex justify-between text-slate-600">
                                <span>Fuel &amp; Vehicle ({row.distanceKm} km)</span>
                                <span className="font-mono tabular-nums text-red-700">
                                  -{formatINR(row.fuelAndHireCostRs)}
                                </span>
                              </div>
                              <div className="flex justify-between text-slate-600">
                                <span>Tolls</span>
                                <span className="font-mono tabular-nums text-red-700">
                                  -{formatINR(row.tollCostRs)}
                                </span>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between text-slate-600">
                                <span>Mandi Fee ({row.mandi.commissionPct}%)</span>
                                <span className="font-mono tabular-nums text-red-700">
                                  -{formatINR(row.commissionCostRs)}
                                </span>
                              </div>
                              <div className="flex justify-between text-slate-600">
                                <span>Loading / Weighing</span>
                                <span className="font-mono tabular-nums text-red-700">
                                  -{formatINR(row.handlingCostRs)}
                                </span>
                              </div>
                              <div className="flex justify-between font-semibold text-emerald-800 pt-1 border-t border-slate-200">
                                <span>Wait Time</span>
                                <span className="font-mono tabular-nums">~{row.mandi.avgWaitHours} hrs</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
