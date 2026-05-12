'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  ArrowLeft,
  Shield,
  Lock,
  CreditCard,
  Truck,
  Package,
  Sparkles,
  CheckCircle,
  Crown,
  MapPin,
  ChevronRight,
  Beaker,
  Gem,
  Scroll,
  Clock,
  ExternalLink,
  Droplets,
  Wallet
} from 'lucide-react'
import { formatPrice } from '@/lib/content/pricing-engine-final'
import { useCart } from '@/app/hooks/use-cart'
import { useUser } from '@/lib/context/user-context'
import { cn } from '@/lib/utils'
import { ATELIER_CRYSTALS } from '@/lib/atelier/atelier-engine'
import { SIMPLE_CORD_OPTIONS } from '@/lib/atelier/cord-data-simple'
import { createCheckoutSession, cartItemsToCheckoutItems } from '@/lib/stripe/checkout'
import { hasPreorderItems, getPreorderOils } from '@/lib/inventory/client'

// ============================================================================
// COMPONENT: Checkout Item Summary
// ============================================================================
function CheckoutItem({ item }: { item: any }) {
  const customMix = item.customMix || {}
  const configuration = item.configuration || {}
  const attachment = item.attachment || {}
  
  const isAtelierBlend = customMix.oils?.length > 0 || (configuration.oils?.length > 0)
  
  const crystalId = customMix.crystalId || configuration?.crystals?.[0]
  const crystal = crystalId ? ATELIER_CRYSTALS.find(c => c.id === crystalId) : null
  
  const cordId = attachment.cordId || customMix.cordId || configuration?.cord
  const cord = cordId ? SIMPLE_CORD_OPTIONS.find(c => c.id === cordId) : null
  
  return (
    <div className={cn(
      "flex gap-4 p-4 rounded-xl",
      isAtelierBlend ? "bg-[#c9a227]/5 border border-[#c9a227]/20" : "bg-[#0a080c]"
    )}>
      <div className={cn(
        "w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0",
        isAtelierBlend ? "bg-[#c9a227]/10" : "bg-[#111]"
      )}>
        {isAtelierBlend ? (
          <Beaker className="w-6 h-6 text-[#c9a227]" />
        ) : (
          <Sparkles className="w-6 h-6 text-[#a69b8a]" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className={cn(
          "font-medium truncate",
          isAtelierBlend ? "text-[#f5e6c8]" : "text-[#f5f3ef]"
        )}>
          {item.name}
        </h4>
        <p className="text-xs text-[#a69b8a] mt-0.5">
          {isAtelierBlend ? 'Custom Blend' : item.description}
        </p>
        
        {/* Regular Oil Product Details */}
        {!isAtelierBlend && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {/* Bottle Size */}
            {configuration.bottleSize && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#f5f3ef]/5 text-[#a69b8a] text-[10px]">
                <Beaker className="w-2.5 h-2.5" />
                {configuration.bottleSize}
              </span>
            )}
            
            {/* Type: Pure or Carrier */}
            {configuration.type === 'pure' || configuration.isPure ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#c9a227]/10 text-[#c9a227] text-[10px]">
                <Sparkles className="w-2.5 h-2.5" />
                Pure
              </span>
            ) : configuration.isCarrierBlend ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[10px]">
                <Droplets className="w-2.5 h-2.5" />
                Carrier Blend
              </span>
            ) : null}
            
            {/* Carrier Oil */}
            {configuration.carrierOil && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#f5f3ef]/5 text-[#a69b8a] text-[10px]">
                {configuration.carrierOil}
              </span>
            )}
            
            {/* Ratio */}
            {configuration.ratio && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#f5f3ef]/5 text-[#a69b8a] text-[10px]">
                {configuration.ratio}
              </span>
            )}
            
            {/* Crystal */}
            {configuration.crystalName && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#c9a227]/10 text-[#c9a227] text-[10px]">
                <Gem className="w-2.5 h-2.5" />
                {configuration.crystalName}
              </span>
            )}
            
            {/* Cord */}
            {configuration.cord && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#f5f3ef]/5 text-[#a69b8a] text-[10px]">
                <Scroll className="w-2.5 h-2.5" />
                {configuration.cord}
              </span>
            )}
          </div>
        )}
        
        {/* Atelier Blend Details */}
        {isAtelierBlend && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {crystal && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#f5f3ef]/5 text-[#a69b8a] text-[10px]">
                <Gem className="w-2.5 h-2.5" />
                {crystal.name}
              </span>
            )}
            {cord && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#f5f3ef]/5 text-[#a69b8a] text-[10px]">
                <Scroll className="w-2.5 h-2.5" />
                {cord.name}
              </span>
            )}
          </div>
        )}
        
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-[#a69b8a]">Qty: {item.quantity}</span>
          <span className={cn(
            "font-medium",
            isAtelierBlend ? "text-[#c9a227]" : "text-[#f5f3ef]"
          )}>
            {formatPrice(item.unitPrice * item.quantity)}
          </span>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// COMPONENT: Form Input
// ============================================================================
function FormInput({ 
  label, 
  type = 'text', 
  placeholder, 
  required,
  icon: Icon,
  value,
  onChange,
  name
}: { 
  label: string
  type?: string
  placeholder?: string
  required?: boolean
  icon?: any
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  name?: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-[#a69b8a] uppercase tracking-wider">
        {label}
        {required && <span className="text-[#c9a227] ml-1">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a69b8a]" />
        )}
        <input
          type={type}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          className={cn(
            "w-full px-4 py-3 rounded-xl bg-[#0a080c] border border-[#f5f3ef]/10 text-[#f5f3ef] placeholder:text-[#a69b8a]/50 focus:border-[#c9a227]/50 focus:outline-none transition-colors",
            Icon && "pl-10"
          )}
        />
      </div>
    </div>
  )
}

