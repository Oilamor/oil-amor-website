'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { Gem, Droplets, Shield, Star, MapPin, Sparkles } from 'lucide-react'

export default function LavenderPreview() {
  const oilColor = '#9b7cb6'
  const oilColorLight = '#b8a0d9'
  const oilColorDark = '#7c5f9e'

  return (
    <div className="min-h-screen bg-[#0a080c] text-[#f5f3ef]">
      {/* Navigation */}
      <nav className="px-6 py-4 border-b border-[#f5f3ef]/10 flex items-center justify-between">
        <span className="font-serif text-xl tracking-widest text-[#c9a227] uppercase">Oil Amor</span>
        <span className="text-xs text-[#a69b8a] uppercase tracking-wider">Product Preview — Lavender</span>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Bottle + Label Composite */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="relative flex justify-center"
          >
            {/* Bottle Image */}
            <div className="relative w-[280px] h-[420px]">
              <Image
                src="/images/bottles/bottle-30ml.webp"
                alt="MIRON Violetglass Bottle"
                fill
                className="object-contain drop-shadow-2xl"
                priority
              />

              {/* Label Overlay */}
              <div
                className="absolute left-1/2 -translate-x-1/2 top-[28%] w-[64%] rounded-sm overflow-hidden shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${oilColorLight}15, ${oilColor}25)`,
                  border: `1px solid ${oilColor}40`,
                  backdropFilter: 'blur(4px)',
                }}
              >
                {/* Label Content */}
                <div className="px-3 py-3 text-center">
                  {/* Brand */}
                  <div className="text-[8px] tracking-[0.25em] uppercase text-[#c9a227] font-medium mb-0.5">
                    Oil Amor
                  </div>

                  {/* Divider */}
                  <div
                    className="w-8 h-[1px] mx-auto my-1"
                    style={{ background: oilColor }}
                  />

                  {/* Oil Name */}
                  <div className="font-serif text-sm font-bold tracking-wide" style={{ color: oilColorLight }}>
                    LAVENDER
                  </div>

                  {/* Botanical */}
                  <div className="text-[7px] text-[#a69b8a] italic mt-0.5">
                    Lavandula angustifolia
                  </div>

                  {/* Origin */}
                  <div className="flex items-center justify-center gap-1 mt-1.5">
                    <MapPin className="w-2 h-2" style={{ color: oilColor }} />
                    <span className="text-[7px] text-[#a69b8a]">Provence, France</span>
                  </div>

                  {/* Properties */}
                  <div className="flex flex-wrap justify-center gap-1 mt-2">
                    {['Calming', 'Sleep', 'Skin'].map((tag) => (
                      <span
                        key={tag}
                        className="text-[6px] px-1.5 py-0.5 rounded-full uppercase tracking-wider"
                        style={{
                          background: `${oilColor}20`,
                          color: oilColorLight,
                          border: `1px solid ${oilColor}30`,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Crystal */}
                  <div className="flex items-center justify-center gap-1 mt-2">
                    <Gem className="w-2 h-2" style={{ color: oilColor }} />
                    <span className="text-[7px] text-[#a69b8a]">Amethyst • 12 chips</span>
                  </div>

                  {/* Size */}
                  <div className="text-[8px] text-[#a69b8a] mt-2 font-medium">
                    30ml
                  </div>
                </div>
              </div>

              {/* Reflection/Glow */}
              <div
                className="absolute inset-0 rounded-full opacity-20 blur-3xl -z-10"
                style={{ background: `radial-gradient(circle at 50% 50%, ${oilColor}, transparent 70%)` }}
              />
            </div>
          </motion.div>

          {/* Right: Product Info */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-6"
          >
            {/* Title */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: oilColor }}
                />
                <span className="text-xs uppercase tracking-[0.2em] text-[#a69b8a]">
                  Essential Oil
                </span>
              </div>
              <h1 className="font-serif text-5xl font-bold text-[#f5f3ef]">
                Lavender
              </h1>
              <p className="text-[#a69b8a] italic mt-1">Lavandula angustifolia</p>
            </div>

            {/* Description */}
            <p className="text-[#a69b8a] leading-relaxed">
              The queen of essential oils, our Bulgarian lavender is harvested at dawn when its 
              calming compounds peak. Each breath carries the soul of endless purple fields
              dancing in mountain breeze.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: Droplets, label: 'Extraction', value: 'Steam Distillation' },
                { icon: MapPin, label: 'Origin', value: 'Provence, France' },
                { icon: Shield, label: 'Safety', value: 'Pregnancy Safe' },
              ].map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="p-3 rounded-lg border border-[#f5f3ef]/10"
                  style={{ background: `${oilColor}08` }}
                >
                  <Icon className="w-4 h-4 mb-1.5" style={{ color: oilColor }} />
                  <div className="text-[10px] uppercase tracking-wider text-[#a69b8a]">{label}</div>
                  <div className="text-xs font-medium mt-0.5">{value}</div>
                </div>
              ))}
            </div>

            {/* Benefits */}
            <div>
              <h3 className="text-xs uppercase tracking-wider text-[#a69b8a] mb-3 flex items-center gap-2">
                <Sparkles className="w-3 h-3" style={{ color: oilColor }} />
                Therapeutic Benefits
              </h3>
              <div className="flex flex-wrap gap-2">
                {['Anxiety relief', 'Sleep improvement', 'Skin regeneration', 'Emotional balance', 'Headache relief'].map((benefit) => (
                  <span
                    key={benefit}
                    className="px-3 py-1.5 rounded-full text-xs"
                    style={{
                      background: `${oilColor}15`,
                      color: oilColorLight,
                      border: `1px solid ${oilColor}25`,
                    }}
                  >
                    {benefit}
                  </span>
                ))}
              </div>
            </div>

            {/* Price & CTA */}
            <div className="flex items-end gap-4 pt-4 border-t border-[#f5f3ef]/10">
              <div>
                <div className="text-xs text-[#a69b8a] mb-1">30ml Collection Bottle</div>
                <div className="text-3xl font-serif font-bold">$24.95</div>
              </div>
              <button
                className="ml-auto px-8 py-3 rounded-lg text-sm font-medium uppercase tracking-wider transition-all hover:scale-105"
                style={{
                  background: `linear-gradient(135deg, ${oilColor}, ${oilColorDark})`,
                  color: '#fff',
                }}
              >
                Add to Cart
              </button>
            </div>
          </motion.div>
        </div>

        {/* Comparison Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-20 pt-12 border-t border-[#f5f3ef]/10"
        >
          <h2 className="text-center text-xs uppercase tracking-[0.3em] text-[#a69b8a] mb-8">
            Before & After
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Before: Plant Image */}
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-wider text-[#a69b8a] mb-3">Current — Plant Photo</div>
              <div className="relative w-full h-64 rounded-lg overflow-hidden border border-[#f5f3ef]/10">
                <Image
                  src="/images/plants/lavender.jpg"
                  alt="Lavender plant"
                  fill
                  className="object-cover"
                />
              </div>
              <p className="text-xs text-[#a69b8a] mt-2">Beautiful, but doesn&apos;t show what the customer receives</p>
            </div>

            {/* After: Bottle + Label */}
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-wider mb-3" style={{ color: oilColor }}>Proposed — Product Photo</div>
              <div className="relative w-full h-64 rounded-lg overflow-hidden border flex items-center justify-center" style={{ borderColor: `${oilColor}30`, background: `${oilColor}08` }}>
                <div className="relative w-32 h-48">
                  <Image
                    src="/images/bottles/bottle-30ml.webp"
                    alt="Lavender bottle"
                    fill
                    className="object-contain drop-shadow-xl"
                  />
                  {/* Mini label overlay */}
                  <div
                    className="absolute left-1/2 -translate-x-1/2 top-[28%] w-[62%] rounded-sm overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${oilColorLight}20, ${oilColor}30)`,
                      border: `1px solid ${oilColor}50`,
                    }}
                  >
                    <div className="px-1.5 py-1.5 text-center">
                      <div className="text-[6px] tracking-[0.2em] uppercase text-[#c9a227] font-medium">Oil Amor</div>
                      <div className="w-4 h-[1px] mx-auto my-0.5" style={{ background: oilColor }} />
                      <div className="font-serif text-[10px] font-bold tracking-wide" style={{ color: oilColorLight }}>LAVENDER</div>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs mt-2" style={{ color: oilColorLight }}>Shows the actual product the customer will hold</p>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
