import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Shipping Information | Oil Amor',
  description: 'Free shipping on orders over $150. Learn about our shipping options, delivery times, and international shipping policies.',
}

export default function ShippingPage() {
  return (
    <div className="min-h-screen bg-[#0a080c]">
      {/* Hero */}
      <section className="relative py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="max-w-2xl">
            <span className="text-[0.625rem] uppercase tracking-[0.3em] text-[#a69b8a] mb-6 block">
              Shipping
            </span>
            <h1 className="font-display text-4xl lg:text-6xl text-[#f5f3ef] leading-[1.1] mb-6">
              Delivery
              <br />
              <em className="text-[#c9a227] not-italic">Information</em>
            </h1>
            <p className="text-[#a69b8a] text-lg leading-relaxed">
              Free shipping on all orders over $150. Carefully packaged and delivered to your door.
            </p>
          </div>
        </div>
      </section>

      {/* Shipping Options */}
      <section className="py-12 lg:py-24 border-t border-[#1c181f]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                title: 'Standard Shipping',
                price: '$10',
                free: 'Free over $150',
                time: '3-5 business days',
                features: ['Tracking included', 'Signature on delivery', 'Carefully packaged'],
              },
              {
                title: 'Express Shipping',
                price: '$20',
                free: 'Free over $300',
                time: '1-2 business days',
                features: ['Priority handling', 'Tracking included', 'Signature on delivery'],
              },
              {
                title: 'International',
                price: 'Calculated',
                free: 'Free over $500',
                time: '7-14 business days',
                features: ['Duties calculated', 'Full tracking', 'Insured delivery'],
              },
            ].map((option) => (
              <div key={option.title} className="bg-[#141218] border border-[#262228] p-8">
                <h2 className="font-display text-xl text-[#f5f3ef] mb-2">{option.title}</h2>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl text-[#c9a227]">{option.price}</span>
                  <span className="text-[#a69b8a] text-sm">{option.free}</span>
                </div>
                <p className="text-[#f5f3ef] mb-4">{option.time}</p>
                <ul className="space-y-2">
                  {option.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-[#a69b8a] text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#c9a227]" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Processing */}
      <section className="py-12 lg:py-24 border-t border-[#1c181f]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="max-w-3xl">
            <h2 className="font-display text-2xl text-[#f5f3ef] mb-6">
              Order Processing
            </h2>
            <div className="space-y-6 text-[#a69b8a] leading-relaxed">
              <p>
                Orders placed before 2pm AEST on business days are processed and shipped the same day. 
                Orders placed after 2pm or on weekends will be processed the next business day.
              </p>
              <p>
                During peak periods (holidays, promotions), processing may take an additional 1-2 business days. 
                We&apos;ll always notify you if there are any delays with your order.
              </p>
            </div>

            <div className="mt-12 grid md:grid-cols-3 gap-6">
              {[
                { step: '01', title: 'Order Placed', desc: 'You receive confirmation email' },
                { step: '02', title: 'Processing', desc: 'We prepare your order' },
                { step: '03', title: 'Shipped', desc: 'Tracking number sent' },
              ].map((s) => (
                <div key={s.step} className="text-center">
                  <span className="font-display text-5xl text-[#c9a227]/20">{s.step}</span>
                  <h3 className="text-[#f5f3ef] mt-2 mb-1">{s.title}</h3>
                  <p className="text-[#a69b8a] text-sm">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Packaging */}
      <section className="py-12 lg:py-24 border-t border-[#1c181f]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <h2 className="font-display text-2xl text-[#f5f3ef] mb-6">
                Sustainable Packaging
              </h2>
              <div className="space-y-4 text-[#a69b8a] leading-relaxed">
                <p>
                  Every Oil Amor order is carefully packaged with sustainability in mind. 
                  We use plastic-free, recyclable, and compostable materials.
                </p>
                <ul className="space-y-3">
                  {[
                    'Miron Violetglass bottles wrapped in biodegradable tissue',
                    'Protective cushioning from recycled paper',
                    'FSC-certified cardboard boxes',
                    'Seed paper cards that you can plant',
                    'Return your packaging for account credit',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#c9a227] mt-2 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="aspect-square bg-[#141218] border border-[#262228] flex items-center justify-center">
              <span className="font-display text-9xl text-[#c9a227]/20 italic">P</span>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Teaser */}
      <section className="py-12 lg:py-24 border-t border-[#1c181f]">
        <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center">
          <h2 className="font-display text-2xl text-[#f5f3ef] mb-4">
            Questions about shipping?
          </h2>
          <p className="text-[#a69b8a] mb-6">
            Find answers to common shipping questions in our FAQ or contact our support team.
          </p>
          <div className="flex gap-4 justify-center">
            <a href="/faq" className="btn-luxury-dark">
              View FAQ
            </a>
            <a href="/contact" className="btn-luxury">
              Contact Us
            </a>
          </div>
        </div>
      </section>

    </div>
  )
}