// ============================================================================
// MAIN CHECKOUT PAGE
// ============================================================================
export default function CheckoutPage() {
  const router = useRouter()
  const { cart, isLoading, clearCart } = useCart()
  const { user, isAuthenticated } = useUser()
  
  // Cart state is managed by useCart hook

  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shippingRate, setShippingRate] = useState<{ amount: number; description: string } | null>(null)
  const [shippingLoading, setShippingLoading] = useState(false)
  
  // Store credit state
  const [creditBalance, setCreditBalance] = useState(0)
  const [creditToApply, setCreditToApply] = useState(0)
  const [applyCredit, setApplyCredit] = useState(false)
  const [creditLoading, setCreditLoading] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    email: user?.email || '',
    phone: '',
    firstName: '',
    lastName: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'AU',
  })
  
  // Update form field
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Get items from cart
  const items = cart?.items || []

  // Preorder check
  const hasPreorder = hasPreorderItems(items)
  const preorderOils = getPreorderOils(items)

  // Calculate totals
  const { subtotal, shipping, total, itemCount } = useMemo(() => {
    const sub = items.reduce((sum: number, item: any) => sum + (item.unitPrice * item.quantity), 0)
    const ship = sub >= 199 ? 0 : (shippingRate ? shippingRate.amount / 100 : 10)
    const creditDollars = applyCredit ? creditToApply / 100 : 0
    return {
      subtotal: sub,
      shipping: ship,
      total: Math.max(0, sub + ship - creditDollars),
      itemCount: items.reduce((sum: number, item: any) => sum + item.quantity, 0)
    }
  }, [items, shippingRate, applyCredit, creditToApply])

  // Fetch store credit balance
  useEffect(() => {
    const fetchCredit = async () => {
      if (!isAuthenticated || !user?.id) return
      setCreditLoading(true)
      try {
        const res = await fetch('/api/refill/credits')
        if (res.ok) {
          const data = await res.json()
          const balance = data.summary?.currentBalance || 0
          setCreditBalance(balance)
        }
      } catch (err) {
        console.error('Failed to fetch credit balance:', err)
      } finally {
        setCreditLoading(false)
      }
    }
    fetchCredit()
  }, [isAuthenticated, user?.id])

  // Recalculate credit to apply when subtotal or balance changes
  useEffect(() => {
    if (!applyCredit || creditBalance <= 0) {
      setCreditToApply(0)
      return
    }
    const subtotalCents = Math.round(subtotal * 100)
    const maxCredit = Math.min(creditBalance, subtotalCents)
    setCreditToApply(maxCredit)
  }, [applyCredit, creditBalance, subtotal])

  // Fetch live shipping rates when postcode changes
  useEffect(() => {
    const fetchShippingRate = async () => {
      const postcode = formData.postalCode.trim()
      if (!postcode || postcode.length < 4 || formData.country !== 'AU') {
        setShippingRate(null)
        return
      }
      
      setShippingLoading(true)
      try {
        const hasCustomBlends = items.some((item: any) => item.customMix?.oils?.length > 0 || item.configuration?.oils?.length > 0)
        const response = await fetch('/api/shipping/rates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            postalCode: postcode,
            country: formData.country,
            itemCount,
            hasCustomBlends,
            subtotal,
          }),
        })
        
        if (response.ok) {
          const data = await response.json()
          setShippingRate({ amount: data.amount, description: data.description })
        } else {
          setShippingRate(null)
        }
      } catch (err) {
        console.error('Failed to fetch shipping rate:', err)
        setShippingRate(null)
      } finally {
        setShippingLoading(false)
      }
    }
    
    const timer = setTimeout(fetchShippingRate, 500)
    return () => clearTimeout(timer)
  }, [formData.postalCode, formData.country, items, itemCount, subtotal])

  const handlePlaceOrder = async () => {
    // Validate form
    if (!formData.email || !formData.firstName || !formData.lastName || 
        !formData.address1 || !formData.city || !formData.state || !formData.postalCode) {
      setError('Please fill in all required fields')
      return
    }
    
    setIsProcessing(true)
    setError(null)
    
    try {
      // Transform cart items for Stripe
      const checkoutItems = cartItemsToCheckoutItems(items)
      
      // Create checkout session
      const result = await createCheckoutSession({
        items: checkoutItems,
        customerEmail: formData.email,
        customerId: user?.id,
        shippingAddress: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          address1: formData.address1,
          address2: formData.address2,
          city: formData.city,
          province: formData.state,
          postalCode: formData.postalCode,
          country: formData.country,
        },
        creditUsed: applyCredit ? creditToApply : 0,
        successUrl: `${window.location.origin}/checkout/success`,
        cancelUrl: `${window.location.origin}/checkout`,
      })
      
      if (!result.success) {
        throw new Error(result.error || 'Checkout failed')
      }
      
      // Stripe redirectToCheckout handles the redirect
      // If we reach here, there was an issue
      if (result.url) {
        window.location.href = result.url
      }
      
    } catch (err: any) {
      console.error('Checkout error:', err)
      setError(err.message || 'An error occurred during checkout')
      setIsProcessing(false)
    }
  }

  // Show loading state while cart initializes
  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#0a080c] pt-28 pb-16">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-[#c9a227]/30 border-t-[#c9a227] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[#a69b8a]">Loading checkout...</p>
          </div>
        </div>
      </main>
    )
  }

  // Show empty cart only after loading is complete
  if (!isLoading && items.length === 0) {
    return (
      <main className="min-h-screen bg-[#0a080c] pt-32 pb-16">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <div className="w-24 h-24 rounded-full bg-[#111] border border-[#f5f3ef]/10 flex items-center justify-center mx-auto mb-6">
            <Package className="w-10 h-10 text-[#a69b8a]" />
          </div>
          <h1 className="font-serif text-3xl text-[#f5f3ef] mb-2">Your Cart is Empty</h1>
          <p className="text-[#a69b8a] mb-8">Add some items to proceed to checkout</p>
          <Link
            href="/oils"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#c9a227] text-[#0a080c] font-medium hover:bg-[#f5e6c8] transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Browse Collection
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0a080c] pt-28 pb-16">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <Link 
            href="/cart"
            className="p-2 rounded-lg text-[#a69b8a] hover:text-[#f5f3ef] hover:bg-[#f5f3ef]/5 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-serif text-3xl text-[#f5f3ef]">Secure Checkout</h1>
            <p className="text-sm text-[#a69b8a]">{itemCount} items • {formatPrice(total)}</p>
          </div>
        </motion.div>

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-wrap justify-center gap-6 mb-8 py-4 border-y border-[#f5f3ef]/10"
        >
          <div className="flex items-center gap-2 text-xs text-[#a69b8a]">
            <Lock className="w-4 h-4 text-[#c9a227]" />
            SSL Secure Payment
          </div>
          <div className="flex items-center gap-2 text-xs text-[#a69b8a]">
            <Shield className="w-4 h-4 text-[#c9a227]" />
            100% Protected
          </div>
          <div className="flex items-center gap-2 text-xs text-[#a69b8a]">
            <Truck className="w-4 h-4 text-[#c9a227]" />
            Free Shipping over $199
          </div>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400"
          >
            {error}
          </motion.div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Checkout Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-2xl bg-[#111] border border-[#f5f3ef]/10"
            >
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-full bg-[#c9a227]/10 flex items-center justify-center text-[#c9a227] text-sm font-medium">
                  1
                </div>
                <h2 className="font-medium text-[#f5f3ef]">Contact Information</h2>
              </div>
              
              <div className="grid sm:grid-cols-2 gap-4">
                <FormInput 
                  label="Email" 
                  type="email" 
                  placeholder="you@example.com" 
                  required 
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                />
                <FormInput 
                  label="Phone" 
                  type="tel" 
                  placeholder="+61 400 000 000"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            </motion.div>

            {/* Shipping Address */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-6 rounded-2xl bg-[#111] border border-[#f5f3ef]/10"
            >
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-full bg-[#c9a227]/10 flex items-center justify-center text-[#c9a227] text-sm font-medium">
                  2
                </div>
                <h2 className="font-medium text-[#f5f3ef]">Shipping Address</h2>
              </div>
              
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <FormInput 
                    label="First Name" 
                    required
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                  />
                  <FormInput 
                    label="Last Name" 
                    required
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                  />
                </div>
                <FormInput 
                  label="Address" 
                  required 
                  icon={MapPin}
                  name="address1"
                  value={formData.address1}
                  onChange={handleChange}
                />
                <FormInput 
                  label="Apartment, suite, etc. (optional)"
                  name="address2"
                  value={formData.address2}
                  onChange={handleChange}
                />
                <div className="grid sm:grid-cols-3 gap-4">
                  <FormInput 
                    label="City" 
                    required
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                  />
                  <FormInput 
                    label="State" 
                    required
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                  />
                  <FormInput 
                    label="Postcode" 
                    required
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </motion.div>

            {/* Payment Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-6 rounded-2xl bg-[#111] border border-[#f5f3ef]/10"
            >
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-full bg-[#c9a227]/10 flex items-center justify-center text-[#c9a227] text-sm font-medium">
                  3
                </div>
                <h2 className="font-medium text-[#f5f3ef]">Payment</h2>
              </div>
              
              <div className="p-4 rounded-xl bg-[#0a080c] border border-[#f5f3ef]/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#635bff] flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-[#f5f3ef] font-medium">Secure Stripe Checkout</p>
                    <p className="text-sm text-[#a69b8a]">
                      You&apos;ll be redirected to complete payment securely
                    </p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-[#a69b8a] ml-auto" />
                </div>
              </div>
              
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="px-2 py-1 rounded bg-[#f5f3ef]/5 text-[#a69b8a] text-xs">Credit Card</span>
                <span className="px-2 py-1 rounded bg-[#f5f3ef]/5 text-[#a69b8a] text-xs">PayPal</span>
                <span className="px-2 py-1 rounded bg-[#f5f3ef]/5 text-[#a69b8a] text-xs">Apple Pay</span>
                <span className="px-2 py-1 rounded bg-[#f5f3ef]/5 text-[#a69b8a] text-xs">Google Pay</span>
              </div>
            </motion.div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-6 rounded-2xl bg-gradient-to-br from-[#111] to-[#0a080c] border border-[#f5f3ef]/10 sticky top-28"
            >
              <div className="flex items-center gap-2 mb-6">
                <Crown className="w-5 h-5 text-[#c9a227]" />
                <h2 className="font-serif text-lg text-[#f5f3ef]">Order Summary</h2>
              </div>

              {/* Preorder Warning */}
              {hasPreorder && (
                <div className="mb-4 p-3 rounded-xl bg-[#c9a227]/10 border border-[#c9a227]/30 text-[#f5e6c8] text-sm">
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-[#c9a227] mt-0.5 flex-shrink-0" />
                    <span>
                      Your order contains pre-order oils ({preorderOils.join(', ')}). These items will ship within 2-4 weeks. In-stock items will ship immediately in a separate package.
                    </span>
                  </div>
                </div>
              )}

              {/* Items */}
              <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                {items.map((item: any) => (
                  <CheckoutItem key={item.id} item={item} />
                ))}
              </div>

              {/* Store Credit */}
              {creditBalance > 0 && (
                <div className="mb-4 p-3 rounded-xl bg-[#c9a227]/5 border border-[#c9a227]/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-[#c9a227]" />
                      <span className="text-sm text-[#f5f3ef]">Store Credit</span>
                    </div>
                    <span className="text-sm text-[#a69b8a]">
                      {creditLoading ? 'Loading...' : `${formatPrice(creditBalance / 100)} available`}
                    </span>
                  </div>
                  <button
                    onClick={() => setApplyCredit(!applyCredit)}
                    className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                      applyCredit
                        ? 'bg-[#c9a227] text-[#0a080c]'
                        : 'bg-[#0a080c] text-[#a69b8a] border border-[#f5f3ef]/10 hover:border-[#c9a227]/30'
                    }`}
                  >
                    {applyCredit
                      ? `Applying ${formatPrice(creditToApply / 100)} credit`
                      : 'Apply Store Credit'}
                  </button>
                </div>
              )}

              {/* Totals */}
              <div className="space-y-2 pt-4 border-t border-[#f5f3ef]/10">
                <div className="flex justify-between text-sm">
                  <span className="text-[#a69b8a]">Subtotal</span>
                  <span className="text-[#f5f3ef]">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#a69b8a]">Shipping</span>
                  <span className={shipping === 0 ? "text-[#2ecc71]" : "text-[#f5f3ef]"}>
                    {shippingLoading ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-3 h-3 border border-[#a69b8a]/30 border-t-[#a69b8a] rounded-full animate-spin" />
                        Calculating...
                      </span>
                    ) : shipping === 0 ? (
                      'Free'
                    ) : (
                      formatPrice(shipping)
                    )}
                  </span>
                </div>
                {applyCredit && creditToApply > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#2ecc71]">Store Credit</span>
                    <span className="text-[#2ecc71]">-{formatPrice(creditToApply / 100)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-[#a69b8a]">Tax (GST)</span>
                  <span className="text-[#f5f3ef]">Included</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#f5f3ef]/10">
                  <span className="text-[#f5f3ef] font-medium">Total</span>
                  <span className="font-serif text-2xl text-[#c9a227]">{formatPrice(total)} AUD</span>
                </div>
              </div>

              {/* Place Order Button */}
              <button
                onClick={handlePlaceOrder}
                disabled={isProcessing}
                className="w-full mt-6 py-4 rounded-xl bg-gradient-to-r from-[#c9a227] to-[#d4af37] text-[#0a080c] font-medium hover:from-[#f5e6c8] hover:to-[#c9a227] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    Redirecting to Stripe...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Complete Purchase
                  </>
                )}
              </button>

              {/* Security Note */}
              <p className="text-xs text-[#a69b8a] text-center mt-4">
                Powered by Stripe. Your payment information is encrypted and secure.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </main>
  )
}
