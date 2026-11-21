import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Plus,
  ShieldCheck,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CROPS,
  DISTRICT_DISTANCE_KM,
  UP_DISTRICTS,
  UP_MANDIS,
  type CropId,
  type DistrictId,
  type TransportPool,
  type VehicleTypeId,
} from '../data/upMandis';
import {
  calculatePoolSavings,
  calculateSoloTransportCost,
  formatINR,
  type RankedMandiProfit,
} from '../utils/mandiEngine';
import type { UiStrings } from '../utils/i18n';

interface CongestionPoolWorkspaceProps {
  cropId: CropId;
  originDistrict: DistrictId;
  quantityQtl: number;
  vehicleId: VehicleTypeId;
  rankedMandis: RankedMandiProfit[];
  pools: TransportPool[];
  onJoinPool: (poolId: string, qtlToBook: number) => void;
  onCreatePool: (newPool: Omit<TransportPool, 'id'>) => void;
  t: UiStrings;
}

export function CongestionPoolWorkspace({
  cropId,
  originDistrict,
  quantityQtl,
  vehicleId,
  rankedMandis,
  pools,
  onJoinPool,
  onCreatePool,
  t,
}: CongestionPoolWorkspaceProps) {
  const [poolFilter, setPoolFilter] = useState<'matching' | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create Pool Form state
  const [farmerName, setFarmerName] = useState('');
  const [villageName, setVillageName] = useState('');
  const [destMandiId, setDestMandiId] = useState(
    rankedMandis[0]?.mandi.id ?? 'lucknow_dubagga'
  );
  const [truckCapQtl, setTruckCapQtl] = useState(60);
  const [farmerContributionQtl, setFarmerContributionQtl] = useState(
    Math.min(quantityQtl, 25)
  );
  const [departureDate, setDepartureDate] = useState('Tomorrow, 21 Nov');
  const [departureTime, setDepartureTime] = useState('04:30 AM');
  const [formError, setFormError] = useState<string | null>(null);

  const crop = CROPS[cropId];
  const overcrowdedMandis = rankedMandis.filter((m) => m.congestionStatus === 'Overcrowded');
  const undersuppliedBest = rankedMandis.find((m) => m.congestionStatus === 'Undersupplied');

  const chartData = rankedMandis.map((r) => ({
    name: r.mandi.districtLabel,
    loadPct: r.congestionLoadPct,
    status: r.congestionStatus,
    waitHours: r.mandi.avgWaitHours,
    priceShift: r.mandi.congestionPriceShiftPct,
  }));

  const visiblePools =
    poolFilter === 'matching'
      ? pools.filter((p) => p.cropId === cropId || p.originDistrict === originDistrict)
      : pools;

  function handleCreateSubmit(e: FormEvent) {
    e.preventDefault();
    if (!farmerName.trim() || !villageName.trim()) {
      setFormError('Please enter your name and village/block.');
      return;
    }
    if (farmerContributionQtl < 1 || farmerContributionQtl >= truckCapQtl) {
      setFormError('Your lot must be at least 1 Qtl and less than total truck capacity.');
      return;
    }

    const destMandi = UP_MANDIS.find((m) => m.id === destMandiId) ?? UP_MANDIS[1];
    const distKm = DISTRICT_DISTANCE_KM[originDistrict]?.[destMandi.district] ?? 95;
    const estCost = Math.round(1600 + distKm * 36);

    onCreatePool({
      cropId,
      originDistrict,
      destinationMandiId: destMandiId,
      vehicleLabel: truckCapQtl >= 60 ? `Eicher ${Math.round(truckCapQtl / 10)}-Ton Truck` : 'Bolero Maxi Shared Carrier',
      totalCapacityQtl: truckCapQtl,
      bookedQtl: farmerContributionQtl,
      farmersJoined: 1,
      departureDate,
      departureTime,
      totalTruckCostRs: estCost,
      leadFarmerName: farmerName.trim(),
      leadVillage: villageName.trim(),
      verifiedFpo: false,
      joinedByUser: true,
      userBookedQtl: farmerContributionQtl,
    });

    setFarmerName('');
    setVillageName('');
    setFormError(null);
    setShowCreateModal(false);
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <p className="text-xs font-medium text-emerald-800 mb-1">
            Live Arrival Load &amp; Shared Logistics · {crop.nameEn} ({crop.nameHi})
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {t.pools.title}
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            {t.pools.subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>{t.pools.startPool}</span>
        </button>
      </section>

      {/* Congestion Alert & Redirect Banner */}
      {overcrowdedMandis.length > 0 && undersuppliedBest && (
        <section
          aria-label="Oversupply congestion alert"
          className="bg-red-50/70 border border-red-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <h2 className="font-display text-base font-bold text-red-950">
                Oversupply Congestion Alert: {overcrowdedMandis.map((m) => m.mandi.districtLabel).join(', ')} Yards Above 85% Capacity
              </h2>
              <p className="text-xs text-red-900/90 leading-relaxed max-w-3xl">
                Heavy morning arrivals are triggering 3.8–4.5 hr gate queues and -2.6% to -3.2% distress bidding. Redirecting your {quantityQtl} Qtl lot to{' '}
                <strong>{undersuppliedBest.mandi.name}</strong> ({undersuppliedBest.congestionLoadPct}% load, +{undersuppliedBest.mandi.congestionPriceShiftPct}% undersupply premium) projects{' '}
                <strong className="font-mono tabular-nums">{formatINR(undersuppliedBest.netProfitRs)}</strong> take-home profit.
              </p>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2 text-xs font-semibold text-emerald-900 bg-white border border-emerald-200 rounded-lg px-3.5 py-2.5">
            <span>Redirect Target</span>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
            <span>{undersuppliedBest.mandi.districtLabel} ({undersuppliedBest.congestionLoadPct}% load)</span>
          </div>
        </section>
      )}

      {/* Arrival Congestion Chart */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              {t.pools.crowdChartTitle}
            </h2>
            <p className="text-xs text-slate-500">
              Red (&ge;85%): Price drop risk · Slate (61–84%): Normal · Green (&le;60%): Undersupplied premium opportunity
            </p>
          </div>
        </div>

        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#475569' }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: unknown) => [`${value}% Yard Capacity`, 'Arrival Load']}
                contentStyle={{ borderRadius: '8px', borderColor: '#cbd5e1', fontSize: '12px' }}
              />
              <Bar dataKey="loadPct" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={
                      entry.status === 'Overcrowded'
                        ? '#dc2626'
                        : entry.status === 'Undersupplied'
                          ? '#15803d'
                          : '#64748b'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Collective Transport Pooling Section */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900">
              {t.pools.poolsTitle}
            </h2>
            <p className="text-xs text-slate-500">
              Share truck space with neighboring farmers heading to higher-paying mandis and cut per-quintal freight by 35–55%.
            </p>
          </div>

          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start" role="group" aria-label="Filter transport pools">
            <button
              type="button"
              onClick={() => setPoolFilter('all')}
              aria-pressed={poolFilter === 'all'}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                poolFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              All Active Pools ({pools.length})
            </button>
            <button
              type="button"
              onClick={() => setPoolFilter('matching')}
              aria-pressed={poolFilter === 'matching'}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                poolFilter === 'matching' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              My Crop / District
            </button>
          </div>
        </div>

        {visiblePools.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-800">
              No active truck pools match this filter yet.
            </p>
            <p className="text-xs text-slate-500">
              Start a new shared truck pool so nearby farmers can join your route and split costs.
            </p>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Start Pool</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visiblePools.map((pool) => {
              const destMandi = UP_MANDIS.find((m) => m.id === pool.destinationMandiId);
              const originLabel =
                UP_DISTRICTS.find((d) => d.id === pool.originDistrict)?.label ?? pool.originDistrict;
              const distKm =
                DISTRICT_DISTANCE_KM[pool.originDistrict]?.[destMandi?.district ?? 'lucknow'] ?? 100;
              const solo = calculateSoloTransportCost(distKm, quantityQtl, vehicleId);
              const soloTotal = solo.fuelAndHireCostRs + solo.tollCostRs;
              const bookableQty = Math.min(quantityQtl, Math.max(1, pool.totalCapacityQtl - pool.bookedQtl));
              const savings = calculatePoolSavings(pool, bookableQty, soloTotal);
              const isFull = savings.remainingCapacityQtl <= 0;

              return (
                <article
                  key={pool.id}
                  data-testid={`pool-card-${pool.id}`}
                  className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-slate-500">
                          {CROPS[pool.cropId].nameEn} · {pool.vehicleLabel} · {pool.departureDate}, {pool.departureTime}
                        </p>
                        <h3 className="font-display text-base font-bold text-slate-900 mt-0.5">
                          {originLabel} → {destMandi?.name ?? pool.destinationMandiId}
                        </h3>
                      </div>
                      {pool.verifiedFpo && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 shrink-0">
                          <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>FPO Verified</span>
                        </span>
                      )}
                    </div>

                    {/* Capacity Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                          {pool.farmersJoined} farmer{pool.farmersJoined > 1 ? 's' : ''} · Lead: {pool.leadFarmerName} ({pool.leadVillage})
                        </span>
                        <span className="font-mono tabular-nums font-semibold text-slate-900">
                          {pool.bookedQtl}/{pool.totalCapacityQtl} Qtl
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isFull ? 'bg-slate-500' : 'bg-emerald-600'
                          }`}
                          style={{ width: `${savings.utilizationPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Savings Comparison */}
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-xs">
                      <div>
                        <p className="text-slate-500">Your Solo Cost</p>
                        <p className="font-mono tabular-nums font-semibold text-slate-700 mt-0.5">
                          {formatINR(savings.soloCostRs)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Pooled Share ({bookableQty} Qtl)</p>
                        <p className="font-mono tabular-nums font-bold text-slate-900 mt-0.5">
                          {formatINR(savings.pooledShareCostRs)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Transport Saved</p>
                        <p className="font-mono tabular-nums font-bold text-emerald-700 mt-0.5">
                          +{formatINR(savings.savingsRs)} ({savings.savingsPct}%)
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200">
                    <span className="text-xs text-slate-600 font-mono tabular-nums">
                      {isFull
                        ? 'Truck Full'
                        : `${savings.remainingCapacityQtl} Qtl space remaining`}
                    </span>
                    {pool.joinedByUser ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                        <span>Joined ({pool.userBookedQtl} Qtl reserved)</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={isFull}
                        onClick={() => onJoinPool(pool.id, bookableQty)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 rounded-lg transition-colors whitespace-nowrap"
                      >
                        <Truck className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Reserve {bookableQty} Qtl Slot</span>
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Start New Truck Pool Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-pool-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 id="create-pool-title" className="font-display text-lg font-bold text-slate-900">
                Start a Collective Truck Pool
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                aria-label="Close truck pool modal"
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-sm">
              <div>
                <label htmlFor="pool-farmer-name" className="block text-xs font-semibold text-slate-700 mb-1">
                  Your Name (किसान का नाम)
                </label>
                <input
                  id="pool-farmer-name"
                  type="text"
                  required
                  placeholder="e.g., Ashok Kumar Verma"
                  value={farmerName}
                  onChange={(e) => setFarmerName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label htmlFor="pool-village" className="block text-xs font-semibold text-slate-700 mb-1">
                  Village / Block
                </label>
                <input
                  id="pool-village"
                  type="text"
                  required
                  placeholder="e.g., Masauli Block, Barabanki"
                  value={villageName}
                  onChange={(e) => setVillageName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label htmlFor="pool-dest-mandi" className="block text-xs font-semibold text-slate-700 mb-1">
                  Destination Mandi
                </label>
                <select
                  id="pool-dest-mandi"
                  value={destMandiId}
                  onChange={(e) => setDestMandiId(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  {UP_MANDIS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="pool-cap" className="block text-xs font-semibold text-slate-700 mb-1">
                    Truck Capacity (Qtl)
                  </label>
                  <select
                    id="pool-cap"
                    value={truckCapQtl}
                    onChange={(e) => setTruckCapQtl(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 text-sm bg-white"
                  >
                    <option value={35}>35 Qtl (Pickup)</option>
                    <option value={60}>60 Qtl (6-Ton Truck)</option>
                    <option value={100}>100 Qtl (10-Ton Truck)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="pool-my-qtl" className="block text-xs font-semibold text-slate-700 mb-1">
                    Your Lot (Qtl)
                  </label>
                  <input
                    id="pool-my-qtl"
                    type="number"
                    min={1}
                    max={truckCapQtl - 1}
                    value={farmerContributionQtl}
                    onChange={(e) => setFarmerContributionQtl(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 font-mono tabular-nums text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="pool-date" className="block text-xs font-semibold text-slate-700 mb-1">
                    Departure Date
                  </label>
                  <input
                    id="pool-date"
                    type="text"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="pool-time" className="block text-xs font-semibold text-slate-700 mb-1">
                    Departure Time
                  </label>
                  <input
                    id="pool-time"
                    type="text"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
              </div>

              {formError && (
                <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
                  {formError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
                >
                  Publish Truck Pool
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
