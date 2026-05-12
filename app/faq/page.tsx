import { Metadata } from 'next'
import { FAQAccordion } from './FAQAccordion'

export const metadata: Metadata = {
  title: 'FAQ | Oil Amor',
  description: 'Find answers to frequently asked questions about Oil Amor products, shipping, returns, and more.',
}

const faqCategories = [
  {
    name: 'General',
    questions: [
      {
        q: 'What makes Oil Amor different from other essential oil brands?',
        a: 'Oil Amor is the first essential oil collection designed to transcend consumption. Each bottle is crafted from Miron Violetglass and contains ethically-sourced crystal chips with drilled holes. When your oil is finished, the crystals can be threaded into jewelry — creating a personal talisman scented with your journey.',
      },
      {
        q: 'Are your oils pure and organic?',
        a: 'Yes, all our oils are 100% pure, therapeutic-grade essential oils. Many are certified organic, and all are sourced from sustainable farms and distilleries we have direct relationships with. We provide full traceability for every oil in our collection.',
      },
      {
        q: 'What is Miron Violetglass?',
        a: 'Miron Violetglass is a unique biophotonic glass that filters out harmful light while allowing beneficial violet and infrared rays to penetrate. This protects and enhances the potency of your oil, extending its shelf life while creating a beautiful object.',
      },
      {
        q: 'Where do you source your crystals?',
        a: 'Our crystals are ethically sourced from certified mines around the world. Each crystal is inspected, cleansed, and precision-drilled with a 1mm hole for threading. We prioritize fair trade practices and sustainable mining.',
      },
    ],
  },
  {
    name: 'Products',
    questions: [
      {
        q: 'How do I choose the right oil and crystal pairing?',
        a: 'Each oil in our collection has recommended crystal pairings based on energetic resonance. You can follow our suggestions or choose intuitively. Our product pages detail the properties of each oil-crystal combination to help guide your selection.',
      },
      {
        q: 'What sizes do your bottles come in?',
        a: 'We offer three bottle sizes: 5ml (with 3 crystals), 15ml (with 7 crystals), and 30ml (with 12 crystals). Larger bottles contain more crystals for more elaborate jewelry creations.',
      },
      {
        q: 'How long do the oils last?',
        a: 'Stored in Miron Violetglass, our oils maintain their potency for 2-3 years. The violet glass naturally preserves the oil by filtering harmful light while allowing beneficial rays to penetrate.',
      },
      {
        q: 'Can I buy replacement crystals?',
        a: 'Yes, we offer individual crystals and crystal sets in our Accessories section. These are perfect for adding to your collection or replacing any lost stones.',
      },
    ],
  },
  {
    name: 'Orders & Shipping',
    questions: [
      {
        q: 'How much is shipping?',
        a: 'We offer free standard shipping on all orders over $150. Standard shipping is $10, and express shipping is $20. International shipping is calculated at checkout based on your location.',
      },
      {
        q: 'How long will my order take to arrive?',
        a: 'Standard shipping takes 3-5 business days within Australia. Express shipping takes 1-2 business days. International orders typically arrive within 7-14 business days.',
      },
      {
        q: 'Do you ship internationally?',
        a: 'Yes, we ship worldwide. International shipping rates are calculated at checkout. Please note that international orders may be subject to customs duties and taxes.',
      },
      {
        q: 'How can I track my order?',
        a: 'Once your order ships, you\'ll receive an email with tracking information. You can also track your order by logging into your account and viewing your order history.',
      },
    ],
  },
  {
    name: 'Returns',
    questions: [
      {
        q: 'What is your return policy?',
        a: 'We offer a 30-day satisfaction guarantee. If you\'re not happy with your purchase, you can return unopened or gently used products within 30 days for a full refund. Sale items are final sale.',
      },
      {
        q: 'How do I start a return?',
        a: 'Email hello@oilamor.com with your order number and reason for return. We\'ll provide a return authorization and prepaid shipping label (domestic orders). Process your return within 3-5 business days of receiving your items.',
      },
      {
        q: 'When will I receive my refund?',
        a: 'Refunds are processed within 3-5 business days of receiving your return. The refund will appear on your original payment method within 5-10 business days, depending on your bank.',
      },
    ],
  },
  {
    name: 'Crystals & Jewelry',
    questions: [
      {
        q: 'How do I make jewelry from my crystals?',
        a: 'Each bottle includes silk cord and instructions for threading your crystals. Simply remove the crystals from the bottle, thread them in your desired pattern, and tie off. Create bracelets, necklaces, or anklets.',
      },
      {
        q: 'Will the crystals retain the oil scent?',
        a: 'Yes, crystals are porous and will retain a subtle scent of the oil they were infused with. This creates a personal aromatherapy experience that lasts for months. You can refresh the scent with a drop of the same oil.',
      },
      {
        q: 'Can I add my own crystals to the bottle?',
        a: 'We recommend using only our drilled crystals to ensure they can be properly threaded later. However, you can certainly add your own crystals to your finished jewelry pieces.',
      },
      {
        q: 'How do I care for my crystal jewelry?',
        a: 'Crystal jewelry should be treated gently. Remove before swimming or showering. Clean with a soft cloth. Avoid exposure to harsh chemicals. Store in a soft pouch when not wearing.',
      },
    ],
  },
  {
    name: 'Refill Program',
    questions: [
      {
        q: 'How does the refill program work?',
        a: 'Bring your empty Miron bottle to our Central Coast atelier or mail it to us. We\'ll refill it with your chosen oil at a discount. Members of The Circle receive additional savings on refills.',
      },
      {
        q: 'Do I need to clean the bottle before refilling?',
        a: 'We recommend gently rinsing the bottle with warm water and allowing it to dry completely before refilling. This prevents mixing of different oil scents.',
      },
      {
        q: 'Can I switch to a different oil when I refill?',
        a: 'Yes, you can choose any oil from our collection for your refill. We recommend thoroughly cleaning the bottle if switching between significantly different scents.',
      },
    ],
  },
]

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-[#0a080c]">
      {/* Hero */}
      <section className="relative py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 text-center">
          <span className="text-[0.625rem] uppercase tracking-[0.3em] text-[#a69b8a] mb-6 block">
            Support
          </span>
          <h1 className="font-display text-4xl lg:text-6xl text-[#f5f3ef] leading-[1.1] mb-6">
            Frequently Asked
            <br />
            <em className="text-[#c9a227] not-italic">Questions</em>
          </h1>
          <p className="text-[#a69b8a] text-lg max-w-2xl mx-auto">
            Find answers to common questions about our products, orders, shipping, and more.
          </p>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-12 lg:py-24 border-t border-[#1c181f]">
        <div className="max-w-4xl mx-auto px-6 lg:px-12">
          <FAQAccordion categories={faqCategories} />
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-12 lg:py-24 border-t border-[#1c181f]">
        <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center">
          <h2 className="font-display text-2xl text-[#f5f3ef] mb-4">
            Still have questions?
          </h2>
          <p className="text-[#a69b8a] mb-6">
            Can&apos;t find the answer you&apos;re looking for? Our team is here to help.
          </p>
          <a href="/contact" className="btn-luxury">
            Contact Us
          </a>
        </div>
      </section>

    </div>
  )
}
