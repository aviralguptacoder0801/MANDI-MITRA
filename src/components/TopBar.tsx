import { Bell, Menu, Mic, Sprout, X } from 'lucide-react';
import { useState } from 'react';
import { triggerHaptic } from '../utils/haptics';
import type { UiStrings } from '../utils/i18n';

export type WorkspaceTab =
  | 'home'
  | 'profit'
  | 'map'
  | 'forecast'
  | 'pools'
  | 'voice'
  | 'community';

interface TopBarProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  unreadAlertCount: number;
  onOpenAlerts: () => void;
  t: UiStrings;
}

export function TopBar({
  activeTab,
  onSelectTab,
  unreadAlertCount,
  onOpenAlerts,
  t,
}: TopBarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: WorkspaceTab; label: string }[] = [
    { id: 'home', label: t.nav.home },
    { id: 'profit', label: t.nav.profit },
    { id: 'forecast', label: t.nav.forecast },
    { id: 'map', label: t.nav.map },
    { id: 'community', label: t.nav.community },
  ];

  const mobileNavItems: { id: WorkspaceTab; label: string }[] = [
    { id: 'home', label: t.nav.home },
    { id: 'profit', label: t.nav.profit },
    { id: 'forecast', label: t.nav.forecast },
    { id: 'map', label: t.nav.map },
    { id: 'pools', label: t.nav.pools },
    { id: 'voice', label: t.nav.voice },
    { id: 'community', label: t.nav.community },
  ];

  const handleSelect = (tab: WorkspaceTab) => {
    triggerHaptic('tap');
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Single-line brand wordmark */}
        <button
          type="button"
          data-testid="brand-home-btn"
          onClick={() => handleSelect('home')}
          className="inline-flex items-center gap-2 font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 rounded"
        >
          <Sprout className="w-5 h-5 text-emerald-700 shrink-0" aria-hidden="true" />
          <span>MandiMitra</span>
        </button>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav
          aria-label="Primary workspace navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium"
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                data-testid={`nav-tab-${item.id}`}
                onClick={() => handleSelect(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative py-4 whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
                  isActive
                    ? 'text-emerald-800 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 right-0 bottom-0 h-0.5 bg-emerald-700"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Price Alerts Bell + primary Voice CTA + mobile menu trigger */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            data-testid="topbar-alerts-btn"
            onClick={() => {
              triggerHaptic('tap');
              onOpenAlerts();
            }}
            aria-label={t.alerts.buttonLabel}
            title={t.alerts.buttonLabel}
            className="relative inline-flex items-center justify-center gap-1.5 h-10 sm:h-9 px-2.5 sm:px-3 rounded-lg border border-slate-300 bg-white hover:bg-amber-50 hover:border-amber-400 text-slate-900 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            <Bell className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
            <span className="hidden lg:inline">{t.alerts.buttonLabel}</span>
            {unreadAlertCount > 0 && (
              <span
                data-testid="topbar-alerts-badge"
                className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white font-mono tabular-nums text-[10px] font-bold"
              >
                {unreadAlertCount > 9 ? '9+' : unreadAlertCount}
              </span>
            )}
          </button>

          <button
            type="button"
            data-testid="nav-voice-cta"
            onClick={() => handleSelect('voice')}
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            <Mic className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{t.nav.voiceCta}</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-300 text-slate-900 hover:bg-slate-50"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile collapsible navigation drawer with 48px touch targets */}
      {mobileMenuOpen && (
        <nav
          aria-label="Mobile workspace navigation"
          className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1.5"
        >
          {mobileNavItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full min-h-[48px] flex items-center text-left px-4 py-3 rounded-xl text-base font-semibold transition-colors ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-950 border border-emerald-300'
                    : 'text-slate-800 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      )}
    </header>
  );
}
