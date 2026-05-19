'use client'

import { useState, useRef } from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { Gift, Sparkles, Mail, Heart, Clock, Check, ArrowRight, Star, Package } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/app/hooks/use-cart'
import { logger } from '@/lib/logging/logger'

// ============================================================================
// TYPES
// ============================================================================

interface GiftCardAmount {
  amount: number
  popular: boolean
  label: string
}

interface GiftCardDetails {
  recipientName: string
  recipientEmail: string
  senderName: string
  message: string
  amount: number
  deliveryDate: string
}

// ============================================================================
// DATA
// ============================================================================

const GIFT_CARD_AMOUNTS: GiftCardAmount[] = [
  { amount: 50, popular: false, label: 'Starter' },
  { amount: 100, popular: true, label: 'Most Popular' },
  { amount: 200, popular: false, label: 'Premium' },
  { amount: 500, popular: false, label: 'Luxury' },
]

const FEATURES = [
  {
    icon: Clock,
    title: '3 Years Valid',
    description: 'Plenty of time to find the perfect oil'
  },
  {
    icon: Package,
    title: 'Multiple Uses',
    description: 'Use across multiple purchases until balance runs out'
  },
  {
    icon: Check,
    title: 'No Fees',
    description: 'No hidden fees or expiration penalties'
  },
  {
    icon: Sparkles,
    title: 'Full Collection',
    description: 'Valid for all oils, crystals, and accessories'
  }
]

const HOW_IT_WORKS = [
  { step: 1, icon: Gift, title: 'Choose Amount', desc: 'Select from $50 to $500' },
  { step: 2, icon: Mail, title: 'Personalize', desc: 'Add your heartfelt message' },
  { step: 3, icon: Sparkles, title: 'We Send It', desc: 'Delivered instantly via email' },
  { step: 4, icon: Heart, title: 'They Enjoy', desc: 'They choose their perfect oil' },
]

// ============================================================================
// GIFT CARD PREVIEW COMPONENT
// ============================================================================

