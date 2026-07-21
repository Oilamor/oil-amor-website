// ============================================================================
// MIXING ATELIER — PURE DATA & HELPERS
// Extracted from page.tsx (structural refactor, no behavior change)
// ============================================================================

import { ATELIER_OILS } from '@/lib/atelier/atelier-engine'
import { RiskLevel } from '@/lib/safety/comprehensive-safety-v2'

export type BlendMode = 'pure' | 'carrier'

export const AVAILABLE_OILS = ATELIER_OILS

export const CARRIER_RATIOS = [5, 10, 15, 25, 50, 75] as const

// ============================================================================
// CARRIER RATIO GUIDANCE
// ============================================================================

export interface RatioGuidance {
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
export const RATIO_GUIDANCE: Record<number, RatioGuidance> = {
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
export const BOTTLE_SIZES = [5, 10, 15, 20, 30] as const

// Carrier Oil Options
// ============================================================================
// CARRIER OILS - CURATED SELECTION
// Only the two finest carriers for optimal results
// ============================================================================

export const CARRIER_OILS = [
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

export interface CarrierOilEducation {
  title: string
  content: string
  highlight?: string
}

export const CARRIER_EDUCATION: Record<string, CarrierOilEducation> = {
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

export const CARRIER_COMPARISON = [
  { feature: 'Molecular Type', jojoba: 'Liquid Wax Ester', coconut: 'Fractionated Triglyceride', winner: null as 'jojoba' | 'coconut' | null },
  { feature: 'Skin Similarity', jojoba: '98% match to sebum', coconut: 'Highly compatible', winner: 'jojoba' as const },
  { feature: 'Texture', jojoba: 'Silky, luxurious', coconut: 'Featherlight, dry', winner: null as 'jojoba' | 'coconut' | null },
  { feature: 'Absorption', jojoba: 'Medium (sustained)', coconut: 'Fast (quick)', winner: null as 'jojoba' | 'coconut' | null },
  { feature: 'Scent', jojoba: 'Subtle nutty', coconut: 'Completely odorless', winner: null as 'jojoba' | 'coconut' | null },
  { feature: 'Best For Face', jojoba: '★★★★★ Superior', coconut: '★★★★☆ Good', winner: 'jojoba' as const },
  { feature: 'Best For Body', jojoba: '★★★★☆ Excellent', coconut: '★★★★★ Superior', winner: 'coconut' as const },
  { feature: 'Climate Stability', jojoba: 'Always liquid', coconut: 'Never solidifies', winner: null as 'jojoba' | 'coconut' | null },
]

export const ML_PRECISION = 0.1
export const CARRIER_ML_PRECISION = 0.01
export const DROPS_PER_ML = 20
export const PURE_DEFAULT_ML = 0.1
export const CARRIER_DEFAULT_ML = 0.1

export function getMlPrecision(mode: BlendMode) {
  return mode === 'carrier' ? CARRIER_ML_PRECISION : ML_PRECISION
}

export function getMlDecimals(mode: BlendMode) {
  return mode === 'carrier' ? 2 : 1
}

export function formatDrops(ml: number): string {
  const drops = ml * DROPS_PER_ML
  if (drops < 0.5) return '<1 drop'
  if (drops < 1.5) return '~1 drop'
  return `~${Math.round(drops)} drops`
}

// Intended use options
export const INTENDED_USES = [
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
export const DANGEROUS_COMBINATIONS = {
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
export const OIL_SAFETY_PROFILES: Record<string, {
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
export const BLEND_FACTS = [
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
export const PROFANITY_LIST = ['badword1', 'badword2', 'badword3'] // Simplified for demo
