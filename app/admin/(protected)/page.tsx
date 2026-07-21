/**
 * Oil Amor — Enterprise Admin Dashboard v2
 * Shopify-independent, local DB only
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Package, Beaker, Printer, DollarSign, BarChart3,
  RefreshCw, LogOut
} from 'lucide-react'
import Link from 'next/link'
import { EnrichedOrder } from '@/lib/orders/types'
import { OrderStatus } from '@/lib/db/schema/orders'
import { logger } from '@/lib/logging/logger'
import { StatsCards } from '@/app/components/admin/stats-cards'
import { OrderList } from '@/app/components/admin/order-list'
import { OrderDetail } from '@/app/components/admin/order-detail'
import { ProductionQueue } from '@/app/components/admin/production-queue'
import { CommissionDashboard } from '@/app/components/admin/commission-dashboard'

type TabType = 'orders' | 'production' | 'commissions' | 'analytics'

interface DashboardStats {
  totalOrders: number
  pendingOrders: number
  mixingOrders: number
  readyOrders: number
  shippedOrders: number
  deliveredOrders: number
  cancelledOrders: number
  todayRevenue: number
  weekRevenue: number
  monthRevenue: number
  averageOrderValue: number
  totalCommissions: number
  pendingCommissions: number
  paidCommissions: number
  activeCustomers: number
  totalBottles: number
  activeBottles: number
  lowStockItems: string[]
  orderBreakdown: Record<string, number>
}

// Use ProductionQueueItem from lib/orders/types

interface Commission {
  id: string
  blendName: string
  creatorName: string
  saleAmount: number
  commissionAmount: number
  commissionRate: number
  status: 'purchased' | 'paid' | 'refunded'
  createdAt: string
  paidAt?: string
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('orders')
  const [orders, setOrders] = useState<EnrichedOrder[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [productionItems, setProductionItems] = useState<import('@/lib/orders/types').ProductionQueueItem[]>([])
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [selectedOrder, setSelectedOrder] = useState<EnrichedOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [labelHtml, setLabelHtml] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  // ==========================================================================
  // FETCH DATA
  // ==========================================================================

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/orders', { cache: 'no-store' })
      const data = await res.json()
      if (data.orders) setOrders(data.orders)
    } catch (err) {
      logger.error('Failed to fetch orders', err instanceof Error ? err : new Error(String(err)))
    }
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/dashboard/stats', { cache: 'no-store' })
      const data = await res.json()
      setStats(data)
    } catch (err) {
      logger.error('Failed to fetch stats', err instanceof Error ? err : new Error(String(err)))
    }
  }, [])

  const fetchProduction = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/production-queue', { cache: 'no-store' })
      const data = await res.json()
      if (data.items) setProductionItems(data.items)
    } catch (err) {
      logger.error('Failed to fetch production queue', err instanceof Error ? err : new Error(String(err)))
    }
  }, [])

  const fetchCommissions = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/commissions', { cache: 'no-store' })
      const data = await res.json()
      if (data.commissions) setCommissions(data.commissions)
    } catch (err) {
      logger.error('Failed to fetch commissions', err instanceof Error ? err : new Error(String(err)))
    }
  }, [])

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/dashboard/stats', { cache: 'no-store' })
      if (res.status === 401) {
        setIsAuthenticated(false)
        setLoading(false)
        return false
      }
      setIsAuthenticated(true)
      return true
    } catch {
      setIsAuthenticated(false)
      setLoading(false)
      return false
    }
  }, [])

  const refreshAll = useCallback(async () => {
    setLoading(true)
    await Promise.all([fetchOrders(), fetchStats(), fetchProduction(), fetchCommissions()])
    setLoading(false)
  }, [fetchOrders, fetchStats, fetchProduction, fetchCommissions])

  useEffect(() => {
    checkAuth().then((auth) => {
      if (auth) {
        refreshAll()
        const interval = setInterval(refreshAll, 30000)
        return () => clearInterval(interval)
      }
    })
  }, [checkAuth, refreshAll])

  // ==========================================================================
  // ACTIONS
  // ==========================================================================

  const handleStatusChange = async (orderId: string, status: OrderStatus, note?: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, note }),
      })
      const data = await res.json()
      if (data.success) {
        await refreshAll()
        if (selectedOrder?.id === orderId) {
          const updated = orders.find((o) => o.id === orderId)
          if (updated) setSelectedOrder({ ...updated, status })
        }
      }
    } catch (err) {
      logger.error('Status change failed', err instanceof Error ? err : new Error(String(err)))
    }
  }

  const handleAddTracking = async (orderId: string, trackingNumber: string, carrier: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/tracking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingNumber, carrier }),
      })
      const data = await res.json()
      if (data.success) {
        await refreshAll()
      }
    } catch (err) {
      logger.error('Tracking update failed', err instanceof Error ? err : new Error(String(err)))
    }
  }

  const handlePrintLabel = async (order: EnrichedOrder, itemIndex?: number) => {
    try {
      const res = await fetch('/api/admin/labels/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, itemIndex: itemIndex || 0, format: 'pdf' }),
      })

      // If server returned a PDF, open it directly
      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('application/pdf')) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank')
        return
      }

      // Fallback: HTML output
      const data = await res.json()
      if (data.success && data.html) {
        setLabelHtml(data.html)
        const printWindow = window.open('', '_blank')
        if (printWindow) {
          printWindow.document.write(data.html)
          printWindow.document.close()
          printWindow.focus()
          // Wait for embedded fonts to load before printing
          if (printWindow.document.fonts) {
            printWindow.document.fonts.ready.then(() => {
              printWindow.print()
            })
          } else {
            setTimeout(() => printWindow.print(), 500)
          }
        }
      }
    } catch (err) {
      logger.error('Label generation failed', err instanceof Error ? err : new Error(String(err)))
    }
  }

  const handleRefund = async (orderId: string, amount?: number, reason?: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, reason }),
      })
      const data = await res.json()
      if (data.success) {
        await refreshAll()
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(prev => prev ? { ...prev, status: data.orderStatus } : null)
        }
      } else {
        alert(data.error || 'Refund failed')
      }
    } catch (err) {
      alert('Refund request failed')
    }
  }

  const handleProductionAction = async (orderId: string, itemId: string, action: string) => {
    try {
      const res = await fetch('/api/admin/production-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, action }),
      })
      const data = await res.json()
      if (data.success) {
        await refreshAll()
      }
    } catch (err) {
      logger.error('Production action failed', err instanceof Error ? err : new Error(String(err)))
    }
  }

  const handlePayCommission = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/commissions/${id}/pay`, {
        method: 'POST',
      })
      const data = await res.json()
      if (data.success) {
        await fetchCommissions()
        await fetchStats()
      }
    } catch (err) {
      logger.error('Commission payment failed', err instanceof Error ? err : new Error(String(err)))
    }
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  const tabs = [
    { id: 'orders' as TabType, label: 'Orders', icon: Package },
    { id: 'production' as TabType, label: 'Production', icon: Beaker },
    { id: 'commissions' as TabType, label: 'Commissions', icon: DollarSign },
    { id: 'analytics' as TabType, label: 'Analytics', icon: BarChart3 },
  ]

  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <LogOut className="w-8 h-8 text-slate-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mb-2">Authentication Required</h1>
          <p className="text-slate-400 mb-8">
            You need to sign in with your admin credentials to access the dashboard.
          </p>
          <a
            href="/admin/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#c9a227] text-[#0a080c] font-medium rounded-lg hover:bg-[#b8921f] transition-colors"
          >
            Sign In
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Oil Amor Admin
              </h1>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono">
                v2.0
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin/products"
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition-colors"
              >
                Inventory
              </Link>
              <button
                onClick={refreshAll}
                className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-1 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats (show on all tabs except analytics) */}
        {activeTab !== 'analytics' && stats && (
          <StatsCards stats={stats} loading={loading} />
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <OrderList
            orders={orders}
            loading={loading}
            onSelectOrder={setSelectedOrder}
            onPrintLabel={handlePrintLabel}
          />
        )}

        {/* Production Tab */}
        {activeTab === 'production' && (
          <ProductionQueue
            items={productionItems}
            loading={loading}
            onStartMixing={(orderId) => handleProductionAction(orderId, '', 'start')}
            onCompleteMixing={(orderId) => handleProductionAction(orderId, '', 'complete')}
            onPrintLabel={(orderId) => {
              const order = orders.find((o) => o.id === orderId)
              if (order) handlePrintLabel(order)
            }}
          />
        )}

        {/* Commissions Tab */}
        {activeTab === 'commissions' && (
          <CommissionDashboard
            commissions={commissions}
            totalPending={stats?.pendingCommissions || 0}
            totalPaid={stats?.paidCommissions || 0}
            loading={loading}
            onPayCommission={handlePayCommission}
          />
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="text-center py-16">
            <BarChart3 className="w-12 h-12 mx-auto text-slate-600 mb-3" />
            <div className="text-slate-400 font-medium">Analytics Dashboard</div>
            <div className="text-sm text-slate-500 mt-1">
              Detailed analytics coming in Phase 3
            </div>
            {stats && (
              <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
                <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
                  <div className="text-xs text-slate-500">Total Orders</div>
                  <div className="text-2xl font-bold text-slate-100">{stats.totalOrders}</div>
                </div>
                <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
                  <div className="text-xs text-slate-500">Delivered</div>
                  <div className="text-2xl font-bold text-emerald-400">{stats.deliveredOrders}</div>
                </div>
                <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
                  <div className="text-xs text-slate-500">Cancelled</div>
                  <div className="text-2xl font-bold text-red-400">{stats.cancelledOrders}</div>
                </div>
                <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
                  <div className="text-xs text-slate-500">Active Bottles</div>
                  <div className="text-2xl font-bold text-blue-400">{stats.activeBottles}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Order Detail Slide-out */}
      {selectedOrder && (
        <OrderDetail
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={handleStatusChange}
          onAddTracking={handleAddTracking}
          onPrintLabel={handlePrintLabel}
        />
      )}

      {/* Label Preview Modal */}
      {labelHtml && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setLabelHtml(null)} />
          <div className="relative bg-white rounded-xl p-4 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900">Label Preview</h3>
              <button
                onClick={() => setLabelHtml(null)}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                Close
              </button>
            </div>
            <div dangerouslySetInnerHTML={{ __html: labelHtml }} />
          </div>
        </div>
      )}
    </div>
  )
}
