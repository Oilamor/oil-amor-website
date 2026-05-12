'use client'

import { useState } from 'react'
import { DollarSign, User, CheckCircle, Clock, ShoppingBag } from 'lucide-react'

interface Commission {
  id: string
  blendName: string
  creatorName: string
  purchaserName?: string
  saleAmount: number
  commissionAmount: number
  commissionRate: number
  status: 'purchased' | 'paid' | 'refunded'
  createdAt: string
  paidAt?: string
}

interface CommissionDashboardProps {
  commissions: Commission[]
  totalPending: number
  totalPaid: number
  loading: boolean
  onPayCommission: (id: string) => void
}

export function CommissionDashboard({ commissions, totalPending, totalPaid, loading, onPayCommission }: CommissionDashboardProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all')

  const filtered = commissions.filter((c) => {
    if (filter === 'pending') return c.status === 'purchased'
    if (filter === 'paid') return c.status === 'paid'
    return true
  })

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-pink-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wider">Total Commissions</span>
          </div>
          <div className="text-2xl font-bold text-slate-100">
            ${loading ? '—' : (totalPending + totalPaid).toFixed(2)}
          </div>
        </div>
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wider">Pending</span>
          </div>
          <div className="text-2xl font-bold text-amber-300">
            ${loading ? '—' : totalPending.toFixed(2)}
          </div>
        </div>
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wider">Paid</span>
          </div>
          <div className="text-2xl font-bold text-emerald-300">
            ${loading ? '—' : totalPaid.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'pending', 'paid'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700/50 hover:bg-slate-700'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-slate-900/40 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50 text-left">
                <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Blend</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Creator</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Buyer</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider text-right">Sale</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider text-right">Commission</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="px-4 py-4">
                      <div className="h-10 bg-slate-800/50 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    No commissions found
                  </td>
                </tr>
              ) : (
                filtered.map((comm) => (
                  <tr key={comm.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-slate-200 font-medium">{comm.blendName}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-slate-300">{comm.creatorName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-slate-300">{comm.purchaserName || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300 font-mono">
                      ${comm.saleAmount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-200 font-mono font-medium">
                      ${comm.commissionAmount.toFixed(2)}
                      <span className="text-[10px] text-slate-500 ml-1">({comm.commissionRate}%)</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          comm.status === 'paid'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : comm.status === 'purchased'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-red-500/20 text-red-300'
                        }`}
                      >
                        {comm.status === 'purchased' ? 'Pending' : comm.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {new Date(comm.createdAt).toLocaleDateString('en-AU')}
                    </td>
                    <td className="px-4 py-3">
                      {comm.status === 'purchased' && (
                        <button
                          onClick={() => onPayCommission(comm.id)}
                          className="px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-600/30 text-emerald-300 rounded-lg text-xs font-medium transition-colors"
                        >
                          Pay
                        </button>
                      )}
                      {comm.status === 'paid' && (
                        <span className="text-[10px] text-emerald-400">
                          Paid {comm.paidAt && new Date(comm.paidAt).toLocaleDateString('en-AU')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