function GiftCardPreview({ amount, recipientName, senderName, message }: {
  amount: number
  recipientName: string
  senderName: string
  message: string
}) {
  return (
    <div className="relative w-full aspect-[1.6/1] rounded-2xl overflow-hidden bg-gradient-to-br from-[#1c181f] via-[#141218] to-[#0a080c] border border-[#c9a227]/30 p-8 shadow-2xl">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#c9a227]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#c9a227]/5 rounded-full blur-2xl" />
      
      {/* Gold accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#c9a227] to-transparent" />
      
      {/* Content */}
      <div className="relative h-full flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[0.625rem] uppercase tracking-[0.3em] text-[#c9a227] mb-1">Oil Amor</p>
            <p className="text-[0.5rem] uppercase tracking-[0.2em] text-[#a69b8a]">Digital Gift Card</p>
          </div>
          <Star className="w-6 h-6 text-[#c9a227]" fill="#c9a227" />
        </div>
        
        <div className="text-center">
          <p className="font-display text-5xl text-[#f5f3ef] mb-2">${amount}</p>
          {recipientName && (
            <p className="text-[#a69b8a] text-sm">For {recipientName}</p>
          )}
        </div>
        
        <div className="space-y-2">
          {message && (
            <p className="text-[#f5f3ef]/80 text-sm italic line-clamp-2">&ldquo;{message}&rdquo;</p>
          )}
          {senderName && (
            <p className="text-[#a69b8a] text-xs">From {senderName}</p>
          )}
        </div>
      </div>
      
      {/* Holographic effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-50 pointer-events-none" />
    </div>
  )
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function GiftCardsPage() {
  const router = useRouter()
  const { addItem } = useCart()
  const containerRef = useRef<HTMLDivElement>(null)
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  })
  
  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0])
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -100])

  const [selectedAmount, setSelectedAmount] = useState<number>(100)
  const [showForm, setShowForm] = useState(false)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [details, setDetails] = useState<GiftCardDetails>({
    recipientName: '',
    recipientEmail: '',
    senderName: '',
    message: '',
    amount: 100,
    deliveryDate: new Date().toISOString().split('T')[0]
  })

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount)
    setDetails(prev => ({ ...prev, amount }))
    setShowForm(true)
  }

  const handleAddToCart = async () => {
    if (!details.recipientEmail || !details.recipientName || !details.senderName) return
    
    setIsAddingToCart(true)
    
    try {
      await addItem({
        productId: `gift-card-${selectedAmount}`,
        variantId: `gift-card-${selectedAmount}`,
        quantity: 1,
        properties: {
          name: `Oil Amor Gift Card - $${selectedAmount}`,
          price: String(selectedAmount),
          image: '/gift-card.jpg',
          sku: `GIFT-${selectedAmount}`,
          recipientName: details.recipientName,
          recipientEmail: details.recipientEmail,
          senderName: details.senderName,
          message: details.message,
          deliveryDate: details.deliveryDate,
          type: 'gift-card'
        }
      })
      
      router.push('/cart')
    } catch (error) {
      logger.error('Failed to add gift card', error instanceof Error ? error : new Error(String(error)))
    } finally {
      setIsAddingToCart(false)
    }
  }

  const isFormValid = details.recipientEmail && details.recipientName && details.senderName

  return (
    <div ref={containerRef} className="min-h-screen bg-[#0a080c]">
      {/* =====================================================================
          HERO SECTION
          ===================================================================== */}
      <motion.section 
        className="relative min-h-[80vh] flex items-center justify-center overflow-hidden"
        style={{ opacity: heroOpacity, y: heroY }}
      >
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#141218] via-[#0a080c] to-[#0a080c]" />
          <motion.div 
            className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #c9a227 0%, transparent 60%)' }}
            animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.3, 0.2] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #c9a227 0%, transparent 60%)' }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#c9a227]/10 border border-[#c9a227]/30 mb-8">
              <Gift className="w-4 h-4 text-[#c9a227]" />
              <span className="text-[0.625rem] uppercase tracking-[0.2em] text-[#c9a227]">The Perfect Gift</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="font-display text-5xl sm:text-6xl lg:text-8xl text-[#f5f3ef] leading-[0.95] mb-8"
          >
            Gift the Art of
            <br />
            <span className="italic text-[#c9a227]">Transformation</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-[#a69b8a] text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-12"
          >
            Our digital gift cards unlock a world of sacred oils and crystal jewelry. 
            Let them choose their own journey.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <a 
              href="#amounts"
              className="inline-flex items-center gap-3 px-8 py-4 bg-[#c9a227] text-[#0a080c] rounded-full font-medium hover:bg-[#f5f3ef] transition-colors duration-300"
            >
              Choose Amount
              <ArrowRight className="w-4 h-4" />
            </a>
            <p className="text-[#a69b8a] text-sm">Instant digital delivery</p>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div 
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
        >
          <motion.div 
            className="w-px h-16 bg-gradient-to-b from-[#c9a227] to-transparent"
            animate={{ scaleY: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </motion.section>

      {/* =====================================================================
          AMOUNT SELECTION
          ===================================================================== */}
      <section id="amounts" className="py-24 relative">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <p className="text-[0.625rem] uppercase tracking-[0.3em] text-[#c9a227] mb-4">Select Value</p>
            <h2 className="font-display text-4xl sm:text-5xl text-[#f5f3ef] mb-4">Choose Your Amount</h2>
            <p className="text-[#a69b8a] max-w-xl mx-auto">From starter collections to complete crystal experiences</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {GIFT_CARD_AMOUNTS.map((card, index) => (
              <motion.button
                key={card.amount}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleAmountSelect(card.amount)}
                className={`group relative p-8 rounded-2xl border-2 text-left transition-all duration-300 ${
                  selectedAmount === card.amount && showForm
                    ? 'border-[#c9a227] bg-[#c9a227]/10' 
                    : 'border-[#262228] bg-[#141218] hover:border-[#c9a227]/50'
                }`}
              >
                {/* Popular Badge */}
                {card.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 px-4 py-1.5 bg-[#c9a227] text-[#0a080c] text-xs font-semibold rounded-full">
                      <Star className="w-3 h-3" fill="currentColor" />
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Label */}
                <p className="text-[0.625rem] uppercase tracking-[0.2em] text-[#a69b8a] mb-4">{card.label}</p>
                
                {/* Amount */}
                <p className="font-display text-5xl text-[#f5f3ef] mb-2 group-hover:text-[#c9a227] transition-colors">
                  ${card.amount}
                </p>
                <p className="text-[#a69b8a] text-sm mb-6">Digital Gift Card</p>

                {/* Features */}
                <ul className="space-y-2 text-xs text-[#a69b8a]">
                  <li className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-[#c9a227]" />
                    Valid for 3 years
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-[#c9a227]" />
                    Multiple uses
                  </li>
                </ul>

                {/* Select Button */}
                <div className={`mt-6 py-3 px-4 rounded-xl text-center font-medium transition-all duration-300 ${
                  selectedAmount === card.amount && showForm
                    ? 'bg-[#c9a227] text-[#0a080c]'
                    : 'bg-[#262228] text-[#f5f3ef] group-hover:bg-[#c9a227] group-hover:text-[#0a080c]'
                }`}>
                  {selectedAmount === card.amount && showForm ? 'Selected' : 'Select'}
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          PERSONALIZATION FORM
          ===================================================================== */}
      <AnimatePresence>
        {showForm && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="py-24 bg-[#141218] border-y border-[#262228] overflow-hidden"
          >
            <div className="max-w-6xl mx-auto px-6">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
                {/* Form */}
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  <p className="text-[0.625rem] uppercase tracking-[0.3em] text-[#c9a227] mb-4">Personalize</p>
                  <h2 className="font-display text-4xl text-[#f5f3ef] mb-8">Make It Personal</h2>

                  <div className="space-y-6">
                    {/* Recipient Name */}
                    <div>
                      <label className="block text-[#a69b8a] text-sm mb-2">Recipient Name *</label>
                      <input
                        type="text"
                        value={details.recipientName}
                        onChange={(e) => setDetails(prev => ({ ...prev, recipientName: e.target.value }))}
                        placeholder="e.g., Sarah"
                        className="w-full px-4 py-3 bg-[#0a080c] border border-[#262228] rounded-xl text-[#f5f3ef] placeholder:text-[#3d383f] focus:border-[#c9a227] focus:outline-none transition-colors"
                      />
                    </div>

                    {/* Recipient Email */}
                    <div>
                      <label className="block text-[#a69b8a] text-sm mb-2">Recipient Email *</label>
                      <input
                        type="email"
                        value={details.recipientEmail}
                        onChange={(e) => setDetails(prev => ({ ...prev, recipientEmail: e.target.value }))}
                        placeholder="sarah@example.com"
                        className="w-full px-4 py-3 bg-[#0a080c] border border-[#262228] rounded-xl text-[#f5f3ef] placeholder:text-[#3d383f] focus:border-[#c9a227] focus:outline-none transition-colors"
                      />
                    </div>

                    {/* Sender Name */}
                    <div>
                      <label className="block text-[#a69b8a] text-sm mb-2">Your Name *</label>
                      <input
                        type="text"
                        value={details.senderName}
                        onChange={(e) => setDetails(prev => ({ ...prev, senderName: e.target.value }))}
                        placeholder="e.g., Michael"
                        className="w-full px-4 py-3 bg-[#0a080c] border border-[#262228] rounded-xl text-[#f5f3ef] placeholder:text-[#3d383f] focus:border-[#c9a227] focus:outline-none transition-colors"
                      />
                    </div>

                    {/* Personal Message */}
                    <div>
                      <label className="block text-[#a69b8a] text-sm mb-2">Personal Message</label>
                      <textarea
                        value={details.message}
                        onChange={(e) => setDetails(prev => ({ ...prev, message: e.target.value }))}
                        placeholder="Write a heartfelt message..."
                        rows={4}
                        maxLength={200}
                        className="w-full px-4 py-3 bg-[#0a080c] border border-[#262228] rounded-xl text-[#f5f3ef] placeholder:text-[#3d383f] focus:border-[#c9a227] focus:outline-none transition-colors resize-none"
                      />
                      <p className="text-[#3d383f] text-xs mt-1 text-right">{details.message.length}/200</p>
                    </div>

                    {/* Add to Cart Button */}
                    <button
                      onClick={handleAddToCart}
                      disabled={!isFormValid || isAddingToCart}
                      className="w-full py-4 bg-[#c9a227] text-[#0a080c] rounded-xl font-medium flex items-center justify-center gap-3 hover:bg-[#f5f3ef] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isAddingToCart ? (
                        <>
                          <div className="w-5 h-5 border-2 border-[#0a080c]/30 border-t-[#0a080c] rounded-full animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Gift className="w-5 h-5" />
                          Add Gift Card to Cart — ${selectedAmount}
                        </>
                      )}
                    </button>

                    {!isFormValid && (
                      <p className="text-[#a69b8a] text-sm text-center">
                        Please fill in all required fields
                      </p>
                    )}
                  </div>
                </motion.div>

                {/* Preview */}
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="lg:sticky lg:top-32 lg:self-start"
                >
                  <p className="text-[0.625rem] uppercase tracking-[0.3em] text-[#a69b8a] mb-4">Preview</p>
                  <GiftCardPreview
                    amount={selectedAmount}
                    recipientName={details.recipientName}
                    senderName={details.senderName}
                    message={details.message}
                  />
                  
                  <div className="mt-6 p-6 bg-[#0a080c] rounded-xl border border-[#262228]">
                    <p className="text-[#f5f3ef] font-medium mb-2">What happens next?</p>
                    <ul className="space-y-2 text-sm text-[#a69b8a]">
                      <li className="flex items-start gap-2">
                        <span className="text-[#c9a227]">1.</span>
                        Complete checkout like any other purchase
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#c9a227]">2.</span>
                        We send the gift card to {details.recipientEmail || 'recipient'} immediately
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#c9a227]">3.</span>
                        They can redeem it for any product in our collection
                      </li>
                    </ul>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* =====================================================================
          HOW IT WORKS
          ===================================================================== */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <p className="text-[0.625rem] uppercase tracking-[0.3em] text-[#c9a227] mb-4">Simple Process</p>
            <h2 className="font-display text-4xl sm:text-5xl text-[#f5f3ef] mb-4">How It Works</h2>
            <p className="text-[#a69b8a] max-w-xl mx-auto">Four simple steps to gifting transformation</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {HOW_IT_WORKS.map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative text-center"
              >
                {/* Connector Line */}
                {index < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden lg:block absolute top-12 left-1/2 w-full h-px bg-gradient-to-r from-[#262228] to-[#262228]" />
                )}

                {/* Step Number */}
                <div className="relative inline-flex items-center justify-center w-24 h-24 mb-6">
                  <div className="absolute inset-0 rounded-full border border-[#262228]" />
                  <div className="absolute inset-2 rounded-full bg-[#141218] border border-[#262228]" />
                  <step.icon className="relative w-8 h-8 text-[#c9a227]" />
                  <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-[#c9a227] text-[#0a080c] text-sm font-bold flex items-center justify-center">
                    {step.step}
                  </span>
                </div>

                <h3 className="text-[#f5f3ef] font-medium text-lg mb-2">{step.title}</h3>
                <p className="text-[#a69b8a] text-sm">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          FEATURES GRID
          ===================================================================== */}
      <section className="py-24 bg-[#141218] border-y border-[#262228]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {FEATURES.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#0a080c] border border-[#262228] flex items-center justify-center">
                  <feature.icon className="w-7 h-7 text-[#c9a227]" />
                </div>
                <h3 className="text-[#f5f3ef] font-medium mb-2">{feature.title}</h3>
                <p className="text-[#a69b8a] text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          FAQ / TRUST SECTION
          ===================================================================== */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <p className="text-[0.625rem] uppercase tracking-[0.3em] text-[#c9a227] mb-4">Questions</p>
            <h2 className="font-display text-4xl text-[#f5f3ef]">Common Questions</h2>
          </motion.div>

          <div className="space-y-6">
            {[
              { q: 'How long is the gift card valid?', a: 'Our gift cards are valid for 3 years from the date of purchase, giving plenty of time to find the perfect oil.' },
              { q: 'Can the gift card be used multiple times?', a: 'Yes! The gift card works like a store credit. You can use it across multiple purchases until the balance runs out.' },
              { q: 'What can the gift card be used for?', a: 'Gift cards can be used for any product in our collection — essential oils, crystal jewelry, refill programs, and accessories.' },
              { q: 'When will the recipient receive the gift card?', a: 'Gift cards are delivered instantly via email. You can also schedule delivery for a specific date.' },
            ].map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="p-6 bg-[#141218] rounded-2xl border border-[#262228]"
              >
                <h3 className="text-[#f5f3ef] font-medium mb-2">{faq.q}</h3>
                <p className="text-[#a69b8a] text-sm">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          CTA SECTION
          ===================================================================== */}
      <section className="py-24 bg-[#141218]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="font-display text-4xl sm:text-5xl text-[#f5f3ef] mb-6">
              Ready to Gift Something
              <span className="italic text-[#c9a227]"> Meaningful?</span>
            </h2>
            <p className="text-[#a69b8a] mb-8 max-w-xl mx-auto">
              Give them the gift of choice. Let them discover their own perfect oil and crystal pairing.
            </p>
            <a 
              href="#amounts"
              className="inline-flex items-center gap-3 px-8 py-4 bg-[#c9a227] text-[#0a080c] rounded-full font-medium hover:bg-[#f5f3ef] transition-colors"
            >
              <Gift className="w-5 h-5" />
              Get Started
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
