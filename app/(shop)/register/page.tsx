'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  User,
  ArrowRight,
  Crown,
  CheckCircle
} from 'lucide-react'
import { useUser } from '@/lib/context/user-context'
import { logger } from '@/lib/logging/logger'

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [acceptMarketing, setAcceptMarketing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { login } = useUser()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // Create account via API
      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          firstName,
          lastName,
          password,
          acceptMarketing,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        logger.error('[Register] API Error', new Error(JSON.stringify(data)))
        throw new Error(data.error || data.details || `Server error: ${response.status}`)
      }

      // Auto-login after registration
      await login(email, password)
      router.push('/account')
    } catch (err: any) {
      setError(err.message || 'Failed to create account')
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#0a080c] pt-32 pb-16">
      <div className="max-w-md mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-[#c9a227]/10 border border-[#c9a227]/30 flex items-center justify-center mx-auto mb-4">
            <Crown className="w-8 h-8 text-[#c9a227]" />
          </div>
          <h1 className="font-serif text-3xl text-[#f5f3ef] mb-2">Create Account</h1>
          <p className="text-[#a69b8a]">Join the Oil Amor collective</p>
        </div>

        {/* Register Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl bg-[#111] border border-[#f5f3ef]/10"
        >
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[#a69b8a] mb-2">First Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a69b8a]" />
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jane"
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#0a080c] border border-[#f5f3ef]/10 text-[#f5f3ef] placeholder:text-[#a69b8a]/50 focus:border-[#c9a227] focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-[#a69b8a] mb-2">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  className="w-full px-4 py-3 rounded-xl bg-[#0a080c] border border-[#f5f3ef]/10 text-[#f5f3ef] placeholder:text-[#a69b8a]/50 focus:border-[#c9a227] focus:outline-none transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-[#a69b8a] mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a69b8a]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#0a080c] border border-[#f5f3ef]/10 text-[#f5f3ef] placeholder:text-[#a69b8a]/50 focus:border-[#c9a227] focus:outline-none transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-[#a69b8a] mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a69b8a]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  className="w-full pl-12 pr-12 py-3 rounded-xl bg-[#0a080c] border border-[#f5f3ef]/10 text-[#f5f3ef] placeholder:text-[#a69b8a]/50 focus:border-[#c9a227] focus:outline-none transition-colors"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#a69b8a] hover:text-[#f5f3ef] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-[#a69b8a] mt-2">
                Must be at least 8 characters
              </p>
            </div>

            <label className="flex items-start gap-3 text-sm text-[#a69b8a] cursor-pointer">
              <input 
                type="checkbox" 
                checked={acceptMarketing}
                onChange={(e) => setAcceptMarketing(e.target.checked)}
                className="mt-0.5 rounded bg-[#0a080c] border-[#f5f3ef]/20" 
              />
              <span>
                Send me exclusive offers, unique gift ideas, and personalized tips for shopping on Oil Amor.
              </span>
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-[#c9a227] text-[#0a080c] font-medium hover:bg-[#f5f3ef] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? 'Creating account...' : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>


        </motion.div>

        {/* Login Link */}
        <p className="text-center text-[#a69b8a] mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-[#c9a227] hover:underline">
            Sign in
          </Link>
        </p>

        {/* Benefits */}
        <div className="mt-12 grid grid-cols-3 gap-4 text-center">
          <div>
            <CheckCircle className="w-6 h-6 text-[#2ecc71] mx-auto mb-2" />
            <p className="text-xs text-[#a69b8a]">Unlock refills</p>
          </div>
          <div>
            <CheckCircle className="w-6 h-6 text-[#2ecc71] mx-auto mb-2" />
            <p className="text-xs text-[#a69b8a]">Track orders</p>
          </div>
          <div>
            <CheckCircle className="w-6 h-6 text-[#2ecc71] mx-auto mb-2" />
            <p className="text-xs text-[#a69b8a]">Earn rewards</p>
          </div>
        </div>

        {/* Back Link */}
        <Link 
          href="/"
          className="block text-center text-sm text-[#a69b8a] hover:text-[#f5f3ef] mt-8 transition-colors"
        >
          ← Back to home
        </Link>
      </div>
    </main>
  )
}
