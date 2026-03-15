import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { Twitter, Linkedin, Github } from 'lucide-react';

export function Footer() {
  const footerLinks = {
    product: [
      { label: 'How It Works', href: '#how-it-works' },
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Changelog', href: '#', disabled: true },
    ],
    legal: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Security', href: '/security' },
      { label: 'GDPR', href: '/gdpr' },
    ],
    company: [
      { label: 'About', href: '/about' },
      { label: 'Blog', href: '#', disabled: true },
      { label: 'Contact', href: '/contact' },
      { label: 'Careers', href: '#', disabled: true },
    ],
  };

  return (
    <footer className="border-t border-white/5 py-16 bg-[#05030f]">
      <div className="max-w-7xl mx-auto px-6">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <Logo size={32} showText />
            <p className="text-white/30 text-sm mt-4 max-w-xs leading-relaxed">
              Generate safe synthetic data at scale.
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-4 mt-4">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/20 hover:text-white/60 transition-colors"
              >
                <Twitter size={20} />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/20 hover:text-white/60 transition-colors"
              >
                <Linkedin size={20} />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/20 hover:text-white/60 transition-colors"
              >
                <Github size={20} />
              </a>
            </div>
          </div>

          {/* Product Column */}
          <div>
            <h3 className="text-white/50 text-xs uppercase tracking-widest mb-4">
              Product
            </h3>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  {link.disabled ? (
                    <span className="text-white/20 text-sm">{link.label}</span>
                  ) : (
                    <a
                      href={link.href}
                      className="text-white/30 text-sm hover:text-white/60 transition-colors"
                    >
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h3 className="text-white/50 text-xs uppercase tracking-widest mb-4">
              Legal
            </h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-white/30 text-sm hover:text-white/60 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Column */}
          <div>
            <h3 className="text-white/50 text-xs uppercase tracking-widest mb-4">
              Company
            </h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  {link.disabled ? (
                    <span className="text-white/20 text-sm">{link.label}</span>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-white/30 text-sm hover:text-white/60 transition-colors"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/20 text-xs">
            © 2025 Syntho. All rights reserved.
          </p>
          <p className="text-white/20 text-xs">
            Made with ♥ for data teams worldwide
          </p>
        </div>
      </div>
    </footer>
  );
}
