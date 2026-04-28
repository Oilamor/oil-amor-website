'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Beaker, 
  Droplets, 
  Percent, 
  Sparkles, 
  Save, 
  Share2, 
  RotateCcw,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  FlaskConical,
  Shield,
  History,
  BookOpen,
  Plus,
  Minus,
  Scroll,
  Gem,
  Search,
  Info,
  Crown,
  Star,
  Zap,
  Leaf,
  Wind,
  Download,
  ExternalLink,
  X,
  ShoppingCart,
  Lightbulb,
  Heart,
  AlertTriangle,
  Pill,
  User,
  ChevronDown,
  ChevronUp,
  Tag,
  Sun,
  Baby,
  Wine,
  Activity,
  AlertOctagon,
  Stethoscope,
  CheckSquare,
  Square,
  PieChart,
  Palette,
  FileText,
  Send,
  Copy,
  Brain,
  Globe,
  Award,
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

// Context
import { useHealthProfile } from '@/lib/context/health-profile-context'
import { useRecipes } from '@/lib/context/recipe-context'
import { useUser } from '@/lib/context/user-context'
import { useCart } from '@/app/hooks/use-cart'

// Safety System
import { 
  validateOilMix, 
  MixValidationResult, 
  MixComponent,
} from '@/lib/safety'
import { 
  validateMixSafety,
  SafetyValidationResult,
  OilComponent,
  ExperienceLevel,
  UserSafetyProfile,
  getWarningMessage,
  SafetyWarning,
  RiskLevel,
} from '@/lib/safety/comprehensive-safety-v2'
import { AGE_DOSAGE_LIMITS } from '@/lib/safety/medication-database'
import { 
  getInteractionsForMix, 
  hasCriticalInteraction,
  OilInteraction,
  SYNERGISTIC_COMBINATIONS,
} from '@/lib/safety/oil-interactions'

// Components
import { HealthProfileForm } from '@/components/mixing/HealthProfileForm'
import { SafetySummary } from '@/components/mixing/SafetySummary'
import { cn } from '@/lib/utils'

// Atelier data - all 17 collection oils
import { 
  ATELIER_OILS, 
  ATELIER_CRYSTALS,
  calculateAtelierPrice,
  formatPrice as formatAtelierPrice,
  suggestCrystals,
  getAllCrystals,
  AtelierOil,
} from '@/lib/atelier/atelier-engine'

// Cord & Revelation Systems
import { 
  SIMPLE_CORD_OPTIONS, 
  DEFAULT_SIMPLE_CORD, 
  getSimpleCordById,
  SimpleCordOption,
} from '@/lib/atelier/cord-data-simple'

// Living Blend Codex
import { LivingBlendCodex, BlendCodex } from '@/lib/atelier/living-blend-codex'
import { LivingBlendCodex as LivingBlendCodexModal } from '@/components/mixing/LivingBlendCodex'

// Oil Wisdom
import { 
  OIL_WISDOM, 
  OIL_CATEGORIES, 
  getOilWisdom, 
  getOilCategories,
  OilCategory,
} from '@/lib/atelier/oil-wisdom'

// Pricing
import { CRYSTAL_COUNTS } from '@/lib/content/pricing-engine-final'

// Types
import { AddToCartInput } from '@/lib/cart/types'

const AVAILABLE_OILS = ATELIER_OILS

const CARRIER_RATIOS = [5, 10, 15, 25, 50, 75] as const

// ============================================================================
// CARRIER RATIO GUIDANCE
// ============================================================================

interface RatioGuidance {
  label: string
  description: string
  bestFor: string[]
  experience: 'beginner' | 'intermediate' | 'advanced'
  safetyAdvice: string
  typicalUses: string[]
  childrenSafe: boolean
  pregnancySafe: boolean
}

// Essential oil concentration (5% = 5% essential, 95% carrier)
const RATIO_GUIDANCE: Record<number, RatioGuidance> = {
  5: {
    label: 'Delicate',
    description: 'Ultra-gentle dilution for facial care and sensitive skin.',
    bestFor: ['Facial care', 'Children over 6', 'Daily use', 'Sensitive skin'],
    experience: 'beginner',
    safetyAdvice: 'Safe for children 6+, facial application, and sensitive skin. Patch test recommended.',
    typicalUses: ['Daily facial serums', 'Children\'s wellness blends', 'Sensitive skin care', 'Eye area treatments'],
    childrenSafe: true,
    pregnancySafe: true
  },
  10: {
    label: 'Gentle',
    description: 'Mild dilution perfect for regular, everyday wellness.',
    bestFor: ['Full body massage', 'Daily maintenance', 'Preventive care'],
    experience: 'beginner',
    safetyAdvice: 'Ideal for daily use. Safe for most adults. Patch test for sensitive individuals.',
    typicalUses: ['Full body massage oils', 'Daily aromatherapy', 'Preventive wellness', 'Long-term use'],
    childrenSafe: true,
    pregnancySafe: true
  },
  15: {
    label: 'Balanced',
    description: 'Moderate therapeutic strength for targeted support.',
    bestFor: ['Specific concerns', 'Occasional use', 'Aromatic wearables'],
    experience: 'intermediate',
    safetyAdvice: 'Use for specific concerns. Limit to 2-3 weeks continuous use. Take breaks.',
    typicalUses: ['Targeted muscle relief', 'Aromatic jewellery', 'Occasional stress support', 'Sleep blends'],
    childrenSafe: false,
    pregnancySafe: true
  },
  25: {
    label: 'Therapeutic',
    description: 'Concentrated strength for active therapeutic intervention.',
    bestFor: ['Acute concerns', 'Short-term use', 'Localized application'],
    experience: 'intermediate',
    safetyAdvice: 'For acute issues only. Use 7-10 days maximum. Avoid sensitive areas. Not for children.',
    typicalUses: ['Acute pain relief', 'Cold & flu support', 'Injury recovery', 'Intensive treatment'],
    childrenSafe: false,
    pregnancySafe: false
  },
  50: {
    label: 'Intensive',
    description: 'High concentration for experienced practitioners.',
    bestFor: ['Professional use', 'Short duration', 'Specific protocols'],
    experience: 'advanced',
    safetyAdvice: 'Expert use only. 3-5 days maximum. Professional guidance recommended. Adults only.',
    typicalUses: ['Clinical aromatherapy', 'Advanced protocols', 'Emergency intervention', 'Professional treatment'],
    childrenSafe: false,
    pregnancySafe: false
  },
  75: {
    label: 'Maximum',
    description: 'Maximum therapeutic concentration. Expert use only.',
    bestFor: ['Expert use only', 'Very short term', 'Emergency support'],
    experience: 'advanced',
    safetyAdvice: 'Maximum strength. 1-2 applications only. Risk of sensitization. Professional supervision required.',
    typicalUses: ['Emergency therapeutic use', 'Severe acute conditions', 'Single application treatment'],
    childrenSafe: false,
    pregnancySafe: false
  }
}
const BOTTLE_SIZES = [5, 10, 15, 20, 30] as const

// Carrier Oil Options
// ============================================================================
// CARRIER OILS - CURATED SELECTION
// Only the two finest carriers for optimal results
// ============================================================================

const CARRIER_OILS = [
  { 
    id: 'jojoba', 
    name: 'Jojoba Oil', 
    shortDescription: 'Golden liquid wax - skin\'s perfect match',
    description: 'Golden liquid wax ester. Molecularly identical to human sebum (98% match). The only plant source of liquid wax esters.', 
    color: '#d4a574', 
    benefits: ['Balances sebum production', 'Non-comedogenic', 'Indefinite shelf life', 'Facial care superior'],
    scientificFact: 'Simmondsia chinensis - liquid wax esters, not a true oil',
    bestFor: ['Facial application', 'Acne-prone skin', 'Balancing oil production', 'Daily face serums'],
    texture: 'Silky, medium absorption',
    skinType: 'All skin types - especially oily/acne-prone',
  },
  { 
    id: 'fractionated-coconut', 
    name: 'Fractionated Coconut Oil', 
    shortDescription: 'Lightweight & odorless - never solidifies',
    description: 'Fractionated coconut oil stays liquid at any temperature. Completely odorless and colorless - won\'t compete with your blend\'s aroma.', 
    color: '#f8f8f8', 
    benefits: ['Never solidifies', 'Completely odorless', 'Fast absorption', 'Won\'t stain fabrics'],
    scientificFact: 'Long-chain fatty acids removed - Caprylic/Capric triglycerides only',
    bestFor: ['Full body massage', 'Sensitive skin', 'Hot climates', 'Large area application'],
    texture: 'Featherlight, fast absorption',
    skinType: 'All skin types - especially sensitive',
  },
] as const

// ============================================================================
// CARRIER OIL EDUCATION CONTENT
// ============================================================================

interface CarrierOilEducation {
  title: string
  content: string
  highlight?: string
}

const CARRIER_EDUCATION: Record<string, CarrierOilEducation> = {
  jojoba: {
    title: 'Why Jojoba is Different',
    content: 'Unlike any other plant oil, Jojoba is a liquid wax ester. Its molecular structure is 98% identical to human sebum (skin\'s natural oil). When applied, your skin recognizes it as its own, making it uniquely balancing.',
    highlight: 'The only plant source of liquid wax esters on Earth',
  },
  'fractionated-coconut': {
    title: 'The Science of Fractionation',
    content: 'Regular coconut oil contains long-chain fatty acids that solidify below 24°C. Fractionation removes these, leaving only medium-chain triglycerides (Caprylic and Capric acids). The result? A stable liquid that never solidifies, with enhanced antimicrobial properties.',
    highlight: 'Stays liquid from -20°C to 100°C',
  },
}

const CARRIER_COMPARISON = [
  { feature: 'Molecular Type', jojoba: 'Liquid Wax Ester', coconut: 'Fractionated Triglyceride', winner: null as 'jojoba' | 'coconut' | null },
  { feature: 'Skin Similarity', jojoba: '98% match to sebum', coconut: 'Highly compatible', winner: 'jojoba' as const },
  { feature: 'Texture', jojoba: 'Silky, luxurious', coconut: 'Featherlight, dry', winner: null as 'jojoba' | 'coconut' | null },
  { feature: 'Absorption', jojoba: 'Medium (sustained)', coconut: 'Fast (quick)', winner: null as 'jojoba' | 'coconut' | null },
  { feature: 'Scent', jojoba: 'Subtle nutty', coconut: 'Completely odorless', winner: null as 'jojoba' | 'coconut' | null },
  { feature: 'Best For Face', jojoba: '★★★★★ Superior', coconut: '★★★★☆ Good', winner: 'jojoba' as const },
  { feature: 'Best For Body', jojoba: '★★★★☆ Excellent', coconut: '★★★★★ Superior', winner: 'coconut' as const },
  { feature: 'Climate Stability', jojoba: 'Always liquid', coconut: 'Never solidifies', winner: null as 'jojoba' | 'coconut' | null },
]

const ML_PRECISION = 0.1
const PURE_DEFAULT_ML = 0.1
const CARRIER_DEFAULT_ML = 0.1

// Intended use options
const INTENDED_USES = [
  { id: 'sleep', label: 'Sleep & Relaxation', icon: '🌙' },
  { id: 'focus', label: 'Focus & Clarity', icon: '🧠' },
  { id: 'energy', label: 'Energy & Vitality', icon: '⚡' },
  { id: 'immunity', label: 'Immune Support', icon: '🛡️' },
  { id: 'pain-relief', label: 'Pain Relief', icon: '🌿' },
  { id: 'mood', label: 'Mood Balance', icon: '💜' },
  { id: 'stress-relief', label: 'Stress Relief', icon: '😌' },
  { id: 'romance', label: 'Romance & Intimacy', icon: '💕' },
  { id: 'meditation', label: 'Meditation', icon: '🧘' },
  { id: 'other', label: 'Other', icon: '✨' },
] as const

// Dangerous combinations data
const DANGEROUS_COMBINATIONS = {
  bloodThinners: {
    oils: ['clove-bud', 'cinnamon-bark', 'cinnamon-leaf'],
    medications: ['warfarin', 'eliquis', 'xarelto', 'aspirin', 'clopidogrel'],
    severity: 'critical' as RiskLevel,
    title: 'CRITICAL: Blood Thinner Interaction',
    description: 'These oils contain anticoagulant compounds (eugenol, coumarin) that can dangerously increase bleeding risk when combined with blood thinning medications.',
    recommendation: 'CONSULT YOUR DOCTOR before use. Avoid topical application.',
  },
  epilepsy: {
    oils: ['rosemary', 'clary-sage', 'fennel'],
    conditions: ['epilepsy', 'seizure-disorder'],
    severity: 'critical' as RiskLevel,
    title: 'CRITICAL: Seizure Risk',
    description: 'These oils contain neurotoxic compounds (thujone, camphor) that can trigger seizures in susceptible individuals.',
    recommendation: 'AVOID these oils if you have epilepsy or a seizure disorder.',
  },
  pregnancy: {
    oils: ['clary-sage', 'rosemary', 'cinnamon-bark', 'cinnamon-leaf', 'juniper-berry'],
    severity: 'high' as RiskLevel,
    title: 'HIGH RISK: Pregnancy Concern',
    description: 'These oils can stimulate uterine contractions and should be avoided during pregnancy, especially in the first trimester.',
    recommendation: 'AVOID during pregnancy or consult a qualified prenatal care provider.',
  },
}

// Oil safety profiles for badges
const OIL_SAFETY_PROFILES: Record<string, {
  pregnancySafe: boolean
  photosensitive: boolean
  photosensitiveNote?: string
  skinSensitizer: boolean
  respiratoryCaution: boolean
  childrenCaution: boolean
  contraindications: string[]
}> = {
  'clove-bud': { 
    pregnancySafe: false, 
    photosensitive: false, 
    skinSensitizer: true, 
    respiratoryCaution: false,
    childrenCaution: true,
    contraindications: ['blood-thinners', 'surgery'] 
  },
  'cinnamon-bark': { 
    pregnancySafe: false, 
    photosensitive: false, 
    skinSensitizer: true, 
    respiratoryCaution: true,
    childrenCaution: true,
    contraindications: ['blood-thinners', 'pregnancy', 'sensitive-skin'] 
  },
  'cinnamon-leaf': { 
    pregnancySafe: false, 
    photosensitive: false, 
    skinSensitizer: true, 
    respiratoryCaution: false,
    childrenCaution: true,
    contraindications: ['blood-thinners', 'pregnancy'] 
  },
  'rosemary': { 
    pregnancySafe: false, 
    photosensitive: false, 
    skinSensitizer: false, 
    respiratoryCaution: true,
    childrenCaution: false,
    contraindications: ['epilepsy', 'high-blood-pressure', 'pregnancy'] 
  },
  'clary-sage': { 
    pregnancySafe: false, 
    photosensitive: false, 
    skinSensitizer: false, 
    respiratoryCaution: false,
    childrenCaution: false,
    contraindications: ['pregnancy', 'alcohol'] 
  },
  'fennel': { 
    pregnancySafe: false, 
    photosensitive: false, 
    skinSensitizer: false, 
    respiratoryCaution: false,
    childrenCaution: true,
    contraindications: ['pregnancy', 'hormone-sensitive-conditions'] 
  },
  'juniper-berry': { 
    pregnancySafe: false, 
    photosensitive: false, 
    skinSensitizer: false, 
    respiratoryCaution: false,
    childrenCaution: false,
    contraindications: ['pregnancy', 'kidney-disease'] 
  },
  'lemon': { 
    pregnancySafe: true, 
    photosensitive: true, 
    photosensitiveNote: 'Wait 12h before sun',
    skinSensitizer: false, 
    respiratoryCaution: false,
    childrenCaution: false,
    contraindications: [] 
  },
  'lemongrass': { 
    pregnancySafe: true, 
    photosensitive: false, 
    skinSensitizer: true, 
    respiratoryCaution: false,
    childrenCaution: false,
    contraindications: ['sensitive-skin'] 
  },
  'tea-tree': { 
    pregnancySafe: false, 
    photosensitive: false, 
    skinSensitizer: true, 
    respiratoryCaution: false,
    childrenCaution: true,
    contraindications: ['pregnancy', 'hormone-sensitive-conditions'] 
  },
  'eucalyptus': { 
    pregnancySafe: false, 
    photosensitive: false, 
    skinSensitizer: false, 
    respiratoryCaution: true,
    childrenCaution: true,
    contraindications: ['pregnancy', 'young-children', 'asthma'] 
  },
  'ginger': { 
    pregnancySafe: true, 
    photosensitive: false, 
    skinSensitizer: false, 
    respiratoryCaution: false,
    childrenCaution: false,
    contraindications: ['blood-thinners'] 
  },
  'lavender': { 
    pregnancySafe: true, 
    photosensitive: false, 
    skinSensitizer: false, 
    respiratoryCaution: false,
    childrenCaution: false,
    contraindications: [] 
  },
  'may-chang': { 
    pregnancySafe: true, 
    photosensitive: true,
    photosensitiveNote: 'Wait 12h before sun',
    skinSensitizer: true, 
    respiratoryCaution: false,
    childrenCaution: false,
    contraindications: ['sensitive-skin'] 
  },
  'carrot-seed': { 
    pregnancySafe: true, 
    photosensitive: false, 
    skinSensitizer: false, 
    respiratoryCaution: false,
    childrenCaution: false,
    contraindications: [] 
  },
  'lemon-myrtle': { 
    pregnancySafe: true, 
    photosensitive: true,
    photosensitiveNote: 'Wait 12h before sun',
    skinSensitizer: true, 
    respiratoryCaution: false,
    childrenCaution: false,
    contraindications: ['sensitive-skin'] 
  },
  'geranium-bourbon': { 
    pregnancySafe: true, 
    photosensitive: false, 
    skinSensitizer: false, 
    respiratoryCaution: false,
    childrenCaution: false,
    contraindications: [] 
  },
  'patchouli-dark': { 
    pregnancySafe: true, 
    photosensitive: false, 
    skinSensitizer: false, 
    respiratoryCaution: false,
    childrenCaution: false,
    contraindications: [] 
  },
  'myrrh': { 
    pregnancySafe: false, 
    photosensitive: false, 
    skinSensitizer: false, 
    respiratoryCaution: false,
    childrenCaution: false,
    contraindications: ['pregnancy', 'surgery'] 
  },
}

// Interesting facts for loading state
const BLEND_FACTS = [
  "Ancient Egyptians used essential oils in their sacred rituals over 5,000 years ago.",
  "The term 'aromatherapy' was coined by French chemist René-Maurice Gattefossé in 1937.",
  "It takes about 250 pounds of lavender flowers to make just 1 pound of lavender essential oil.",
  "Rose essential oil contains over 300 chemical compounds.",
  "Essential oils can reach your bloodstream within 20 minutes of topical application.",
  "The sense of smell is the only sense directly connected to the limbic system.",
  "Frankincense was once more valuable than gold in ancient times.",
  "Different oils vibrate at different frequencies - rose oil vibrates at 320 MHz!",
  "Essential oils don't expire, they actually improve with age like fine wine.",
  "One drop of peppermint oil is equivalent to 28 cups of peppermint tea.",
]

// Profanity filter - basic implementation
const PROFANITY_LIST = ['badword1', 'badword2', 'badword3'] // Simplified for demo

// ============================================================================
// COMPONENT: Miron Violet Glass Banner
// ============================================================================
function MironVioletGlassBanner({ mode }: { mode: 'pure' | 'carrier' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#2d1b4e] via-[#4c1d95] to-[#2d1b4e] border border-[#8B5CF6]/50 shadow-xl"
    >
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#8B5CF6]/20 via-transparent to-transparent" />
      
      <div className="relative p-5 flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#A855F7] flex items-center justify-center shadow-lg shadow-[#8B5CF6]/30">
            <Wine className="w-7 h-7 text-white" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              Handcrafted in Miron Violet Glass
              <span className="px-2 py-0.5 rounded-full bg-[#A855F7]/30 text-[#c4b5fd] text-xs border border-[#8B5CF6]/30">
                Premium Protection
              </span>
            </h3>
            <Link 
              href="/bottles#science"
              className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1a1033]/60 border border-[#8B5CF6]/30 text-[#ddd6fe] text-xs hover:bg-[#8B5CF6]/20 transition-colors whitespace-nowrap"
            >
              Learn more
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
          
          <p className="text-[#c4b5fd] text-sm mb-3">
            Laboratory-grade Miron violet glass blocks 100% of UV-A and UV-B rays while allowing 
            beneficial violet and infrared light to penetrate. This unique combination naturally 
            preserves your oils&apos; potency, maintaining pH balance and active compounds for 2+ years—
            compared to just months in conventional glass.
          </p>
          
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1033]/60 border border-[#8B5CF6]/30 text-[#ddd6fe] text-xs">
              {mode === 'pure' ? (
                <>
                  <Droplets className="w-3.5 h-3.5 text-[#A855F7]" />
                  Glass Dropper Included
                </>
              ) : (
                <>
                  <Wind className="w-3.5 h-3.5 text-[#A855F7]" />
                  Stainless Steel Roller Included
                </>
              )}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1033]/60 border border-[#8B5CF6]/30 text-[#ddd6fe] text-xs">
              <Shield className="w-3.5 h-3.5 text-[#A855F7]" />
              100% UV Protection
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1033]/60 border border-[#8B5CF6]/30 text-[#ddd6fe] text-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#A855F7]" />
              2+ Year Potency Preservation
            </span>
            <Link 
              href="/bottles#science"
              className="sm:hidden inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#8B5CF6]/30 border border-[#8B5CF6]/50 text-[#ddd6fe] text-xs"
            >
              Learn more
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
      
      {/* Decorative corner accents */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#8B5CF6]/10 to-transparent" />
      <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-[#A855F7]/10 to-transparent" />
    </motion.div>
  )
}

// ============================================================================
// COMPONENT: Oil Safety Badge
// ============================================================================
function OilSafetyBadge({ oilId }: { oilId: string }) {
  const profile = OIL_SAFETY_PROFILES[oilId]
  if (!profile) return null

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {!profile.pregnancySafe && (
        <Tooltip content="Not recommended during pregnancy. May stimulate uterine contractions.">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px]">
            <Baby className="w-3 h-3" />
            Pregnancy
          </span>
        </Tooltip>
      )}
      {profile.photosensitive && (
        <Tooltip content={`Photosensitive: ${profile.photosensitiveNote || 'Avoid sun exposure after topical use'}`}>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-400 text-[10px]">
            <Sun className="w-3 h-3" />
            Sun
          </span>
        </Tooltip>
      )}
      {profile.skinSensitizer && (
        <Tooltip content="May cause skin irritation. Patch test recommended.">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-[10px]">
            <AlertCircle className="w-3 h-3" />
            Skin
          </span>
        </Tooltip>
      )}
      {profile.respiratoryCaution && (
        <Tooltip content="Use with caution around respiratory conditions.">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[10px]">
            <Wind className="w-3 h-3" />
            Respiratory
          </span>
        </Tooltip>
      )}
      {profile.childrenCaution && (
        <Tooltip content="Use reduced dilution for children under 12.">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-400 text-[10px]">
            <Baby className="w-3 h-3" />
            Children
          </span>
        </Tooltip>
      )}
    </div>
  )
}

