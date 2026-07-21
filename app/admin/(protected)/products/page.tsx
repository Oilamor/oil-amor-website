/**
 * Oil Amor — Admin Inventory Management
 * View and edit stock levels for all products
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Package, Beaker, Gem, Scroll, Box, AlertTriangle,
  Plus, Minus, Save, RotateCcw, ArrowLeft, Search,
} from 'lucide-react'
import Link from 'next/link'

interface InventoryItem {
  id: string
  sku: string
  name: string
  category: string
  quantity: number
  reservedQuantity: number
  reorderPoint: number
  updatedAt: string
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  oil: <Beaker className="w-4 h-4" />,
  bottle: <Box className="w-4 h-4" />,
  crystal: <Gem className="w-4 h-4" />,
  cord: <Scroll className="w-4 h-4" />,
  cap: <Package className="w-4 h-4" />,
}

const CATEGORY_LABELS: Record<string, string> = {
  oil: 'Essential Oils',
  bottle: 'Bottles',
  crystal: 'Crystals',
  cord: 'Cords',
  cap: 'Caps & Pipettes',
}

export default function InventoryManagement() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [saving, setSaving] = useState<string | null>(null)

  const fetchInventory = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/inventory', { cache: 'no-store' })
      const data = await res.json()
      if (data.items) {
        setItems(data.items)
      } else {
        setError(data.error || 'Failed to load inventory')
      }
    } catch (err) {
      setError('Network error loading inventory')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInventory()
  }, [fetchInventory])

  const updateQuantity = (id: string, delta: number) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item
      return { ...item, quantity: Math.max(0, item.quantity + delta) }
    }))
  }

  const updateReorderPoint = (id: string, value: number) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item
      return { ...item, reorderPoint: Math.max(0, value) }
    }))
  }

  const saveItem = async (item: InventoryItem) => {
    setSaving(item.id)
    try {
      const res = await fetch('/api/admin/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          quantity: item.quantity,
          reorderPoint: item.reorderPoint,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Save failed')
      }
    } catch (err) {
      alert('Network error saving item')
    } finally {
      setSaving(null)
    }
  }

  const categories = Array.from(new Set(items.map(i => i.category)))

  const filteredItems = items.filter(item => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory
    return matchesSearch && matchesCategory
  })

  const lowStockItems = items.filter(
    item => item.quantity <= item.reorderPoint && item.reorderPoint > 0
  )

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-950/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <h1 className="text-xl font-bold">Inventory Management</h1>
                <p className="text-sm text-slate-500">
                  {items.length} items tracked • {lowStockItems.length} low stock
                </p>
              </div>
            </div>
            <button
              onClick={fetchInventory}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Low Stock Alert Banner */}
      {lowStockItems.length > 0 && (
        <div className="max-w-7xl mx-auto px-6 mt-4">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-300">{lowStockItems.length} items running low</p>
              <p className="text-sm text-amber-400/70 mt-0.5">
                {lowStockItems.map(i => i.name).join(', ').slice(0, 120)}
                {lowStockItems.length > 3 ? '...' : ''}
              </p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-6 mt-6">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or SKU..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm focus:outline-none focus:border-slate-500"
            />
          </div>

          {/* Category filters */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                activeCategory === 'all'
                  ? 'bg-slate-100 text-slate-900'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                  activeCategory === cat
                    ? 'bg-slate-100 text-slate-900'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {CATEGORY_ICONS[cat] || <Package className="w-4 h-4" />}
                {CATEGORY_LABELS[cat] || cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="max-w-7xl mx-auto px-6 mt-6 pb-16">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-slate-600 border-t-slate-100 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-20 text-slate-500">{error}</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 text-slate-500">No items found</div>
        ) : (
          <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="text-left px-4 py-3 font-medium">Item</th>
                  <th className="text-left px-4 py-3 font-medium">SKU</th>
                  <th className="text-left px-4 py-3 font-medium">Category</th>
                  <th className="text-right px-4 py-3 font-medium">Stock</th>
                  <th className="text-right px-4 py-3 font-medium">Reserved</th>
                  <th className="text-right px-4 py-3 font-medium">Available</th>
                  <th className="text-right px-4 py-3 font-medium">Reorder At</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const available = item.quantity - item.reservedQuantity
                  const isLow = item.quantity <= item.reorderPoint && item.reorderPoint > 0

                  return (
                    <tr
                      key={item.id}
                      className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors ${
                        isLow ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isLow && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                          <span className="font-medium text-slate-200">{item.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">{item.sku}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-slate-400">
                          {CATEGORY_ICONS[item.category] || <Package className="w-3.5 h-3.5" />}
                          {CATEGORY_LABELS[item.category] || item.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className={`w-10 text-center font-mono ${isLow ? 'text-amber-400' : 'text-slate-200'}`}>
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500">
                        {item.reservedQuantity}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={available <= 0 ? 'text-red-400' : 'text-slate-300'}>
                          {available}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          value={item.reorderPoint}
                          onChange={(e) => updateReorderPoint(item.id, parseInt(e.target.value) || 0)}
                          className="w-16 text-right bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-slate-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => saveItem(item)}
                          disabled={saving === item.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-900 text-xs font-medium hover:bg-white transition-colors disabled:opacity-50"
                        >
                          <Save className="w-3 h-3" />
                          {saving === item.id ? 'Saving...' : 'Save'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
