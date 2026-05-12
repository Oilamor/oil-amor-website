'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { 
  Crown,
  Droplets,
  Package,
  RefreshCw,
  TrendingDown,
  Gem,
  Calendar,
  ArrowRight,
  Sparkles,
  Award,
  LogOut,
  ShoppingBag,
  Lock,
  Unlock,
  CheckCircle,
  X,
  ExternalLink,
  FileText,
  DollarSign,
  Wallet,
  Beaker
} from 'lucide-react'
import { getAllOils } from '@/lib/content/oil-crystal-synergies'
import { formatPrice } from '@/lib/content/pricing-engine-final'
import { useUser, type Order } from '@/lib/context/user-context'
import { useRouter } from 'next/navigation'

// ============================================================================
// COMPONENTS
// ============================================================================

function ProgressRing({ progress, size = 100, children }: { progress: number; size?: number; children: React.ReactNode }) {
  const radius = (size - 8) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(245, 243, 239, 0.1)"
          strokeWidth={6}
        />
        <motion.circle
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#c9a227"
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, value, label, sublabel, color = '#c9a227' }: any) {
  return (
    <div className="p-5 rounded-2xl bg-[#111] border border-[#f5f3ef]/10">
      <div className="flex items-start justify-between mb-3">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {sublabel && (
          <span className="text-[10px] text-[#a69b8a] uppercase tracking-wider">{sublabel}</span>
        )}
      </div>
      <p className="text-2xl font-serif text-[#f5f3ef] mb-1">{value}</p>
      <p className="text-xs text-[#a69b8a]">{label}</p>
    </div>
  )
}