// ============================================================================
// COMPONENT: Critical Warning Modal
// ============================================================================
function CriticalWarningModal({
  isOpen,
  onClose,
  warnings,
  onAcknowledge,
  experienceLevel,
}: {
  isOpen: boolean
  onClose: () => void
  warnings: SafetyWarning[]
  onAcknowledge: (warningIds: string[]) => void
  experienceLevel: ExperienceLevel
}) {
  const [acknowledged, setAcknowledged] = useState<Record<string, boolean>>({})
  const criticalWarnings = warnings.filter(w => w.riskLevel === 'critical')

  useEffect(() => {
    if (isOpen) {
      setAcknowledged({})
    }
  }, [isOpen])

  const handleAcknowledge = () => {
    const acknowledgedIds = Object.entries(acknowledged)
      .filter(([_, checked]) => checked)
      .map(([id]) => id)
    onAcknowledge(acknowledgedIds)
    onClose()
  }

  const allAcknowledged = criticalWarnings.every(w => acknowledged[w.id])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="max-w-lg w-full bg-[#111] border border-red-500/50 rounded-2xl p-6 shadow-2xl shadow-red-500/20"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertOctagon className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h3 className="text-xl font-medium text-white">Critical Safety Warning</h3>
              <p className="text-red-400 text-sm">Action Required Before Proceeding</p>
            </div>
          </div>

          <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
            {criticalWarnings.map(warning => (
              <div key={warning.id} className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                <h4 className="font-medium text-red-400 mb-2">{warning.title}</h4>
                <p className="text-sm text-[#a69b8a] mb-2">
                  {getWarningMessage(warning, experienceLevel)}
                </p>
                <p className="text-xs text-[#a69b8a]/70 mb-3">{warning.detailedExplanation}</p>
                
                <label className="flex items-start gap-3 cursor-pointer">
                  <div className="flex-shrink-0 mt-0.5">
                    {acknowledged[warning.id] ? (
                      <CheckSquare 
                        className="w-5 h-5 text-red-500" 
                        onClick={() => setAcknowledged(prev => ({ ...prev, [warning.id]: false }))}
                      />
                    ) : (
                      <Square 
                        className="w-5 h-5 text-red-500/50" 
                        onClick={() => setAcknowledged(prev => ({ ...prev, [warning.id]: true }))}
                      />
                    )}
                  </div>
                  <span className="text-sm text-[#f5f3ef]">
                    {warning.acknowledgmentText || 'I understand and accept the risks associated with this warning.'}
                  </span>
                </label>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-[#0a080c] border border-[#f5f3ef]/20 text-[#a69b8a] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAcknowledge}
              disabled={!allAcknowledged}
              className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Acknowledge & Proceed
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ============================================================================
// COMPONENT: Experience Level Warning Banner
// ============================================================================
function ExperienceLevelBanner({ 
  experienceLevel,
  warningCount 
}: { 
  experienceLevel: ExperienceLevel
  warningCount: number 
}) {
  const configs = {
    beginner: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
      icon: AlertCircle,
      title: 'Beginner Mode: Extra Caution Advised',
      message: warningCount > 0 
        ? `We've identified ${warningCount} safety consideration${warningCount !== 1 ? 's' : ''}. Please review all warnings carefully.`
        : 'Start with low dilutions (1-2%) and patch test new blends.',
    },
    intermediate: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      text: 'text-blue-400',
      icon: Info,
      title: 'Intermediate Mode: Standard Precautions',
      message: 'You have some experience. Follow standard safety guidelines for your selections.',
    },
    advanced: {
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/30',
      text: 'text-purple-400',
      icon: Zap,
      title: 'Advanced Mode: Professional Discretion',
      message: 'You understand essential oil chemistry. Critical warnings are still displayed.',
    },
    professional: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
      icon: Stethoscope,
      title: 'Professional Mode: Clinical Judgment',
      message: 'Only critical contraindications and medication interactions are highlighted.',
    },
  }

  const config = configs[experienceLevel]
  const Icon = config.icon

  return (
    <div className={cn('p-4 rounded-xl border', config.bg, config.border)}>
      <div className="flex items-start gap-3">
        <Icon className={cn('w-5 h-5 mt-0.5', config.text)} />
        <div>
          <h4 className={cn('font-medium', config.text)}>{config.title}</h4>
          <p className="text-sm text-[#a69b8a] mt-1">{config.message}</p>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// COMPONENT: Acknowledgment Checklist
// ============================================================================
function AcknowledgmentChecklist({
  warnings,
  acknowledgedIds,
  onAcknowledge,
  experienceLevel,
}: {
  warnings: SafetyWarning[]
  acknowledgedIds: string[]
  onAcknowledge: (id: string) => void
  experienceLevel: ExperienceLevel
}) {
  const acknowledgableWarnings = warnings.filter(w => w.requiresAcknowledgment)
  
  if (acknowledgableWarnings.length === 0) return null

  return (
    <div className="mt-4 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
      <h4 className="text-sm font-medium text-red-400 mb-3 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" />
        Required Acknowledgments
      </h4>
      <div className="space-y-2">
        {acknowledgableWarnings.map(warning => {
          const isAcknowledged = acknowledgedIds.includes(warning.id)
          return (
            <label 
              key={warning.id}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                isAcknowledged ? 'bg-red-500/10' : 'bg-[#0a080c] hover:bg-[#0a080c]/80'
              )}
            >
              <div className="flex-shrink-0 mt-0.5">
                {isAcknowledged ? (
                  <CheckSquare 
                    className="w-5 h-5 text-red-500" 
                    onClick={() => onAcknowledge(warning.id)}
                  />
                ) : (
                  <Square 
                    className="w-5 h-5 text-red-500/50" 
                    onClick={() => onAcknowledge(warning.id)}
                  />
                )}
              </div>
              <div className="flex-1">
                <p className={cn('text-sm', isAcknowledged ? 'text-[#a69b8a] line-through' : 'text-[#f5f3ef]')}>
                  {warning.acknowledgmentText || warning.title}
                </p>
                {!isAcknowledged && (
                  <p className="text-xs text-[#a69b8a]/70 mt-1">
                    {getWarningMessage(warning, experienceLevel)}
                  </p>
                )}
              </div>
            </label>
          )
        })}
      </div>
      <div className="mt-3 pt-3 border-t border-red-500/20">
        <p className="text-xs text-[#a69b8a]">
          {acknowledgedIds.length} of {acknowledgableWarnings.length} acknowledged
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// COMPONENT: Dangerous Combination Alert
// ============================================================================
function DangerousCombinationAlert({
  selectedOils,
  healthProfile,
  mode,
}: {
  selectedOils: { oilId: string; ml: number }[]
  healthProfile: any
  mode: 'pure' | 'carrier'
}) {
  const alerts = useMemo(() => {
    const alerts: { type: string; severity: string; title: string; message: string; oils: string[] }[] = []
    const selectedOilIds = selectedOils.map(o => o.oilId)
    const oilNames = selectedOils.map(o => ATELIER_OILS.find(ao => ao.id === o.oilId)?.name || o.oilId)

    // Check blood thinners
    const dangerousBloodOils = selectedOilIds.filter(id => 
      DANGEROUS_COMBINATIONS.bloodThinners.oils.includes(id)
    )
    if (dangerousBloodOils.length > 0) {
      const onBloodThinners = healthProfile?.medications?.some((m: string) =>
        DANGEROUS_COMBINATIONS.bloodThinners.medications.some(med => 
          m.toLowerCase().includes(med.toLowerCase())
        )
      )
      if (onBloodThinners) {
        alerts.push({
          type: 'blood-thinner',
          severity: 'critical',
          title: DANGEROUS_COMBINATIONS.bloodThinners.title,
          message: DANGEROUS_COMBINATIONS.bloodThinners.description,
          oils: dangerousBloodOils,
        })
      }
    }

    // Check epilepsy/seizure risk
    const epilepsyOils = selectedOilIds.filter(id =>
      DANGEROUS_COMBINATIONS.epilepsy.oils.includes(id)
    )
    if (epilepsyOils.length > 0 && healthProfile?.conditions?.includes('epilepsy')) {
      alerts.push({
        type: 'epilepsy',
        severity: 'critical',
        title: DANGEROUS_COMBINATIONS.epilepsy.title,
        message: DANGEROUS_COMBINATIONS.epilepsy.description,
        oils: epilepsyOils,
      })
    }

    // Check pregnancy
    const pregnancyOils = selectedOilIds.filter(id =>
      DANGEROUS_COMBINATIONS.pregnancy.oils.includes(id)
    )
    if (pregnancyOils.length > 0 && healthProfile?.isPregnant) {
      alerts.push({
        type: 'pregnancy',
        severity: 'high',
        title: DANGEROUS_COMBINATIONS.pregnancy.title,
        message: DANGEROUS_COMBINATIONS.pregnancy.description,
        oils: pregnancyOils,
      })
    }

    return alerts
  }, [selectedOils, healthProfile])

  if (alerts.length === 0) return null

  return (
    <div className="space-y-3">
      {alerts.map((alert, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={cn(
            'p-4 rounded-xl border-l-4',
            alert.severity === 'critical' 
              ? 'bg-red-500/10 border-red-500' 
              : 'bg-orange-500/10 border-orange-500'
          )}
        >
          <div className="flex items-start gap-3">
            <AlertOctagon className={cn(
              'w-5 h-5 flex-shrink-0',
              alert.severity === 'critical' ? 'text-red-500' : 'text-orange-500'
            )} />
            <div className="flex-1">
              <h4 className={cn(
                'font-medium',
                alert.severity === 'critical' ? 'text-red-400' : 'text-orange-400'
              )}>
                {alert.title}
              </h4>
              <p className="text-sm text-[#a69b8a] mt-1">{alert.message}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {alert.oils.map(oilId => {
                  const oil = ATELIER_OILS.find(o => o.id === oilId)
                  return (
                    <span key={oilId} className="px-2 py-1 rounded bg-[#0a080c] text-xs text-[#f5f3ef]">
                      {oil?.name || oilId}
                    </span>
                  )
                })}
              </div>
              {alert.severity === 'critical' && (
                <div className="mt-3 p-3 rounded-lg bg-[#0a080c] border border-red-500/30">
                  <p className="text-xs text-red-400 font-medium flex items-center gap-2">
                    <Stethoscope className="w-3.5 h-3.5" />
                    CONSULT PROFESSIONAL REQUIRED
                  </p>
                  <p className="text-xs text-[#a69b8a] mt-1">
                    This combination requires consultation with a qualified healthcare provider before use.
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// ============================================================================
// COMPONENT: Enhanced Safety Summary Panel
// ============================================================================
function EnhancedSafetySummary({
  validation,
  comprehensiveSafety,
  onAcknowledge,
  acknowledgedIds,
  healthProfile,
}: {
  validation: MixValidationResult | null
  comprehensiveSafety: SafetyValidationResult | null
  onAcknowledge: (ids: string[]) => void
  acknowledgedIds: string[]
  healthProfile: any
}) {
  const [showCriticalModal, setShowCriticalModal] = useState(false)

  if (!comprehensiveSafety) {
    return (
      <div className="p-6 rounded-2xl bg-[#111] border border-[#f5f3ef]/10">
        <div className="text-center py-8">
          <Shield className="w-12 h-12 mx-auto mb-3 text-[#a69b8a]/30" />
          <p className="text-[#a69b8a]">Complete your health profile to see safety information</p>
        </div>
      </div>
    )
  }

  const criticalCount = comprehensiveSafety.warnings.filter(w => w.riskLevel === 'critical').length
  const highCount = comprehensiveSafety.warnings.filter(w => w.riskLevel === 'high').length
  const moderateCount = comprehensiveSafety.warnings.filter(w => w.riskLevel === 'moderate').length

  return (
    <div className="p-6 rounded-2xl bg-[#111] border border-[#f5f3ef]/10 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#c9a227]" />
          <h3 className="text-lg font-medium text-[#f5f3ef]">Safety Assessment</h3>
        </div>
        <span className={cn(
          'px-3 py-1 rounded-full text-xs font-medium',
          comprehensiveSafety.safetyScore >= 80 ? 'bg-emerald-500/20 text-emerald-400' :
          comprehensiveSafety.safetyScore >= 60 ? 'bg-amber-500/20 text-amber-400' :
          'bg-red-500/20 text-red-400'
        )}>
          Score: {comprehensiveSafety.safetyScore}/100
        </span>
      </div>

      {/* Experience Level Banner */}
      <ExperienceLevelBanner 
        experienceLevel={comprehensiveSafety.experienceLevel}
        warningCount={comprehensiveSafety.warnings.length}
      />

      {/* Dangerous Combinations */}
      <DangerousCombinationAlert
        selectedOils={comprehensiveSafety.warnings.flatMap(w => w.affectedOils?.map(id => ({ oilId: id, ml: 0 })) || [])}
        healthProfile={healthProfile}
        mode="pure"
      />

      {/* Warning Summary */}
      {(criticalCount > 0 || highCount > 0 || moderateCount > 0) && (
        <div className="grid grid-cols-3 gap-2">
          {criticalCount > 0 && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-center">
              <div className="text-2xl font-bold text-red-500">{criticalCount}</div>
              <div className="text-xs text-red-400">Critical</div>
            </div>
          )}
          {highCount > 0 && (
            <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 text-center">
              <div className="text-2xl font-bold text-orange-500">{highCount}</div>
              <div className="text-xs text-orange-400">High</div>
            </div>
          )}
          {moderateCount > 0 && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-center">
              <div className="text-2xl font-bold text-amber-500">{moderateCount}</div>
              <div className="text-xs text-amber-400">Moderate</div>
            </div>
          )}
        </div>
      )}

      {/* Warning Details */}
      {comprehensiveSafety.warnings.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {comprehensiveSafety.warnings.map(warning => (
            <motion.div
              key={warning.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={cn(
                'p-3 rounded-lg border',
                warning.riskLevel === 'critical' && 'bg-red-500/5 border-red-500/30',
                warning.riskLevel === 'high' && 'bg-orange-500/5 border-orange-500/30',
                warning.riskLevel === 'moderate' && 'bg-amber-500/5 border-amber-500/30',
                warning.riskLevel === 'low' && 'bg-blue-500/5 border-blue-500/30',
                warning.riskLevel === 'info' && 'bg-[#0a080c] border-[#f5f3ef]/10',
              )}
            >
              <div className="flex items-start gap-2">
                {warning.riskLevel === 'critical' && <AlertOctagon className="w-4 h-4 text-red-500 mt-0.5" />}
                {warning.riskLevel === 'high' && <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5" />}
                {warning.riskLevel === 'moderate' && <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" />}
                {warning.riskLevel === 'low' && <Info className="w-4 h-4 text-blue-500 mt-0.5" />}
                {warning.riskLevel === 'info' && <Info className="w-4 h-4 text-[#a69b8a] mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm font-medium',
                    warning.riskLevel === 'critical' && 'text-red-400',
                    warning.riskLevel === 'high' && 'text-orange-400',
                    warning.riskLevel === 'moderate' && 'text-amber-400',
                    warning.riskLevel === 'low' && 'text-blue-400',
                    warning.riskLevel === 'info' && 'text-[#a69b8a]',
                  )}>
                    {warning.title}
                  </p>
                  <p className="text-xs text-[#a69b8a] mt-1">
                    {getWarningMessage(warning, comprehensiveSafety.experienceLevel)}
                  </p>
                  {warning.requiresAcknowledgment && (
                    <span className="inline-block mt-2 px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px]">
                      Requires Acknowledgment
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Acknowledgment Checklist */}
      <AcknowledgmentChecklist
        warnings={comprehensiveSafety.warnings}
        acknowledgedIds={acknowledgedIds}
        onAcknowledge={(id) => {
          const newIds = acknowledgedIds.includes(id)
            ? acknowledgedIds.filter(i => i !== id)
            : [...acknowledgedIds, id]
          onAcknowledge(newIds)
        }}
        experienceLevel={comprehensiveSafety.experienceLevel}
      />

      {/* Critical Warning Modal Trigger */}
      {criticalCount > 0 && (
        <button
          onClick={() => setShowCriticalModal(true)}
          className="w-full py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors text-sm font-medium"
        >
          View Critical Warnings
        </button>
      )}

      <CriticalWarningModal
        isOpen={showCriticalModal}
        onClose={() => setShowCriticalModal(false)}
        warnings={comprehensiveSafety.warnings}
        onAcknowledge={(ids) => {
          onAcknowledge(Array.from(new Set([...acknowledgedIds, ...ids])))
        }}
        experienceLevel={comprehensiveSafety.experienceLevel}
      />
    </div>
  )
}

// ============================================================================
// COMPONENT: Toast Notification
// ============================================================================
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  const colors = {
    success: 'bg-[#2ecc71] text-[#0a080c]',
    error: 'bg-red-500 text-white',
    info: 'bg-[#c9a227] text-[#0a080c]',
  }

  const icons = {
    success: <CheckCircle className="w-4 h-4" />,
    error: <AlertCircle className="w-4 h-4" />,
    info: <Info className="w-4 h-4" />,
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      className={cn(
        'fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3',
        colors[type]
      )}
    >
      {icons[type]}
      <span className="font-medium text-sm">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  )
}

// ============================================================================
// COMPONENT: Tooltip
// ============================================================================
function Tooltip({ content, children, rich = false, position = 'top' }: { content: string | React.ReactNode; children: React.ReactNode; rich?: boolean; position?: 'top' | 'bottom' }) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div className={cn("relative inline-block", !rich && "inline-block")}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: position === 'top' ? 5 : -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: position === 'top' ? 5 : -5 }}
            className={cn(
              "absolute left-1/2 -translate-x-1/2 px-4 py-3 bg-[#0a080c] border border-[#f5f3ef]/20 rounded-lg text-xs text-[#a69b8a] z-50 shadow-xl",
              position === 'top' ? "bottom-full mb-2" : "top-full mt-2",
              rich ? "min-w-[220px] max-w-[280px]" : "whitespace-nowrap"
            )}
          >
            {content}
            <div className={cn(
              "absolute left-1/2 -translate-x-1/2 border-4 border-transparent",
              position === 'top' 
                ? "top-full -mt-1 border-t-[#0a080c]" 
                : "bottom-full -mb-1 border-b-[#0a080c]"
            )} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// COMPONENT: Cord Selector with Collapse and Info Modal
// ============================================================================
function CordSelector({ 
  selectedCordId, 
  onSelect 
}: { 
  selectedCordId: string
  onSelect: (id: string) => void 
}) {
  const [showAll, setShowAll] = useState(false)
  const [infoCord, setInfoCord] = useState<SimpleCordOption | null>(null)
  const selectedCord = SIMPLE_CORD_OPTIONS.find(c => c.id === selectedCordId) || SIMPLE_CORD_OPTIONS[0]
  
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Scroll className="w-5 h-5 text-[#c9a227]" />
          <h3 className="text-lg font-medium text-[#f5f3ef]">Cord & Closure</h3>
        </div>
        <Tooltip content="Cord pricing is passed through at cost, same as our Collection products">
          <Info className="w-4 h-4 text-[#a69b8a] cursor-help" />
        </Tooltip>
      </div>
      
      {showAll ? (
        /* Expanded List */
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {SIMPLE_CORD_OPTIONS.map(cord => (
            <div key={cord.id} className="flex gap-2">
              <button
                onClick={() => { onSelect(cord.id); setShowAll(false); }}
                className={cn(
                  'flex-1 p-4 rounded-xl border transition-all text-left flex items-center gap-4 hover:scale-[1.02]',
                  selectedCordId === cord.id
                    ? cord.id === 'mystery-pendant' 
                      ? 'bg-purple-500/10 border-purple-500'
                      : 'bg-[#c9a227]/10 border-[#c9a227]'
                    : 'bg-[#0a080c] border-[#f5f3ef]/10 hover:border-[#f5f3ef]/30'
                )}
              >
                {/* Cord Preview */}
                {cord.id === 'mystery-pendant' ? (
                  <div className="w-12 h-12 rounded-lg flex-shrink-0 border-2 border-purple-500/30 bg-gradient-to-br from-purple-500/30 to-pink-500/20 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-purple-400" />
                  </div>
                ) : (
                  <div 
                    className="w-12 h-12 rounded-lg flex-shrink-0 border-2 border-white/10 shadow-inner"
                    style={{ backgroundColor: cord.colorCode }}
                  />
                )}
                
                <div className="flex-1 min-w-0">
                  <h4 className={cn(
                    'font-medium',
                    selectedCordId === cord.id 
                      ? cord.id === 'mystery-pendant' ? 'text-purple-300' : 'text-[#f5f3ef]'
                      : 'text-[#a69b8a]'
                  )}>
                    {cord.name}
                  </h4>
                </div>
                
                <div className="text-right">
                  {cord.price === 0 ? (
                    <span className="px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">Free</span>
                  ) : (
                    <span className="px-2 py-1 rounded-full bg-[#c9a227]/20 text-[#c9a227] text-xs font-medium">+${cord.price.toFixed(2)}</span>
                  )}
                </div>
              </button>
              
              {/* Info Button */}
              <button
                onClick={() => setInfoCord(cord)}
                className="px-3 rounded-xl bg-[#0a080c] border border-[#f5f3ef]/10 hover:border-[#c9a227]/30 text-[#a69b8a] hover:text-[#c9a227] transition-colors"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
          ))}
          
          <button
            onClick={() => setShowAll(false)}
            className="w-full py-2 text-xs text-[#a69b8a] hover:text-[#f5f3ef] transition-colors"
          >
            Collapse
          </button>
        </div>
      ) : (
        /* Collapsed - Show Selected Only */
        <div className="flex items-center gap-4 p-4 rounded-xl bg-[#0a080c] border border-[#f5f3ef]/10">
          {selectedCord.id === 'mystery-pendant' ? (
            <div className="w-12 h-12 rounded-lg flex-shrink-0 border-2 border-purple-500/30 bg-gradient-to-br from-purple-500/30 to-pink-500/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-purple-400" />
            </div>
          ) : (
            <div 
              className="w-12 h-12 rounded-lg flex-shrink-0 border-2 border-white/10 shadow-inner"
              style={{ backgroundColor: selectedCord.colorCode }}
            />
          )}
          
          <div className="flex-1">
            <h4 className={cn(
              'font-medium',
              selectedCord.id === 'mystery-pendant' ? 'text-purple-300' : 'text-[#f5f3ef]'
            )}>
              {selectedCord.name}
            </h4>
            <p className="text-xs text-[#a69b8a]">{selectedCord.bestFor?.[0] || 'Cord selection'}</p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setInfoCord(selectedCord)}
              className="px-3 py-2 rounded-lg bg-[#111] border border-[#f5f3ef]/10 hover:border-[#c9a227]/30 text-[#a69b8a] hover:text-[#c9a227] transition-colors text-xs"
            >
              Info
            </button>
            <button
              onClick={() => setShowAll(true)}
              className="px-3 py-2 rounded-lg bg-[#c9a227]/10 border border-[#c9a227]/30 text-[#c9a227] hover:bg-[#c9a227]/20 transition-colors text-xs"
            >
              Change
            </button>
          </div>
        </div>
      )}
      
      {/* Cord Info Modal */}
      <AnimatePresence>
        {infoCord && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setInfoCord(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111] border border-[#f5f3ef]/20 rounded-2xl p-6 max-w-md w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                {infoCord.id === 'mystery-pendant' ? (
                  <div className="w-12 h-12 rounded-lg border-2 border-purple-500/30 bg-gradient-to-br from-purple-500/30 to-pink-500/20 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-purple-400" />
                  </div>
                ) : (
                  <div 
                    className="w-12 h-12 rounded-lg border-2 border-white/10"
                    style={{ backgroundColor: infoCord.colorCode }}
                  />
                )}
                <div>
                  <h3 className={cn(
                    'text-lg font-medium',
                    infoCord.id === 'mystery-pendant' ? 'text-purple-300' : 'text-[#f5f3ef]'
                  )}>
                    {infoCord.name}
                  </h3>
                  <p className="text-xs text-[#a69b8a]">{infoCord.material}</p>
                </div>
              </div>
              
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="text-[#c9a227] font-medium mb-1">Description</h4>
                  <p className="text-[#a69b8a]">{infoCord.description}</p>
                </div>
                
                {infoCord.bestFor && (
                  <div>
                    <h4 className="text-[#c9a227] font-medium mb-1">Best For</h4>
                    <div className="flex flex-wrap gap-2">
                      {infoCord.bestFor.map((use, i) => (
                        <span key={i} className="px-2 py-1 rounded-full bg-[#f5f3ef]/10 text-[#a69b8a] text-xs">
                          {use}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {infoCord.energy && (
                  <div>
                    <h4 className="text-[#c9a227] font-medium mb-1">Energy & Meaning</h4>
                    <p className="text-[#a69b8a]">{infoCord.energy}</p>
                  </div>
                )}
                
                <div className="pt-4 border-t border-[#f5f3ef]/10">
                  <p className="text-xs text-[#a69b8a]/60">
                    When imbued with your oil and crystals, this cord carries the energetic signature 
                    of your blend throughout your day.
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => setInfoCord(null)}
                className="w-full mt-6 py-3 rounded-xl bg-[#0a080c] border border-[#f5f3ef]/20 text-[#f5f3ef] hover:border-[#c9a227]/30 transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ============================================================================
// COMPONENT: Strength Info Button & Modal
// ============================================================================
function StrengthInfoButton({ ratio }: { ratio: number }) {
  const [showInfo, setShowInfo] = useState(false)
  const guidance = RATIO_GUIDANCE[ratio]
  
  return (
    <>
      <button
        onClick={() => setShowInfo(true)}
        className="px-3 py-2 rounded-lg bg-[#f5f3ef]/5 border border-[#f5f3ef]/10 hover:border-[#c9a227]/30 text-[#a69b8a] hover:text-[#c9a227] transition-colors"
        title="View strength details"
      >
        <Info className="w-4 h-4" />
      </button>
      
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowInfo(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111] border border-[#f5f3ef]/20 rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className={cn(
                  'w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold',
                  guidance.experience === 'beginner' && 'bg-green-500/20 text-green-400',
                  guidance.experience === 'intermediate' && 'bg-[#c9a227]/20 text-[#c9a227]',
                  guidance.experience === 'advanced' && 'bg-amber-500/20 text-amber-400'
                )}>
                  {ratio}%
                </div>
                <div>
                  <h3 className="text-xl font-medium text-[#f5f3ef]">{guidance.label}</h3>
                  <span className={cn(
                    'text-xs uppercase tracking-wider',
                    guidance.experience === 'beginner' && 'text-green-400',
                    guidance.experience === 'intermediate' && 'text-[#c9a227]',
                    guidance.experience === 'advanced' && 'text-amber-400'
                  )}>
                    {guidance.experience} level
                  </span>
                </div>
              </div>
              
              <div className="space-y-5 text-sm">
                {/* Description */}
                <div>
                  <h4 className="text-[#c9a227] font-medium mb-1">About this Strength</h4>
                  <p className="text-[#a69b8a]">{guidance.description}</p>
                </div>
                
                {/* Typical Uses */}
                <div>
                  <h4 className="text-[#c9a227] font-medium mb-2">Typical Uses</h4>
                  <ul className="space-y-1">
                    {guidance.typicalUses.map((use, i) => (
                      <li key={i} className="text-[#a69b8a] flex items-start gap-2">
                        <span className="text-[#c9a227] mt-1">•</span>
                        {use}
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* Safety Advice */}
                <div className="p-3 rounded-xl bg-[#0a080c] border border-[#f5f3ef]/10">
                  <h4 className="text-amber-400 font-medium mb-1 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Safety Guidelines
                  </h4>
                  <p className="text-[#a69b8a] text-xs">{guidance.safetyAdvice}</p>
                </div>
                
                {/* Safety Icons */}
                <div className="flex gap-4">
                  <div className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-xs',
                    guidance.childrenSafe ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                  )}>
                    <Baby className="w-4 h-4" />
                    {guidance.childrenSafe ? 'Children 6+' : 'Adults only'}
                  </div>
                  <div className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-xs',
                    guidance.pregnancySafe ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'
                  )}>
                    <Heart className="w-4 h-4" />
                    {guidance.pregnancySafe ? 'Pregnancy safe' : 'Consult provider'}
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => setShowInfo(false)}
                className="w-full mt-6 py-3 rounded-xl bg-[#0a080c] border border-[#f5f3ef]/20 text-[#f5f3ef] hover:border-[#c9a227]/30 transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ============================================================================
// COMPONENT: Oil Amount Control with Editable Input and Hold-to-Adjust
// ============================================================================
function OilAmountControl({
  oilId,
  ml,
  onAdjust,
  currentEssentialOilMl,
  maxEssentialOilMl,
  bottleSize,
}: {
  oilId: string
  ml: number
  onAdjust: (oilId: string, delta: number) => void
  currentEssentialOilMl: number
  maxEssentialOilMl: number
  bottleSize: number
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(ml.toFixed(1))
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Use refs to track current values for closure-stale fix
  const currentMlRef = useRef(currentEssentialOilMl)
  const maxMlRef = useRef(maxEssentialOilMl)
  
  // Keep refs updated with latest props
  useEffect(() => {
    currentMlRef.current = currentEssentialOilMl
    maxMlRef.current = maxEssentialOilMl
  }, [currentEssentialOilMl, maxEssentialOilMl])
  
  useEffect(() => {
    setEditValue(ml.toFixed(1))
  }, [ml])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])
  
  const handleStartDecrement = () => {
    onAdjust(oilId, -ML_PRECISION)
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        onAdjust(oilId, -ML_PRECISION)
      }, 100)
    }, 400)
  }
  
  const handleStartIncrement = () => {
    // Check using ref for current value
    if (currentMlRef.current >= maxMlRef.current) return
    onAdjust(oilId, ML_PRECISION)
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        // Use refs to get current values (not stale closure)
        if (currentMlRef.current < maxMlRef.current) {
          onAdjust(oilId, ML_PRECISION)
        } else {
          // Stop interval when at capacity
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
        }
      }, 100)
    }, 400)
  }
  
  const handleStop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }
  
  const handleInputSubmit = () => {
    const newValue = parseFloat(editValue)
    if (!isNaN(newValue) && newValue >= 0.1 && newValue <= bottleSize) {
      const delta = newValue - ml
      const newTotal = currentEssentialOilMl + delta
      if (newTotal <= maxEssentialOilMl) {
        onAdjust(oilId, delta)
      } else {
        // If would exceed max, set to max allowed for this oil
        const maxForThisOil = ml + (maxEssentialOilMl - currentEssentialOilMl)
        onAdjust(oilId, maxForThisOil - ml)
      }
    }
    setIsEditing(false)
    setEditValue(ml.toFixed(1))
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInputSubmit()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
      setEditValue(ml.toFixed(1))
    }
  }
  
  return (
    <div className="flex items-center gap-1">
      <button
        onMouseDown={handleStartDecrement}
        onMouseUp={handleStop}
        onMouseLeave={handleStop}
        onTouchStart={(e) => { e.preventDefault(); handleStartDecrement() }}
        onTouchEnd={(e) => { e.preventDefault(); handleStop() }}
        className="w-8 h-8 rounded-lg bg-[#111] border border-[#f5f3ef]/10 flex items-center justify-center text-[#a69b8a] hover:text-[#f5f3ef] hover:border-[#c9a227]/30 transition-colors active:scale-95 select-none"
      >
        <Minus className="w-3 h-3" />
      </button>
      
      <div className="w-16 text-center">
        {isEditing ? (
          <input
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleInputSubmit}
            onKeyDown={handleKeyDown}
            autoFocus
            step="0.1"
            min="0.1"
            max={bottleSize}
            className="w-full px-1 py-0.5 text-sm font-medium text-[#f5f3ef] bg-[#111] border border-[#c9a227] rounded text-center focus:outline-none focus:ring-1 focus:ring-[#c9a227]"
          />
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="w-full px-1 py-0.5 text-sm font-medium text-[#f5f3ef] hover:bg-[#f5f3ef]/10 rounded transition-colors"
            title="Click to edit"
          >
            {ml.toFixed(1)}
            <span className="text-xs text-[#a69b8a] ml-0.5">ml</span>
          </button>
        )}
      </div>
      
      <button
        onMouseDown={handleStartIncrement}
        onMouseUp={handleStop}
        onMouseLeave={handleStop}
        onTouchStart={(e) => { e.preventDefault(); handleStartIncrement() }}
        onTouchEnd={(e) => { e.preventDefault(); handleStop() }}
        disabled={currentEssentialOilMl >= maxEssentialOilMl}
        className="w-8 h-8 rounded-lg bg-[#111] border border-[#f5f3ef]/10 flex items-center justify-center text-[#a69b8a] hover:text-[#f5f3ef] hover:border-[#c9a227]/30 transition-colors disabled:opacity-50 active:scale-95 select-none"
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  )
}

// ============================================================================
// COMPONENT: Revolutionary Blend Chamber with Real-time Pouring Animation
// ============================================================================
function BlendChamber({
  selectedOils,
  bottleSize,
  mode,
  carrierRatio,
  carrierOilName,
  onAdjustOil,
  onRemoveOil,
  maxEssentialOilMl,
  currentEssentialOilMl,
  isBottleComplete,
}: {
  selectedOils: { oilId: string; ml: number }[]
  bottleSize: number
  mode: 'pure' | 'carrier'
  carrierRatio: number
  carrierOilName?: string
  onAdjustOil: (oilId: string, delta: number) => void
  onRemoveOil: (oilId: string) => void
  maxEssentialOilMl: number
  currentEssentialOilMl: number
  isBottleComplete: boolean
}) {
  const [recentlyAdded, setRecentlyAdded] = useState<string | null>(null)
  const [pourAnimation, setPourAnimation] = useState<{ oilId: string; color: string } | null>(null)
  
  // Track when oils are added for animation
  const prevOilsRef = useRef<string[]>([])
  
  useEffect(() => {
    const currentOilIds = selectedOils.map(o => o.oilId)
    const newOilId = currentOilIds.find(id => !prevOilsRef.current.includes(id))
    
    if (newOilId) {
      const oil = ATELIER_OILS.find(o => o.id === newOilId)
      if (oil) {
        setRecentlyAdded(newOilId)
        setPourAnimation({ oilId: newOilId, color: oil.color })
        
        // Clear animations after they complete
        setTimeout(() => setPourAnimation(null), 1500)
        setTimeout(() => setRecentlyAdded(null), 3000)
      }
    }
    
    prevOilsRef.current = currentOilIds
  }, [selectedOils])
  
  // Deduplicate selected oils to prevent duplicate key errors
  const uniqueSelectedOils = useMemo(() => {
    const seen = new Set<string>()
    return selectedOils.filter(oil => {
      if (seen.has(oil.oilId)) return false
      seen.add(oil.oilId)
      return true
    })
  }, [selectedOils])

  // Calculate oil layers for the chamber - fills from BOTTOM to TOP
  const oilLayers = useMemo(() => {
    if (uniqueSelectedOils.length === 0) return []
    
    // Calculate cumulative heights from bottom
    let cumulativeHeight = 0
    const layersWithHeights = uniqueSelectedOils.map(oil => {
      const oilInfo = ATELIER_OILS.find(o => o.id === oil.oilId)
      const height = (oil.ml / bottleSize) * 100
      const layer = {
        ...oil,
        name: oilInfo?.name || oil.oilId,
        color: oilInfo?.color || '#888888',
        height,
        isNew: recentlyAdded === oil.oilId
      }
      cumulativeHeight += height
      return layer
    })
    
    // Now position from bottom up (reverse order for rendering)
    let currentBottom = 0
    return layersWithHeights.slice().reverse().map(layer => {
      const positionedLayer = {
        ...layer,
        bottom: currentBottom,
      }
      currentBottom += layer.height
      return positionedLayer
    }).reverse() // Reverse back to maintain z-order (first added at bottom)
  }, [uniqueSelectedOils, bottleSize, recentlyAdded])
  
  // Calculate carrier layer
  const carrierHeight = mode === 'carrier' 
    ? ((bottleSize - currentEssentialOilMl) / bottleSize) * 100 
    : 0
  
  if (selectedOils.length === 0) {
    return (
      <div className="p-8 rounded-3xl bg-gradient-to-b from-[#1a1a2e] to-[#0a080c] border border-[#f5f3ef]/10 relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-[#c9a227]/5 blur-3xl rounded-full" />
        
        <div className="relative text-center py-12">
          {/* Empty chamber visualization */}
          <div className="relative w-32 h-48 mx-auto mb-6">
            {/* Glass chamber */}
            <div className="absolute inset-0 rounded-3xl border-2 border-[#f5f3ef]/10 bg-gradient-to-b from-[#1a1a2e]/30 to-[#0a080c]/50 overflow-hidden">
              {/* Glass reflections */}
              <div className="absolute top-4 left-2 w-1 h-32 bg-gradient-to-b from-white/10 to-transparent rounded-full" />
              <div className="absolute top-8 right-3 w-0.5 h-20 bg-gradient-to-b from-white/5 to-transparent rounded-full" />
            </div>
            {/* Chamber neck */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-10 h-6 rounded-t-xl border-2 border-b-0 border-[#f5f3ef]/10 bg-[#111]/50" />
          </div>
          
          <h3 className="text-xl font-serif text-[#f5f3ef] mb-2">The Blend Chamber</h3>
          <p className="text-sm text-[#a69b8a] max-w-xs mx-auto">
            Add oils from below to see them blend in real-time
          </p>
          <div className="flex items-center justify-center gap-4 mt-4 text-xs text-[#a69b8a]/60">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#c9a227]" />
              from 0.1ml per addition
            </span>
            <span className="flex items-center gap-1">
              <Droplets className="w-3 h-3" />
              {maxEssentialOilMl}ml capacity
            </span>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="p-6 rounded-3xl bg-gradient-to-b from-[#1a1a2e] to-[#0a080c] border border-[#c9a227]/30 relative overflow-hidden">
      {/* Ambient glow effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-[#c9a227]/10 blur-3xl rounded-full pointer-events-none" />
      
      {/* Header */}
      <div className="relative flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#c9a227]/20 flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-[#c9a227]" />
          </div>
          <div>
            <h3 className="text-lg font-serif text-[#f5f3ef]">Blend Chamber</h3>
            <p className="text-xs text-[#a69b8a]">
              {selectedOils.length} oil{selectedOils.length !== 1 ? 's' : ''} • {currentEssentialOilMl.toFixed(1)}ml / {maxEssentialOilMl}ml
            </p>
          </div>
        </div>
        
        {isBottleComplete && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="px-3 py-1.5 rounded-full bg-[#2ecc71]/20 border border-[#2ecc71]/40"
          >
            <span className="text-xs text-[#2ecc71] font-medium flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Complete
            </span>
          </motion.div>
        )}
      </div>
      
      <div className="relative flex gap-6">
        {/* The Chamber - Visual Bottle */}
        <div className="relative w-28 flex-shrink-0">
          {/* Pouring animation overlay */}
          <AnimatePresence>
            {pourAnimation && (
              <motion.div
                initial={{ y: -40, opacity: 1, height: 0 }}
                animate={{ y: 0, opacity: 1, height: 60 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.8, ease: "easeIn" }}
                className="absolute left-1/2 -translate-x-1/2 w-4 rounded-full z-20"
                style={{ backgroundColor: pourAnimation.color, top: -20 }}
              />
            )}
          </AnimatePresence>
          
          {/* Glass container */}
          <div className="relative h-56 rounded-3xl border-2 border-[#f5f3ef]/20 bg-gradient-to-b from-[#1a1a2e]/20 to-[#0a080c]/40 overflow-hidden backdrop-blur-sm">
            {/* Glass shine effects */}
            <div className="absolute top-4 left-2 w-1.5 h-40 bg-gradient-to-b from-white/20 via-white/5 to-transparent rounded-full z-10" />
            <div className="absolute top-8 right-2.5 w-0.5 h-24 bg-gradient-to-b from-white/10 to-transparent rounded-full z-10" />
            
            {/* Measurement lines - positioned from BOTTOM up to match fill direction */}
            <div className="absolute right-0 top-0 bottom-0 w-8 pr-2">
              {[0, 25, 50, 75, 100].map((pct) => (
                <div 
                  key={pct} 
                  className="absolute right-2 flex items-center justify-end gap-1"
                  style={{ bottom: `${pct}%`, transform: 'translateY(50%)' }}
                >
                  <span className="text-[8px] text-[#a69b8a]/40">{pct}%</span>
                  <div className="w-2 h-px bg-[#a69b8a]/30" />
                </div>
              ))}
            </div>
            
            {/* Oil layers - positioned from BOTTOM up */}
            {oilLayers.map((layer, index) => (
              <motion.div
                key={layer.oilId}
                layout
                initial={layer.isNew ? { height: 0, opacity: 0 } : false}
                animate={{ 
                  height: `${layer.height}%`, 
                  opacity: 1,
                }}
                transition={{ 
                  type: "spring", 
                  stiffness: 300, 
                  damping: 30,
                  delay: layer.isNew ? 0.3 : 0
                }}
                className="absolute left-0 right-0 group cursor-pointer"
                style={{ 
                  backgroundColor: layer.color,
                  bottom: `${layer.bottom}%`,
                }}
              >
                {/* Layer info on hover */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                  <span className="text-[9px] text-white font-medium px-1 truncate max-w-full">
                    {layer.ml.toFixed(1)}ml
                  </span>
                </div>
                
                {/* Ripple effect for newly added */}
                {layer.isNew && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 1 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    transition={{ duration: 1, repeat: 2 }}
                    className="absolute inset-0 bg-white/30"
                  />
                )}
              </motion.div>
            ))}
            
            {/* Carrier oil layer (bottom) */}
            {mode === 'carrier' && carrierHeight > 0 && (
              <motion.div
                layout
                initial={{ height: 0 }}
                animate={{ height: `${carrierHeight}%` }}
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#f5e6c8] to-[#f5e6c8]/80 flex items-center justify-center"
              >
                <span className="text-[9px] text-[#8B7355] font-medium text-center px-1">
                  {(bottleSize - currentEssentialOilMl).toFixed(1)}ml {carrierOilName || 'carrier'}
                </span>
              </motion.div>
            )}
            
            {/* Fill level indicator */}
            <div className="absolute left-0 right-0 h-px bg-[#c9a227]/50 z-20" 
              style={{ bottom: `${(currentEssentialOilMl / bottleSize) * 100}%` }}
            >
              <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-[#c9a227]" />
            </div>
          </div>
          
          {/* Chamber neck */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-10 h-6 rounded-t-xl border-2 border-b-0 border-[#f5f3ef]/20 bg-gradient-to-b from-[#1a1a2e]/40 to-[#111]/60" />
        </div>
        
        {/* Oil Controls Panel */}
        <div className="flex-1 space-y-2 max-h-64 overflow-y-auto pr-1">
          {uniqueSelectedOils.map((oil) => {
            const oilInfo = ATELIER_OILS.find(o => o.id === oil.oilId)
            const percentage = ((oil.ml / bottleSize) * 100).toFixed(1)
            const isNew = recentlyAdded === oil.oilId
            
            return (
              <motion.div
                key={oil.oilId}
                layout
                initial={isNew ? { x: -20, opacity: 0 } : false}
                animate={{ x: 0, opacity: 1 }}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border transition-all",
                  isNew 
                    ? "bg-[#c9a227]/10 border-[#c9a227]/50 shadow-lg shadow-[#c9a227]/10" 
                    : "bg-[#0a080c]/60 border-[#f5f3ef]/10 hover:border-[#f5f3ef]/20"
                )}
              >
                {/* Color indicator */}
                <motion.div 
                  animate={isNew ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 0.5 }}
                  className="w-10 h-10 rounded-lg border border-white/20 flex-shrink-0 relative overflow-hidden"
                  style={{ backgroundColor: oilInfo?.color || '#666' }}
                >
                  {isNew && (
                    <motion.div
                      initial={{ y: '-100%' }}
                      animate={{ y: '100%' }}
                      transition={{ duration: 0.8 }}
                      className="absolute inset-0 bg-white/40"
                    />
                  )}
                </motion.div>
                
                {/* Oil info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#f5f3ef] truncate">{oilInfo?.name}</p>
                  <p className="text-xs text-[#a69b8a]">{percentage}% of blend</p>
                </div>
                
                {/* Amount controls with editable input and hold-to-adjust */}
                <OilAmountControl
                  oilId={oil.oilId}
                  ml={oil.ml}
                  onAdjust={onAdjustOil}
                  currentEssentialOilMl={currentEssentialOilMl}
                  maxEssentialOilMl={maxEssentialOilMl}
                  bottleSize={bottleSize}
                />
                
                {/* Remove button */}
                <button
                  onClick={() => onRemoveOil(oil.oilId)}
                  className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            )
          })}
          
          {/* Capacity indicator */}
          <div className="pt-2">
            <div className="flex items-center justify-between text-xs text-[#a69b8a] mb-1">
              <span>Chamber Capacity</span>
              <span>{((currentEssentialOilMl / maxEssentialOilMl) * 100).toFixed(0)}%</span>
            </div>
            <div className="h-2 rounded-full bg-[#0a080c] border border-[#f5f3ef]/10 overflow-hidden">
              <motion.div
                className={cn(
                  "h-full rounded-full",
                  isBottleComplete ? "bg-[#2ecc71]" : "bg-gradient-to-r from-[#c9a227] to-[#f5d547]"
                )}
                initial={{ width: 0 }}
                animate={{ width: `${(currentEssentialOilMl / maxEssentialOilMl) * 100}%` }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Quick Actions */}
      {selectedOils.length > 0 && (
        <div className="relative mt-4 pt-4 border-t border-[#f5f3ef]/10 flex items-center justify-between">
          <button
            onClick={() => selectedOils.forEach(o => onRemoveOil(o.oilId))}
            className="flex items-center gap-1.5 text-xs text-[#a69b8a] hover:text-red-400 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear All
          </button>
          
          <div className="flex items-center gap-3 text-xs">
            <span className="text-[#a69b8a]">
              Total: <span className="text-[#f5f3ef] font-medium">{currentEssentialOilMl.toFixed(1)}ml</span>
            </span>
            {mode === 'carrier' && (
              <span className="text-[#a69b8a]">
                Carrier: <span className="text-[#f5e6c8] font-medium">{(bottleSize - currentEssentialOilMl).toFixed(1)}ml</span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// COMPONENT: Oil Interaction Warnings with Consent
// ============================================================================
function OilInteractionWarnings({ 
  selectedOils,
  userProfile,
  acknowledgedInteractions,
  onAcknowledgeInteraction
}: { 
  selectedOils: { oilId: string; ml: number }[]
  userProfile: {
    isPregnant?: boolean
    isTryingToConceive?: boolean
    onBloodThinners?: boolean
    hasEpilepsy?: boolean
    hasBleedingDisorder?: boolean
    age?: number
  }
  acknowledgedInteractions: string[]
  onAcknowledgeInteraction: (interactionKey: string) => void
}) {
  const interactions = useMemo(() => {
    const oilIds = selectedOils.map(o => o.oilId)
    return getInteractionsForMix(oilIds)
  }, [selectedOils])

  if (interactions.length === 0) return null

  const severityColors = {
    low: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    moderate: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    high: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
    critical: 'bg-red-500/10 border-red-500/30 text-red-400',
  }

  const severityIcons = {
    low: Info,
    moderate: AlertCircle,
    high: AlertTriangle,
    critical: AlertOctagon,
  }
  
  // Check if any critical interactions are unacknowledged
  const criticalUnacknowledged = interactions.some(
    i => i.severity === 'critical' && 
    !acknowledgedInteractions.includes(`${i.oilId1}-${i.oilId2}`)
  )

  return (
    <div className="p-5 rounded-xl bg-[#111] border border-[#f5f3ef]/10">
      <h4 className="text-sm font-medium text-[#a69b8a] mb-4 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" />
        Oil Interaction Warnings
        <span className="px-2 py-0.5 rounded-full bg-[#c9a227]/20 text-[#c9a227] text-xs">
          {interactions.length} found
        </span>
        {criticalUnacknowledged && (
          <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs animate-pulse">
            CONSENT REQUIRED
          </span>
        )}
      </h4>

      <div className="space-y-3">
        {interactions.map((interaction, index) => {
          const Icon = severityIcons[interaction.severity]
          const colors = severityColors[interaction.severity]
          const interactionKey = `${interaction.oilId1}-${interaction.oilId2}`
          const isAcknowledged = acknowledgedInteractions.includes(interactionKey)
          
          // Determine if acknowledgment is required
          const requiresAck = interaction.severity === 'critical' || 
            (interaction.severity === 'high' && (
              userProfile.isPregnant || 
              userProfile.isTryingToConceive || 
              userProfile.onBloodThinners ||
              userProfile.hasEpilepsy ||
              userProfile.hasBleedingDisorder
            ))
          
          return (
            <motion.div
              key={interactionKey}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                `p-4 rounded-lg border ${colors}`,
                requiresAck && !isAcknowledged && 'ring-2 ring-red-500/50'
              )}
            >
              <div className="flex items-start gap-3">
                <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h5 className="font-medium">{interaction.title}</h5>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-medium ${
                      interaction.severity === 'critical' ? 'bg-red-500/20' :
                      interaction.severity === 'high' ? 'bg-orange-500/20' :
                      interaction.severity === 'moderate' ? 'bg-amber-500/20' :
                      'bg-blue-500/20'
                    }`}>
                      {interaction.severity}
                    </span>
                    {requiresAck && (
                      <span className="px-2 py-0.5 rounded-full bg-red-500/30 text-red-300 text-[10px]">
                        {isAcknowledged ? '✓ ACKNOWLEDGED' : 'REQUIRES CONSENT'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm opacity-90 mb-2">{interaction.description}</p>
                  <p className="text-xs opacity-70 mb-2">{interaction.explanation}</p>
                  <div className="p-2 rounded bg-[#0a080c]/50 mb-3">
                    <p className="text-xs">
                      <span className="font-medium">Recommendation:</span> {interaction.recommendation}
                    </p>
                  </div>
                  
                  {/* Consent checkbox for critical/high risk interactions */}
                  {requiresAck && (
                    <label className="flex items-start gap-3 cursor-pointer p-3 rounded bg-[#0a080c]/80 border border-red-500/30">
                      <input
                        type="checkbox"
                        checked={isAcknowledged}
                        onChange={() => onAcknowledgeInteraction(interactionKey)}
                        className="mt-0.5 w-4 h-4 rounded border-red-500/50 bg-[#0a080c] text-red-500 focus:ring-red-500"
                      />
                      <span className="text-xs text-red-200">
                        I understand that combining {interaction.oilId1} and {interaction.oilId2} 
                        {interaction.severity === 'critical' 
                          ? ' poses a CRITICAL risk. I accept full responsibility for using this combination.'
                          : ' may not be recommended for my health profile. I accept responsibility for this choice.'}
                      </span>
                    </label>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {hasCriticalInteraction(selectedOils.map(o => o.oilId)) && (
        <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/50">
          <p className="text-sm text-red-400 flex items-center gap-2">
            <AlertOctagon className="w-5 h-5" />
            <strong>Critical Warning:</strong> This combination contains serious incompatibilities. 
            Please review carefully before proceeding.
          </p>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// COMPONENT: Save Draft Dialog
// ============================================================================
function SaveDraftDialog({
  isOpen,
  onClose,
  onSave,
  recipeName,
  selectedOils,
  mode,
  bottleSize,
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string, notes: string) => void
  recipeName: string
  selectedOils: { oilId: string; ml: number }[]
  mode: 'pure' | 'carrier'
  bottleSize: number
}) {
  const [name, setName] = useState(recipeName || '')
  const [notes, setNotes] = useState('')

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-[#111] border border-[#f5f3ef]/10 rounded-2xl p-6 w-full max-w-md"
          onClick={e => e.stopPropagation()}
        >
          <h3 className="text-xl font-medium text-[#f5f3ef] mb-4 flex items-center gap-2">
            <Save className="w-5 h-5 text-[#c9a227]" />
            Save Draft Blend
          </h3>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-[#a69b8a] mb-1 block">Blend Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Sleep Blend"
                className="w-full px-4 py-3 rounded-xl bg-[#0a080c] border border-[#f5f3ef]/10 text-[#f5f3ef] focus:border-[#c9a227] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-sm text-[#a69b8a] mb-1 block">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Why you created this blend, how it smells, etc."
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-[#0a080c] border border-[#f5f3ef]/10 text-[#f5f3ef] focus:border-[#c9a227] focus:outline-none resize-none"
              />
            </div>

            <div className="p-3 rounded-lg bg-[#0a080c]">
              <p className="text-xs text-[#a69b8a]">
                {selectedOils.length} oils • {mode} • {bottleSize}ml bottle
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-[#f5f3ef]/10 text-[#a69b8a] hover:text-[#f5f3ef] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onSave(name, notes)
                onClose()
              }}
              disabled={!name.trim()}
              className="flex-1 py-3 rounded-xl bg-[#c9a227] text-[#0a080c] font-medium hover:bg-[#f5f3ef] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Draft
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ============================================================================
// COMPONENT: Comprehensive Oil Detail Modal
// ============================================================================
function OilDetailModal({
  oil,
  isOpen,
  onClose,
  onAddOil,
  isAdded,
  currentMl,
}: {
  oil: AtelierOil | null
  isOpen: boolean
  onClose: () => void
  onAddOil: (oilId: string) => void
  isAdded: boolean
  currentMl: number
}) {
  if (!isOpen || !oil) return null
  
  const wisdom = getOilWisdom(oil.id)
  const pricePerMl = oil.collectionPrice30ml / 30
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-[#111] border border-[#f5f3ef]/10 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header with oil color banner */}
          <div className="relative h-32" style={{ backgroundColor: oil.color }}>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#111]" />
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="absolute bottom-4 left-6">
              <h2 className="text-3xl font-serif text-white drop-shadow-lg">{oil.name}</h2>
              <p className="text-white/80 text-sm">{oil.botanicalName}</p>
            </div>
          </div>
          
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-128px)]">
            {/* Quick Info Bar */}
            <div className="flex flex-wrap gap-4 mb-6 p-4 rounded-xl bg-[#0a080c] border border-[#f5f3ef]/10">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#c9a227]" />
                <span className="text-sm text-[#a69b8a]">Origin: <span className="text-[#f5f3ef]">{oil.origin || 'Various'}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-[#c9a227]" />
                <span className="text-sm text-[#a69b8a]">Extraction: <span className="text-[#f5f3ef]">{oil.extractionMethod || 'Steam Distilled'}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#c9a227]" />
                <span className="text-sm text-[#a69b8a]">Rarity: <span className="text-[#f5f3ef] capitalize">{oil.rarity}</span></span>
              </div>
              {oil.certification && (
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#c9a227]" />
                  <span className="text-sm text-[#a69b8a]">Cert: <span className="text-[#f5f3ef]">{oil.certification}</span></span>
                </div>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-[#a69b8a]">Price:</span>
                <span className="text-lg font-medium text-[#c9a227]">${pricePerMl.toFixed(2)}/ml</span>
              </div>
            </div>
            
            {wisdom ? (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* Description */}
                  <section>
                    <h3 className="text-lg font-medium text-[#f5f3ef] mb-3 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-[#c9a227]" />
                      Essence
                    </h3>
                    <p className="text-[#a69b8a] text-sm leading-relaxed italic">
                      &ldquo;{wisdom.description.short}&rdquo;
                    </p>
                  </section>
                  
                  {/* Scientific */}
                  <section>
                    <h3 className="text-lg font-medium text-[#f5f3ef] mb-3 flex items-center gap-2">
                      <Beaker className="w-5 h-5 text-[#c9a227]" />
                      Scientific Understanding
                    </h3>
                    <p className="text-[#a69b8a] text-sm leading-relaxed">
                      {wisdom.description.scientific}
                    </p>
                    {wisdom.constituents && (
                      <div className="mt-3 p-3 rounded-lg bg-[#0a080c]">
                        <p className="text-xs text-[#c9a227] font-medium mb-1">Key Constituents:</p>
                        <p className="text-xs text-[#a69b8a]">{wisdom.constituents.primary.join(', ')}</p>
                      </div>
                    )}
                  </section>
                  
                  {/* Physical Benefits */}
                  <section>
                    <h3 className="text-lg font-medium text-[#f5f3ef] mb-3 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-[#c9a227]" />
                      Physical Properties
                    </h3>
                    <p className="text-[#a69b8a] text-sm leading-relaxed">
                      {wisdom.description.physical}
                    </p>
                  </section>
                  
                  {/* Traditional Uses */}
                  {wisdom.traditionalUses && (
                    <section>
                      <h3 className="text-lg font-medium text-[#f5f3ef] mb-3 flex items-center gap-2">
                        <History className="w-5 h-5 text-[#c9a227]" />
                        Ancient Wisdom
                      </h3>
                      <p className="text-[#a69b8a] text-sm leading-relaxed mb-2">
                        {wisdom.traditionalUses.history}
                      </p>
                      {wisdom.traditionalUses.cultures && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {wisdom.traditionalUses.cultures.map(culture => (
                            <span key={culture} className="text-xs px-2 py-1 rounded-full bg-[#c9a227]/20 text-[#c9a227]">
                              {culture}
                            </span>
                          ))}
                        </div>
                      )}
                      {wisdom.traditionalUses.folklore && (
                        <p className="text-[#a69b8a]/70 text-xs mt-2 italic">
                          Folklore: {wisdom.traditionalUses.folklore}
                        </p>
                      )}
                    </section>
                  )}
                </div>
                
                {/* Right Column */}
                <div className="space-y-6">
                  {/* Spiritual */}
                  <section>
                    <h3 className="text-lg font-medium text-[#f5f3ef] mb-3 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-[#c9a227]" />
                      Spiritual & Energetic
                    </h3>
                    <p className="text-[#a69b8a] text-sm leading-relaxed">
                      {wisdom.description.spiritual}
                    </p>
                    <div className="flex flex-wrap gap-3 mt-3">
                      <span className="text-xs px-2 py-1 rounded-full bg-[#f5f3ef]/10 text-[#a69b8a]">
                        Element: {wisdom.element}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-[#f5f3ef]/10 text-[#a69b8a]">
                        Chakra: {wisdom.chakra}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-[#f5f3ef]/10 text-[#a69b8a]">
                        {wisdom.frequency.note} note • {wisdom.frequency.hz}Hz
                      </span>
                    </div>
                  </section>
                  
                  {/* Mental & Emotional */}
                  <section>
                    <h3 className="text-lg font-medium text-[#f5f3ef] mb-3 flex items-center gap-2">
                      <Brain className="w-5 h-5 text-[#c9a227]" />
                      Mental & Emotional
                    </h3>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-[#c9a227] font-medium">Mental:</p>
                        <p className="text-[#a69b8a] text-sm">{wisdom.description.mental}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#c9a227] font-medium">Emotional:</p>
                        <p className="text-[#a69b8a] text-sm">{wisdom.description.emotional}</p>
                      </div>
                    </div>
                  </section>
                  
                  {/* Therapeutic Benefits */}
                  {wisdom.therapeutic && (
                    <section>
                      <h3 className="text-lg font-medium text-[#f5f3ef] mb-3 flex items-center gap-2">
                        <Heart className="w-5 h-5 text-[#c9a227]" />
                        Therapeutic Applications
                      </h3>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-[#c9a227] font-medium">Benefits:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {wisdom.therapeutic.benefits.map(benefit => (
                              <span key={benefit} className="text-xs px-2 py-0.5 rounded bg-[#2ecc71]/20 text-[#2ecc71]">
                                {benefit}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="mt-2">
                          <p className="text-xs text-[#c9a227] font-medium">Best for:</p>
                          <p className="text-[#a69b8a] text-xs">{wisdom.therapeutic.indications.join(', ')}</p>
                        </div>
                      </div>
                    </section>
                  )}
                  
                  {/* Application */}
                  {wisdom.application && (
                    <section>
                      <h3 className="text-lg font-medium text-[#f5f3ef] mb-3 flex items-center gap-2">
                        <Droplets className="w-5 h-5 text-[#c9a227]" />
                        How to Use
                      </h3>
                      <p className="text-[#a69b8a] text-sm">
                        <span className="text-[#c9a227]">Methods:</span> {wisdom.application.bestMethods.join(', ')}
                      </p>
                      <p className="text-[#a69b8a] text-sm mt-1">
                        <span className="text-[#c9a227]">Dilution:</span> {wisdom.application.dilutionGuidelines}
                      </p>
                    </section>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-[#a69b8a]">
                <p>Detailed wisdom for this oil is being compiled.</p>
              </div>
            )}
            
            {/* Action Button */}
            <div className="mt-8 pt-6 border-t border-[#f5f3ef]/10 flex justify-end">
              {isAdded ? (
                <div className="flex items-center gap-4">
                  <span className="text-[#2ecc71] text-sm">
                    <CheckCircle className="w-4 h-4 inline mr-1" />
                    {currentMl.toFixed(1)}ml added
                  </span>
                  <button
                    onClick={onClose}
                    className="px-6 py-3 rounded-xl bg-[#0a080c] border border-[#f5f3ef]/10 text-[#a69b8a] hover:text-[#f5f3ef] transition-colors"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="px-6 py-3 rounded-xl bg-[#0a080c] border border-[#f5f3ef]/10 text-[#a69b8a] hover:text-[#f5f3ef] transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      onAddOil(oil.id)
                      onClose()
                    }}
                    className="px-6 py-3 rounded-xl bg-[#c9a227] text-[#0a080c] font-medium hover:bg-[#f5f3ef] transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add to Blend
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================
export default function MixingAtelierPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { activeProfile, isProfileComplete } = useHealthProfile()
  const healthProfile = activeProfile?.data
  const { createRecipe, myRecipes } = useRecipes()
  const { isAuthenticated, user } = useUser()
  const { addItem, isLoading: isCartLoading, openCart } = useCart()
  
  // Safety check: Show profile form by default (safety first), hide only if profile is complete
  const [showProfileForm, setShowProfileForm] = useState(!isProfileComplete)
  const [mode, setMode] = useState<'pure' | 'carrier'>('pure')
  
  // Toast notifications
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' | 'info' }[]>([])
  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
  }, [])
  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])
  
  // Update showProfileForm when isProfileComplete changes (e.g., after context loads)
  useEffect(() => {
    setShowProfileForm(!isProfileComplete)
  }, [isProfileComplete])

  const [selectedOils, setSelectedOils] = useState<{ oilId: string; ml: number }[]>([])
  const [carrierRatio, setCarrierRatio] = useState<number>(25)
  const [selectedCarrierOilId, setSelectedCarrierOilId] = useState<string>('jojoba')
  const [bottleSize, setBottleSize] = useState<number>(30)
  const [recipeName, setRecipeName] = useState('')
  const [blendDescription, setBlendDescription] = useState('')
  const [blendStory, setBlendStory] = useState('')
  const [sourceBlendId, setSourceBlendId] = useState<string | null>(null)
  const [consentToShare, setConsentToShare] = useState(false)
  const [cartQuantity, setCartQuantity] = useState(1)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedCrystalId, setSelectedCrystalId] = useState<string | undefined>('clear-quartz')
  const [showCrystalSelector, setShowCrystalSelector] = useState(false)
  const [showCarrierSelector, setShowCarrierSelector] = useState(false)
  
  // New state for enhancements
  const [intendedUse, setIntendedUse] = useState<string>('other')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [oilSearchQuery, setOilSearchQuery] = useState('')
  const [acknowledgedWarningIds, setAcknowledgedWarningIds] = useState<string[]>([])
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [showCertificateModal, setShowCertificateModal] = useState(false)

  const hasLoadedDraftRef = useRef(false)

  // Load draft: URL param takes precedence, otherwise localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (hasLoadedDraftRef.current) return
    hasLoadedDraftRef.current = true
    const params = new URLSearchParams(window.location.search)
    const encoded = params.get('blend')
    if (encoded) {
      try {
        const json = atob(encoded)
        const data = JSON.parse(json)
        if (data.oils && Array.isArray(data.oils)) {
          setSelectedOils(data.oils.map((o: any) => ({ oilId: o.oilId, ml: o.ml })))
        }
        if (data.mode === 'pure' || data.mode === 'carrier') {
          setMode(data.mode)
        }
        if (typeof data.bottleSize === 'number') {
          setBottleSize(data.bottleSize)
        }
        if (typeof data.carrierRatio === 'number') {
          setCarrierRatio(data.carrierRatio)
        }
        if (data.carrierOilId) {
          setSelectedCarrierOilId(data.carrierOilId)
        }
        if (data.crystalId) {
          setSelectedCrystalId(data.crystalId)
        }
        if (data.cordId) {
          setSelectedCordId(data.cordId)
        }
        if (data.name) {
          setRecipeName(data.name)
        }
        if (data.blendId) {
          setSourceBlendId(data.blendId)
        }
        // Also persist this shared blend to localStorage so it survives refresh
        localStorage.setItem('oil-amor-atelier-draft', json)
      } catch {
        // ignore invalid blend param
      }
      return
    }

    // No URL param: try to restore from localStorage
    const saved = localStorage.getItem('oil-amor-atelier-draft')
    if (saved) {
      try {
        const data = JSON.parse(saved)
        if (data.oils && Array.isArray(data.oils)) {
          setSelectedOils(data.oils.map((o: any) => ({ oilId: o.oilId, ml: o.ml })))
        }
        if (data.mode === 'pure' || data.mode === 'carrier') {
          setMode(data.mode)
        }
        if (typeof data.bottleSize === 'number') {
          setBottleSize(data.bottleSize)
        }
        if (typeof data.carrierRatio === 'number') {
          setCarrierRatio(data.carrierRatio)
        }
        if (data.carrierOilId) {
          setSelectedCarrierOilId(data.carrierOilId)
        }
        if (data.crystalId) {
          setSelectedCrystalId(data.crystalId)
        }
        if (data.cordId) {
          setSelectedCordId(data.cordId)
        }
        if (data.name || data.recipeName) {
          setRecipeName(data.name || data.recipeName || '')
        }
        if (data.blendDescription || data.description) {
          setBlendDescription(data.blendDescription || data.description || '')
        }
        if (data.blendStory || data.story) {
          setBlendStory(data.blendStory || data.story || '')
        }
        if (data.intendedUse) {
          setIntendedUse(data.intendedUse)
        }
        if (data.tags && Array.isArray(data.tags)) {
          setTags(data.tags)
        }
        if (typeof data.consentToShare === 'boolean') {
          setConsentToShare(data.consentToShare)
        }
      } catch {
        // ignore corrupted draft
      }
    }
  }, [searchParams])


  // Cord & Revelation State
  const [selectedCordId, setSelectedCordId] = useState<string>(DEFAULT_SIMPLE_CORD.id)
  const [showRevelationModal, setShowRevelationModal] = useState(false)
  const [blendCodex, setBlendCodex] = useState<BlendCodex | null>(null)
  const [isGeneratingRevelation, setIsGeneratingRevelation] = useState(false)
  const [revelationFact, setRevelationFact] = useState('')
  
  // Category filter state
  const [selectedCategories, setSelectedCategories] = useState<OilCategory[]>([])
  const [showAllCategories, setShowAllCategories] = useState(false)
  const [selectedOilForWisdom, setSelectedOilForWisdom] = useState<string | null>(null)
  const [selectedOilForDetail, setSelectedOilForDetail] = useState<AtelierOil | null>(null)
  const [isOilDetailModalOpen, setIsOilDetailModalOpen] = useState(false)
  
  // Draft saving state
  const [savedDrafts, setSavedDrafts] = useState<Array<{
    id: string
    name: string
    notes: string
    oils: { oilId: string; ml: number }[]
    mode: 'pure' | 'carrier'
    bottleSize: number
    createdAt: string
  }>>([])
  const [showSaveDraftDialog, setShowSaveDraftDialog] = useState(false)
  
  // Acknowledged oil-oil interactions (for consent tracking)
  const [acknowledgedInteractions, setAcknowledgedInteractions] = useState<string[]>([])
  
  // Recipe name validation
  const [recipeNameError, setRecipeNameError] = useState<string | null>(null)
  
  // Persist atelier state to localStorage so refresh doesn't lose work
  useEffect(() => {
    if (typeof window === 'undefined') return
    const draft = {
      oils: selectedOils,
      mode,
      bottleSize,
      carrierRatio,
      carrierOilId: selectedCarrierOilId,
      crystalId: selectedCrystalId,
      cordId: selectedCordId,
      name: recipeName,
      blendDescription,
      blendStory,
      intendedUse,
      tags,
      consentToShare,
    }
    localStorage.setItem('oil-amor-atelier-draft', JSON.stringify(draft))
  }, [selectedOils, mode, bottleSize, carrierRatio, selectedCarrierOilId, selectedCrystalId, selectedCordId, recipeName, blendDescription, blendStory, intendedUse, tags, consentToShare])
  
  // Calculate maximum essential oil capacity
  const maxEssentialOilMl = useMemo(() => {
    if (mode === 'pure') {
      return bottleSize
    } else {
      return Math.round((bottleSize * carrierRatio) / 100 * 10) / 10
    }
  }, [mode, bottleSize, carrierRatio])
  
  const carrierOilMl = useMemo(() => {
    if (mode === 'pure') return 0
    return Math.round((bottleSize - maxEssentialOilMl) * 10) / 10
  }, [mode, bottleSize, maxEssentialOilMl])
  
  // Deduplicate and calculate total (keep last occurrence if duplicates exist)
  const currentEssentialOilMl = useMemo(() => {
    const uniqueOils = new Map<string, number>()
    // Process in reverse to keep last occurrence
    for (let i = selectedOils.length - 1; i >= 0; i--) {
      const o = selectedOils[i]
      if (!uniqueOils.has(o.oilId)) {
        uniqueOils.set(o.oilId, o.ml)
      }
    }
    return parseFloat(Array.from(uniqueOils.values()).reduce((sum, ml) => sum + ml, 0).toFixed(1))
  }, [selectedOils])
  
  const remainingCapacity = useMemo(() => {
    return parseFloat((maxEssentialOilMl - currentEssentialOilMl).toFixed(1))
  }, [maxEssentialOilMl, currentEssentialOilMl])
  
  const isBottleComplete = useMemo(() => {
    // Use small epsilon for floating point comparison
    return remainingCapacity < 0.05 && currentEssentialOilMl > 0
  }, [remainingCapacity, currentEssentialOilMl])
  
  const isOverfilled = useMemo(() => {
    return currentEssentialOilMl > maxEssentialOilMl
  }, [currentEssentialOilMl, maxEssentialOilMl])
  
  // Calculate oil percentages
  const oilPercentages = useMemo(() => {
    if (currentEssentialOilMl === 0) return {}
    const percentages: Record<string, number> = {}
    selectedOils.forEach(o => {
      percentages[o.oilId] = Math.round((o.ml / currentEssentialOilMl) * 100)
    })
    return percentages
  }, [selectedOils, currentEssentialOilMl])
  
  const mixComponentsForValidation = useMemo<MixComponent[]>(() => {
    return selectedOils.map(o => ({
      oilId: o.oilId,
      ml: Math.round(o.ml * 10) / 10
    }))
  }, [selectedOils])
  
  const validation = useMemo<MixValidationResult | null>(() => {
    if (!healthProfile || selectedOils.length === 0) return null
    return validateOilMix({
      oils: mixComponentsForValidation,
      userProfile: healthProfile,
      totalVolumeMl: bottleSize,
      mode,
      intendedUse: healthProfile.intendedUse,
    })
  }, [mixComponentsForValidation, healthProfile, bottleSize, mode])

  // Comprehensive safety validation
  const comprehensiveSafety = useMemo<SafetyValidationResult | null>(() => {
    if (!healthProfile || selectedOils.length === 0) return null
    
    const oilComponents: OilComponent[] = selectedOils.map(o => ({
      oilId: o.oilId,
      name: ATELIER_OILS.find(ao => ao.id === o.oilId)?.name || o.oilId,
      ml: o.ml,
      drops: Math.round(o.ml * 20) // Keep for backwards compatibility with safety validation
    }))
    
    // Determine age group based on age
    const ageGroup: keyof typeof AGE_DOSAGE_LIMITS = 
      healthProfile.age < 0.25 ? 'infant_0_3mo' :
      healthProfile.age < 0.5 ? 'infant_3_6mo' :
      healthProfile.age < 1 ? 'infant_6_12mo' :
      healthProfile.age < 2 ? 'child_1_2yr' :
      healthProfile.age < 6 ? 'child_2_6yr' :
      healthProfile.age < 12 ? 'child_6_12yr' :
      healthProfile.age < 15 ? 'teen_12_15yr' :
      healthProfile.age < 65 ? 'adult' : 'elderly'
    
    const userProfile: UserSafetyProfile = {
      age: healthProfile.age,
      ageGroup,
      isPregnant: healthProfile.isPregnant,
      isBreastfeeding: healthProfile.isBreastfeeding,
      isTryingToConceive: healthProfile.isTryingToConceive,
      medications: healthProfile.medications.map((m: string) => ({ id: m, name: m, isActive: true })),
      healthConditions: healthProfile.conditions,
      knownAllergies: healthProfile.knownAllergies,
      hasSensitiveSkin: healthProfile.skinSensitivity !== 'normal',
      respiratorySensitivity: healthProfile.respiratorySensitivity,
      experienceLevel: (healthProfile.aromatherapyExperience as ExperienceLevel) || 'beginner',
    }
    
    return validateMixSafety(oilComponents, userProfile, mode === 'pure' ? 'inhalation' : 'topical')
  }, [selectedOils, healthProfile, mode])
  
  // Check if all critical warnings are acknowledged
  const allCriticalAcknowledged = useMemo(() => {
    if (!comprehensiveSafety?.requiresAcknowledgment) return true
    const criticalWarnings = comprehensiveSafety.warnings.filter(w => w.riskLevel === 'critical' && w.requiresAcknowledgment)
    if (criticalWarnings.length === 0) return true
    return criticalWarnings.every(w => acknowledgedWarningIds.includes(w.id))
  }, [comprehensiveSafety, acknowledgedWarningIds])
  
  // Count unacknowledged critical warnings
  const unacknowledgedCriticalCount = useMemo(() => {
    if (!comprehensiveSafety) return 0
    const criticalWarnings = comprehensiveSafety.warnings.filter(w => w.riskLevel === 'critical' && w.requiresAcknowledgment)
    return criticalWarnings.filter(w => !acknowledgedWarningIds.includes(w.id)).length
  }, [comprehensiveSafety, acknowledgedWarningIds])
  
  // Check if all critical oil-oil interactions are acknowledged
  const allInteractionsAcknowledged = useMemo(() => {
    if (selectedOils.length < 2) return true
    const interactions = getInteractionsForMix(selectedOils.map(o => o.oilId))
    const criticalInteractions = interactions.filter(i => i.severity === 'critical')
    if (criticalInteractions.length === 0) return true
    return criticalInteractions.every(i => 
      acknowledgedInteractions.includes(`${i.oilId1}-${i.oilId2}`)
    )
  }, [selectedOils, acknowledgedInteractions])
  
  const canAddToCart = useMemo(() => {
    return isBottleComplete && 
           validation?.canProceed && 
           allCriticalAcknowledged && 
           allInteractionsAcknowledged &&
           recipeName.trim().length >= 2 &&
           selectedCrystalId !== undefined &&
           selectedCordId !== undefined
  }, [isBottleComplete, validation?.canProceed, allCriticalAcknowledged, allInteractionsAcknowledged, recipeName, selectedCrystalId, selectedCordId])
  
  const priceBreakdown = useMemo(() => {
    if (selectedOils.length === 0) return null
    
    return calculateAtelierPrice({
      name: recipeName || 'Custom Blend',
      mode,
      bottleSize: bottleSize as 5 | 10 | 15 | 20 | 30,
      components: selectedOils,
      strength: mode === 'pure' ? 100 : carrierRatio,
      crystalId: selectedCrystalId,
      cordId: selectedCordId,
      safetyScore: validation?.safetyScore,
    })
  }, [selectedOils, bottleSize, mode, carrierRatio, selectedCrystalId, selectedCordId, recipeName, validation?.safetyScore])
  
  const estimatedPrice = priceBreakdown?.total || 0
  
  // Calculate blend rarity score
  const blendRarity = useMemo(() => {
    if (selectedOils.length === 0) return null
    
    let score = 0
    let luxuryCount = 0
    let premiumCount = 0
    
    selectedOils.forEach(o => {
      const oil = ATELIER_OILS.find(ao => ao.id === o.oilId)
      if (!oil) return
      
      if (oil.rarity === 'luxury') {
        score += 30
        luxuryCount++
      } else if (oil.rarity === 'premium') {
        score += 15
        premiumCount++
      } else {
        score += 5
      }
    })
    
    // Bonus for complexity
    score += selectedOils.length * 5
    
    // Bonus for crystal
    if (selectedCrystalId) score += 10
    
    // Cap at 100
    score = Math.min(score, 100)
    
    let rarity = 'Common'
    if (score >= 80) rarity = 'Legendary'
    else if (score >= 60) rarity = 'Epic'
    else if (score >= 40) rarity = 'Rare'
    else if (score >= 20) rarity = 'Uncommon'
    
    return { score, rarity, luxuryCount, premiumCount }
  }, [selectedOils, selectedCrystalId])
  
  // Get suggested oils based on health profile
  const suggestedOils = useMemo(() => {
    if (!healthProfile?.intendedUse) return []
    
    const useToCategories: Record<string, OilCategory[]> = {
      'sleep': ['stress-relief', 'grounding'],
      'energy': ['mood-uplifting', 'circulation'],
      'focus': ['mental-clarity', 'mood-uplifting'],
      'immunity': ['immune-support', 'antimicrobial'],
      'pain-relief': ['pain-relief', 'anti-inflammatory'],
      'stress-relief': ['stress-relief', 'grounding'],
    }
    
    const intendedUseKey = String(healthProfile.intendedUse || '')
    const categories = useToCategories[intendedUseKey] || []
    return AVAILABLE_OILS.filter(oil => {
      const wisdom = getOilWisdom(oil.id)
      if (!wisdom) return false
      return categories.some((cat: OilCategory) => wisdom.categories.includes(cat))
    }).slice(0, 4)
  }, [healthProfile])
  
  // Handle acknowledgment from SafetySummary
  const handleSafetyAcknowledge = useCallback((warningIds: string[]) => {
    setAcknowledgedWarningIds(warningIds)
  }, [])
  
  // Recipe name validation
  const validateRecipeName = useCallback((name: string): string | null => {
    if (name.length < 2) return 'Name must be at least 2 characters'
    if (name.length > 50) return 'Name must be less than 50 characters'
    const lowerName = name.toLowerCase()
    for (const word of PROFANITY_LIST) {
      if (lowerName.includes(word)) return 'Please use appropriate language'
    }
    return null
  }, [])
  
  const handleRecipeNameChange = useCallback((value: string) => {
    setRecipeName(value)
    setRecipeNameError(validateRecipeName(value))
  }, [validateRecipeName])
  
  const handleAddOil = useCallback((oilId: string) => {
    // Prevent adding oil if bottle is at capacity
    if (currentEssentialOilMl >= maxEssentialOilMl) return
    
    const oil = ATELIER_OILS.find(o => o.id === oilId)
    if (!oil) return
    
    const existing = selectedOils.find(o => o.oilId === oilId)
    const defaultAmount = mode === 'pure' ? PURE_DEFAULT_ML : CARRIER_DEFAULT_ML
    
    // Check if adding default amount would exceed capacity
    if (currentEssentialOilMl + defaultAmount > maxEssentialOilMl) return
    
    if (existing) {
      // Only add ML_PRECISION if we have room
      if (currentEssentialOilMl + ML_PRECISION > maxEssentialOilMl) return
      setSelectedOils(prev => prev.map(o => 
        o.oilId === oilId 
          ? { ...o, ml: Math.min(o.ml + ML_PRECISION, maxEssentialOilMl) }
          : o
      ))
    } else {
      setSelectedOils(prev => [...prev, { oilId, ml: defaultAmount }])
    }
  }, [selectedOils, maxEssentialOilMl, mode, currentEssentialOilMl])
  
  const handleRemoveOil = useCallback((oilId: string) => {
    setSelectedOils(prev => prev.filter(o => o.oilId !== oilId))
  }, [])
  
  const handleAdjustOil = useCallback((oilId: string, delta: number) => {
    setSelectedOils(prev => {
      // Calculate current total essential oil ml from previous state
      const prevTotal = prev.reduce((sum, o) => sum + o.ml, 0)
      
      return prev.map(o => {
        if (o.oilId !== oilId) return o
        
        // Calculate what the new amount would be
        const proposedMl = o.ml + delta
        
        // Calculate what the new total would be (subtract old amount, add new amount)
        const newTotal = prevTotal - o.ml + proposedMl
        
        // ENFORCE CAPACITY LIMIT: Don't allow exceeding maxEssentialOilMl
        if (delta > 0 && newTotal > maxEssentialOilMl) {
          // Only add what we can up to the max
          const maxAllowedForThisOil = o.ml + (maxEssentialOilMl - prevTotal)
          const cappedMl = Math.max(0, parseFloat(maxAllowedForThisOil.toFixed(1)))
          return cappedMl <= 0 ? null : { ...o, ml: cappedMl }
        }
        
        // Normal case: apply delta with lower bound of 0
        const newMl = Math.max(0, parseFloat(proposedMl.toFixed(1)))
        return newMl <= 0 ? null : { ...o, ml: newMl }
      }).filter(Boolean) as typeof prev
    })
  }, [maxEssentialOilMl])
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (canAddToCart) {
          handleSaveRecipe()
        }
      }
      // Ctrl/Cmd + Enter to add to cart
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        if (canAddToCart) {
          handleAddToCart()
        }
      }
      // +/- to adjust last added oil
      if (e.key === '+' || e.key === '=') {
        const lastOil = selectedOils[selectedOils.length - 1]
        if (lastOil && currentEssentialOilMl < maxEssentialOilMl) {
          handleAdjustOil(lastOil.oilId, ML_PRECISION)
        }
      }
      if (e.key === '-') {
        const lastOil = selectedOils[selectedOils.length - 1]
        if (lastOil) {
          handleAdjustOil(lastOil.oilId, -ML_PRECISION)
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [canAddToCart, selectedOils, currentEssentialOilMl, maxEssentialOilMl])
  
  const handleSaveRecipe = useCallback(async () => {
    if (!recipeName.trim() || recipeNameError) {
      addToast('Please enter a valid recipe name', 'error')
      return
    }
    
    setIsSaving(true)
    try {
      await createRecipe({
        name: recipeName,
        description: blendDescription,
        mode,
        oils: selectedOils.map(o => ({ 
          oilId: o.oilId, 
          ml: Math.round(o.ml * 10) / 10,
          percentage: oilPercentages[o.oilId] || 0
        })),
        carrierRatio: mode === 'carrier' ? carrierRatio : undefined,
        carrierOilId: mode === 'carrier' ? selectedCarrierOilId : undefined,
        totalVolume: bottleSize as 5 | 10 | 15 | 20 | 30 | 50 | 100,
        isPublic: consentToShare,
        tags: [...tags, intendedUse as any],
        intendedUse: intendedUse as any,
      })
      addToast('Recipe saved successfully!', 'success')
    } catch (error) {
      console.error('Failed to save recipe:', error)
      addToast('Failed to save recipe. Please try again.', 'error')
    } finally {
      setIsSaving(false)
    }
  }, [recipeName, recipeNameError, blendDescription, mode, bottleSize, carrierRatio, selectedCarrierOilId, selectedOils, oilPercentages, consentToShare, tags, intendedUse, createRecipe, addToast])
  
  // Save draft functionality
  const handleSaveDraft = useCallback((name: string, notes: string) => {
    const newDraft = {
      id: `draft-${Date.now()}`,
      name,
      notes,
      oils: [...selectedOils],
      mode,
      bottleSize,
      createdAt: new Date().toISOString(),
    }
    setSavedDrafts(prev => [newDraft, ...prev])
    addToast('Draft saved successfully!', 'success')
  }, [selectedOils, mode, bottleSize, addToast])
  
  // Add to Cart functionality
  const handleAddToCart = useCallback(async () => {
    if (!canAddToCart) return
    
    try {
      const cord = getSimpleCordById(selectedCordId)
      const crystal = selectedCrystalId 
        ? getAllCrystals().find(c => c.id === selectedCrystalId)
        : undefined
      
      const cartInput: AddToCartInput = {
        productId: 'custom-mix',
        quantity: cartQuantity,
        customMix: {
          recipeName: recipeName.trim(),
          mode,
          oils: selectedOils.map(o => ({
            oilId: o.oilId,
            oilName: ATELIER_OILS.find(ao => ao.id === o.oilId)?.name || o.oilId,
            ml: Math.round(o.ml * 10) / 10,
            percentage: oilPercentages[o.oilId] || 0,
          })),
          carrierRatio: mode === 'carrier' ? carrierRatio : undefined,
          carrierOilId: mode === 'carrier' ? selectedCarrierOilId : undefined,
          totalVolume: bottleSize as 5 | 10 | 15 | 20 | 30 | 50 | 100,
          intendedUse: intendedUse,
          tags: tags,
          safetyScore: comprehensiveSafety?.safetyScore || 100,
          safetyRating: (comprehensiveSafety?.safetyScore || 100) >= 90 ? 'excellent' : 
                        (comprehensiveSafety?.safetyScore || 100) >= 75 ? 'good' :
                        (comprehensiveSafety?.safetyScore || 100) >= 60 ? 'acceptable' :
                        (comprehensiveSafety?.safetyScore || 100) >= 40 ? 'caution' : 'dangerous',
          safetyWarnings: comprehensiveSafety?.warnings.map(w => w.title) || [],
          labCertified: true,
          revelationData: blendCodex ? JSON.parse(JSON.stringify(blendCodex)) : undefined,
          // Community sharing - only include if user consented
          ...(consentToShare && {
            shareToCommunity: true,
            creatorId: user?.id,
            creatorName: user?.name || user?.firstName || 'Anonymous Alchemist',
          }),
        },
        attachment: {
          type: 'cord',
          cordId: selectedCordId,
          cordName: cord.name,
          isMysteryCharm: false,
        },
        properties: {
          blendName: recipeName.trim(),
          bottleSize: `${bottleSize}ml`,
          mode: mode,
          carrierOil: mode === 'carrier' ? (CARRIER_OILS.find(c => c.id === selectedCarrierOilId)?.name || 'Jojoba Oil') : 'None',
          crystal: crystal?.name || 'None',
          cord: cord.name,
          intendedUse: INTENDED_USES.find(u => u.id === intendedUse)?.label || 'Other',
          rarity: blendRarity?.rarity || 'Common',
          ...(sourceBlendId && { blendId: sourceBlendId }),
        },
      }
      
      await addItem(cartInput)
      addToast('Blend added to cart!', 'success')
    } catch (error) {
      console.error('Failed to add to cart:', error)
      addToast('Failed to add to cart. Please try again.', 'error')
    }
  }, [canAddToCart, selectedOils, recipeName, mode, carrierRatio, selectedCarrierOilId, bottleSize, selectedCordId, selectedCrystalId, oilPercentages, comprehensiveSafety, intendedUse, blendRarity, addItem, addToast, consentToShare, user, cartQuantity, sourceBlendId])
  
  // Share blend functionality
  const handleShareBlend = useCallback(() => {
    const blendData = {
      oils: selectedOils,
      mode,
      bottleSize,
      carrierRatio: mode === 'carrier' ? carrierRatio : undefined,
      carrierOilId: mode === 'carrier' ? selectedCarrierOilId : undefined,
      crystalId: selectedCrystalId,
      cordId: selectedCordId,
    }
    
    const encoded = btoa(JSON.stringify(blendData))
    const url = `${window.location.origin}/mixing-atelier?blend=${encoded}`
    
    setShareUrl(url)
    setShowShareModal(true)
    
    navigator.clipboard.writeText(url).then(() => {
      addToast('Blend link copied to clipboard!', 'success')
    }).catch(() => {
      addToast('Failed to copy link', 'error')
    })
  }, [selectedOils, mode, bottleSize, carrierRatio, selectedCarrierOilId, selectedCrystalId, selectedCordId, addToast])
  
  // Navigate to recipes
  const handleNavigateToMyRecipes = useCallback(() => {
    router.push('/account?tab=recipes')
  }, [router])
  
  const handleNavigateToCommunity = useCallback(() => {
    router.push('/community-blends')
  }, [router])
  
  // Generate blend revelation using the Living Blend Codex
  const handleRevealBlend = useCallback(async () => {
    if (selectedOils.length === 0) return
    
    setIsGeneratingRevelation(true)
    setRevelationFact(BLEND_FACTS[Math.floor(Math.random() * BLEND_FACTS.length)])
    
    try {
      const totalMl = selectedOils.reduce((sum, o) => sum + o.ml, 0)
      const totalEssentialOilMl = selectedOils.reduce((sum, o) => sum + o.ml, 0)
      
      // Build the Living Codex Input
      const codexInput = {
        oils: selectedOils.map(o => {
          return {
            id: o.oilId,
            ml: o.ml,
            percentage: (o.ml / totalEssentialOilMl) * 100,
          }
        }),
        crystalId: selectedCrystalId || 'clear-quartz',
        cordId: selectedCordId,
        carrierId: mode === 'pure' ? 'pure' : (selectedCarrierOilId || 'jojoba'),
        bottleSize,
        mode: mode as 'pure' | 'carrier',
        carrierRatio: mode === 'carrier' ? carrierRatio : undefined
      }
      
      // Generate the Living Codex
      const codex = LivingBlendCodex.generate(codexInput)
      if (comprehensiveSafety) {
        codex.safetyValidation = comprehensiveSafety
      }
      setBlendCodex(codex)
      
      setTimeout(() => {
        setShowRevelationModal(true)
        setIsGeneratingRevelation(false)
      }, 1200)
    } catch (error) {
      console.error('Failed to generate codex:', error)
      addToast('Failed to generate blend codex. Please try again.', 'error')
      setIsGeneratingRevelation(false)
    }
  }, [selectedOils, selectedCordId, selectedCrystalId, mode, carrierRatio, selectedCarrierOilId, bottleSize, addToast])
  
  // Download blend certificate
  const handleDownloadCertificate = useCallback(() => {
    if (!blendCodex) return
    
    const certificateData = {
      blendName: recipeName || blendCodex.name || 'Unnamed Blend',
      soulHash: blendCodex.soulHash,
      uniquenessScore: blendCodex.uniquenessScore,
      essence: blendCodex.essence,
      vibrationalFrequency: blendCodex.composition.vibrationalFrequency,
      elemental: blendCodex.composition.elemental,
      oils: selectedOils.map(o => ({
        name: ATELIER_OILS.find(ao => ao.id === o.oilId)?.name,
        ml: o.ml,
        percentage: oilPercentages[o.oilId],
      })),
      crystal: blendCodex.crystal,
      cord: blendCodex.cord,
      carrier: blendCodex.carrier,
      therapeuticScores: blendCodex.therapeuticScores,
      bestFor: blendCodex.bestFor,
      timing: blendCodex.timing,
      safety: blendCodex.safety,
      ritual: blendCodex.ritual,
      carrierOil: mode === 'carrier' ? CARRIER_OILS.find(c => c.id === selectedCarrierOilId)?.name : null,
      carrierRatio: mode === 'carrier' ? carrierRatio : null,
      createdAt: new Date().toISOString(),
      rarity: blendRarity,
    }
    
    const blob = new Blob([JSON.stringify(certificateData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${recipeName || blendCodex.name || 'blend'}-certificate.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    addToast('Certificate downloaded!', 'success')
  }, [blendCodex, recipeName, selectedOils, oilPercentages, selectedCrystalId, selectedCordId, mode, selectedCarrierOilId, carrierRatio, blendRarity, addToast])
  
  // Filter oils by category and search query
  const filteredOils = useMemo(() => {
    let oils = AVAILABLE_OILS
    
    // Category filter
    if (selectedCategories.length > 0) {
      oils = oils.filter(oil => {
        const wisdom = getOilWisdom(oil.id)
        if (!wisdom) return false
        return selectedCategories.some(cat => wisdom.categories.includes(cat))
      })
    }
    
    // Search filter
    if (oilSearchQuery.trim()) {
      const query = oilSearchQuery.toLowerCase()
      oils = oils.filter(oil => 
        oil.name.toLowerCase().includes(query) ||
        oil.scentProfile.toLowerCase().includes(query)
      )
    }
    
    // Sort alphabetically by name
    return oils.sort((a, b) => a.name.localeCompare(b.name))
  }, [selectedCategories, oilSearchQuery])
  
  // Get dominant scent notes from selected oils
  const dominantScentNotes = useMemo(() => {
    if (selectedOils.length === 0) return []
    
    const notes: Record<string, number> = {}
    selectedOils.forEach(o => {
      const oil = ATELIER_OILS.find(ao => ao.id === o.oilId)
      if (!oil) return
      
      const profile = oil.scentProfile.toLowerCase()
      if (profile.includes('citrus')) notes['Citrus'] = (notes['Citrus'] || 0) + o.ml
      if (profile.includes('floral')) notes['Floral'] = (notes['Floral'] || 0) + o.ml
      if (profile.includes('woody')) notes['Woody'] = (notes['Woody'] || 0) + o.ml
      if (profile.includes('herbaceous')) notes['Herbaceous'] = (notes['Herbaceous'] || 0) + o.ml
      if (profile.includes('spicy')) notes['Spicy'] = (notes['Spicy'] || 0) + o.ml
      if (profile.includes('earthy')) notes['Earthy'] = (notes['Earthy'] || 0) + o.ml
      if (profile.includes('fresh')) notes['Fresh'] = (notes['Fresh'] || 0) + o.ml
      if (profile.includes('sweet')) notes['Sweet'] = (notes['Sweet'] || 0) + o.ml
    })
    
    return Object.entries(notes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([note]) => note)
  }, [selectedOils])
  
  // Handle tag input
  const handleAddTag = useCallback(() => {
    if (tagInput.trim() && !tags.includes(tagInput.trim()) && tags.length < 5) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }, [tagInput, tags])
  
  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove))
  }, [tags])

  // Render profile form or main atelier
  if (showProfileForm) {
    return (
      <main className="min-h-screen bg-[#0a080c] pt-32 pb-16">
        <div className="max-w-2xl mx-auto px-6">
          <HealthProfileForm onComplete={() => setShowProfileForm(false)} onSkip={() => setShowProfileForm(false)} />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0a080c] pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FlaskConical className="w-5 h-5 text-[#c9a227]" />
              <span className="text-xs text-[#c9a227] uppercase tracking-[0.2em]">The Atelier</span>
            </div>
            <h1 className="font-serif text-4xl md:text-5xl text-[#f5f3ef]">
              Mixing <span className="text-[#c9a227]">Atelier</span>
            </h1>
            <p className="text-[#a69b8a] mt-2">
              Create your own custom essential oil blends with precise milliliter measurements.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowProfileForm(true)}
              className="px-4 py-2 rounded-full bg-[#111] border border-[#f5f3ef]/10 text-[#a69b8a] text-sm hover:border-[#c9a227]/30 transition-colors"
            >
              Edit Health Profile
            </button>
            <Tooltip content="Keyboard shortcuts: Ctrl+S to save, Ctrl+Enter to add to cart, +/- to adjust oils" position="bottom">
              <button className="w-10 h-10 rounded-full bg-[#111] border border-[#f5f3ef]/10 flex items-center justify-center text-[#a69b8a] hover:text-[#f5f3ef] transition-colors">
                <Info className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Miron Violet Glass Banner */}
        <div className="mb-8">
          <MironVioletGlassBanner mode={mode} />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* LEFT COLUMN - Oil Selection */}
          <div className="lg:col-span-2 space-y-6">
            {/* Mode Selection */}
            <div className="p-4 rounded-2xl bg-[#111] border border-[#f5f3ef]/10">
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => { setMode('pure'); setSelectedOils([]); setAcknowledgedWarningIds([]); }}
                  className={cn(
                    'flex-1 p-4 rounded-xl border transition-all text-left hover:scale-[1.02]',
                    mode === 'pure'
                      ? 'bg-[#c9a227]/10 border-[#c9a227]'
                      : 'bg-[#0a080c] border-[#f5f3ef]/10 hover:border-[#f5f3ef]/30'
                  )}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Droplets className="w-5 h-5 text-[#c9a227]" />
                    <span className="font-medium text-[#f5f3ef]">Pure Essential</span>
                  </div>
                  <p className="text-xs text-[#a69b8a]">100% essential oils with glass dropper</p>
                </button>
                
                <button
                  onClick={() => { setMode('carrier'); setSelectedOils([]); setAcknowledgedWarningIds([]); }}
                  className={cn(
                    'flex-1 p-4 rounded-xl border transition-all text-left hover:scale-[1.02]',
                    mode === 'carrier'
                      ? 'bg-[#c9a227]/10 border-[#c9a227]'
                      : 'bg-[#0a080c] border-[#f5f3ef]/10 hover:border-[#f5f3ef]/30'
                  )}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Beaker className="w-5 h-5 text-[#c9a227]" />
                    <span className="font-medium text-[#f5f3ef]">With Carrier</span>
                  </div>
                  <p className="text-xs text-[#a69b8a]">Diluted in jojoba or other carrier</p>
                </button>
              </div>
              
              {/* Alternative Caps Note */}
              <div className="mt-4 pt-4 border-t border-[#f5f3ef]/10">
                <p className="text-xs text-[#a69b8a] flex items-center gap-2">
                  <Info className="w-3 h-3 text-[#c9a227]" />
                  Alternative caps (droppers, rollers, pour caps) available in <a href="/bottles" className="text-[#c9a227] hover:underline">Bottles & Accessories</a>
                </p>
              </div>
              
              <div className="flex flex-col md:flex-row gap-6 mt-6">
                <div>
                  <label className="text-sm text-[#a69b8a] mb-2 block">Bottle Size</label>
                  
                  {/* Visual Bottle Selector */}
                  <div className="flex items-end justify-center gap-4 py-5 px-4 bg-[#0a080c] rounded-xl border border-[#f5f3ef]/10">
                    {BOTTLE_SIZES.map(size => {
                      const chipCount = CRYSTAL_COUNTS[`${size}ml`] || Math.round(size * 0.4)
                      const isSelected = bottleSize === size
                      // Proportional scaling: width and height both scale with size
                      const scale = (size - 5) / 25 // 0 to 1
                      const widthPx = 18 + scale * 14 // 18px to 32px
                      const heightPx = 45 + scale * 55 // 45px to 100px
                      
                      return (
                        <Tooltip
                          key={size}
                          content={`${size}ml ${mode === 'pure' ? 'dropper' : 'rollerball'} bottle`}
                        >
                          <button
                            onClick={() => { setBottleSize(size); setSelectedOils([]); setAcknowledgedWarningIds([]); }}
                            className="flex flex-col items-center gap-2 group"
                          >
                            {/* Bottle Container */}
                            <div className="relative">
                              {/* Bottle Cap - Dropper or Rollerball based on mode */}
                              {mode === 'pure' ? (
                                /* Dropper Cap */
                                <div 
                                  className={cn(
                                    'absolute -top-2 left-1/2 -translate-x-1/2 rounded-t-sm transition-all',
                                    isSelected ? 'bg-[#1a1a1a]' : 'bg-[#2a2a2a]'
                                  )}
                                  style={{ 
                                    width: `${widthPx * 0.5}px`, 
                                    height: '8px' 
                                  }}
                                >
                                  {/* Dropper bulb */}
                                  <div 
                                    className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-[#1a1a1a]"
                                    style={{ width: `${widthPx * 0.4}px`, height: '6px' }}
                                  />
                                </div>
                              ) : (
                                /* Rollerball Cap */
                                <div 
                                  className={cn(
                                    'absolute -top-1.5 left-1/2 -translate-x-1/2 rounded-full transition-all',
                                    isSelected ? 'bg-[#c9a227]' : 'bg-[#a69b8a]'
                                  )}
                                  style={{ 
                                    width: `${widthPx * 0.6}px`, 
                                    height: `${widthPx * 0.6}px` 
                                  }}
                                >
                                  {/* Metallic ball shine */}
                                  <div className="absolute top-1 left-1 w-1 h-1 rounded-full bg-white/60" />
                                </div>
                              )}
                              
                              {/* Bottle Body */}
                              <div 
                                className={cn(
                                  'relative rounded-2xl transition-all duration-300',
                                  isSelected 
                                    ? 'ring-2 ring-[#c9a227] ring-offset-2 ring-offset-[#0a080c]' 
                                    : 'opacity-70 group-hover:opacity-100'
                                )}
                                style={{ 
                                  width: `${widthPx}px`,
                                  height: `${heightPx}px`,
                                  background: isSelected 
                                    ? 'linear-gradient(180deg, #4c1d95 0%, #2e1065 40%, #1e1b4b 100%)'
                                    : 'linear-gradient(180deg, #2e1065 0%, #1e1b4b 50%, #0f0d1c 100%)',
                                  boxShadow: isSelected 
                                    ? '0 4px 20px rgba(139, 92, 246, 0.3), inset 0 1px 2px rgba(255,255,255,0.15)' 
                                    : '0 2px 8px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.1)'
                                }}
                              >
                                {/* Violet glass sheen */}
                                <div 
                                  className="absolute left-1 top-3 bottom-3 rounded-full bg-gradient-to-b from-white/15 to-transparent"
                                  style={{ width: `${widthPx * 0.25}px` }}
                                />
                                
                                {/* Glass Pipette (pure mode only) */}
                                {mode === 'pure' && (
                                  <div 
                                    className="absolute left-1/2 -translate-x-1/2 top-0"
                                    style={{ 
                                      width: `${widthPx * 0.25}px`,
                                      height: `${heightPx * 0.85}px`
                                    }}
                                  >
                                    {/* Pipette tube */}
                                    <div 
                                      className="absolute top-0 left-1/2 -translate-x-1/2 bg-gradient-to-r from-white/20 via-white/40 to-white/20"
                                      style={{ 
                                        width: `${Math.max(2, widthPx * 0.08)}px`,
                                        height: `${heightPx * 0.7}px`
                                      }}
                                    />
                                    {/* Pipette bulb connection */}
                                    <div 
                                      className="absolute top-0 left-1/2 -translate-x-1/2 bg-gradient-to-r from-white/30 to-white/50 rounded-full"
                                      style={{ 
                                        width: `${widthPx * 0.25}px`,
                                        height: `${Math.max(3, widthPx * 0.12)}px`
                                      }}
                                    />
                                    {/* Pipette tip */}
                                    <div 
                                      className="absolute bottom-0 left-1/2 -translate-x-1/2"
                                      style={{
                                        width: 0,
                                        height: 0,
                                        borderLeft: `${Math.max(1, widthPx * 0.06)}px solid transparent`,
                                        borderRight: `${Math.max(1, widthPx * 0.06)}px solid transparent`,
                                        borderTop: `${Math.max(4, widthPx * 0.15)}px solid rgba(255,255,255,0.3)`
                                      }}
                                    />
                                  </div>
                                )}
                                
                                {/* Crystal chips settled at bottom */}
                                <div 
                                  className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-wrap justify-center gap-[2px]"
                                  style={{ width: `${widthPx * 0.8}px` }}
                                >
                                  {Array.from({ length: Math.min(chipCount, 8) }).map((_, i) => (
                                    <div 
                                      key={i} 
                                      className={cn(
                                        'rounded-sm',
                                        isSelected ? 'bg-[#c9a227]' : 'bg-[#a69b8a]/60'
                                      )}
                                      style={{ 
                                        width: `${Math.max(3, widthPx * 0.12)}px`,
                                        height: `${Math.max(2, widthPx * 0.08)}px`
                                      }}
                                    />
                                  ))}
                                  {chipCount > 8 && (
                                    <span className={cn('text-[5px] leading-none', isSelected ? 'text-[#c9a227]' : 'text-[#a69b8a]')}>+</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Size Label */}
                            <span className={cn(
                              'text-xs font-medium transition-colors',
                              isSelected ? 'text-[#c9a227]' : 'text-[#a69b8a] group-hover:text-[#f5f3ef]'
                            )}>
                              {size}ml
                            </span>
                            
                            {/* Chip count */}
                            <span className="text-[10px] text-[#a69b8a]/60">{chipCount} chips</span>
                          </button>
                        </Tooltip>
                      )
                    })}
                  </div>
                  
                  <p className="text-xs text-[#8B5CF6] mt-2 flex items-center gap-1">
                    <Wine className="w-3 h-3" />
                    Handcrafted in Miron Violet Glass
                  </p>
                  <p className="text-xs text-[#a69b8a]/70 mt-1">
                    Includes {CRYSTAL_COUNTS[`${bottleSize}ml`] || Math.round(bottleSize * 0.4)} pre-drilled crystal chips imbued in your oil for jewellery crafting
                  </p>
                </div>
                
                {mode === 'carrier' && (
                  <div className="flex-1">
                    {/* Visual Dilution Chamber */}
                    <div className="relative bg-[#0a080c] rounded-2xl border border-[#f5f3ef]/10 p-4">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm text-[#a69b8a]">Essential Oil Strength</span>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-light text-[#c9a227]">{carrierRatio}%</span>
                          <span className="text-xs text-[#a69b8a]/60 uppercase tracking-wider">{RATIO_GUIDANCE[carrierRatio].label}</span>
                        </div>
                      </div>
                      
                      {/* Visual Cylinder */}
                      <div className="relative h-32 flex gap-4">
                        {/* The Cylinder */}
                        <div className="relative w-16 h-full mx-auto">
                          {/* Glass tube */}
                          <div className="absolute inset-0 rounded-full border-2 border-[#f5f3ef]/20 bg-gradient-to-r from-[#f5f3ef]/5 to-transparent overflow-hidden">
                            {/* Measurement ticks */}
                            {[0, 25, 50, 75, 100].map(tick => (
                              <div 
                                key={tick}
                                className="absolute left-0 right-0 border-t border-[#f5f3ef]/10"
                                style={{ bottom: `${tick}%` }}
                              >
                                <span className="absolute -right-6 text-[8px] text-[#a69b8a]/40">{tick}%</span>
                              </div>
                            ))}
                            
                            {/* Essential Oil Layer (top) */}
                            <motion.div 
                              className="absolute left-0 right-0 bg-gradient-to-b from-amber-600/90 to-amber-700/80"
                              initial={false}
                              animate={{ 
                                top: `${100 - carrierRatio}%`,
                                bottom: 0
                              }}
                              transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                            >
                              {/* Oil shimmer effect */}
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/20 to-transparent animate-pulse" />
                            </motion.div>
                            
                            {/* Carrier Oil Layer (bottom) */}
                            <motion.div 
                              className="absolute left-0 right-0 bg-gradient-to-b from-[#d4a574]/60 to-[#c49a6c]/70"
                              initial={false}
                              animate={{ 
                                top: '0%',
                                bottom: `${carrierRatio}%`
                              }}
                              transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                            />
                            
                            {/* Interface line */}
                            <motion.div 
                              className="absolute left-0 right-0 h-0.5 bg-[#f5f3ef]/30 shadow-[0_0_8px_rgba(245,243,239,0.3)]"
                              initial={false}
                              animate={{ bottom: `${carrierRatio}%` }}
                              transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                            />
                          </div>
                          
                          {/* Cylinder cap */}
                          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-12 h-2 rounded-full bg-[#f5f3ef]/10 border border-[#f5f3ef]/20" />
                        </div>
                        
                        {/* Legend */}
                        <div className="flex-1 flex flex-col justify-center gap-3">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-gradient-to-br from-amber-600 to-amber-700" />
                            <span className="text-xs text-[#a69b8a]">Essential Oil</span>
                            <span className="text-xs text-[#c9a227] font-medium">{carrierRatio}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-gradient-to-br from-[#d4a574] to-[#c49a6c]" />
                            <span className="text-xs text-[#a69b8a]">Carrier Oil</span>
                            <span className="text-xs text-[#f5f3ef]/70">{100 - carrierRatio}%</span>
                          </div>
                          <p className="text-[11px] text-[#a69b8a]/60 leading-relaxed mt-1">
                            {RATIO_GUIDANCE[carrierRatio].description}
                          </p>
                        </div>
                      </div>
                      
                      {/* Strength Selector with Info */}
                      <div className="flex items-center gap-2 mt-4">
                        <div className="flex-1 flex gap-1">
                          {CARRIER_RATIOS.map(ratio => (
                            <button
                              key={ratio}
                              onClick={() => { setCarrierRatio(ratio); setSelectedOils([]); setAcknowledgedWarningIds([]); }}
                              className={cn(
                                'flex-1 py-2.5 rounded-lg text-sm font-medium transition-all',
                                carrierRatio === ratio
                                  ? 'bg-[#c9a227] text-[#0a080c]'
                                  : 'bg-[#f5f3ef]/5 text-[#a69b8a] hover:bg-[#f5f3ef]/10'
                              )}
                            >
                            {ratio}%
                          </button>
                        ))}
                        </div>
                        <StrengthInfoButton ratio={carrierRatio} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-4 p-3 rounded-xl bg-[#0a080c]">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#a69b8a]">Essential Oil Capacity</span>
                  <span className="text-[#f5f3ef] font-medium">{currentEssentialOilMl.toFixed(1)} / {maxEssentialOilMl.toFixed(1)} ml</span>
                </div>
                {mode === 'carrier' && (
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-[#a69b8a]">Carrier Oil</span>
                    <span className="text-[#f5f3ef] font-medium">{carrierOilMl.toFixed(1)} ml</span>
                  </div>
                )}
                <div className="h-2 rounded-full bg-[#f5f3ef]/10 mt-3 overflow-hidden">
                  <motion.div 
                    className={cn(
                      'h-full rounded-full',
                      isOverfilled ? 'bg-red-500' : isBottleComplete ? 'bg-[#2ecc71]' : 'bg-[#c9a227]'
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((currentEssentialOilMl / maxEssentialOilMl) * 100, 100)}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            </div>

            {/* Carrier Oil Selection - Collapsible */}
            {mode === 'carrier' && (
              <div className="p-6 rounded-2xl bg-[#111] border border-[#f5f3ef]/10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#c9a227]/20 flex items-center justify-center">
                      <Droplets className="w-5 h-5 text-[#c9a227]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-[#f5f3ef]">Carrier Oil</h3>
                      <p className="text-xs text-[#a69b8a]">
                        {(() => {
                          const selected = CARRIER_OILS.find(c => c.id === selectedCarrierOilId)
                          return selected ? `${selected.name} selected` : 'Select a carrier oil'
                        })()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCarrierSelector(!showCarrierSelector)}
                    className={cn(
                      'text-xs px-4 py-2 rounded-full transition-all font-medium',
                      showCarrierSelector 
                        ? 'bg-[#c9a227] text-[#0a080c]' 
                        : 'bg-[#0a080c] text-[#c9a227] border border-[#c9a227]/30 hover:bg-[#c9a227]/10'
                    )}
                  >
                    {showCarrierSelector ? 'Hide' : 'Change'}
                  </button>
                </div>
                
                {/* Selected Carrier Display */}
                {!showCarrierSelector && selectedCarrierOilId && (
                  <div className="p-4 rounded-xl bg-[#0a080c]/60 border border-[#f5f3ef]/5">
                    <div className="flex items-start gap-3">
                      <div 
                        className="w-14 h-14 rounded-full flex-shrink-0 border-2 border-white/20 shadow-inner"
                        style={{ backgroundColor: CARRIER_OILS.find(c => c.id === selectedCarrierOilId)?.color || '#d4a574' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[#f5f3ef] font-medium">
                          {CARRIER_OILS.find(c => c.id === selectedCarrierOilId)?.name}
                        </p>
                        
                        {/* Educational highlight */}
                        <div className="mt-2 p-2 rounded-lg bg-[#c9a227]/10 border border-[#c9a227]/20">
                          <p className="text-xs text-[#c9a227] italic">
                            {CARRIER_EDUCATION[selectedCarrierOilId]?.highlight}
                          </p>
                        </div>
                        
                        <p className="text-sm text-[#a69b8a] leading-relaxed mt-2">
                          {CARRIER_OILS.find(c => c.id === selectedCarrierOilId)?.description}
                        </p>
                        
                        {/* Scientific fact */}
                        <p className="text-xs text-[#a69b8a]/70 mt-2">
                          <span className="text-[#c9a227]">Science:</span> {CARRIER_OILS.find(c => c.id === selectedCarrierOilId)?.scientificFact}
                        </p>
                        
                        {/* Best for tags */}
                        <div className="flex flex-wrap gap-1 mt-3">
                          {CARRIER_OILS.find(c => c.id === selectedCarrierOilId)?.bestFor.map(use => (
                            <span key={use} className="text-[10px] px-2 py-0.5 rounded-full bg-[#c9a227]/20 text-[#c9a227]">
                              {use}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <AnimatePresence>
                  {showCarrierSelector && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      {/* Educational Header */}
                      <div className="p-4 rounded-xl bg-[#c9a227]/5 border border-[#c9a227]/20 mb-4">
                        <h4 className="text-sm font-medium text-[#c9a227] mb-2">Why These Two Carriers?</h4>
                        <p className="text-xs text-[#a69b8a] leading-relaxed">
                          After extensive testing, we selected only the two finest carriers. 
                          <strong className="text-[#f5f3ef]"> Jojoba</strong> is a liquid wax ester (not an oil) that mimics human sebum. 
                          <strong className="text-[#f5f3ef]"> Fractionated Coconut</strong> stays liquid at any temperature and is completely odorless.
                        </p>
                      </div>

                      <div className="space-y-3 pt-2">
                        {CARRIER_OILS.map(carrier => (
                          <button
                            key={carrier.id}
                            onClick={() => {
                              setSelectedCarrierOilId(carrier.id)
                              setShowCarrierSelector(false)
                            }}
                            className={cn(
                              'w-full p-4 rounded-xl border transition-all text-left hover:scale-[1.01]',
                              selectedCarrierOilId === carrier.id
                                ? 'bg-[#c9a227]/10 border-[#c9a227]'
                                : 'bg-[#0a080c] border-[#f5f3ef]/10 hover:border-[#f5f3ef]/30'
                            )}
                          >
                            <div className="flex items-start gap-4">
                              <div 
                                className="w-14 h-14 rounded-full flex-shrink-0 border-2 border-white/20 shadow-inner"
                                style={{ backgroundColor: carrier.color }}
                              />
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className={cn(
                                    'font-medium',
                                    selectedCarrierOilId === carrier.id ? 'text-[#f5f3ef]' : 'text-[#a69b8a]'
                                  )}>
                                    {carrier.name}
                                  </h4>
                                  {selectedCarrierOilId === carrier.id && (
                                    <CheckCircle className="w-4 h-4 text-[#c9a227]" />
                                  )}
                                </div>
                                
                                <p className="text-sm text-[#a69b8a] mt-1">{carrier.shortDescription}</p>
                                
                                {/* Scientific Fact */}
                                <p className="text-xs text-[#c9a227]/80 mt-2 italic">
                                  {carrier.scientificFact}
                                </p>
                                
                                {/* Best For */}
                                <div className="mt-3">
                                  <span className="text-[10px] text-[#a69b8a]/70 uppercase tracking-wider">Best For:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {carrier.bestFor.map(use => (
                                      <span key={use} className="text-[10px] px-2 py-0.5 rounded-full bg-[#c9a227]/20 text-[#c9a227]">
                                        {use}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                
                                {/* Skin Type */}
                                <div className="mt-2 flex items-center gap-2">
                                  <span className="text-[10px] text-[#a69b8a]/70">Skin:</span>
                                  <span className="text-[10px] text-[#f5f3ef]">{carrier.skinType}</span>
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>

                      {/* Comparison Table */}
                      <div className="mt-4 p-4 rounded-xl bg-[#0a080c] border border-[#f5f3ef]/10">
                        <h5 className="text-xs font-medium text-[#a69b8a] mb-3 uppercase tracking-wider">Quick Comparison</h5>
                        <div className="space-y-2">
                          {CARRIER_COMPARISON.map(row => (
                            <div key={row.feature} className="grid grid-cols-3 gap-2 text-xs">
                              <span className="text-[#a69b8a]">{row.feature}</span>
                              <span className={cn(
                                "text-[#f5f3ef]",
                                row.winner === 'jojoba' && "text-[#c9a227] font-medium"
                              )}>{row.jojoba}</span>
                              <span className={cn(
                                "text-[#f5f3ef]",
                                row.winner === 'coconut' && "text-[#c9a227] font-medium"
                              )}>{row.coconut}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Revolutionary Blend Chamber - Real-time Visualization */}
            <BlendChamber
              selectedOils={selectedOils}
              bottleSize={bottleSize}
              mode={mode}
              carrierRatio={carrierRatio}
              carrierOilName={mode === 'carrier' ? CARRIER_OILS.find(c => c.id === selectedCarrierOilId)?.name : undefined}
              onAdjustOil={handleAdjustOil}
              onRemoveOil={handleRemoveOil}
              maxEssentialOilMl={maxEssentialOilMl}
              currentEssentialOilMl={currentEssentialOilMl}
              isBottleComplete={isBottleComplete}
            />

            {/* Category Filters */}
            <div className="p-4 rounded-2xl bg-[#111] border border-[#f5f3ef]/10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-[#a69b8a]">Filter by Category</h3>
                <button
                  onClick={() => setShowAllCategories(!showAllCategories)}
                  className="text-xs text-[#c9a227] hover:text-[#f5f3ef] flex items-center gap-1 transition-colors"
                >
                  {showAllCategories ? (
                    <>
                      Show less <ChevronUp className="w-3 h-3" />
                    </>
                  ) : (
                    <>
                      Show more <ChevronDown className="w-3 h-3" />
                    </>
                  )}
                </button>
              </div>
              <div className={cn(
                "flex flex-wrap gap-2 overflow-hidden transition-all duration-300",
                showAllCategories ? "max-h-[500px]" : "max-h-[72px]"
              )}>
                {Object.entries(OIL_CATEGORIES).map(([key, cat]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedCategories(prev => 
                        prev.includes(key as OilCategory)
                          ? prev.filter(c => c !== key)
                          : [...prev, key as OilCategory]
                      )
                    }}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs transition-all flex items-center gap-1.5 hover:scale-105',
                      selectedCategories.includes(key as OilCategory)
                        ? 'bg-[#c9a227] text-[#0a080c]'
                        : 'bg-[#0a080c] text-[#a69b8a] border border-[#f5f3ef]/10 hover:border-[#f5f3ef]/30'
                    )}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
              {selectedCategories.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[#f5f3ef]/10">
                  <button
                    onClick={() => setSelectedCategories([])}
                    className="text-xs text-[#a69b8a] hover:text-[#f5f3ef] underline"
                  >
                    Clear {selectedCategories.length} filter{selectedCategories.length !== 1 ? 's' : ''}
                  </button>
                </div>
              )}
            </div>

            {/* Recommended Oils */}
            {suggestedOils.length > 0 && !oilSearchQuery && selectedCategories.length === 0 && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#c9a227]/10 to-transparent border border-[#c9a227]/20">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-4 h-4 text-[#c9a227]" />
                  <h3 className="text-sm font-medium text-[#c9a227]">Recommended for Your Profile</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestedOils.map(oil => (
                    <button
                      key={`rec-${oil.id}`}
                      onClick={() => handleAddOil(oil.id)}
                      disabled={currentEssentialOilMl >= maxEssentialOilMl}
                      className="px-3 py-1.5 rounded-full text-xs bg-[#0a080c] border border-[#c9a227]/30 text-[#f5f3ef] hover:bg-[#c9a227]/20 transition-colors disabled:opacity-50"
                    >
                      + {oil.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search Oils - Moved below Blend Chamber */}
            <div className="p-4 rounded-2xl bg-[#111] border border-[#f5f3ef]/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a69b8a]" />
                <input
                  type="text"
                  value={oilSearchQuery}
                  onChange={(e) => setOilSearchQuery(e.target.value)}
                  placeholder="Search oils by name or scent profile..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#0a080c] border border-[#f5f3ef]/10 text-[#f5f3ef] placeholder:text-[#a69b8a]/50 focus:border-[#c9a227] focus:outline-none"
                />
                {oilSearchQuery && (
                  <button
                    onClick={() => setOilSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a69b8a] hover:text-[#f5f3ef]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Available Oils */}
            <div className="p-6 rounded-2xl bg-[#111] border border-[#f5f3ef]/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-[#f5f3ef] flex items-center gap-2">
                  <Beaker className="w-5 h-5 text-[#c9a227]" />
                  Available Oils
                </h3>
                <div className="flex items-center gap-3">
                  {filteredOils.length !== AVAILABLE_OILS.length && (
                    <span className="text-xs text-[#a69b8a]">
                      {filteredOils.length} of {AVAILABLE_OILS.length} oils
                    </span>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredOils.map(oil => {
                  const isSelected = selectedOils.some(o => o.oilId === oil.id)
                  const currentMl = selectedOils.find(o => o.oilId === oil.id)?.ml || 0
                  const wisdom = getOilWisdom(oil.id)
                  const hasSafetyWarning = comprehensiveSafety?.warnings.some(w => 
                    w.affectedOils?.includes(oil.id) && (w.riskLevel === 'high' || w.riskLevel === 'critical')
                  )
                  
                  return (
                    <motion.div
                      key={oil.id}
                      layout
                      className={cn(
                        'p-3 rounded-xl border transition-all hover:shadow-lg',
                        isSelected
                          ? 'bg-[#c9a227]/10 border-[#c9a227]'
                          : 'bg-[#0a080c] border-[#f5f3ef]/10 hover:border-[#f5f3ef]/30'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <motion.div 
                          whileHover={{ scale: 1.1 }}
                          className="w-10 h-10 rounded-lg flex-shrink-0 border border-white/10 cursor-pointer relative"
                          style={{ backgroundColor: oil.color }}
                          onClick={() => {
                            setSelectedOilForDetail(oil)
                            setIsOilDetailModalOpen(true)
                          }}
                          title="Click for detailed oil information"
                        >
                          {hasSafetyWarning && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                              <AlertTriangle className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                        </motion.div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 
                              className="font-medium text-[#f5f3ef] text-sm truncate cursor-pointer hover:text-[#c9a227] transition-colors"
                              onClick={() => {
                                setSelectedOilForDetail(oil)
                                setIsOilDetailModalOpen(true)
                              }}
                            >{oil.name}</h4>
                            {oil.rarity === 'luxury' && (
                              <span title="Luxury oil"><Crown className="w-3 h-3 text-[#c9a227]" /></span>
                            )}
                            {oil.rarity === 'premium' && (
                              <span title="Premium oil"><Star className="w-3 h-3 text-[#c9a227]" /></span>
                            )}
                          </div>
                          <p className="text-xs text-[#a69b8a]">{oil.scentProfile}</p>
                          
                          {/* Price per ml and categories */}
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-[#c9a227]">${(oil.collectionPrice30ml / 30).toFixed(2)}/ml</span>
                            {wisdom && (
                              <div className="flex flex-wrap gap-1">
                                {wisdom.categories.slice(0, 2).map(cat => (
                                  <span key={cat} className="text-[10px] px-1.5 py-0.5 rounded bg-[#f5f3ef]/10 text-[#a69b8a]/70">
                                    {OIL_CATEGORIES[cat]?.icon}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {isSelected ? (
                        <div className="flex items-center justify-between mt-3">
                          <OilAmountControl
                            oilId={oil.id}
                            ml={currentMl}
                            onAdjust={handleAdjustOil}
                            currentEssentialOilMl={currentEssentialOilMl}
                            maxEssentialOilMl={maxEssentialOilMl}
                            bottleSize={bottleSize}
                          />
                          <button
                            onClick={() => handleRemoveOil(oil.id)}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddOil(oil.id)}
                          disabled={currentEssentialOilMl >= maxEssentialOilMl}
                          className="w-full mt-3 py-2 rounded-lg bg-[#0a080c] border border-[#f5f3ef]/10 text-[#a69b8a] hover:text-[#f5f3ef] hover:border-[#c9a227]/30 transition-all text-sm disabled:opacity-50 hover:shadow-md"
                        >
                          Add Oil
                        </button>
                      )}
                    </motion.div>
                  )
                })}
              </div>
              
              {filteredOils.length === 0 && (
                <div className="text-center py-8 text-[#a69b8a]">
                  <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No oils match your search.</p>
                  <button 
                    onClick={() => { setOilSearchQuery(''); setSelectedCategories([]); }}
                    className="mt-2 text-[#c9a227] hover:underline"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN - Safety & Actions */}
          <div className="space-y-6">
            {/* Enhanced Safety Summary with Acknowledgment */}
            <EnhancedSafetySummary
              validation={validation}
              comprehensiveSafety={comprehensiveSafety}
              onAcknowledge={handleSafetyAcknowledge}
              acknowledgedIds={acknowledgedWarningIds}
              healthProfile={healthProfile}
            />

            {/* Oil Interaction Warnings */}
            {selectedOils.length > 1 && (
              <OilInteractionWarnings 
                selectedOils={selectedOils} 
                userProfile={{
                  isPregnant: healthProfile?.isPregnant,
                  isTryingToConceive: healthProfile?.isTryingToConceive,
                  onBloodThinners: healthProfile?.medications?.some((m: any) => 
                    ['warfarin', 'apixaban', 'rivaroxaban', 'eliquis', 'xarelto'].some(d => 
                      m.name.toLowerCase().includes(d)
                    )
                  ),
                  hasEpilepsy: healthProfile?.healthConditions?.some((c: string) => 
                    c.toLowerCase().includes('epilepsy') || c.toLowerCase().includes('seizure')
                  ),
                  hasBleedingDisorder: healthProfile?.healthConditions?.some((c: string) => 
                    c.toLowerCase().includes('hemophilia') || c.toLowerCase().includes('bleeding')
                  ),
                  age: healthProfile?.age,
                }}
                acknowledgedInteractions={acknowledgedInteractions}
                onAcknowledgeInteraction={(key) => {
                  setAcknowledgedInteractions(prev => 
                    prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
                  )
                }}
              />
            )}

            {/* Crystal Selection - Always Visible */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-[#1a1a2e] to-[#0d0b0f] border border-[#c9a227]/30 shadow-lg shadow-[#c9a227]/5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#c9a227]/20 flex items-center justify-center">
                    <Gem className="w-5 h-5 text-[#c9a227]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-[#f5f3ef]">Crystal Infusion</h3>
                    <p className="text-xs text-[#a69b8a]">Select energy for your blend</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCrystalSelector(!showCrystalSelector)}
                  className={cn(
                    'text-xs px-4 py-2 rounded-full transition-all font-medium',
                    showCrystalSelector 
                      ? 'bg-[#c9a227] text-[#0a080c]' 
                      : 'bg-[#0a080c] text-[#c9a227] border border-[#c9a227]/30 hover:bg-[#c9a227]/10'
                  )}
                >
                  {showCrystalSelector ? 'Hide Options' : 'Change Crystal'}
                </button>
              </div>
              
              {/* Selected Crystal Display */}
              {(() => {
                const selectedCrystal = getAllCrystals().find(c => c.id === selectedCrystalId)
                return (
                  <div className="p-4 rounded-xl bg-[#0a080c]/60 border border-[#f5f3ef]/5 mb-4">
                    <div className="flex items-start gap-3">
                      <div 
                        className="w-12 h-12 rounded-full flex-shrink-0 border-2 border-white/20 shadow-inner"
                        style={{ backgroundColor: selectedCrystal?.color || '#e8e8e8' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[#f5f3ef] font-medium text-base">
                          {selectedCrystal?.name || 'Clear Quartz'}
                        </p>
                        <p className="text-sm text-[#a69b8a] leading-relaxed mt-1">
                          {selectedCrystal?.description || 'The master healer and energy amplifier'}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })()}
              
              <AnimatePresence>
                {showCrystalSelector && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <p className="text-xs text-[#a69b8a] mb-3 uppercase tracking-wider">All Available Crystals</p>
                    <div className="grid grid-cols-3 gap-3 mb-3 max-h-72 overflow-y-auto pr-1">
                      {getAllCrystals().map(crystal => (
                        <button
                          key={crystal.id}
                          onClick={() => setSelectedCrystalId(crystal.id)}
                          className={cn(
                            'p-3 rounded-xl border transition-all text-left hover:scale-105',
                            selectedCrystalId === crystal.id
                              ? 'bg-[#c9a227]/20 border-[#c9a227] ring-1 ring-[#c9a227]/50'
                              : 'bg-[#0a080c] border-[#f5f3ef]/10 hover:border-[#c9a227]/30'
                          )}
                          title={crystal.description}
                        >
                          <div 
                            className="w-8 h-8 rounded-full mb-2 border border-white/20"
                            style={{ backgroundColor: crystal.color }}
                          />
                          <p className="text-xs text-[#a69b8a] leading-tight">{crystal.name}</p>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Cord Selection */}
            <div className="p-6 rounded-2xl bg-[#111] border border-[#f5f3ef]/10">
              <CordSelector 
                selectedCordId={selectedCordId}
                onSelect={setSelectedCordId}
              />
              </div>

            {/* Blend Revelation Button */}
            <AnimatePresence>
              {selectedOils.length > 0 && isBottleComplete && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-6 rounded-2xl bg-gradient-to-br from-[#c9a227]/20 via-purple-500/10 to-[#0a080c] border border-[#c9a227]/30"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#c9a227]/20 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-6 h-6 text-[#c9a227]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-[#f5f3ef] mb-1">
                        Unlock Your Blend&apos;s Hidden Wisdom
                      </h3>
                      <p className="text-sm text-[#a69b8a] mb-4">
                        Our AI analyzes your {mode === 'pure' ? 'pure essential' : `${carrierRatio}% dilution`} blend 
                        to reveal its archetype, elemental composition, and personalized guidance.
                      </p>
                      <button
                        onClick={handleRevealBlend}
                        disabled={isGeneratingRevelation}
                        className={cn(
                          'w-full py-3 rounded-xl font-medium transition-all',
                          'bg-gradient-to-r from-[#c9a227] to-amber-500 text-[#0a080c]',
                          'hover:from-[#f5f3ef] hover:to-[#c9a227]',
                          'flex items-center justify-center gap-2',
                          'hover:shadow-lg hover:shadow-[#c9a227]/20',
                          isGeneratingRevelation && 'opacity-70 cursor-wait'
                        )}
                      >
                        {isGeneratingRevelation ? (
                          <>
                            <div className="w-5 h-5 border-2 border-[#0a080c]/30 border-t-[#0a080c] rounded-full animate-spin" />
                            Analyzing Blend DNA...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5" />
                            Reveal Blend Secrets
                          </>
                        )}
                      </button>
                      
                      {/* Loading Fact */}
                      <AnimatePresence>
                        {isGeneratingRevelation && revelationFact && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="mt-4 p-3 rounded-lg bg-[#0a080c]/50 border border-[#c9a227]/20"
                          >
                            <p className="text-xs text-[#a69b8a] italic">
                              <Lightbulb className="w-3 h-3 inline mr-1 text-[#c9a227]" />
                              Did you know? {revelationFact}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Price & Actions */}
            <div className="p-6 rounded-2xl bg-[#111] border border-[#f5f3ef]/10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[#a69b8a]">Estimated Price</span>
                <div className="text-right">
                  <span className="text-2xl font-serif text-[#c9a227]">{formatAtelierPrice(estimatedPrice)}</span>
                  {blendRarity && blendRarity.score >= 60 && (
                    <Tooltip content={`Rarity Score: ${blendRarity.score}/100`}>
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-[#c9a227]/20 text-[#c9a227] cursor-help">
                        {blendRarity.rarity}
                      </span>
                    </Tooltip>
                  )}
                </div>
              </div>
              
              {priceBreakdown && (
                <div className="mb-4 p-3 rounded-xl bg-[#0a080c] text-sm space-y-2">
                  {/* Oils */}
                  <div className="space-y-1">
                    {priceBreakdown.costs.oils.map((oil, i) => (
                      <div key={i} className="flex justify-between text-[#a69b8a] text-xs group">
                        <Tooltip content={`Wholesale: $${oil.wholesaleCost.toFixed(2)}`}>
                          <span className="truncate pr-2 cursor-help">
                            {oil.name} <span className="text-[#a69b8a]/50">({oil.ml}ml)</span>
                          </span>
                        </Tooltip>
                        <span className="flex-shrink-0 text-[#c9a227]">${oil.retailPrice.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t border-[#f5f3ef]/10 pt-2 space-y-1">
                    <div className="flex justify-between text-[#a69b8a] text-xs">
                      <span>Oils Subtotal</span>
                      <span className="text-[#c9a227]">${priceBreakdown.costs.oilsSubtotal.toFixed(2)}</span>
                    </div>
                    {priceBreakdown.costs.additionalOilFee > 0 && (
                      <div className="flex justify-between text-[#a69b8a] text-xs">
                        <Tooltip content="$1 per additional oil after the first 2">
                          <span className="cursor-help flex items-center gap-1">
                            Multi-Oil Fee ({selectedOils.length} oils) <Info className="w-3 h-3" />
                          </span>
                        </Tooltip>
                        <span className="text-[#c9a227]">${priceBreakdown.costs.additionalOilFee.toFixed(2)}</span>
                      </div>
                    )}
                    {mode === 'carrier' && priceBreakdown.costs.carrierOil > 0 && (
                      <div className="flex justify-between text-[#a69b8a] text-xs">
                        <Tooltip content={CARRIER_OILS.find(c => c.id === selectedCarrierOilId)?.description || 'Carrier oil for dilution'}>
                          <span className="cursor-help flex items-center gap-1">
                            {CARRIER_OILS.find(c => c.id === selectedCarrierOilId)?.name || 'Carrier Oil'} <Info className="w-3 h-3" />
                          </span>
                        </Tooltip>
                        <span className="text-[#c9a227]">${priceBreakdown.costs.carrierOil.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[#a69b8a] text-xs">
                      <Tooltip content={`${priceBreakdown.costs.bottleType === 'roller' ? 'Rollerball' : 'Dropper'} bottle included`}>
                        <span className="cursor-help flex items-center gap-1">
                          Miron Violet Glass Bottle <Info className="w-3 h-3" />
                        </span>
                      </Tooltip>
                      <span className="text-[#f5f3ef]/70">${priceBreakdown.costs.bottleCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[#a69b8a] text-xs">
                      <Tooltip content={`${priceBreakdown.costs.bottleType === 'roller' ? 'Stainless Steel Roller' : 'Glass Dropper'} included`}>
                        <span className="cursor-help flex items-center gap-1">
                          {priceBreakdown.costs.bottleType === 'roller' ? 'Steel Roller' : 'Glass Dropper'} <Info className="w-3 h-3" />
                        </span>
                      </Tooltip>
                      <span className="text-[#8B5CF6]/70 text-[10px]">Included</span>
                    </div>
                    <div className="flex justify-between text-[#a69b8a] text-xs">
                      <Tooltip content={`${CRYSTAL_COUNTS[`${bottleSize}ml`] || 12} crystal chips at $0.25 each = $${((CRYSTAL_COUNTS[`${bottleSize}ml`] || 12) * 0.25).toFixed(2)}`}>
                        <span className="cursor-help flex items-center gap-1">
                          Crystals ({CRYSTAL_COUNTS[`${bottleSize}ml`] || 12} × $0.25) <Info className="w-3 h-3" />
                        </span>
                      </Tooltip>
                      <span className="text-[#f5f3ef]/70">${priceBreakdown.costs.crystals.toFixed(2)}</span>
                    </div>
                    {priceBreakdown.costs.cord > 0 && (
                      <div className="flex justify-between text-[#a69b8a] text-xs">
                        <span>
                          Cord Upgrade
                          <span className="text-[#c9a227]/70 text-[10px] ml-1">
                            ({getSimpleCordById(selectedCordId).name})
                          </span>
                        </span>
                        <span className="text-[#c9a227]">${priceBreakdown.costs.cord.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[#a69b8a] text-xs">
                      <Tooltip content="Hand-blended with care in small batches">
                        <span className="cursor-help flex items-center gap-1">
                          Blending Labor <Info className="w-3 h-3" />
                        </span>
                      </Tooltip>
                      <span className="text-[#c9a227]">${priceBreakdown.costs.labor.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="border-t border-[#f5f3ef]/10 pt-2">
                    <div className="flex justify-between text-[#a69b8a] text-xs">
                      <span>Subtotal</span>
                      <span className="text-[#f5f3ef]/70">${priceBreakdown.costs.subtotalBeforeRounding.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[#a69b8a] text-xs">
                      <span className="text-[10px]">Round to .95</span>
                      <span className={priceBreakdown.costs.roundingAdjustment >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}>
                        {priceBreakdown.costs.roundingAdjustment >= 0 ? '+' : ''}${priceBreakdown.costs.roundingAdjustment.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="border-t border-[#f5f3ef]/10 pt-2">
                    <div className="flex justify-between text-[#f5f3ef] font-medium">
                      <span>Total</span>
                      <span>${priceBreakdown.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Bottle Status */}
              {!isBottleComplete ? (
                <div className={cn(
                  "p-4 rounded-xl mb-4 flex items-center gap-3",
                  isOverfilled ? "bg-red-500/10 border border-red-500/30" : "bg-yellow-500/10 border border-yellow-500/30"
                )}>
                  <AlertCircle className={cn("w-5 h-5", isOverfilled ? "text-red-400" : "text-yellow-400")} />
                  <div>
                    <p className={cn("text-sm font-medium", isOverfilled ? "text-red-400" : "text-yellow-400")}>
                      {isOverfilled ? 'Bottle Overfilled' : 'Bottle Incomplete'}
                    </p>
                    <p className="text-xs text-[#a69b8a]">
                      {isOverfilled 
                        ? `Please reduce by ${(currentEssentialOilMl - maxEssentialOilMl).toFixed(1)}ml`
                        : `Add ${remainingCapacity.toFixed(1)}ml more essential oil${remainingCapacity !== 1 ? 's' : ''} to proceed`
                      }
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#2ecc71]/10 border border-[#2ecc71]/30 mb-4 flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-[#2ecc71]" />
                  <div>
                    <p className="text-sm font-medium text-[#2ecc71]">Ready to Order</p>
                    <p className="text-xs text-[#a69b8a]">Your bottle is perfectly filled</p>
                  </div>
                </div>
              )}
              
              {/* Critical Acknowledgment Warning */}
              {isBottleComplete && unacknowledgedCriticalCount > 0 && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 mb-4">
                  <div className="flex items-start gap-3">
                    <AlertOctagon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-400">
                        Critical Safety Acknowledgment Required
                      </p>
                      <p className="text-xs text-[#a69b8a] mt-1">
                        {unacknowledgedCriticalCount} critical warning{unacknowledgedCriticalCount !== 1 ? 's' : ''} must be acknowledged before checkout.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Recipe Form - Always Visible */}
              <input
                type="text"
                value={recipeName}
                onChange={(e) => handleRecipeNameChange(e.target.value)}
                placeholder="Name your blend..."
                className={cn(
                  "w-full px-4 py-3 rounded-xl bg-[#0a080c] border text-[#f5f3ef] placeholder:text-[#a69b8a]/50 focus:border-[#c9a227] focus:outline-none mb-3",
                  recipeNameError ? "border-red-500/50" : "border-[#f5f3ef]/10"
                )}
              />
              {recipeNameError && (
                <p className="text-xs text-red-400 mb-3">{recipeNameError}</p>
              )}
              
              {/* Intended Use */}
              <div className="mb-3">
                <label className="text-xs text-[#a69b8a] mb-2 block">Intended Use</label>
                <div className="grid grid-cols-2 gap-2">
                  {INTENDED_USES.slice(0, 6).map(use => (
                    <button
                      key={use.id}
                      onClick={() => setIntendedUse(use.id)}
                      disabled={!isBottleComplete}
                      className={cn(
                        'px-2 py-2 rounded-lg text-xs transition-all text-left flex items-center gap-2',
                        intendedUse === use.id
                          ? 'bg-[#c9a227]/20 border border-[#c9a227] text-[#f5f3ef]'
                          : 'bg-[#0a080c] border border-[#f5f3ef]/10 text-[#a69b8a] hover:border-[#f5f3ef]/30',
                        !isBottleComplete && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <span>{use.icon}</span>
                      <span className="truncate">{use.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <textarea
                value={blendDescription}
                onChange={(e) => setBlendDescription(e.target.value)}
                placeholder="Describe your blend... What makes it special? (Optional)"
                rows={3}
                disabled={!isBottleComplete}
                className="w-full px-4 py-3 rounded-xl bg-[#0a080c] border border-[#f5f3ef]/10 text-[#f5f3ef] placeholder:text-[#a69b8a]/50 focus:border-[#c9a227] focus:outline-none mb-3 resize-none text-sm disabled:opacity-50"
              />

              <textarea
                value={blendStory}
                onChange={(e) => setBlendStory(e.target.value)}
                placeholder="The story behind this blend... Why did you create it? (Optional)"
                rows={2}
                disabled={!isBottleComplete}
                className="w-full px-4 py-3 rounded-xl bg-[#0a080c] border border-[#f5f3ef]/10 text-[#f5f3ef] placeholder:text-[#a69b8a]/50 focus:border-[#c9a227] focus:outline-none mb-3 resize-none text-sm disabled:opacity-50"
              />
              
              {/* Tags Input */}
              <div className="mb-4">
                <label className="text-xs text-[#a69b8a] mb-2 block flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  Tags (max 5)
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map(tag => (
                    <span 
                      key={tag} 
                      className="px-2 py-1 rounded-full bg-[#c9a227]/20 text-[#c9a227] text-xs flex items-center gap-1"
                    >
                      {tag}
                      <button onClick={() => handleRemoveTag(tag)} className="hover:text-white">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                {tags.length < 5 && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      placeholder="Add tag..."
                      disabled={!isBottleComplete}
                      className="flex-1 px-3 py-2 rounded-lg bg-[#0a080c] border border-[#f5f3ef]/10 text-[#f5f3ef] placeholder:text-[#a69b8a]/50 text-xs focus:border-[#c9a227] focus:outline-none disabled:opacity-50"
                    />
                    <button
                      onClick={handleAddTag}
                      disabled={!tagInput.trim() || !isBottleComplete}
                      className="px-3 py-2 rounded-lg bg-[#c9a227] text-[#0a080c] text-xs font-medium disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
              
              {/* Final Safety Acknowledgment Checkbox */}
              {comprehensiveSafety && comprehensiveSafety.warnings.length > 0 && (
                <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20 mb-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acknowledgedWarningIds.length >= comprehensiveSafety.warnings.filter(w => w.requiresAcknowledgment).length}
                      onChange={() => {}}
                      disabled={!isBottleComplete}
                      className="mt-0.5 w-4 h-4 rounded border-red-500/30 bg-transparent text-red-500 focus:ring-red-500 focus:ring-offset-0 disabled:opacity-50"
                    />
                    <div className="text-xs text-[#a69b8a]">
                      <span className="text-red-400 font-medium block mb-1">
                        I understand the risks and have consulted appropriate professionals
                      </span>
                      I acknowledge that I have read all safety warnings and understand the potential risks associated with this blend. I take full responsibility for the safe use of this product.
                    </div>
                  </label>
                </div>
              )}
              
              <div className="p-3 rounded-xl bg-[#0a080c] border border-[#f5f3ef]/10 mb-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentToShare}
                    onChange={(e) => setConsentToShare(e.target.checked)}
                    disabled={!isBottleComplete}
                    className="mt-0.5 w-4 h-4 rounded border-[#f5f3ef]/30 bg-transparent text-[#c9a227] focus:ring-[#c9a227] focus:ring-offset-0 disabled:opacity-50"
                  />
                  <div className="text-xs text-[#a69b8a]">
                    <span className="text-[#f5f3ef] font-medium block mb-1">
                      Share to Community Blends
                    </span>
                    After you complete your purchase, this blend will be automatically 
                    shared on the Community Blends page. Other users can discover, 
                    rate, and purchase your creation. You&apos;ll be credited as the creator.
                  </div>
                </label>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleSaveRecipe}
                  disabled={!recipeName.trim() || !!recipeNameError || isSaving || !isBottleComplete}
                  className="flex-1 py-3 rounded-xl bg-[#c9a227] text-[#0a080c] font-medium hover:bg-[#f5f3ef] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-[#c9a227]/20"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Recipe'}
                </button>
                <button
                  onClick={handleShareBlend}
                  disabled={!isBottleComplete}
                  className="p-3 rounded-xl bg-[#0a080c] border border-[#f5f3ef]/10 text-[#a69b8a] hover:text-[#f5f3ef] hover:border-[#f5f3ef]/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Share private link"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </div>

              {/* Save Draft Button */}
              <button
                onClick={() => setShowSaveDraftDialog(true)}
                disabled={!isBottleComplete}
                className="w-full mt-2 py-2.5 rounded-xl bg-[#0a080c] border border-[#f5f3ef]/10 text-[#a69b8a] hover:text-[#f5f3ef] hover:border-[#c9a227]/50 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText className="w-4 h-4" />
                Save as Draft
              </button>

              {/* Quantity Selector */}
              <div className="flex items-center justify-between mt-3 p-3 rounded-xl bg-[#0a080c] border border-[#f5f3ef]/10">
                <span className="text-sm text-[#a69b8a]">Quantity</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCartQuantity(Math.max(1, cartQuantity - 1))}
                    disabled={!isBottleComplete}
                    className="w-8 h-8 rounded-lg bg-[#111] border border-[#f5f3ef]/10 flex items-center justify-center text-[#a69b8a] hover:text-[#f5f3ef] hover:border-[#c9a227]/30 transition-colors disabled:opacity-50"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-[#f5f3ef] font-medium w-8 text-center">{cartQuantity}</span>
                  <button
                    onClick={() => setCartQuantity(cartQuantity + 1)}
                    disabled={!isBottleComplete}
                    className="w-8 h-8 rounded-lg bg-[#111] border border-[#f5f3ef]/10 flex items-center justify-center text-[#a69b8a] hover:text-[#f5f3ef] hover:border-[#c9a227]/30 transition-colors disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <button 
                onClick={handleAddToCart}
                disabled={!canAddToCart || isCartLoading}
                className="w-full mt-3 py-3 rounded-xl bg-[#2ecc71] text-[#0a080c] font-medium hover:bg-[#27ae60] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-[#2ecc71]/20"
              >
                {isCartLoading ? (
                  <div className="w-5 h-5 border-2 border-[#0a080c]/30 border-t-[#0a080c] rounded-full animate-spin" />
                ) : (
                  <ShoppingCart className="w-4 h-4" />
                )}
                {isCartLoading ? 'Adding...' : `Add ${cartQuantity} to Cart`}
                <span className="text-xs opacity-70">({formatAtelierPrice(estimatedPrice * cartQuantity)})</span>
              </button>
              
              {/* Missing Crystal/Cord Warning */}
              {isBottleComplete && (!selectedCrystalId || !selectedCordId) && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 mb-3">
                  <p className="text-xs text-amber-400 text-center">
                    {!selectedCrystalId && !selectedCordId 
                      ? "Please select a crystal and cord to proceed"
                      : !selectedCrystalId 
                        ? "Please select a crystal to proceed"
                        : "Please select a cord to proceed"
                    }
                  </p>
                </div>
              )}
              
              {!canAddToCart && unacknowledgedCriticalCount > 0 && (
                <p className="text-xs text-red-400 mt-2 text-center">
                  Acknowledge all critical warnings to enable checkout
                </p>
              )}
            </div>

            {/* Quick Links */}
            <div className="p-4 rounded-2xl bg-[#111] border border-[#f5f3ef]/10">
              <h3 className="text-sm font-medium text-[#f5f3ef] mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <button 
                  onClick={handleNavigateToMyRecipes}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-[#0a080c] text-[#a69b8a] hover:text-[#f5f3ef] hover:bg-[#0a080c]/80 transition-all group"
                >
                  <span className="flex items-center gap-2">
                    <History className="w-4 h-4" />
                    My Recipes
                    {myRecipes.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#c9a227]/20 text-[#c9a227]">
                        {myRecipes.length}
                      </span>
                    )}
                  </span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <button 
                  onClick={handleNavigateToCommunity}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-[#0a080c] text-[#a69b8a] hover:text-[#f5f3ef] hover:bg-[#0a080c]/80 transition-all group"
                >
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Community Recipes
                  </span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Living Blend Codex Modal */}
      <LivingBlendCodexModal
        codex={blendCodex}
        isOpen={showRevelationModal}
        onClose={() => setShowRevelationModal(false)}
      />

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
              onClick={() => setShowShareModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-md md:w-full bg-[#111] rounded-2xl border border-[#f5f3ef]/10 z-50 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-[#f5f3ef]">Share Your Blend</h3>
                <button 
                  onClick={() => setShowShareModal(false)}
                  className="text-[#a69b8a] hover:text-[#f5f3ef]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-[#a69b8a] mb-4">
                Share this link with friends so they can see (and order!) your creation:
              </p>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 px-3 py-2 rounded-lg bg-[#0a080c] border border-[#f5f3ef]/10 text-[#f5f3ef] text-sm"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl)
                    addToast('Copied to clipboard!', 'success')
                  }}
                  className="px-4 py-2 rounded-lg bg-[#c9a227] text-[#0a080c] text-sm font-medium"
                >
                  Copy
                </button>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`Check out my custom essential oil blend: ${recipeName || 'Unnamed Blend'}`)}`, '_blank')
                  }}
                  className="flex-1 py-2 rounded-lg bg-[#0a080c] border border-[#f5f3ef]/10 text-[#a69b8a] hover:text-[#f5f3ef] text-sm"
                >
                  Share on X
                </button>
                <button 
                  onClick={() => {
                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank')
                  }}
                  className="flex-1 py-2 rounded-lg bg-[#0a080c] border border-[#f5f3ef]/10 text-[#a69b8a] hover:text-[#f5f3ef] text-sm"
                >
                  Share on Facebook
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Certificate Download Modal */}
      <AnimatePresence>
        {showCertificateModal && blendCodex && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
              onClick={() => setShowCertificateModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-md md:w-full bg-[#111] rounded-2xl border border-[#c9a227]/30 z-50 p-6"
            >
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-[#c9a227]/20 flex items-center justify-center mx-auto mb-4">
                  <Crown className="w-8 h-8 text-[#c9a227]" />
                </div>
                <h3 className="text-xl font-serif text-[#f5f3ef] mb-2">Blend Certificate</h3>
                <p className="text-sm text-[#a69b8a] mb-6">
                  Download your official blend certificate with full composition details.
                </p>
                <div className="space-y-2">
                  <button
                    onClick={handleDownloadCertificate}
                    className="w-full py-3 rounded-xl bg-[#c9a227] text-[#0a080c] font-medium flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download JSON
                  </button>
                  <button
                    onClick={() => setShowCertificateModal(false)}
                    className="w-full py-3 rounded-xl bg-[#0a080c] border border-[#f5f3ef]/10 text-[#a69b8a]"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Save Draft Dialog */}
      <SaveDraftDialog
        isOpen={showSaveDraftDialog}
        onClose={() => setShowSaveDraftDialog(false)}
        onSave={handleSaveDraft}
        recipeName={recipeName}
        selectedOils={selectedOils}
        mode={mode}
        bottleSize={bottleSize}
      />

      {/* Oil Detail Modal */}
      <OilDetailModal
        oil={selectedOilForDetail}
        isOpen={isOilDetailModalOpen}
        onClose={() => setIsOilDetailModalOpen(false)}
        onAddOil={handleAddOil}
        isAdded={selectedOilForDetail ? selectedOils.some(o => o.oilId === selectedOilForDetail.id) : false}
        currentMl={selectedOilForDetail ? selectedOils.find(o => o.oilId === selectedOilForDetail.id)?.ml || 0 : 0}
      />

      {/* Toast Notifications */}
      <AnimatePresence>
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </AnimatePresence>
    </main>
  )
}
