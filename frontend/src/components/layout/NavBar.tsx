'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: '首页' },
  { href: '/blog', label: '博客' },
  { href: '/projects', label: '项目' },
  { href: '/about', label: '关于' },
];

export default function NavBar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-outline-variant">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="font-display text-primary text-xl font-bold tracking-tight">
          Sean&apos;s AI World
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors border-b-2 ${
                isActive(item.href)
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-primary hover:border-primary/30'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
