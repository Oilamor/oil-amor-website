import { Metadata } from 'next'
import { ContactForm } from './ContactForm'

export const metadata: Metadata = {
  title: 'Contact Us | Oil Amor',
  description: 'Get in touch with Oil Amor. Visit our atelier at 132 Colorado Dr, Blue Haven, NSW, call 0457189685, or email official.oilamor@gmail.com.',
  openGraph: {
    title: 'Contact Us | Oil Amor',
    description: 'Get in touch with Oil Amor.',
  },
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#0a080c]">
      {/* Hero */}
      <section className="relative py-24 lg:py-40 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#c9a227]/5 rounded-full blur-[120px] opacity-60" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[#a69b8a]/5 rounded-full blur-[100px] opacity-40" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 lg:px-12">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 text-[0.625rem] uppercase tracking-[0.3em] text-[#c9a227] mb-6">
              <span className="w-8 h-px bg-[#c9a227]" />
              Contact
            </span>
            <h1 className="font-display text-5xl lg:text-7xl text-[#f5f3ef] leading-[1.05] mb-8">
              Let&apos;s create
              <br />
              <em className="text-[#c9a227] not-italic">something beautiful</em>
            </h1>
            <p className="text-[#a69b8a] text-xl leading-relaxed max-w-2xl">
              Whether you&apos;re seeking guidance on a custom blend, tracking an order, 
              or exploring a wholesale partnership — we&apos;re here to help.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Cards */}
      <section className="relative py-16 lg:py-24 border-t border-[#1c181f]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {/* Email Card */}
            <a 
              href="mailto:official.oilamor@gmail.com"
              className="group p-8 rounded-2xl bg-[#111] border border-[#262228] hover:border-[#c9a227]/30 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-xl bg-[#c9a227]/10 flex items-center justify-center mb-6 group-hover:bg-[#c9a227]/20 transition-colors">
                <svg className="w-5 h-5 text-[#c9a227]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <h3 className="text-[0.625rem] uppercase tracking-[0.2em] text-[#a69b8a] mb-2">Email</h3>
              <p className="text-[#f5f3ef] text-lg font-medium mb-1 group-hover:text-[#c9a227] transition-colors">
                official.oilamor@gmail.com
              </p>
              <p className="text-[#a69b8a] text-sm">We typically respond within 24 hours</p>
            </a>

            {/* Phone Card */}
            <a 
              href="tel:0457189685"
              className="group p-8 rounded-2xl bg-[#111] border border-[#262228] hover:border-[#c9a227]/30 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-xl bg-[#c9a227]/10 flex items-center justify-center mb-6 group-hover:bg-[#c9a227]/20 transition-colors">
                <svg className="w-5 h-5 text-[#c9a227]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-7.5-1.875a2.25 2.25 0 00-2.25.63l-2.625 2.625a19.305 19.305 0 01-6.375-6.375l2.625-2.625a2.25 2.25 0 00.63-2.25L4.26 4.5c-.125-.5-.575-.852-1.091-.852H1.5A2.25 2.25 0 00-.75 6v2.25c0 1.5.3 2.94.84 4.26" />
                </svg>
              </div>
              <h3 className="text-[0.625rem] uppercase tracking-[0.2em] text-[#a69b8a] mb-2">Phone</h3>
              <p className="text-[#f5f3ef] text-lg font-medium mb-1 group-hover:text-[#c9a227] transition-colors">
                0457 189 685
              </p>
              <p className="text-[#a69b8a] text-sm">Mon-Fri, 9am-5pm AEST</p>
            </a>

            {/* Address Card */}
            <div className="group p-8 rounded-2xl bg-[#111] border border-[#262228] hover:border-[#c9a227]/30 transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-[#c9a227]/10 flex items-center justify-center mb-6 group-hover:bg-[#c9a227]/20 transition-colors">
                <svg className="w-5 h-5 text-[#c9a227]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
              </div>
              <h3 className="text-[0.625rem] uppercase tracking-[0.2em] text-[#a69b8a] mb-2">Atelier</h3>
              <address className="not-italic text-[#f5f3ef] text-lg font-medium mb-1 leading-relaxed">
                132 Colorado Dr<br />
                Blue Haven, NSW 2262
              </address>
              <p className="text-[#a69b8a] text-sm">By appointment only</p>
            </div>
          </div>
        </div>
      </section>

      {/* Form + Map Section */}
      <section className="py-12 lg:py-24 border-t border-[#1c181f]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-5 gap-12 lg:gap-16">
            {/* Contact Form */}
            <div className="lg:col-span-3">
              <div className="mb-8">
                <h2 className="font-display text-3xl text-[#f5f3ef] mb-3">
                  Send us a message
                </h2>
                <p className="text-[#a69b8a]">
                  Have a question? Fill out the form below and we&apos;ll get back to you as soon as possible.
                </p>
              </div>
              <ContactForm />
            </div>

            {/* Sidebar Info */}
            <div className="lg:col-span-2 space-y-8">
              {/* Business Hours */}
              <div className="p-6 rounded-2xl bg-[#111] border border-[#262228]">
                <h3 className="font-display text-xl text-[#f5f3ef] mb-4">Business Hours</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#a69b8a]">Monday — Friday</span>
                    <span className="text-[#f5f3ef]">9:00am — 5:00pm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#a69b8a]">Saturday</span>
                    <span className="text-[#f5f3ef]">10:00am — 2:00pm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#a69b8a]">Sunday</span>
                    <span className="text-[#f5f3ef]">Closed</span>
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="p-6 rounded-2xl bg-[#111] border border-[#262228]">
                <h3 className="font-display text-xl text-[#f5f3ef] mb-4">Follow Along</h3>
                <div className="flex flex-wrap gap-3">
                  {['Instagram', 'Pinterest', 'TikTok'].map((social) => (
                    <a
                      key={social}
                      href={`https://${social.toLowerCase()}.com/oilamor`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-full border border-[#262228] text-[#f5f3ef] text-sm hover:border-[#c9a227]/50 hover:text-[#c9a227] transition-colors"
                    >
                      {social}
                    </a>
                  ))}
                </div>
              </div>

              {/* Quick Links */}
              <div className="p-6 rounded-2xl bg-[#111] border border-[#262228]">
                <h3 className="font-display text-xl text-[#f5f3ef] mb-4">Quick Links</h3>
                <div className="space-y-2">
                  <a href="/faq" className="block text-[#a69b8a] hover:text-[#c9a227] transition-colors text-sm">Frequently Asked Questions</a>
                  <a href="/shipping" className="block text-[#a69b8a] hover:text-[#c9a227] transition-colors text-sm">Shipping Information</a>
                  <a href="/returns" className="block text-[#a69b8a] hover:text-[#c9a227] transition-colors text-sm">Returns & Refills</a>
                  <a href="/track-order" className="block text-[#a69b8a] hover:text-[#c9a227] transition-colors text-sm">Track Your Order</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Embedded Map */}
      <section className="relative h-[400px] lg:h-[500px] border-t border-[#1c181f]">
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3345.670612593317!2d151.4923453154599!3d-33.21876598083642!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x6b733e9f0b4e8f1f%3A0x3e6f8e8e8e8e8e8e!2s132%20Colorado%20Dr%2C%20Blue%20Haven%20NSW%202262!5e0!3m2!1sen!2sau!4v1699999999999!5m2!1sen!2sau"
          width="100%"
          height="100%"
          style={{ border: 0, filter: 'grayscale(100%) invert(92%) contrast(83%)' }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Oil Amor Atelier Location"
          className="absolute inset-0"
        />
        {/* Map overlay card */}
        <div className="absolute bottom-6 left-6 lg:bottom-10 lg:left-12 max-w-sm p-6 rounded-2xl bg-[#0a080c]/90 backdrop-blur-md border border-[#262228]">
          <h3 className="font-display text-lg text-[#f5f3ef] mb-1">Oil Amor Atelier</h3>
          <p className="text-[#a69b8a] text-sm">132 Colorado Dr, Blue Haven, NSW 2262</p>
        </div>
      </section>

      {/* FAQ CTA */}
      <section className="py-16 lg:py-24 border-t border-[#1c181f]">
        <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center">
          <h2 className="font-display text-3xl text-[#f5f3ef] mb-4">
            Quick answers
          </h2>
          <p className="text-[#a69b8a] mb-8 max-w-xl mx-auto">
            Find immediate answers to common questions about orders, shipping, returns, and our Forever Bottle program.
          </p>
          <a 
            href="/faq" 
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full border border-[#c9a227]/30 text-[#c9a227] font-medium hover:bg-[#c9a227]/10 transition-colors"
          >
            View FAQ
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </section>

    </div>
  )
}
