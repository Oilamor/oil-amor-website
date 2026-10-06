'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useCart } from '../../hooks/use-cart'
import { ShoppingBag, Menu, X, Search, User } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Badge } from '../../components/ui/Badge'
import { TierType } from '../../styles/design-system'

interface NavLink {
  href: string
  label: string
  children?: { href: string; label: string; description?: string }[]
}

export interface HeaderProps {
  tier?: TierType
  tierProgress?: number
}

const navLinks: NavLink[] = [
  {
    href: '/oils',
    label: 'The Atelier',
    children: [
      { href: '/oils/single', label: 'Single Origin', description: 'Pure botanical essences' },
      { href: '/oils/blends', label: 'Sacred Blends', description: 'Curated combinations' },
      { href: '/oils/limited', label: 'Limited Editions', description: 'Rare & seasonal' },
    ],
  },
  { href: '/crystals', label: 'Crystals' },
  { href: '/philosophy', label: 'Philosophy' },
  { href: '/journal', label: 'Journal' },
]

export function Header({ tier, tierProgress = 0 }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const { totalItems, openCart } = useCart()

  const itemCount = totalItems

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  return (
    <>
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-[1000] transition-all duration-500',
          isScrolled
            ? 'bg-cream-pure/95 backdrop-blur-xl shadow-sm py-3'
            : 'bg-transparent py-5 lg:py-6'
        )}
      >
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-12">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2 group magnetic"
              data-cursor="logo"
            >
              <Image
                src="/images/logo/oil-amor-wordmark.webp"
                alt="Oil Amor"
                width={1600}
                height={527}
                priority
                className="h-8 lg:h-10 w-auto transition-all duration-300 group-hover:scale-[1.03]"
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <div
                  key={link.href}
                  className="relative"
                  onMouseEnter={() => link.children && setActiveDropdown(link.label)}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <Link
                    href={link.href}
                    className={cn(
                      'relative px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] magnetic',
                      'transition-colors duration-200',
                      isScrolled
                        ? 'text-miron-void hover:text-miron-mid'
                        : 'text-miron-void hover:text-miron-mid'
                    )}
                    data-cursor="text"
                  >
                    {link.label}
                  </Link>

                  {/* Dropdown */}
                  <AnimatePresence>
                    {link.children && activeDropdown === link.label && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-0 pt-2"
                      >
                        <div className="bg-cream-pure rounded-xl shadow-xl border border-miron-dark/10 p-2 min-w-[200px]">
                          {link.children.map((child) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              className="block px-4 py-3 rounded-lg hover:bg-miron-dark/5 transition-colors"
                            >
                              <div className="text-sm font-medium text-miron-dark">
                                {child.label}
                              </div>
                              {child.description && (
                                <div className="text-xs text-miron-dark/50 mt-0.5">
                                  {child.description}
                                </div>
                              )}
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {/* Search */}
              <button
                type="button"
                className={cn(
                  'w-10 h-10 flex items-center justify-center rounded-lg magnetic',
                  'transition-colors duration-200',
                  isScrolled
                    ? 'text-miron-void hover:bg-miron-dark/5'
                    : 'text-miron-void hover:bg-miron-void/5'
                )}
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Account */}
              <Link
                href="/account"
                className={cn(
                  'hidden sm:flex w-10 h-10 items-center justify-center rounded-lg magnetic',
                  'transition-colors duration-200',
                  isScrolled
                    ? 'text-miron-void hover:bg-miron-dark/5'
                    : 'text-miron-void hover:bg-miron-void/5'
                )}
                aria-label="Account"
              >
                <User className="w-5 h-5" />
              </Link>

              {/* Cart */}
              <button
                type="button"
                onClick={openCart}
                className={cn(
                  'relative w-10 h-10 flex items-center justify-center rounded-lg magnetic',
                  'transition-colors duration-200',
                  isScrolled
                    ? 'text-miron-void hover:bg-miron-dark/5'
                    : 'text-miron-void hover:bg-miron-void/5'
                )}
                aria-label={`Cart (${itemCount} items)`}
              >
                <ShoppingBag className="w-5 h-5" />
                {itemCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-gold-pure text-miron-void text-[10px] font-semibold rounded-full flex items-center justify-center">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </button>

              {/* Tier Badge */}
              {tier && (
                <div className="hidden lg:block ml-2">
                  <Badge variant="tier" tier={tier} size="sm">
                    {tier.charAt(0).toUpperCase() + tier.slice(1)}
                  </Badge>
                </div>
              )}

              {/* Mobile Menu Toggle */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={cn(
                  'lg:hidden w-10 h-10 flex items-center justify-center rounded-lg',
                  'transition-colors duration-200',
                  isScrolled ? 'text-miron-void' : 'text-miron-void'
                )}
                aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-miron-void/80 z-[998] lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Menu Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 right-0 w-full max-w-sm bg-cream-pure z-[999] flex flex-col lg:hidden"
            >
              {/* Mobile Menu Header */}
              <div className="flex items-center justify-between p-4 border-b border-miron-dark/10">
                <span className="font-display text-xl text-miron-dark">Menu</span>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-10 h-10 flex items-center justify-center text-miron-dark"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Menu Links */}
              <nav className="flex-1 overflow-auto py-6 px-4">
                <div className="space-y-1">
                  {navLinks.map((link, index) => (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Link
                        href={link.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block py-3 text-lg font-display text-miron-dark hover:text-gold-dark transition-colors"
                      >
                        {link.label}
                      </Link>
                      {link.children && (
                        <div className="pl-4 mt-1 space-y-1">
                          {link.children.map((child) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className="block py-2 text-sm text-miron-dark/70 hover:text-miron-dark"
                            >
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </nav>

              {/* Mobile Menu Footer */}
              <div className="p-4 border-t border-miron-dark/10">
                {tier && (
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-miron-dark/60">Crystal Circle</span>
                    <Badge variant="tier" tier={tier}>
                      {tier}
                    </Badge>
                  </div>
                )}
                <Link
                  href="/account"
                  className="flex items-center gap-3 py-3 text-miron-dark"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <User className="w-5 h-5" />
                  <span>My Account</span>
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

export default Header
