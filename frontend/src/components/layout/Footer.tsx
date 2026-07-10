import Link from 'next/link';

const socialLinks = [
  { href: 'https://github.com/fupengfei', label: 'GitHub' },
  { href: '/blog', label: 'Blog' },
];

export default function Footer() {
  return (
    <footer className="bg-surface-container-low border-t border-outline-variant">
      <div className="flex flex-col md:flex-row justify-between items-center w-full py-12 px-4 sm:px-6 lg:px-10 max-w-[1200px] mx-auto">
        {/* Left: Logo + copyright */}
        <div className="mb-6 md:mb-0">
          <div className="text-base font-bold text-on-surface mb-2">
            Sean&apos;s AI World
          </div>
          <p className="text-xs font-semibold tracking-wider uppercase text-on-surface-variant">
            &copy; {new Date().getFullYear()} Sean&apos;s AI World. All rights reserved.
          </p>
        </div>

        {/* Right: Links */}
        <div className="flex items-center space-x-8">
          {socialLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-xs font-semibold tracking-wider uppercase text-on-surface-variant hover:text-primary underline transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
