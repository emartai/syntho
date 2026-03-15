'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { Menu, X } from 'lucide-react';

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 border-b border-white/5 transition-all duration-300 ${
        isScrolled ? 'bg-[#05030f]/80' : 'bg-[#05030f]/80'
      }`}
      style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Logo size={28} showText />
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden sm:block text-sm text-white/80 hover:text-white px-4 py-2 rounded-full border border-white/10 hover:border-white/20 transition-all"
          >
            Sign In
          </Link>
          <Link
            href="/login"
            className="text-sm font-semibold text-white px-6 py-2 rounded-full bg-gradient-to-r from-[#6366f1] to-[#22d3ee] hover:brightness-110 hover:scale-105 transition-all"
          >
            Get Started Free
          </Link>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden text-white/80 hover:text-white"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-white/5 bg-[#05030f]/95 backdrop-blur-md">
          <div className="px-6 py-4 flex flex-col gap-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
