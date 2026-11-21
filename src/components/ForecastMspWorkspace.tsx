import {
  AlertTriangle,
  CalendarClock,
  CloudSun,
  Landmark,
  ShieldCheck,
  TrendingUp,
  Warehouse,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CROPS, UP_DISTRICTS, type CropId, type DistrictId } from '../data/upMandis';
import type { UiStrings } from '../utils/i18n';
import { formatINR, type RankedMandiProfit, type SellVsStoreAdvisory } from '../utils/mandiEngine';

interface ForecastMspWorkspaceProps {
  cropId: CropId;
  originDistrict: DistrictId;
  quantityQtl: number;
  holdDays: number;
  onChangeHoldDays: (days: number) => void;
  storageMode: 'cold_store' | 'farm_godown';
  onChangeStorageMode: (mode: 'cold_store' | 'farm_godown') => void;
  topMandi: RankedMandiProfit;
  advisory: SellVsStoreAdvisory;
  t: UiStrings;
}

export function ForecastMspWorkspace({
  cropId,
  originDistrict,
  quantityQtl,
  holdDays,
  onChangeHoldDays,
  storageMode,
  onChangeStorageMode,
  topMandi,
  advisory,
  t,
}: ForecastMspWorkspaceProps) {
  const crop = CROPS[cropId];
  const district = UP_DISTRICTS.find((d) => d.id === originDistrict) ?? UP_DISTRICTS[0];
  const isHoldRecommended = advisory.verdict === 'STORE_AND_HOLD';

  return (
    <div className="space-y-6">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <p className="text-xs font-medium text-emerald-800 mb-1">
            {crop.nameEn} ({crop.nameHi}) · {district.label} ({district.labelHi})
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {t.forecast.title}
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            {t.forecast.subtitle}
          </p>
        </div>

        {/* Storage Mode Selector */}
        <div
          className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0"
          role="group"
          aria-label="Storage facility type"
        >
          <button
            type="button"
            onClick={() => onChangeStorageMode('cold_store')}
            aria-pressed={storageMode === 'cold_store'}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              storageMode === 'cold_store'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.forecast.coldStore} ({formatINR(crop.coldStoragePerQtlDay)}/qtl)
          </button>
          <button
            type="button"
            onClick={() => onChangeStorageMode('farm_godown')}
            aria-pressed={storageMode === 'farm_godown'}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              storageMode === 'farm_godown'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.forecast.farmShed} ({formatINR(crop.godownPerQtlDay)}/qtl)
          </button>
        </div>
      </section>

      {/* Primary Decision Verdict Banner */}
      <section
        data-testid="sell-vs-store-verdict"
        className={`rounded-xl border p-5 sm:p-6 ${
          isHoldRecommended
            ? 'bg-amber-50/60 border-amber-300'
            : 'bg-emerald-50/60 border-emerald-300'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold">
              {isHoldRecommended ? (
                <Warehouse className="w-4 h-4 text-amber-800" aria-hidden="true" />
              ) : (
                <TrendingUp className="w-4 h-4 text-emerald-800" aria-hidden="true" />
              )}
              <span className={isHoldRecommended ? 'text-amber-900' : 'text-emerald-900'}>
                {isHoldRecommended
                  ? `${t.forecast.holdBadge} (${advisory.optimalDay}d)`
                  : t.forecast.sellNowBadge}
              </span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900">
              {advisory.headline}
            </h2>
            <p className="text-sm text-slate-700 max-w-3xl">{advisory.rationale}</p>
          </div>

          <div className="shrink-0 bg-white border border-slate-200 rounded-lg px-4 py-3 min-w-[210px]">
            <p className="text-xs text-slate-500">
              Net Difference at Day +{advisory.selectedDay}
            </p>
            <p
              data-testid="selected-hold-gain"
              className={`font-mono tabular-nums text-2xl font-bold mt-0.5 ${
                advisory.selectedDayGainRs >= 0 ? 'text-emerald-800' : 'text-red-700'
              }`}
            >
              {advisory.selectedDayGainRs >= 0 ? '+' : ''}
              {formatINR(advisory.selectedDayGainRs)}
            </p>
            <p className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
              Storage: {formatINR(advisory.storageCostRs)} · Shrinkage: {formatINR(advisory.spoilageLossRs)}
            </p>
          </div>
        </div>
      </section>

      {/* Forecast Chart + Hold Duration Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900">
                15-Day Projected Net Take-Home ({quantityQtl} Qtl at {topMandi.mandi.name})
              </h3>
              <p className="text-xs text-slate-500">
                Accounts for your crop&apos;s moisture &amp; grade adjustment, daily storage rent, and spoilage loss.
              </p>
            </div>
            <div className="w-full sm:w-56">
              <div className="flex items-center justify-between text-xs mb-1">
                <label htmlFor="hold-days-slider" className="font-semibold text-slate-700">
                  {t.forecast.holdSlider}
                </label>
                <span className="font-mono tabular-nums font-bold text-emerald-800">
                  Day +{holdDays}
                </span>
              </div>
              <input
                id="hold-days-slider"
                type="range"
                min={1}
                max={14}
                value={holdDays}
                onChange={(e) => onChangeHoldDays(Number(e.target.value))}
                className="w-full accent-emerald-700 cursor-pointer"
              />
            </div>
          </div>

          <div className="h-[290px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={advisory.dailySeries}
                margin={{ top: 12, right: 18, left: 6, bottom: 4 }}
              >
                <defs>
                  <linearGradient id="netRevFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#15803d" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#15803d" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(1)}k`}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  domain={['dataMin - 600', 'dataMax + 600']}
                />
                <Tooltip
                  formatter={(value: unknown, name: unknown) => {
                    const num = Number(value ?? 0);
                    if (name === 'netProjectedRevenueRs') return [formatINR(num), 'Net Take-Home'];
                    return [formatINR(num), String(name)];
                  }}
                  contentStyle={{
                    borderRadius: '8px',
                    borderColor: '#cbd5e1',
                    fontSize: '12px',
                  }}
                />
                <ReferenceLine
                  x={advisory.dailySeries[holdDays]?.label}
                  stroke="#b45309"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                />
                <Area
                  type="monotone"
                  dataKey="netProjectedRevenueRs"
                  stroke="#15803d"
                  strokeWidth={2.5}
                  fill="url(#netRevFill)"
                  dot={{ r: 3, fill: '#15803d', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#14532d' }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Market Drivers */}
          <div className="pt-4 border-t border-slate-200">
            <p className="text-xs font-semibold text-slate-700 mb-2">
              Key Forecast Drivers for {crop.nameEn}
            </p>
            <ul className="space-y-1.5 text-xs text-slate-600 list-disc pl-4">
              {crop.forecastDrivers.map((driver) => (
                <li key={driver}>{driver}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* Right Column: Weather Risk + UP MSP Procurement Card */}
        <section className="lg:col-span-4 space-y-5">
          {/* Weather Risk Box */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CloudSun className="w-4 h-4 text-amber-700" aria-hidden="true" />
                <h3 className="font-display text-base font-bold text-slate-900">
                  {t.forecast.weatherTitle}
                </h3>
              </div>
              <span
                className={`text-xs font-semibold ${
                  advisory.weatherRiskLabel === 'High'
                    ? 'text-red-700'
                    : advisory.weatherRiskLabel === 'Moderate'
                      ? 'text-amber-700'
                      : 'text-emerald-700'
                }`}
              >
                {advisory.weatherRiskLabel} Risk
              </span>
            </div>
            <p className="text-sm font-medium text-slate-800">{crop.weatherRisk.summary}</p>
            <p className="text-xs text-slate-600 leading-relaxed">{crop.weatherRisk.impactNote}</p>
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <span>District Now ({district.label})</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {district.weatherTempC}°C · {district.weatherCondition}
              </span>
            </div>
          </div>

          {/* UP MSP & Government Scheme Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Landmark className="w-4 h-4 text-emerald-700" aria-hidden="true" />
              <h3 className="font-display text-base font-bold text-slate-900">
                {t.forecast.mspTitle}
              </h3>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-900">{crop.msp.schemeName}</p>
              <p className="text-xs text-slate-500 mt-0.5">{crop.msp.schemeNameHi}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-200 text-xs">
              <div>
                <p className="text-slate-500">
                  {crop.msp.hasOfficialMsp ? 'Official MSP Rate' : 'MIS Floor Support'}
                </p>
                <p className="font-mono tabular-nums text-lg font-bold text-slate-900 mt-0.5">
                  {crop.msp.ratePerQtl > 0 ? `${formatINR(crop.msp.ratePerQtl)}/qtl` : 'Buffer Only'}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Your Top Mandi Rate</p>
                <p className="font-mono tabular-nums text-lg font-bold text-emerald-800 mt-0.5">
                  {formatINR(topMandi.gradeAdjustedPricePerQtl)}/qtl
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs text-slate-700">
              {advisory.mspComparisonRsPerQtl !== null && advisory.mspComparisonRsPerQtl > 0 ? (
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
              )}
              <p className="leading-relaxed">{advisory.mspRecommendation}</p>
            </div>

            <div className="text-xs text-slate-500 space-y-1 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                <CalendarClock className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                <span>{crop.msp.procurementWindow}</span>
              </div>
              <p>
                <strong className="text-slate-700">FAQ Standard:</strong> {crop.msp.faqRule}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
