import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Returns & Refunds | Oil Amor',
  description: '30-day satisfaction guarantee. Learn about our return policy, refund process, and how to initiate a return.',
}

export default function ReturnsPage() {
  return (
    <div className="min-h-screen bg-[#0a080c]">
      {/* Hero */}
      <section className="relative py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="max-w-2xl">
            <span className="text-[0.625rem] uppercase tracking-[0.3em] text-[#a69b8a] mb-6 block">
              Returns
            </span>
            <h1 className="font-display text-4xl lg:text-6xl text-[#f5f3ef] leading-[1.1] mb-6">
              Our Promise to
              <br />
              <em className="text-[#c9a227] not-italic">You</em>
            </h1>
            <p className="text-[#a69b8a] text-lg leading-relaxed">
              30-day satisfaction guarantee. If you&apos;re not completely happy with your purchase, 
              we&apos;ll make it right.
            </p>
          </div>
        </div>
      </section>

      {/* Policy Overview */}
      <section className="py-12 lg:py-24 border-t border-[#1c181f]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                title: '30-Day Returns',
                desc: 'Return any unopened or gently used product within 30 days of purchase for a full refund.',
                icon: '30',
              },
              {
                title: 'Free Return Shipping',
                desc: 'We provide free return shipping labels for all domestic orders. International returns are at customer cost.',
                icon: '↵',
              },
              {
                title: 'Quick Refunds',
                desc: 'Refunds are processed within 3-5 business days of receiving your return. Original payment method only.',
                icon: '$',
              },
            ].map((item) => (
              <div key={item.title} className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full border border-[#c9a227]/30 flex items-center justify-center">
                  <span className="font-display text-3xl text-[#c9a227]">{item.icon}</span>
                </div>
                <h2 className="font-display text-xl text-[#f5f3ef] mb-3">{item.title}</h2>
                <p className="text-[#a69b8a] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Return Process */}
      <section className="py-12 lg:py-24 border-t border-[#1c181f]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <h2 className="font-display text-2xl text-[#f5f3ef] mb-12 text-center">
            How to Return
          </h2>
          
          <div className="max-w-3xl mx-auto">
            {[
              {
                step: '01',
                title: 'Contact Us',
                desc: 'Email hello@oilamor.com with your order number and reason for return. We\'ll respond within 24 hours with a return authorization.',
              },
              {
                step: '02',
                title: 'Package Your Return',
                desc: 'Securely pack the items in the original packaging if possible. Include the return authorization form we email you.',
              },
              {
                step: '03',
                title: 'Ship Your Return',
                desc: 'Use the prepaid shipping label we provide (domestic orders). Drop off at any post office or schedule a pickup.',
              },
              {
                step: '04',
                title: 'Receive Refund',
                desc: 'Once we receive and inspect your return, we\'ll process your refund within 3-5 business days to your original payment method.',
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-6 mb-8 last:mb-0">
                <span className="font-display text-5xl text-[#c9a227]/20 flex-shrink-0 w-20">
                  {item.step}
                </span>
                <div>
                  <h3 className="text-[#f5f3ef] text-lg mb-2">{item.title}</h3>
                  <p className="text-[#a69b8a] leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Conditions */}
      <section className="py-12 lg:py-24 border-t border-[#1c181f]">
        <div className="max-w-7xl mx-auto px-px-6 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
            <div>
              <h2 className="font-display text-2xl text-[#f5f3ef] mb-6">
                Return Conditions
              </h2>
              <ul className="space-y-4 text-[#a69b8a]">
                {[
                  'Items must be returned within 30 days of purchase',
                  'Products must be in original condition (unopened or gently used)',
                  'Crystal jewelry must be unworn with original packaging',
                  'Sale items are final sale unless defective',
                  'Gift cards cannot be returned',
                  'Shipping costs are non-refundable unless item is defective',
                ].map((condition) => (
                  <li key={condition} className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#c9a227] mt-2 flex-shrink-0" />
                    {condition}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="font-display text-2xl text-[#f5f3ef] mb-6">
                Exchanges
              </h2>
              <p className="text-[#a69b8a] leading-relaxed mb-4">
                We don&apos;t offer direct exchanges. Instead, please return the unwanted item for a refund 
                and place a new order for the item you&apos;d like.
              </p>
              <p className="text-[#a69b8a] leading-relaxed">
                This ensures you get your new item quickly while we process your return separately.
              </p>

              <h3 className="font-display text-xl text-[#f5f3ef] mt-8 mb-4">
                Damaged or Defective Items
              </h3>
              <p className="text-[#a69b8a] leading-relaxed">
                If your order arrives damaged or defective, please contact us immediately at 
                hello@oilamor.com with photos. We&apos;ll send a replacement at no cost and provide 
                a prepaid return label for the damaged item.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Refill Program */}
      <section className="py-12 lg:py-24 border-t border-[#1c181f]">
        <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center">
          <h2 className="font-display text-2xl text-[#f5f3ef] mb-4">
            Prefer not to return?
          </h2>
          <p className="text-[#a69b8a] mb-6">
            If your oil isn&apos;t quite right, consider our refill program. You can exchange your 
            remaining oil for a different scent, or simply refill your Miron bottle at a discount.
          </p>
          <a href="/refill" className="btn-luxury">
            Learn About Refills
          </a>
        </div>
      </section>

    </div>
  )
}