function LoginPrompt() {
  return (
    <div className="min-h-screen bg-[#0a080c] pt-32 pb-16">
      <div className="max-w-md mx-auto px-6">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-[#c9a227]/10 border border-[#c9a227]/30 flex items-center justify-center mx-auto mb-6">
            <Crown className="w-10 h-10 text-[#c9a227]" />
          </div>
          <h1 className="font-serif text-3xl text-[#f5f3ef] mb-2">The Atelier</h1>
          <p className="text-[#a69b8a]">Your personal Oil Amor sanctuary</p>
        </div>

        <div className="p-6 rounded-2xl bg-[#111] border border-[#f5f3ef]/10 mb-6">
          <h2 className="text-lg font-medium text-[#f5f3ef] mb-4">Sign In Required</h2>
          <p className="text-sm text-[#a69b8a] mb-6">
            Sign in to access your account dashboard, track orders, manage refill unlocks, 
            and view your collection progress.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/login"
              className="w-full py-3 rounded-xl bg-[#c9a227] text-[#0a080c] font-medium hover:bg-[#f5f3ef] transition-colors text-center"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="w-full py-3 rounded-xl border border-[#f5f3ef]/20 text-[#f5f3ef] font-medium hover:bg-[#f5f3ef]/5 transition-colors text-center"
            >
              Create Account
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-[#111]/50 border border-[#f5f3ef]/5">
            <div className="w-10 h-10 rounded-lg bg-[#2ecc71]/10 flex items-center justify-center">
              <Unlock className="w-5 h-5 text-[#2ecc71]" />
            </div>
            <div>
              <p className="text-sm text-[#f5f3ef]">Refill Unlocks</p>
              <p className="text-xs text-[#a69b8a]">See oils available for refill</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-[#111]/50 border border-[#f5f3ef]/5">
            <div className="w-10 h-10 rounded-lg bg-[#c9a227]/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-[#c9a227]" />
            </div>
            <div>
              <p className="text-sm text-[#f5f3ef]">Order History</p>
              <p className="text-xs text-[#a69b8a]">Track purchases and deliveries</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-[#111]/50 border border-[#f5f3ef]/5">
            <div className="w-10 h-10 rounded-lg bg-[#a855f7]/10 flex items-center justify-center">
              <Award className="w-5 h-5 text-[#a855f7]" />
            </div>
            <div>
              <p className="text-sm text-[#f5f3ef]">Collector Progress</p>
              <p className="text-xs text-[#a69b8a]">XP and level tracking</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN PAGE
// ============================================================================
export default function AccountDashboardPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'collection' | 'orders' | 'returns' | 'earnings'>('overview')
  const [earningsData, setEarningsData] = useState<any>(null)
  const [earningsLoading, setEarningsLoading] = useState(false)
  const [returnModalOrder, setReturnModalOrder] = useState<Order | null>(null)
  const { user, orders, unlockedOils, isAuthenticated, logout, isOilUnlocked, getUnlockedOilIds, totalSavings, isDemo } = useUser()
  const router = useRouter()

  // Fetch creator earnings when earnings tab is selected
  useEffect(() => {
    if (activeTab === 'earnings' && user?.id) {
      setEarningsLoading(true)
      fetch(`/api/community-blends/earnings?creatorId=${user.id}`)
        .then(res => res.json())
        .then(data => setEarningsData(data))
        .catch(err => console.error('Failed to load earnings:', err))
        .finally(() => setEarningsLoading(false))
    }
  }, [activeTab, user?.id])

  const getTrackingUrl = (order: Order): string | null => {
    if (!order.shipping?.trackingNumber) return null
    const carrier = order.shipping.carrier?.toLowerCase() || 'auspost'
    if (carrier === 'auspost' || carrier === 'australia post') {
      return `https://auspost.com.au/mypost/track/#/details/${order.shipping.trackingNumber}`
    }
    return order.shipping.trackingUrl || `https://auspost.com.au/mypost/track/#/details/${order.shipping.trackingNumber}`
  }

  const handleDownloadInvoice = (order: Order) => {
    const addr = order.shippingAddress
    const addressHtml = addr
      ? `<p>${addr.firstName} ${addr.lastName}</p>
         <p>${addr.address1}</p>
         ${addr.address2 ? `<p>${addr.address2}</p>` : ''}
         <p>${addr.city}, ${addr.province} ${addr.zip}</p>
         <p>${addr.country}</p>`
      : '<p>—</p>'

    const itemsHtml = order.items.map((item) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f5f3ef10;">
          <div style="font-weight:500;color:#f5f3ef;">${item.name}</div>
          <div style="font-size:12px;color:#a69b8a;">${item.size} • ${item.type === 'enhanced' ? `${item.ratio}% Enhanced` : 'Pure'}${item.quantity && item.quantity > 1 ? ` • Qty: ${item.quantity}` : ''}</div>
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #f5f3ef10;text-align:right;white-space:nowrap;color:#f5f3ef;">
          ${formatPrice(item.price)}
        </td>
      </tr>
    `).join('')

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice ${order.id}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=Inter:wght@400;500&display=swap');
          body { margin:0; padding:40px; background:#0a080c; color:#f5f3ef; font-family:'Inter',sans-serif; }
          .container { max-width:720px; margin:0 auto; background:#111; border:1px solid #f5f3ef10; border-radius:16px; padding:48px; }
          h1 { font-family:'Playfair Display',serif; margin:0 0 8px; font-size:32px; }
          .brand { color:#c9a227; font-weight:600; letter-spacing:0.1em; text-transform:uppercase; font-size:12px; }
          .meta { display:flex; justify-content:space-between; gap:24px; margin:32px 0; }
          .meta-col { flex:1; }
          .meta-label { font-size:11px; text-transform:uppercase; letter-spacing:0.08em; color:#a69b8a; margin-bottom:6px; }
          .meta-value { color:#f5f3ef; font-size:14px; line-height:1.5; }
          table { width:100%; border-collapse:collapse; margin-top:16px; }
          th { text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:0.08em; color:#a69b8a; padding-bottom:8px; border-bottom:1px solid #f5f3ef20; }
          .total-row td { padding-top:16px; font-size:18px; font-family:'Playfair Display',serif; color:#c9a227; }
          .footer { margin-top:40px; padding-top:24px; border-top:1px solid #f5f3ef10; font-size:12px; color:#a69b8a; text-align:center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="brand">Oil Amor</div>
          <h1>Tax Invoice</h1>
          <div class="meta">
            <div class="meta-col">
              <div class="meta-label">Invoice To</div>
              <div class="meta-value">${addressHtml}</div>
            </div>
            <div class="meta-col">
              <div class="meta-label">Order Number</div>
              <div class="meta-value">${order.id}</div>
              <div class="meta-label" style="margin-top:16px;">Date</div>
              <div class="meta-value">${new Date(order.date).toLocaleDateString()}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align:right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              <tr class="total-row">
                <td style="text-align:left;">Total</td>
                <td style="text-align:right;">${formatPrice(order.total)}</td>
              </tr>
            </tbody>
          </table>
          <div class="footer">
            Thank you for choosing Oil Amor • hello@oilamor.com • GST included where applicable
          </div>
        </div>
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.focus()
    }
  }

  const eligibleReturns = useMemo(() => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    return orders.filter((order) => {
      if (order.status !== 'delivered') return false
      if (new Date(order.date) < thirtyDaysAgo) return false
      // Must contain at least one physical item (not just gift cards / shipping)
      const physicalItems = order.items.filter(
        (item) => item.itemType !== 'gift-card' && item.itemType !== 'shipping'
      )
      return physicalItems.length > 0
    })
  }, [orders])

  const allOils = useMemo(() => getAllOils(), [])

  if (!isAuthenticated || !user) {
    return <LoginPrompt />
  }

  const collectorProgress = (user.totalXP / user.nextLevelXP) * 100
  const titles = ['Novice', 'Apprentice', 'Adept', 'Expert', 'Master', 'Grandmaster', 'Legend']
  const currentTitle = titles[Math.min(user.collectorLevel - 1, titles.length - 1)]

  const unlockedCount = getUnlockedOilIds().length

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  return (
    <main className="min-h-screen bg-[#0a080c] pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <p className="text-xs text-[#a69b8a] uppercase tracking-[0.3em]">Your Atelier</p>
              {isDemo && (
                <span className="px-2 py-0.5 rounded-full bg-[#c9a227]/20 text-[#c9a227] text-[10px] uppercase tracking-wider">
                  Demo Mode
                </span>
              )}
            </div>
            <h1 className="font-serif text-4xl md:text-5xl text-[#f5f3ef]">
              Welcome, <span className="text-[#c9a227]">{user.name}</span>
            </h1>
            <p className="text-[#a69b8a] mt-2">Member since {new Date(user.memberSince).toLocaleDateString()}</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-full bg-[#c9a227]/10 border border-[#c9a227]/30">
              <span className="text-[#c9a227] text-sm font-medium">{currentTitle}</span>
            </div>
            <div className="px-4 py-2 rounded-full bg-[#111] border border-[#f5f3ef]/10 text-sm text-[#a69b8a]">
              Level {user.collectorLevel}
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-full bg-[#111] border border-[#f5f3ef]/10 text-[#a69b8a] hover:text-[#f5f3ef] hover:border-[#f5f3ef]/30 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress & Stats */}
        <div className="grid lg:grid-cols-3 gap-6 mb-12">
          {/* Collector Progress */}
          <div className="lg:col-span-1 p-6 rounded-3xl bg-[#111] border border-[#f5f3ef]/10">
            <div className="flex items-center gap-6">
              <ProgressRing progress={collectorProgress} size={100}>
                <div className="text-center">
                  <span className="font-serif text-2xl text-[#f5f3ef]">{unlockedCount}</span>
                  <span className="text-[#a69b8a] text-sm">/{allOils.length}</span>
                  <p className="text-[10px] text-[#a69b8a] mt-1">OILS</p>
                </div>
              </ProgressRing>
              <div>
                <p className="text-sm text-[#a69b8a] mb-1">Collector XP</p>
                <p className="font-serif text-2xl text-[#f5f3ef]">{user.totalXP.toLocaleString()}</p>
                <div className="mt-2 h-1.5 w-32 bg-[#f5f3ef]/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#c9a227] to-[#f5f3ef] rounded-full"
                    style={{ width: `${collectorProgress}%` }}
                  />
                </div>
                <p className="text-[10px] text-[#a69b8a] mt-1">
                  {user.nextLevelXP - user.totalXP} XP to next level
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard 
              icon={Package} 
              value={orders.length} 
              label="Orders Placed" 
            />
            <StatCard 
              icon={Droplets} 
              value={unlockedCount} 
              label="Oils Unlocked" 
              sublabel="Available for Refill"
              color="#2ecc71"
            />
            <StatCard 
              icon={TrendingDown} 
              value={formatPrice(totalSavings)} 
              label="Total Saved" 
              sublabel="Via Refill Program"
              color="#2ecc71"
            />
            <StatCard 
              icon={Award} 
              value={user.streakDays} 
              label="Day Streak" 
              sublabel="Active Member"
              color="#a855f7"
            />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {[
            { id: 'overview', label: 'Overview', icon: Sparkles },
            { id: 'collection', label: 'My Collection', icon: Gem },
            { id: 'orders', label: 'Order History', icon: Package },
            { id: 'returns', label: 'Returns', icon: RefreshCw },
            { id: 'earnings', label: 'My Earnings', icon: DollarSign },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-[#c9a227] text-[#0a080c]'
                  : 'bg-[#111] text-[#a69b8a] border border-[#f5f3ef]/10 hover:border-[#c9a227]/50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Quick Actions */}
              <div className="grid md:grid-cols-2 gap-4">
                <Link 
                  href="/refill"
                  className="group p-6 rounded-2xl bg-gradient-to-br from-[#2ecc71]/10 to-transparent border border-[#2ecc71]/30 hover:border-[#2ecc71]/60 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-[#2ecc71]/20 flex items-center justify-center">
                      <Droplets className="w-6 h-6 text-[#2ecc71]" />
                    </div>
                    <ArrowRight className="w-5 h-5 text-[#2ecc71] transition-transform group-hover:translate-x-1" />
                  </div>
                  <h3 className="text-lg font-medium text-[#f5f3ef] mb-1">Order Refills</h3>
                  <p className="text-sm text-[#a69b8a]">{unlockedCount} oils available for refill</p>
                </Link>

                <Link 
                  href="/account?tab=returns"
                  onClick={() => setActiveTab('returns')}
                  className="group p-6 rounded-2xl bg-[#111] border border-[#f5f3ef]/10 hover:border-[#c9a227]/30 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-[#c9a227]/10 flex items-center justify-center">
                      <RefreshCw className="w-6 h-6 text-[#c9a227]" />
                    </div>
                    <ArrowRight className="w-5 h-5 text-[#a69b8a] transition-transform group-hover:translate-x-1" />
                  </div>
                  <h3 className="text-lg font-medium text-[#f5f3ef] mb-1">Create Return Label</h3>
                  <p className="text-sm text-[#a69b8a]">Return bottles for $5 credit each</p>
                </Link>
              </div>

              {/* Recent Orders */}
              {orders.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-[#f5f3ef]">Recent Orders</h3>
                    <button 
                      onClick={() => setActiveTab('orders')}
                      className="text-sm text-[#c9a227] hover:underline"
                    >
                      View All
                    </button>
                  </div>
                  <div className="space-y-3">
                    {orders.slice(0, 2).map((order) => (
                      <div key={order.id} className="p-4 rounded-2xl bg-[#111] border border-[#f5f3ef]/10">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-[#f5f3ef] font-medium">{order.id}</span>
                            <span className="text-xs text-[#a69b8a]">{new Date(order.date).toLocaleDateString()}</span>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            order.status === 'delivered' 
                              ? 'bg-[#2ecc71]/10 text-[#2ecc71]' 
                              : 'bg-[#c9a227]/10 text-[#c9a227]'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {order.items.map((item, i) => (
                            <div key={i} className="text-sm text-[#a69b8a]">
                              {item.name}{i < order.items.length - 1 ? ',' : ''}
                            </div>
                          ))}
                          <span className="ml-auto text-sm text-[#f5f3ef] font-medium">{formatPrice(order.total)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* COLLECTION TAB */}
          {activeTab === 'collection' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-[#c9a227]/10 to-transparent border border-[#c9a227]/30">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#c9a227]/20 flex items-center justify-center">
                    <Crown className="w-7 h-7 text-[#c9a227]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-medium text-[#f5f3ef] mb-1">Your Essential Collection</h3>
                    <p className="text-[#a69b8a]">{unlockedCount} of {allOils.length} oils unlocked</p>
                  </div>
                </div>
              </div>

              {/* Unlocked Oils Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allOils.map((oil) => {
                  const unlocked = unlockedOils.find(u => u.oilId === oil.id)
                  const isLocked = !unlocked
                  
                  return (
                    <div 
                      key={oil.id}
                      className={`p-4 rounded-xl border ${
                        isLocked 
                          ? 'bg-[#111]/50 border-[#f5f3ef]/5 opacity-60' 
                          : 'bg-[#111] border-[#2ecc71]/30'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                          <Image 
                            src={oil.image} 
                            alt={oil.commonName}
                            fill
                            className={`object-cover ${isLocked ? 'grayscale' : ''}`}
                          />
                          {isLocked && (
                            <div className="absolute inset-0 bg-[#0a080c]/60 flex items-center justify-center">
                              <Lock className="w-5 h-5 text-[#f5f3ef]/50" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className={`font-medium truncate ${isLocked ? 'text-[#a69b8a]' : 'text-[#f5f3ef]'}`}>
                              {oil.commonName}
                            </h4>
                            {!isLocked && (
                              <CheckCircle className="w-4 h-4 text-[#2ecc71] flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-[#a69b8a] truncate">{oil.origin}</p>
                          {!isLocked ? (
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] ${
                                unlocked?.type === 'enhanced'
                                  ? 'bg-[#c9a227]/20 text-[#c9a227]'
                                  : 'bg-[#2ecc71]/20 text-[#2ecc71]'
                              }`}>
                                {unlocked?.type === 'enhanced' ? 'Pure + Enhanced' : 'Pure'}
                              </span>
                              <span className="text-[10px] text-[#a69b8a]">
                                Unlocked {new Date(unlocked!.unlockedAt).toLocaleDateString()}
                              </span>
                            </div>
                          ) : (
                            <Link 
                              href={`/oil/${oil.handle || `${oil.id}-oil`}`}
                              className="inline-flex items-center gap-1 text-xs text-[#c9a227] hover:underline mt-2"
                            >
                              <ShoppingBag className="w-3 h-3" />
                              Purchase to unlock
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ORDERS TAB */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              {orders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-[#a69b8a]/30 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-[#f5f3ef] mb-2">No Orders Yet</h3>
                  <p className="text-[#a69b8a] mb-6">Start your collection today</p>
                  <Link
                    href="/oils"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#c9a227] text-[#0a080c] font-medium"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    Shop Oils
                  </Link>
                </div>
              ) : (
                orders.map((order) => (
                  <div key={order.id} className="p-6 rounded-2xl bg-[#111] border border-[#f5f3ef]/10">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-lg text-[#f5f3ef] font-medium">{order.id}</span>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            order.status === 'delivered' 
                              ? 'bg-[#2ecc71]/10 text-[#2ecc71]' 
                              : 'bg-[#c9a227]/10 text-[#c9a227]'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-[#a69b8a]">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(order.date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <span className="text-xl font-serif text-[#c9a227]">{formatPrice(order.total)}</span>
                    </div>
                    
                    <div className="space-y-3">
                      {order.items.map((item, i) => (
                        <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-[#0a080c]">
                          <div className="flex-1">
                            <p className="text-[#f5f3ef] font-medium">{item.name}</p>
                            <p className="text-xs text-[#a69b8a]">{item.size} • {item.type === 'enhanced' ? `${item.ratio}% Enhanced` : 'Pure'}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            {/* Show unlock status */}
                            <span className="px-2 py-1 rounded bg-[#2ecc71]/10 text-[#2ecc71] text-xs">
                              <Unlock className="w-3 h-3 inline mr-1" />
                              Unlocked
                            </span>
                            <span className="text-sm text-[#a69b8a]">{formatPrice(item.price)}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3 mt-4 pt-4 border-t border-[#f5f3ef]/10">
                      {getTrackingUrl(order) ? (
                        <a
                          href={getTrackingUrl(order)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-[#c9a227] hover:underline"
                        >
                          Track Order
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <button
                          disabled
                          className="text-sm text-[#a69b8a] cursor-not-allowed"
                          title="Tracking number not yet available"
                        >
                          Not Yet Shipped
                        </button>
                      )}
                      <button
                        onClick={() => handleDownloadInvoice(order)}
                        className="inline-flex items-center gap-1 text-sm text-[#a69b8a] hover:text-[#f5f3ef] transition-colors"
                      >
                        <FileText className="w-3 h-3" />
                        Download Invoice
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* RETURNS TAB */}
          {activeTab === 'returns' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-[#2ecc71]/10 to-transparent border border-[#2ecc71]/30">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#2ecc71]/20 flex items-center justify-center flex-shrink-0">
                    <RefreshCw className="w-7 h-7 text-[#2ecc71]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-medium text-[#f5f3ef] mb-2">Circular Economy Returns</h3>
                    <p className="text-[#a69b8a] mb-4">
                      Return your empty 50ml or 100ml refill bottles for $5 store credit each. 
                      Your original Forever Bottle (30ml or under) is yours to keep forever.
                    </p>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-2 text-[#a69b8a]">
                        <div className="w-2 h-2 rounded-full bg-[#2ecc71]" />
                        Prepaid return labels
                      </div>
                      <div className="flex items-center gap-2 text-[#a69b8a]">
                        <div className="w-2 h-2 rounded-full bg-[#2ecc71]" />
                        $5 credit per bottle
                      </div>
                      <div className="flex items-center gap-2 text-[#a69b8a]">
                        <div className="w-2 h-2 rounded-full bg-[#2ecc71]" />
                        Credit applies to any purchase
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {eligibleReturns.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-[#a69b8a]/30 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-[#f5f3ef] mb-2">No Eligible Returns</h3>
                  <p className="text-[#a69b8a] max-w-md mx-auto mb-6">
                    You don&apos;t have any orders eligible for return right now. 
                    Delivered orders from the last 30 days will appear here.
                  </p>
                  <Link
                    href="/refill"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#c9a227] text-[#0a080c] font-medium hover:bg-[#f5f3ef] transition-colors"
                  >
                    <Droplets className="w-4 h-4" />
                    Order Refills
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {eligibleReturns.map((order) => (
                    <div key={order.id} className="p-5 rounded-2xl bg-[#111] border border-[#f5f3ef]/10">
                      <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-[#f5f3ef] font-medium">{order.id}</span>
                            <span className="px-2 py-0.5 rounded-full bg-[#2ecc71]/10 text-[#2ecc71] text-xs">
                              Delivered
                            </span>
                          </div>
                          <p className="text-sm text-[#a69b8a]">
                            {new Date(order.date).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => setReturnModalOrder(order)}
                          className="px-4 py-2 rounded-full bg-[#c9a227] text-[#0a080c] text-sm font-medium hover:bg-[#f5f3ef] transition-colors"
                        >
                          Initiate Return
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {order.items.map((item, i) => (
                          <span
                            key={i}
                            className="text-xs text-[#a69b8a] px-2 py-1 rounded bg-[#0a080c]"
                          >
                            {item.name} ({item.size})
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* EARNINGS TAB */}
          {activeTab === 'earnings' && (
            <div className="space-y-8">
              {/* Earnings Stats */}
              <div className="grid md:grid-cols-3 gap-4">
                <StatCard
                  icon={DollarSign}
                  value={earningsData?.earnings?.totalEarned ? `$${(earningsData.earnings.totalEarned / 100).toFixed(2)}` : '$0.00'}
                  label="Total Earned"
                  sublabel="Lifetime Commissions"
                  color="#c9a227"
                />
                <StatCard
                  icon={Wallet}
                  value={earningsData?.earnings?.pendingAmount ? `$${(earningsData.earnings.pendingAmount / 100).toFixed(2)}` : '$0.00'}
                  label="Pending Payout"
                  sublabel="Awaiting Admin Approval"
                  color="#a855f7"
                />
                <StatCard
                  icon={ShoppingBag}
                  value={earningsData?.earnings?.totalSales ?? 0}
                  label="Blend Sales"
                  sublabel="Total Purchases"
                  color="#2ecc71"
                />
              </div>

              {/* Commission History */}
              <div>
                <h3 className="text-lg font-medium text-[#f5f3ef] mb-4">Commission History</h3>
                {earningsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-14 bg-[#111] rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : earningsData?.history && earningsData.history.length > 0 ? (
                  <div className="space-y-3">
                    {earningsData.history.map((comm: any) => (
                      <div
                        key={comm.id}
                        className="flex items-center justify-between p-4 rounded-xl bg-[#111] border border-[#f5f3ef]/10"
                      >
                        <div>
                          <p className="text-[#f5f3ef] font-medium">{comm.blendName}</p>
                          <p className="text-xs text-[#a69b8a]">
                            {new Date(comm.createdAt).toLocaleDateString('en-AU')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[#c9a227] font-medium">
                            +${(comm.commissionAmount / 100).toFixed(2)}
                          </p>
                          <p className="text-[10px] text-[#a69b8a]">
                            Sale: ${(comm.saleAmount / 100).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 rounded-2xl bg-[#111] border border-[#f5f3ef]/10 text-center">
                    <Beaker className="w-10 h-10 text-[#a69b8a] mx-auto mb-4" />
                    <h4 className="text-[#f5f3ef] font-medium mb-2">No Earnings Yet</h4>
                    <p className="text-sm text-[#a69b8a] mb-4">
                      Create your first blend in the Mixing Atelier and share it with the community to start earning 10% on every sale.
                    </p>
                    <Link
                      href="/mixing-atelier"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#c9a227] text-[#0a080c] text-sm font-medium hover:bg-[#f5f3ef] transition-colors"
                    >
                      <Beaker className="w-4 h-4" />
                      Create a Blend
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Return Initiation Modal */}
      {returnModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a080c]/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#111] border border-[#f5f3ef]/10 relative">
            <button
              onClick={() => setReturnModalOrder(null)}
              className="absolute top-4 right-4 p-1 rounded-full text-[#a69b8a] hover:text-[#f5f3ef] hover:bg-[#f5f3ef]/5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-12 h-12 rounded-xl bg-[#c9a227]/10 flex items-center justify-center mb-4">
              <RefreshCw className="w-6 h-6 text-[#c9a227]" />
            </div>
            <h3 className="text-lg font-medium text-[#f5f3ef] mb-2">Initiate Return</h3>
            <p className="text-sm text-[#a69b8a] mb-6">
              Please contact us at{' '}
              <a href="mailto:hello@oilamor.com" className="text-[#c9a227] hover:underline">
                hello@oilamor.com
              </a>{' '}
              with your order number ({returnModalOrder.id}) to arrange a return.
            </p>
            <div className="flex gap-3">
              <a
                href={`mailto:hello@oilamor.com?subject=Return Request - ${returnModalOrder.id}`}
                className="flex-1 py-2.5 rounded-xl bg-[#c9a227] text-[#0a080c] text-sm font-medium text-center hover:bg-[#f5f3ef] transition-colors"
              >
                Email Us
              </a>
              <button
                onClick={() => setReturnModalOrder(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#f5f3ef]/20 text-[#f5f3ef] text-sm font-medium hover:bg-[#f5f3ef]/5 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
