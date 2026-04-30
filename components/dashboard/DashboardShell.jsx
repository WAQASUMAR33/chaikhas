'use client';

import Link from 'next/link';
import { Menu, X } from 'lucide-react';

/**
 * Shared dashboard chrome: sidebar, header, main — visuals only.
 * Parent layouts keep auth, menu config, and sidebar state behavior.
 */
export default function DashboardShell({
  children,
  menuItems,
  pathname,
  portalTitle,
  sidebarOpen,
  setSidebarOpen,
  isMobile,
  onNavLinkClick,
  userName,
  userSubtitle,
  headerActions,
}) {
  const currentLabel =
    menuItems.find((item) => item.path === pathname)?.label || 'Dashboard';

  const initials = (() => {
    const s = String(userName || 'U').trim();
    if (!s) return 'U';
    const parts = s.split(/\s+/).filter(Boolean);
    if (parts.length >= 2)
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return s.slice(0, 2).toUpperCase();
  })();

  const asideWidthExpanded = 'w-64';
  const asideWidthCollapsed = 'w-20';
  const asideClass =
    sidebarOpen && !isMobile ? asideWidthExpanded : isMobile ? asideWidthExpanded : asideWidthCollapsed;

  const mainMarginClass =
    sidebarOpen && !isMobile ? 'lg:ml-64' : !isMobile ? 'lg:ml-20' : '';

  return (
    <div className="min-h-screen flex overflow-hidden bg-slate-100">
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/45 backdrop-blur-[2px] z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${asideClass} flex flex-col bg-slate-900 text-slate-300 border-r border-slate-800/90 transition-[width,transform] duration-300 ease-out fixed h-screen z-50 lg:z-30 shadow-[4px_0_32px_-12px_rgba(15,23,42,0.45)]`}
      >
        <div className="h-16 flex items-center justify-between gap-2 px-3 border-b border-slate-800/90 shrink-0">
          {sidebarOpen ? (
            <div className="min-w-0 pl-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Chaikhas
              </p>
              <h1 className="text-base font-semibold text-white truncate leading-snug">
                {portalTitle}
              </h1>
            </div>
          ) : (
            <span className="sr-only">{portalTitle}</span>
          )}
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? (
              <X className="w-5 h-5" aria-hidden />
            ) : (
              <Menu className="w-5 h-5" aria-hidden />
            )}
          </button>
        </div>

        <nav className="flex-1 mt-3 px-2 pb-4 overflow-y-auto overscroll-contain [scrollbar-width:thin]">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            const IconComponent = item.icon;
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={onNavLinkClick}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors duration-150 ${
                  isActive
                    ? 'bg-[#FF5F15] text-white shadow-lg shadow-[#FF5F15]/20'
                    : 'text-slate-400 hover:bg-slate-800/70 hover:text-white'
                }`}
                title={!sidebarOpen && !isMobile ? item.label : undefined}
              >
                <IconComponent
                  className={`w-5 h-5 shrink-0 ${isActive ? 'opacity-100' : 'opacity-90 group-hover:opacity-100'}`}
                  aria-hidden
                />
                {(sidebarOpen || isMobile) && (
                  <span className="font-medium text-sm whitespace-nowrap">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div
        className={`flex-1 flex flex-col min-w-0 transition-[margin] duration-300 ease-out w-full ${mainMarginClass}`}
      >
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200/90 shadow-sm shadow-slate-900/[0.04]">
          <div className="px-4 sm:px-6 py-3 sm:py-3.5 flex justify-between items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Toggle sidebar"
              >
                <Menu className="w-5 h-5" aria-hidden />
              </button>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 hidden sm:block">
                  Current view
                </p>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-900 tracking-tight truncate">
                  {currentLabel}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="hidden sm:flex items-center gap-3 pr-3 border-r border-slate-200">
                <div
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF5F15] to-[#d94a0f] flex items-center justify-center text-white text-xs font-bold shadow-md ring-2 ring-white select-none"
                  title={userName}
                >
                  {initials}
                </div>
                {!isMobile && (
                  <div className="text-sm min-w-0 max-w-[11rem]">
                    <p
                      className="font-semibold text-slate-900 truncate"
                      title={userName}
                    >
                      {userName}
                    </p>
                    <p
                      className="text-xs text-slate-500 truncate"
                      title={userSubtitle}
                    >
                      {userSubtitle}
                    </p>
                  </div>
                )}
              </div>
              {headerActions}
            </div>
          </div>
        </header>

        <main className="flex-1 p-3 sm:p-5 md:p-7 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
