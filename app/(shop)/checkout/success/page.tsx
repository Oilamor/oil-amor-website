'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { CheckCircle, Package, ArrowRight, Sparkles } from 'lucide-react'
import { getCheckoutSessionStatus } from '@/lib/stripe/checkout'
import { useUser } from '@/lib/context/user-context'
import { logger } from '@/lib/logging/logger'

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams()
  const { refreshUserData } = useUser()
  
  const sessionId = searchParams.get('session_id')
  const orderId = searchParams.get('order_id')
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [orderDetails, setOrderDetails] = useState<any>(null)
  
  useEffect(() => {
    if (sessionId) {
      verifyPayment()
    } else {
      setStatus('error')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])
  
  async function verifyPayment() {
    try {
      const session = await getCheckoutSessionStatus(sessionId!)
      
      if (session.payment_status === 'paid') {
        setStatus('success')
        setOrderDetails(session)
        
        // Refresh user data to show new orders/unlocked oils
        await refreshUserData()
      } else {
        setStatus('error')
      }
    } catch (error) {
      logger.error('Payment verification error', error instanceof Error ? error : new Error(String(error)))
      setStatus('error')
    }
  }
  
  if (status === 'loading') {
    return (
      <main className="min-h-screen bg-[#0a080c] pt-32 pb-16">
        <div className="max-w-md mx-auto px-6 text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 border-4 border-[#c9a227] border-t-transparent rounded-full mx-auto mb-6"
          />
          <h1 className="font-serif text-2xl text-[#f5f3ef] mb-2">
            Confirming your order...
          </h1>
          <p className="text-[#a69b8a]">
            Please wait while we verify your payment
          </p>
        </div>
      </main>
    )
  }
  
  if (status === 'error') {
    return (
      <main className="min-h-screen bg-[#0a080c] pt-32 pb-16">
        <div className="max-w-md mx-auto px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">❌</span>
          </div>
          <h1 className="font-serif text-2xl text-[#f5f3ef] mb-2">
            Payment Issue
          </h1>
          <p className="text-[#a69b8a] mb-6">
            We couldn&apos;t verify your payment. If you were charged, please contact support.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/cart"
              className="px-6 py-3 rounded-full bg-[#111] border border-[#f5f3ef]/10 text-[#f5f3ef] font-medium hover:border-[#c9a227]/50 transition-colors"
            >
              Return to Cart
            </Link>
            <Link
              href="/contact"
              className="px-6 py-3 rounded-full bg-[#c9a227] text-[#0a080c] font-medium hover:bg-[#f5f3ef] transition-colors"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </main>
    )
  }
  
  return (
    <main className="min-h-screen bg-[#0a080c] pt-32 pb-16">
      <div className="max-w-2xl mx-auto px-6">
        {/* Success Animation */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="w-24 h-24 rounded-full bg-[#2ecc71]/10 border border-[#2ecc71]/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-[#2ecc71]" />
          </div>
          
          <h1 className="font-serif text-4xl md:text-5xl text-[#f5f3ef] mb-4">
            Order Confirmed!
          </h1>
          
          <p className="text-[#a69b8a] text-lg max-w-md mx-auto">
            Thank you for your purchase. Your order has been received and is being prepared with care.
          </p>
        </motion.div>
        
        {/* Order Details */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="p-8 rounded-3xl bg-[#111] border border-[#f5f3ef]/10 mb-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <Package className="w-5 h-5 text-[#c9a227]" />
            <span className="text-[#a69b8a]">Order Details</span>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-[#a69b8a]">Order Number</span>
              <span className="text-[#f5f3ef] font-mono">{orderId}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-[#a69b8a]">Email</span>
              <span className="text-[#f5f3ef]">{orderDetails?.customer_email}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-[#a69b8a]">Amount Paid</span>
              <span className="text-[#c9a227] font-serif text-xl">
                ${(orderDetails?.amount_total / 100).toFixed(2)}
              </span>
            </div>
            
            <div className="pt-4 border-t border-[#f5f3ef]/10">
              <p className="text-sm text-[#a69b8a]">
                A confirmation email has been sent to your email address with all order details.
              </p>
            </div>
          </div>
        </motion.div>
        
        {/* Refill Info */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="p-6 rounded-2xl bg-gradient-to-br from-[#2ecc71]/10 to-transparent border border-[#2ecc71]/30 mb-8"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#2ecc71]/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-[#2ecc71]" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-[#f5f3ef] mb-1">
                Your Oils Are Now Unlocked!
              </h3>
              <p className="text-[#a69b8a] text-sm mb-3">
                The oils you purchased are now available for refill at a discounted price.
                Keep your Forever Bottle and order refills anytime.
              </p>
              <Link
                href="/account"
                className="inline-flex items-center gap-2 text-sm text-[#2ecc71] hover:underline"
              >
                View in Your Collection
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </motion.div>
        
        {/* Next Steps */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="grid md:grid-cols-2 gap-4"
        >
          <Link
            href="/account"
            className="group p-6 rounded-2xl bg-[#111] border border-[#f5f3ef]/10 hover:border-[#c9a227]/30 transition-all"
          >
            <h3 className="text-lg font-medium text-[#f5f3ef] mb-2 group-hover:text-[#c9a227] transition-colors">
              Track Your Order
            </h3>
            <p className="text-sm text-[#a69b8a]">
              View order status and tracking information in your account
            </p>
          </Link>
          
          <Link
            href="/oils"
            className="group p-6 rounded-2xl bg-[#111] border border-[#f5f3ef]/10 hover:border-[#c9a227]/30 transition-all"
          >
            <h3 className="text-lg font-medium text-[#f5f3ef] mb-2 group-hover:text-[#c9a227] transition-colors">
              Continue Shopping
            </h3>
            <p className="text-sm text-[#a69b8a]">
              Explore more oils and expand your collection
            </p>
          </Link>
        </motion.div>
      </div>
    </main>
  )
}
