import Link from 'next/link';

const quickLinks = [
  { href: '/', label: '首页' },
  { href: '/blog', label: '博客' },
  { href: '/projects', label: '项目' },
  { href: '/about', label: '关于' },
  { href: '/blog/skills', label: 'Skills' },
];

export default function Footer() {
  return (
    <footer className="bg-primary text-white py-16">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 grid grid-cols-1 md:grid-cols-3 gap-12">
        {/* Left: Site description */}
        <div>
          <h3 className="font-display text-xl font-bold mb-4">
            Sean&apos;s AI World
          </h3>
          <p className="text-sm leading-relaxed text-white/70">
            探索人工智能与软件开发的无限可能。分享技术见解、项目实践与学习心得，
            在 AI 时代持续成长。
          </p>
        </div>

        {/* Center: Quick links */}
        <div>
          <h4 className="font-display text-sm font-semibold uppercase tracking-wider mb-4 text-white/80">
            快速链接
          </h4>
          <ul className="space-y-2">
            {quickLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-white/70 hover:text-white transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Right: Contact */}
        <div>
          <h4 className="font-display text-sm font-semibold uppercase tracking-wider mb-4 text-white/80">
            联系方式
          </h4>
          <p className="text-sm text-white/70">
            邮箱：sean@example.com
          </p>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 mt-12 pt-8 border-t border-white/10">
        <p className="text-xs text-white/50 text-center">
          &copy; {new Date().getFullYear()} Sean&apos;s AI World. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
