'use client'

import { useState } from 'react'
import { EnrichedOrder, EnrichedOrderItem } from '@/lib/orders/types'
import { OrderStatus } from '@/lib/db/schema/orders'
import { getStatusLabel, getNextStatuses } from '@/lib/orders/status-helpers'
import {
  X, Printer, QrCode, Beaker, Package, Truck, Clock, AlertTriangle,
  ChevronDown, ExternalLink, User, MapPin, CreditCard, Tag, FileText,
  RotateCcw
} from 'lucide-react'

interface OrderDetailProps {
  order: EnrichedOrder | null
  onClose: () => void
  onStatusChange: (orderId: string, status: OrderStatus, note?: string) => void
  onAddTracking: (orderId: string, trackingNumber: string, carrier: string) => void
  onPrintLabel: (order: EnrichedOrder, itemIndex?: number) => void
  onRefund?: (orderId: string, amount?: number, reason?: string) => Promise<void> | void
}

export function OrderDetail({ order, onClose, onStatusChange, onAddTracking, onPrintLabel, onRefund }: OrderDetailProps) {
  const [statusNote, setStatusNote] = useState('')
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [trackingNumber, setTrackingNumber] = useState('')
  const [trackingCarrier, setTrackingCarrier] = useState('auspost')
  const [activeItem, setActiveItem] = useState(0)
  const [refundAmount, setRefundAmount] = useState('')
  const [refundReason, setRefundReason] = useState('')
  const [refunding, setRefunding] = useState(false)

  if (!order) return null

  const nextStatuses = getNextStatuses(order.status)

  const handleStatusChange = (status: OrderStatus) => {
    onStatusChange(order.id, status, statusNote)
    setShowStatusDropdown(false)
    setStatusNote('')
  }

  const handleTrackingSubmit = () => {
    if (!trackingNumber.trim()) return
    onAddTracking(order.id, trackingNumber.trim(), trackingCarrier)
    setTrackingNumber('')
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-3xl h-full bg-slate-950 border-l border-slate-700/50 overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur border-b border-slate-700/50 px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-slate-100 font-mono">{order.id}</h2>
              <StatusBadge status={order.status} />
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {new Date(order.createdAt).toLocaleString('en-AU')}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Customer & Shipping */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-200">Customer</h3>
              </div>
              <div className="space-y-1 text-sm">
                <div className="text-slate-200 font-medium">{order.customerName}</div>
                <div className="text-slate-400">{order.customerEmail}</div>
                {order.customerPhone && <div className="text-slate-400">{order.customerPhone}</div>}
                {order.isGuest && <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">Guest</span>}
              </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-200">Shipping</h3>
              </div>
              <div className="space-y-1 text-sm text-slate-300">
                <div>{order.shippingAddress?.firstName} {order.shippingAddress?.lastName}</div>
                <div>{order.shippingAddress?.address1}</div>
                {order.shippingAddress?.address2 && <div>{order.shippingAddress.address2}</div>}
                <div>
                  {order.shippingAddress?.city}, {order.shippingAddress?.province} {order.shippingAddress?.zip}
                </div>
                <div>{order.shippingAddress?.country}</div>
              </div>
              {order.shipping?.trackingNumber && (
                <div className="mt-3 pt-3 border-t border-slate-700/50">
                  <div className="flex items-center gap-2 text-xs">
                    <Truck className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">{order.shipping.carrier}: {order.shipping.trackingNumber}</span>
                    <a
                      href={order.shipping.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Payment */}
          <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-200">Payment</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-xs text-slate-500">Method</div>
                <div className="text-slate-200 capitalize">{order.payment?.method?.replace('-', ' ')}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Status</div>
                <div className="text-slate-200 capitalize">{order.payment?.status}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Subtotal</div>
                <div className="text-slate-200">${order.subtotal.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Total</div>
                <div className="text-slate-200 font-bold">${order.total.toFixed(2)}</div>
              </div>
            </div>

            {/* Refund Section */}
            {onRefund && order.payment?.status === 'captured' && order.status !== 'refunded' && (
              <div className="mt-4 pt-4 border-t border-slate-700/50">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm text-slate-400">Process refund:</span>
                  <input
                    type="number"
                    placeholder={`Max $${order.total.toFixed(2)}`}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="flex-1 min-w-[120px] max-w-[150px] px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
                  />
                  <input
                    type="text"
                    placeholder="Reason (optional)"
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="flex-1 min-w-[150px] px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
                  />
                  <button
                    onClick={() => {
                      const amount = refundAmount ? Math.round(parseFloat(refundAmount) * 100) : undefined
                      if (amount && (amount <= 0 || amount > order.total * 100)) {
                        alert('Invalid refund amount')
                        return
                      }
                      setRefunding(true)
                      Promise.resolve(onRefund(order.id, amount, refundReason || undefined))
                        .then(() => {
                          setRefundAmount('')
                          setRefundReason('')
                        })
                        .catch(() => {})
                        .finally(() => setRefunding(false))
                    }}
                    disabled={refunding}
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {refunding ? 'Processing...' : 'Refund'}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5">
                  Leave amount blank for full refund. Partial refunds must be less than order total.
                </p>
              </div>
            )}
          </div>

          {/* Items */}
          <div>
            <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-400" />
              Order Items ({order.items.filter((i) => i.type !== 'shipping').length})
            </h3>

            <div className="space-y-4">
              {order.items
                .filter((item) => item.type !== 'shipping')
                .map((item, idx) => (
                  <OrderItemCard
                    key={item.id}
                    item={item}
                    index={idx}
                    isActive={activeItem === idx}
                    onClick={() => setActiveItem(idx)}
                    onPrintLabel={() => onPrintLabel(order, idx)}
                  />
                ))}
            </div>
          </div>

          {/* Status Workflow */}
          <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-200">Status Workflow</h3>
            </div>

            {/* Status Change */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="text-sm text-slate-400">Change status:</span>
              <div className="relative">
                <button
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-200 hover:bg-slate-700 transition-colors"
                >
                  Select status <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {showStatusDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-20 overflow-hidden">
                    {nextStatuses.map((status) => (
                      <button
                        key={status}
                        onClick={() => handleStatusChange(status)}
                        className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 transition-colors"
                      >
                        → {getStatusLabel(status)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="text"
                placeholder="Optional note..."
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                className="flex-1 min-w-[150px] px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
              />
            </div>

            {/* Tracking */}
            {(order.status === 'ready-to-ship' || order.status === 'shipped') && (
              <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-700/50">
                <span className="text-sm text-slate-400">Add tracking:</span>
                <input
                  type="text"
                  placeholder="Tracking number"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="flex-1 min-w-[150px] px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
                />
                <select
                  value={trackingCarrier}
                  onChange={(e) => setTrackingCarrier(e.target.value)}
                  className="px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-200"
                >
                  <option value="auspost">Australia Post</option>
                  <option value="courier">Courier</option>
                  <option value="express">Express</option>
                </select>
                <button
                  onClick={handleTrackingSubmit}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Add Tracking
                </button>
              </div>
            )}

            {/* Status History */}
            <div className="mt-4 pt-3 border-t border-slate-700/50">
              <div className="text-xs text-slate-500 mb-2">Status History</div>
              <div className="space-y-1.5">
                {[...(order.statusHistory || [])].reverse().map((entry, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs">
                    <div className="w-2 h-2 rounded-full bg-slate-600 shrink-0" />
                    <span className="text-slate-400 w-32">
                      {new Date(entry.timestamp).toLocaleString('en-AU', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <StatusBadge status={entry.status as OrderStatus} size="sm" />
                    {entry.note && <span className="text-slate-500">— {entry.note}</span>}
                    {entry.changedBy && <span className="text-slate-600">by {entry.changedBy}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Internal Notes */}
          <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-200">Internal Notes</h3>
            </div>
            <div className="text-sm text-slate-300 whitespace-pre-wrap">
              {order.internalNote || 'No internal notes'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// ORDER ITEM CARD
// ============================================================================

function OrderItemCard({
  item,
  index,
  isActive,
  onClick,
  onPrintLabel,
}: {
  item: EnrichedOrderItem
  index: number
  isActive: boolean
  onClick: () => void
  onPrintLabel: () => void
}) {
  const hasBlendData = item.customMix || item.scaledRecipe

  return (
    <div
      className={`border rounded-xl overflow-hidden transition-all ${
        isActive ? 'border-purple-500/50 bg-slate-900/80' : 'border-slate-700/50 bg-slate-900/40'
      }`}
    >
      {/* Item Header */}
      <div
        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 transition-colors"
        onClick={onClick}
      >
        <div className="flex items-center gap-3">
          <div className="text-xs font-mono text-slate-500">#{index + 1}</div>
          <div>
            <div className="text-sm font-medium text-slate-200">{item.name}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <ItemTypeBadge type={item.type} />
              {item.bottleSize && <span className="text-[10px] text-slate-500">{item.bottleSize}ml</span>}
              {item.isRefill && <span className="text-[10px] text-amber-400">🔁 Refill</span>}
              {item.communityBlendCreatorName && (
                <span className="text-[10px] text-pink-400">by {item.communityBlendCreatorName}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-mono text-slate-200">${item.totalPrice.toFixed(2)}</div>
            <div className="text-[10px] text-slate-500">qty: {item.quantity}</div>
          </div>
          {hasBlendData && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onPrintLabel()
              }}
              className="p-2 rounded-lg bg-slate-800 hover:bg-purple-500/20 text-slate-400 hover:text-purple-300 transition-colors"
              title="Print Label"
            >
              <Printer className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isActive && hasBlendData && (
        <div className="px-4 pb-4 border-t border-slate-700/30">
          {/* Composition Table */}
          {(item.customMix?.oils?.length || item.scaledRecipe?.oils?.length) ? (
            <div className="mt-3">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Beaker className="w-3.5 h-3.5" />
                Composition
                {item.scaledRecipe && (
                  <span className="text-[10px] normal-case text-amber-400">
                    (scaled from {item.sourceVolume}ml → {item.targetVolume}ml)
                  </span>
                )}
              </div>

              <div className="bg-slate-950/60 rounded-lg overflow-hidden border border-slate-700/30">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-700/30 text-left">
                      <th className="px-3 py-2 text-slate-500 font-medium">Oil Name</th>
                      <th className="px-3 py-2 text-slate-500 font-medium text-right">ml</th>
                      <th className="px-3 py-2 text-slate-500 font-medium text-right">%</th>
                      {item.scaledRecipe && (
                        <th className="px-3 py-2 text-slate-500 font-medium text-right">Original ml</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/20">
                    {(item.customMix?.oils || item.scaledRecipe?.oils || []).map((oil, i) => (
                      <tr key={i} className="hover:bg-slate-800/30">
                        <td className="px-3 py-2 text-slate-200">{oil.oilName || (oil as any).name}</td>
                        <td className="px-3 py-2 text-slate-300 text-right font-mono">{oil.ml.toFixed(1)}</td>
                        <td className="px-3 py-2 text-slate-300 text-right font-mono">{oil.percentage}%</td>
                        {item.scaledRecipe && item.customMix?.oils?.[i] && (
                          <td className="px-3 py-2 text-slate-500 text-right font-mono">
                            {item.customMix.oils[i].ml.toFixed(1)}
                          </td>
                        )}
                      </tr>
                    ))}
                    {/* Carrier row */}
                    {(item.customMix?.carrierOil || item.scaledRecipe?.carrierOil) && (
                      <tr className="bg-slate-800/20">
                        <td className="px-3 py-2 text-slate-300">
                          Carrier: {item.customMix?.carrierOil || item.scaledRecipe?.carrierOil}
                        </td>
                        <td className="px-3 py-2 text-slate-300 text-right font-mono">
                          {item.customMix?.carrierMl?.toFixed(1) || item.scaledRecipe?.carrierMl?.toFixed(1) || '-'}
                        </td>
                        <td className="px-3 py-2 text-slate-300 text-right font-mono">
                          {item.customMix?.carrierPercentage ? `${item.customMix.carrierPercentage}%` : '-'}
                        </td>
                        {item.scaledRecipe && <td className="px-3 py-2" />}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {/* Crystal / Cord */}
          {(item.customMix?.crystal || item.customMix?.cord) && (
            <div className="mt-3 flex gap-4 text-xs">
              {item.customMix.crystal && (
                <div className="bg-slate-800/40 rounded-lg px-3 py-2">
                  <span className="text-slate-500">Crystal:</span>{' '}
                  <span className="text-slate-200">{item.customMix.crystal}</span>
                </div>
              )}
              {item.customMix.cord && (
                <div className="bg-slate-800/40 rounded-lg px-3 py-2">
                  <span className="text-slate-500">Cord:</span>{' '}
                  <span className="text-slate-200">{item.customMix.cord}</span>
                </div>
              )}
              {item.customMix.intendedUse && (
                <div className="bg-slate-800/40 rounded-lg px-3 py-2">
                  <span className="text-slate-500">Use:</span>{' '}
                  <span className="text-slate-200">{item.customMix.intendedUse}</span>
                </div>
              )}
            </div>
          )}

          {/* Safety */}
          {item.customMix?.safetyWarnings && item.customMix.safetyWarnings.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center gap-2 mb-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-semibold text-amber-400">Safety Warnings</span>
                <span className="text-[10px] text-slate-500">
                  Score: {item.customMix.safetyScore}/100 ({item.customMix.safetyRating})
                </span>
              </div>
              <ul className="space-y-1">
                {item.customMix.safetyWarnings.map((warning, i) => (
                  <li key={i} className="text-xs text-amber-200/80 flex items-start gap-1.5">
                    <span className="text-amber-500 mt-0.5">•</span>
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Commission */}
          {item.commissionAmount && (
            <div className="mt-3 bg-pink-900/20 border border-pink-700/30 rounded-lg px-3 py-2">
              <div className="text-xs text-pink-300">
                Commission: ${item.commissionAmount.toFixed(2)} ({item.commissionRate}%) → {item.communityBlendCreatorName}
              </div>
            </div>
          )}

          {/* Batch / QR */}
          {item.customMix?.batchId && (
            <div className="mt-3 flex items-center gap-3">
              <div className="text-xs text-slate-500 font-mono">Batch: {item.customMix.batchId}</div>
              <a
                href={`/batch/${item.customMix.batchId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
              >
                <QrCode className="w-3 h-3" />
                View QR Page
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// BADGES
// ============================================================================

function StatusBadge({ status, size = 'md' }: { status: OrderStatus; size?: 'sm' | 'md' }) {
  const colors: Record<string, string> = {
    pending: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    confirmed: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    processing: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    blending: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    'quality-check': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    'ready-to-ship': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    shipped: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    delivered: 'bg-green-500/20 text-green-300 border-green-500/30',
    cancelled: 'bg-red-500/20 text-red-300 border-red-500/30',
    refunded: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  }

  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'

  return (
    <span className={`inline-block rounded-full font-medium border ${colors[status] || colors.pending} ${sizeClasses}`}>
      {getStatusLabel(status)}
    </span>
  )
}

function ItemTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    custom_blend: 'bg-purple-500/20 text-purple-300',
    collection_blend: 'bg-indigo-500/20 text-indigo-300',
    community_blend: 'bg-pink-500/20 text-pink-300',
    pure_oil: 'bg-emerald-500/20 text-emerald-300',
    carrier_oil: 'bg-teal-500/20 text-teal-300',
    crystal: 'bg-cyan-500/20 text-cyan-300',
    cord_charm: 'bg-slate-500/20 text-slate-300',
    refill: 'bg-amber-500/20 text-amber-300',
    forever_bottle: 'bg-blue-500/20 text-blue-300',
  }

  const labels: Record<string, string> = {
    custom_blend: 'Custom',
    collection_blend: 'Collection',
    community_blend: 'Community',
    pure_oil: 'Pure Oil',
    carrier_oil: 'Carrier',
    crystal: 'Crystal',
    cord_charm: 'Accessory',
    refill: 'Refill',
    forever_bottle: 'Bottle',
  }

  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${colors[type] || colors.pure_oil}`}>
      {labels[type] || type}
    </span>
  )
}
