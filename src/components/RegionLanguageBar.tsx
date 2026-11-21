import { Globe, Loader2, LocateFixed, MapPin } from 'lucide-react';
import { UP_DISTRICTS, type DistrictId, type LanguageCode } from '../data/upMandis';
import { DISTRICT_GEO, type UiStrings } from '../utils/i18n';

interface RegionLanguageBarProps {
  originDistrict: DistrictId;
  onSelectHomeDistrict: (district: DistrictId) => void;
  language: LanguageCode;
  onSelectLanguage: (lang: LanguageCode) => void;
  autoRegionLanguage: boolean;
  onToggleAutoRegion: (enabled: boolean) => void;
  onDetectGps: () => void;
  detectingGps: boolean;
  locationNotice: string | null;
  t: UiStrings;
}

const LANG_BUTTONS: { id: LanguageCode; label: string }[] = [
  { id: 'hi', label: 'हिंदी' },
  { id: 'awadhi', label: 'अवधी' },
  { id: 'bhojpuri', label: 'भोजपुरी' },
  { id: 'en', label: 'English' },
];

export function RegionLanguageBar({
  originDistrict,
  onSelectHomeDistrict,
  language,
  onSelectLanguage,
  autoRegionLanguage,
  onToggleAutoRegion,
  onDetectGps,
  detectingGps,
  locationNotice,
  t,
}: RegionLanguageBarProps) {
  const regionMeta = DISTRICT_GEO[originDistrict];

  return (
    <div
      aria-label="Location and regional language settings"
      className="bg-emerald-50/70 border-b border-emerald-200/80"
    >
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Home District & Current GPS Detection */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-emerald-800 shrink-0" aria-hidden="true" />
            <label
              htmlFor="home-location-select"
              className="text-xs font-semibold text-slate-700 whitespace-nowrap"
            >
              {t.locationBar.homeLocation}:
            </label>
            <select
              id="home-location-select"
              data-testid="home-location-select"
              value={originDistrict}
              onChange={(e) => onSelectHomeDistrict(e.target.value as DistrictId)}
              className="h-8 px-2.5 rounded-lg border border-emerald-300 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              {UP_DISTRICTS.map((d) => {
                const geo = DISTRICT_GEO[d.id];
                return (
                  <option key={d.id} value={d.id}>
                    {d.label} ({d.labelHi}) · {geo.regionNameLocal}
                  </option>
                );
              })}
            </select>
          </div>

          <button
            type="button"
            onClick={onDetectGps}
            disabled={detectingGps}
            data-testid="use-gps-button"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white border border-emerald-300 hover:bg-emerald-100/70 text-xs font-semibold text-emerald-900 transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
          >
            {detectingGps ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <LocateFixed className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span>{detectingGps ? t.locationBar.detectingGps : t.locationBar.useGps}</span>
          </button>

          <span className="hidden xl:inline text-xs text-slate-600">
            {regionMeta.regionNameLocal} ({regionMeta.regionNameEn})
          </span>
        </div>

        {/* Right: Auto-by-Region Toggle & One-Tap Language Switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer select-none whitespace-nowrap">
            <input
              type="checkbox"
              checked={autoRegionLanguage}
              onChange={(e) => onToggleAutoRegion(e.target.checked)}
              className="w-3.5 h-3.5 accent-emerald-700 rounded cursor-pointer"
            />
            <span>{t.locationBar.autoRegion}</span>
          </label>

          <div className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-slate-500 hidden sm:block" aria-hidden="true" />
            <div
              className="inline-flex items-center gap-0.5 p-0.5 bg-white border border-emerald-200 rounded-lg"
              role="group"
              aria-label={t.locationBar.languageLabel}
            >
              {LANG_BUTTONS.map((btn) => {
                const active = language === btn.id;
                return (
                  <button
                    key={btn.id}
                    type="button"
                    data-testid={`lang-btn-${btn.id}`}
                    onClick={() => onSelectLanguage(btn.id)}
                    aria-pressed={active}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-emerald-700 text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {btn.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {locationNotice && (
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pb-2">
          <p data-testid="location-notice" className="text-xs font-medium text-emerald-900">
            {locationNotice}
          </p>
        </div>
      )}
    </div>
  );
}
