"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import DatabaseInitializer from "@/components/database-initializer";
import { RealmProvider } from "@/contexts/realm-context";

// Navigation items
const navigationItems = [
  {
    href: "/dashboard",
    label: "ダッシュボード",
    icon: "📊",
  },
  {
    href: "/capture",
    label: "商品追加",
    icon: "📷",
  },
];

function Navigation() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-suzu-cream border-b border-suzu-neutral-200 sticky top-0 z-50 safe-top">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and brand */}
          <div className="flex items-center min-w-0">
            <Link
              href="/dashboard"
              className="flex items-center space-x-2 sm:space-x-3"
            >
              <Image
                src="/images/suzumemo-logo-notext.png"
                alt="すずメモ"
                width={48}
                height={48}
                className="w-12 h-12 flex-shrink-0"
                priority
              />
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-suzu-neutral-800 truncate">
                  すずメモ
                </h1>
                <p className="text-xs text-suzu-neutral-600 hidden sm:block">
                  かんたん片付けサポート
                </p>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-suzu-primary-100 text-suzu-primary-700"
                      : "text-suzu-neutral-600 hover:text-suzu-neutral-800 hover:bg-suzu-neutral-100"
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-3 rounded-md text-suzu-neutral-600 hover:text-suzu-neutral-800 hover:bg-suzu-neutral-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-suzu-primary-500 min-h-[44px] min-w-[44px] touch-manipulation"
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={
                isMobileMenuOpen ? "メニューを閉じる" : "メニューを開く"
              }
            >
              {isMobileMenuOpen ? (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div
            id="mobile-menu"
            className="md:hidden border-t border-suzu-neutral-200 bg-suzu-neutral-100"
          >
            <div className="px-4 pt-3 pb-4 space-y-2">
              {navigationItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center px-4 py-3 rounded-lg text-base font-medium transition-colors min-h-[52px] touch-manipulation ${
                      isActive
                        ? "bg-suzu-primary-100 text-suzu-primary-700"
                        : "text-suzu-neutral-600 hover:text-suzu-neutral-800 hover:bg-suzu-cream active:bg-suzu-neutral-200"
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className="mr-3 text-xl flex-shrink-0">
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

interface ClientShellProps {
  children: React.ReactNode;
}

export default function ClientShell({ children }: ClientShellProps) {
  return (
    <DatabaseInitializer>
      <RealmProvider>
        <Navigation />
        <main className="flex-1 safe-bottom">{children}</main>
      </RealmProvider>
    </DatabaseInitializer>
  );
}
