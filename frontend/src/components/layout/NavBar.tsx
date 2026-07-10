'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: '首页' },
  { href: '/blog', label: '博客专栏' },
  { href: '/projects', label: '精选作品' },
  { href: '/about', label: '关于我' },
];

export default function NavBar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 路由变化时关闭移动端菜单
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // 按 Escape 关闭菜单
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    if (mobileMenuOpen) {
      document.addEventListener('keydown', handleEsc);
    }
    return () => document.removeEventListener('keydown', handleEsc);
  }, [mobileMenuOpen]);

  // 菜单打开时锁定 body 滚动
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 bg-surface border-b border-outline-variant">
      <div className="flex justify-between items-center w-full px-4 sm:px-6 lg:px-10 max-w-[1200px] mx-auto h-20 gap-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 text-2xl font-bold text-primary tracking-tight shrink-0"
        >
          <img src="/logo.png" alt="Logo" className="h-8 w-auto" />
          Sean&apos;s AI World
        </Link>

        {/* Navigation + Search (desktop) */}
        <div className="hidden md:flex items-center gap-4">
          <nav className="flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-base font-medium transition-colors duration-200 whitespace-nowrap ${
                  isActive(item.href)
                    ? 'text-primary border-b-2 border-primary pb-1'
                    : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Search box (readonly, coming soon) */}
          <div className="relative">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-outline"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              readOnly
              placeholder="即将开放搜索"
              className="w-44 pl-8 pr-3 py-1.5 text-sm border border-outline rounded-lg bg-surface text-on-surface-variant placeholder:text-outline cursor-not-allowed outline-none"
            />
          </div>
        </div>

        {/* Hamburger button (mobile) */}
        <button
          type="button"
          aria-label={mobileMenuOpen ? '关闭菜单' : '打开菜单'}
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className="md:hidden relative w-10 h-10 flex items-center justify-center rounded-lg text-primary hover:bg-surface-container-low transition-colors duration-200"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="transition-transform duration-300"
          >
            {/* Top bar */}
            <line
              x1="3"
              y1="6"
              x2="21"
              y2="6"
              className={`transition-all duration-300 origin-center ${
                mobileMenuOpen ? 'translate-y-[6px] rotate-45' : ''
              }`}
            />
            {/* Middle bar */}
            <line
              x1="3"
              y1="12"
              x2="21"
              y2="12"
              className={`transition-all duration-300 ${
                mobileMenuOpen ? 'opacity-0 scale-x-0' : ''
              }`}
            />
            {/* Bottom bar */}
            <line
              x1="3"
              y1="18"
              x2="21"
              y2="18"
              className={`transition-all duration-300 origin-center ${
                mobileMenuOpen ? '-translate-y-[6px] -rotate-45' : ''
              }`}
            />
          </svg>
        </button>
      </div>

      {/* Mobile menu panel */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          mobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <nav className="border-t border-outline-variant bg-surface px-4 py-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMobileMenu}
              className={`block px-4 py-3 rounded-lg text-base font-medium transition-colors duration-200 ${
                isActive(item.href)
                  ? 'text-primary bg-surface-container-low'
                  : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-low'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Backdrop overlay */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 top-20 bg-black/20 z-[-1]"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}
    </header>
  );
}
