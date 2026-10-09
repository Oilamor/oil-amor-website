'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, ShoppingBag, User, ChevronRight, LogOut, Package, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUser } from '@/lib/context/user-context'
import { useCart } from '@/app/hooks/use-cart'

const navLinks = [
  { href: '/oils', label: 'Collection' },
  { href: '/mixing-atelier', label: 'Mixing Atelier' },
  { href: '/bottles', label: 'Bottles' },
  { href: '/community-blends', label: 'Community' },
  { href: '/refill', label: 'Refill Store' },
  { href: '/philosophy', label: 'Philosophy' },
  { href: '/contact', label: 'Contact' },
]



export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isAccountOpen, setIsAccountOpen] = useState(false)
  
  const { user, isAuthenticated, logout } = useUser()
  const { itemCount } = useCart()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
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

  const handleLogout = () => {
    logout()
    setIsAccountOpen(false)
  }

  // Get initials from user name
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <>
      <nav
        className={cn(
          'fixed top-0 left-0 right-0 z-[1000] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] w-full h-20',
          isScrolled 
            ? 'bg-[#0a080c]/95 backdrop-blur-md border-b border-[#f5f3ef]/5' 
            : 'bg-transparent'
        )}
      >
        <div className="h-full max-w-[1800px] mx-auto px-6 lg:px-12 flex items-center justify-between">
          {/* Left Section: Logo + Divider + Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {/* Logo */}
            <Link 
              href="/" 
              className="flex items-center gap-3 group"
            >
              <Image
                src="/images/logo/oil-amor-wordmark.webp"
                alt="Oil Amor"
                width={640}
                height={211}
                priority
                sizes="220px"
                className="h-8 lg:h-9 w-auto transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </Link>
            
            {/* Divider */}
            <div className="h-8 w-px bg-[#f5f3ef]/20" />
            
            {/* Desktop Navigation */}
            <div className="flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={link.href === '/mixing-atelier' ? false : undefined}
                  className="relative text-[0.6875rem] font-medium uppercase tracking-[0.2em] text-[#a69b8a] hover:text-[#f5f3ef] transition-colors duration-300 py-2"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Center: Logo (Mobile/Tablet) */}
          <Link 
            href="/" 
            className="lg:hidden flex items-center gap-3 group"
          >
            <Image
              src="/images/logo/oil-amor-wordmark.webp"
              alt="Oil Amor"
              width={640}
              height={211}
              priority
              sizes="200px"
              className="h-7 w-auto transition-transform duration-300 group-hover:scale-[1.03]"
            />
          </Link>

          {/* Desktop Actions — Right Side */}
          <div className="hidden lg:flex items-center gap-4">
            
            {/* Cart */}
            <Link 
              href="/cart" 
              className="relative w-10 h-10 flex items-center justify-center text-[#a69b8a] hover:text-[#f5f3ef] transition-colors"
            >
              <ShoppingBag className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#c9a227] text-[#0a080c] text-xs font-medium flex items-center justify-center">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </Link>

            {/* Account Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsAccountOpen(!isAccountOpen)}
                className="flex items-center gap-2 text-[#a69b8a] hover:text-[#f5f3ef] transition-colors"
              >
                {isAuthenticated && user ? (
                  <>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#c9a227] to-[#f5f3ef] text-[#0a080c] flex items-center justify-center text-xs font-medium">
                      {getInitials(user.name)}
                    </div>
                    <span className="text-sm hidden xl:block">{user.name}</span>
                    {user.collectorLevel > 0 && (
                      <span className="hidden xl:block px-2 py-0.5 rounded-full bg-[#c9a227]/20 text-[#c9a227] text-[10px]">
                        Lvl {user.collectorLevel}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <User className="w-5 h-5" />
                    <span className="text-[0.6875rem] uppercase tracking-[0.2em] hidden xl:block">Sign In</span>
                  </>
                )}
              </button>

              {/* Account Dropdown Menu */}
              <AnimatePresence>
                {isAccountOpen && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-[-1]"
                      onClick={() => setIsAccountOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-[#111] border border-[#f5f3ef]/10 overflow-hidden shadow-2xl"
                    >
                      {isAuthenticated && user ? (
                        <div className="p-2">
                          <div className="px-3 py-2 mb-2">
                            <p className="text-sm text-[#f5f3ef] font-medium">{user.name}</p>
                            <p className="text-xs text-[#a69b8a]">Level {user.collectorLevel} Collector</p>
                          </div>
                          
                          <Link 
                            href="/account"
                            onClick={() => setIsAccountOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#a69b8a] hover:text-[#f5f3ef] hover:bg-[#f5f3ef]/5 transition-colors"
                          >
                            <Package className="w-4 h-4" />
                            My Collection
                          </Link>
                          
                          <Link 
                            href="/refill"
                            onClick={() => setIsAccountOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#a69b8a] hover:text-[#f5f3ef] hover:bg-[#f5f3ef]/5 transition-colors"
                          >
                            <Sparkles className="w-4 h-4" />
                            Order Refills
                          </Link>
                          
                          <Link 
                            href="/account?tab=returns"
                            onClick={() => setIsAccountOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#a69b8a] hover:text-[#f5f3ef] hover:bg-[#f5f3ef]/5 transition-colors"
                          >
                            <ChevronRight className="w-4 h-4 rotate-90" />
                            Returns
                          </Link>
                          
                          <div className="border-t border-[#f5f3ef]/10 mt-2 pt-2">
                            <button 
                              onClick={handleLogout}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#a69b8a] hover:text-red-400 hover:bg-red-500/5 transition-colors w-full"
                            >
                              <LogOut className="w-4 h-4" />
                              Sign Out
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4">
                          <p className="text-sm text-[#f5f3ef] font-medium mb-1">Welcome</p>
                          <p className="text-xs text-[#a69b8a] mb-4">Sign in to access your collection and refills</p>
                          
                          <Link 
                            href="/login"
                            onClick={() => setIsAccountOpen(false)}
                            className="block w-full py-2.5 rounded-full bg-[#c9a227] text-[#0a080c] text-sm font-medium text-center hover:bg-[#f5f3ef] transition-colors mb-2"
                          >
                            Sign In
                          </Link>
                          
                          <Link 
                            href="/register"
                            onClick={() => setIsAccountOpen(false)}
                            className="block w-full py-2.5 rounded-full border border-[#f5f3ef]/30 text-[#f5f3ef] text-sm font-medium text-center hover:bg-[#f5f3ef]/10 transition-colors"
                          >
                            Create Account
                          </Link>
                        </div>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Mobile Actions — Right Side */}
          <div className="lg:hidden absolute right-6 flex items-center gap-3">
            {/* Mobile Cart */}
            <Link 
              href="/cart" 
              className="relative w-10 h-10 flex items-center justify-center text-[#f5f3ef]"
            >
              <ShoppingBag className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#c9a227] text-[#0a080c] text-xs font-medium flex items-center justify-center">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </Link>

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="w-10 h-10 flex items-center justify-center text-[#f5f3ef]"
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileMenuOpen}
            >
              <AnimatePresence mode="wait">
                {isMobileMenuOpen ? (
                  <motion.div
                    key="close"
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: 90 }}
                    transition={{ duration: 0.2 }}
                  >
                    <X className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ opacity: 0, rotate: 90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: -90 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Menu className="w-5 h-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu — Full Screen */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="fixed inset-0 bg-[#0a080c]/98 backdrop-blur-xl z-[998] lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            
            {/* Menu Panel */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="fixed inset-0 z-[999] flex flex-col items-center justify-center lg:hidden px-6"
            >
              {/* Account Quick Access (Mobile) */}
              {isAuthenticated && user ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="mb-8 text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#c9a227] to-[#f5f3ef] text-[#0a080c] flex items-center justify-center text-lg font-medium mx-auto mb-3">
                    {getInitials(user.name)}
                  </div>
                  <p className="text-[#f5f3ef] font-medium">{user.name}</p>
                  <p className="text-xs text-[#a69b8a]">Level {user.collectorLevel} Collector</p>
                  <div className="flex gap-2 mt-3">
                    <Link
                      href="/account"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="px-4 py-2 rounded-full bg-[#c9a227] text-[#0a080c] text-sm font-medium"
                    >
                      My Account
                    </Link>
                    <button
                      onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                      className="px-4 py-2 rounded-full border border-[#f5f3ef]/30 text-[#f5f3ef] text-sm"
                    >
                      Sign Out
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="mb-12 text-center"
                >
                  <Link
                    href="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#c9a227] text-[#0a080c] font-medium mb-3"
                  >
                    <User className="w-4 h-4" />
                    Sign In / Create Account
                  </Link>
                  <p className="text-xs text-[#a69b8a]">Access your collection & refills</p>
                </motion.div>
              )}

              <nav className="flex flex-col items-center gap-8">
                {navLinks.map((link, index) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 30 }}
                    transition={{ 
                      delay: 0.2 + index * 0.1,
                      duration: 0.6,
                      ease: [0.16, 1, 0.3, 1]
                    }}
                  >
                    <Link
                      href={link.href}
                      prefetch={link.href === '/mixing-atelier' ? false : undefined}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="font-display text-4xl text-[#f5f3ef] hover:text-[#c9a227] transition-colors duration-300"
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
              </nav>

              {/* Small footer text */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="absolute bottom-12 text-[0.625rem] uppercase tracking-[0.3em] text-[#a69b8a]"
              >
                Est. 2026 — Central Coast, NSW
              </motion.p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
