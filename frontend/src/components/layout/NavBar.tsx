'use client';

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

        {/* Navigation + Search */}
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
      </div>
    </header>
  );
}
