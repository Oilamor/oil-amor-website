/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * THE LIVING BLEND CODEX v3.0
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * The Alchemy of Total Uniqueness
 * 
 * Every component breathes. Every choice changes the soul.
 * 
 * Core Principle: A blend with the same oils but different crystal is a 
 * COMPLETELY DIFFERENT ENTITY. The cord, carrier, bottle size, even 0.1ml 
 * difference—all fundamentally alter the revelation.
 * 
 * Output: Single-page, information-dense, practical yet beautiful.
 * No slides. No mystical fluff. Living knowledge.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { OIL_WISDOM, OilWisdomProfile } from './oil-wisdom'
import { OIL_ARCHETYPES } from './oil-archetypes'
import { SafetyValidationResult } from '@/lib/safety/comprehensive-safety-v2'

// ═══════════════════════════════════════════════════════════════════════════════
// CRYSTAL WISDOM - The Energetic Amplifiers
// ═══════════════════════════════════════════════════════════════════════════════

export interface CrystalWisdom {
  id: string
  name: string
  property: string
  verb: string  // How it acts on the blend
  frequencyShift: number  // Modifies blend Hz by this amount
  element: 'fire' | 'water' | 'earth' | 'air' | 'ether'
  color: string
  amplifies: string[]  // What it enhances
  grounds: string[]  // What it stabilizes
  intention: string  // Suggested ritual focus
}

export const CRYSTAL_WISDOM: Record<string, CrystalWisdom> = {
  'clear-quartz': {
    id: 'clear-quartz',
    name: 'Clear Quartz',
    property: 'amplification',
    verb: 'clarifies and magnifies',
    frequencyShift: 10,
    element: 'ether',
    color: '#E0F2FE',
    amplifies: ['intention', 'clarity', 'universal connection'],
    grounds: ['scattered energy'],
    intention: 'mental clarity and spiritual connection'
  },
  'amethyst': {
    id: 'amethyst',
    name: 'Amethyst',
    property: 'transmutation',
    verb: 'elevates and purifies',
    frequencyShift: 15,
    element: 'air',
    color: '#8B5CF6',
    amplifies: ['intuition', 'peace', 'higher consciousness'],
    grounds: ['anxiety', 'addictive patterns'],
    intention: 'spiritual protection and restful sleep'
  },
  'rose-quartz': {
    id: 'rose-quartz',
    name: 'Rose Quartz',
    property: 'heart-opening',
    verb: 'softens and nurtures',
    frequencyShift: 8,
    element: 'water',
    color: '#F472B6',
    amplifies: ['self-love', 'emotional healing', 'compassion'],
    grounds: ['heartache', 'resentment'],
    intention: 'emotional healing and self-acceptance'
  },
  'citrine': {
    id: 'citrine',
    name: 'Citrine',
    property: 'manifestation',
    verb: 'energizes and attracts',
    frequencyShift: 20,
    element: 'fire',
    color: '#FBBF24',
    amplifies: ['abundance', 'confidence', 'creative power'],
    grounds: ['pessimism', 'fear of success'],
    intention: 'manifestation and solar empowerment'
  },
  'black-tourmaline': {
    id: 'black-tourmaline',
    name: 'Black Tourmaline',
    property: 'protection',
    verb: 'shields and anchors',
    frequencyShift: -5,
    element: 'earth',
    color: '#1F2937',
    amplifies: ['boundaries', 'grounding', 'electromagnetic protection'],
    grounds: ['anxiety', 'negative energy', 'scattered thoughts'],
    intention: 'protection and energetic cleansing'
  },
  'carnelian': {
    id: 'carnelian',
    name: 'Carnelian',
    property: 'vitality',
    verb: 'ignites and motivates',
    frequencyShift: 25,
    element: 'fire',
    color: '#EA580C',
    amplifies: ['courage', 'creativity', 'sexual energy'],
    grounds: ['lethargy', 'fear of action'],
    intention: 'creative confidence and passionate action'
  },
  'sodalite': {
    id: 'sodalite',
    name: 'Sodalite',
    property: 'truth',
    verb: 'articulates and reveals',
    frequencyShift: 12,
    element: 'water',
    color: '#1E40AF',
    amplifies: ['communication', 'logical thinking', 'authenticity'],
    grounds: ['mental confusion', 'fear of speaking'],
    intention: 'clear communication and inner truth'
  },
  'aventurine': {
    id: 'aventurine',
    name: 'Green Aventurine',
    property: 'opportunity',
    verb: 'opens and invites',
    frequencyShift: 18,
    element: 'earth',
    color: '#10B981',
    amplifies: ['luck', 'heart-centered growth', 'optimism'],
    grounds: ['pessimism', 'fear of change'],
    intention: 'new beginnings and heart-aligned success'
  },
  'hematite': {
    id: 'hematite',
    name: 'Hematite',
    property: 'grounding',
    verb: 'anchors and stabilizes',
    frequencyShift: -15,
    element: 'earth',
    color: '#4B5563',
    amplifies: ['focus', 'practical action', 'mental organization'],
    grounds: ['spaciness', 'excess energy', 'disconnection'],
    intention: 'grounding and mental focus'
  },
  'moonstone': {
    id: 'moonstone',
    name: 'Moonstone',
    property: 'intuition',
    verb: 'intuits and flows',
    frequencyShift: 5,
    element: 'water',
    color: '#F3F4F6',
    amplifies: ['feminine energy', 'cycles', 'emotional wisdom'],
    grounds: ['emotional instability', 'disconnection from natural rhythms'],
    intention: 'intuitive wisdom and emotional balance'
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORD WISDOM - The Material Anchors
// ═══════════════════════════════════════════════════════════════════════════════

export interface CordWisdom {
  id: string
  name: string
  material: string
  verb: string
  effect: string
  extends: string  // What it extends
  duration: string
  colorPsychology: string
  texture: string
}

export const CORD_WISDOM: Record<string, CordWisdom> = {
  'silk-gold': {
    id: 'silk-gold',
    name: 'Golden Silk',
    material: 'silk',
    verb: 'flows and elevates',
    effect: 'enhances top notes and heart-opening qualities',
    extends: 'the ethereal lift and emotional resonance',
    duration: 'through morning rituals and creative sessions',
    colorPsychology: 'solar confidence and abundance',
    texture: 'luxuriously smooth'
  },
  'silk-silver': {
    id: 'silk-silver',
    name: 'Silver Silk',
    material: 'silk',
    verb: 'flows and reflects',
    effect: 'enhances clarity and intuitive qualities',
    extends: 'the reflective pause and lunar wisdom',
    duration: 'through evening meditations and dream work',
    colorPsychology: 'intuitive reflection and fluid adaptability',
    texture: 'luxuriously smooth'
  },
  'hemp-natural': {
    id: 'hemp-natural',
    name: 'Natural Hemp',
    material: 'hemp',
    verb: 'grounds and connects',
    effect: 'anchors to earth and stabilizes volatility',
    extends: 'the grounding presence and rooted stability',
    duration: 'throughout the day with steady reliability',
    colorPsychology: 'raw authenticity and natural simplicity',
    texture: 'earthy and textured'
  },
  'hemp-dyed': {
    id: 'hemp-dyed',
    name: 'Dyed Hemp',
    material: 'hemp',
    verb: 'grounds with intention',
    effect: 'earth connection with focused color energy',
    extends: 'the intentional grounding and purposeful stability',
    duration: 'through specific rituals and focused work',
    colorPsychology: 'grounded intention with color amplification',
    texture: 'earthy and textured'
  },
  'leather-brown': {
    id: 'leather-brown',
    name: 'Brown Leather',
    material: 'leather',
    verb: 'protects and endures',
    effect: 'extends longevity and creates protective boundary',
    extends: 'the protective shield and enduring presence',
    duration: 'for weeks of steady protection and strength',
    colorPsychology: 'earthy reliability and protective warmth',
    texture: 'rugged and substantial'
  },
  'leather-black': {
    id: 'leather-black',
    name: 'Black Leather',
    material: 'leather',
    verb: 'shields and empowers',
    effect: 'strongest protection and personal power amplification',
    extends: 'the empowered boundaries and deep resilience',
    duration: 'through challenging times and transformation',
    colorPsychology: 'mystery, power, and complete absorption',
    texture: 'rugged and substantial'
  },
  'cotton-natural': {
    id: 'cotton-natural',
    name: 'Natural Cotton',
    material: 'cotton',
    verb: 'purifies and clarifies',
    effect: 'cleanses without interference, pure transmission',
    extends: 'the clarity and simple truth',
    duration: 'for daily rituals without complication',
    colorPsychology: 'purity, innocence, and clean intention',
    texture: 'soft and breathable'
  },
  'waxed-cord': {
    id: 'waxed-cord',
    name: 'Waxed Cord',
    material: 'waxed-cotton',
    verb: 'activates and seals',
    effect: 'seals intention and activates on contact',
    extends: 'the activated intention and sealed purpose',
    duration: 'until the moment of intentional use',
    colorPsychology: 'practical magic and purposeful action',
    texture: 'waxy and tactile'
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CARRIER WISDOM - The Delivery Vehicles
// ═══════════════════════════════════════════════════════════════════════════════

export interface CarrierWisdom {
  id: string
  name: string
  absorption: 'fast' | 'medium' | 'slow'
  texture: string
  feel: string
  therapeutic: string[]
  extendsNotes: string  // How it affects note longevity
  skinType: string[]
}

export const CARRIER_WISDOM: Record<string, CarrierWisdom> = {
  'pure': {
    id: 'pure',
    name: 'Pure Essential (No Carrier)',
    absorption: 'fast',
    texture: 'concentrated',
    feel: 'highly concentrated — respect potency',
    therapeutic: ['maximum potency', 'targeted intervention'],
    extendsNotes: 'always dilute before skin contact and use sparingly in well-ventilated spaces',
    skinType: ['experienced users only', 'not for direct skin contact']
  },
  'jojoba': {
    id: 'jojoba',
    name: 'Jojoba Oil',
    absorption: 'medium',
    texture: 'liquid wax',
    feel: 'silky and skin-identical',
    therapeutic: ['balances sebum', 'anti-inflammatory', 'hypoallergenic'],
    extendsNotes: 'heart notes linger longest with jojoba—ideal for emotional blends. Its wax ester structure is 98% identical to human sebum.',
    skinType: ['all skin types', 'acne-prone', 'oily', 'mature', 'facial application superior']
  },
  'fractionated-coconut': {
    id: 'fractionated-coconut',
    name: 'Fractionated Coconut Oil',
    absorption: 'fast',
    texture: 'light oil',
    feel: 'dry and weightless',
    therapeutic: ['deep moisture', 'antimicrobial', 'infinite shelf stability'],
    extendsNotes: 'top notes shine through—best for energizing daytime blends. Never solidifies, completely odorless.',
    skinType: ['all skin types', 'sensitive', 'massage superior', 'hot climates']
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES - The Codex Structure
// ═══════════════════════════════════════════════════════════════════════════════

export interface BlendCodex {
  // Identity
  soulHash: string
  name: string
  uniquenessScore: number
  
  // Visual
  aura: {
    primaryColor: string
    secondaryColor: string
    accentColor: string
    gradient: string
  }
  
  // The Essence (Procedural narrative)
  essence: string
  
  // Composition Profile
  composition: {
    oils: Array<{
      id: string
      name: string
      ml: number
      percentage: number
      frequency: number
      note: string
      element: string
    }>
    elemental: {
      fire: number
      water: number
      earth: number
      air: number
      dominant: string
    }
    noteDistribution: {
      top: number
      heart: number
      base: number
    }
    vibrationalFrequency: number
  }
  
  // Component Influence
  crystal: {
    id: string
    name: string
    verb: string
    amplifies: string[]
    frequencyShift: number
  }
  cord: {
    id: string
    name: string
    verb: string
    effect: string
    duration: string
  }
  carrier: {
    id: string
    name: string
    absorption: string
    extendsNotes: string
    feel: string
  }
  
  // Practical Profile
  therapeuticScores: Record<string, number>
  bestFor: string[]
  applicationMethods: Array<{
    method: string
    suitability: number
    instructions: string
  }>
  
  // Temporal Guidance
  timing: {
    timeOfDay: string[]
    season: string
    lunarPhase: string
    maturation: {
      peakDay: number
      character: string
      shelfLife: string
    }
  }
  
  // Safety & Cautions
  safety: {
    level: 'safe' | 'caution' | 'warning'
    phototoxic: boolean
    pregnancySafe: boolean
    ageRestriction?: string
    contraindications: string[]
  }
  
  // Comprehensive safety validation from the safety engine
  safetyValidation?: SafetyValidationResult
  
  // The Ritual
  ritual: {
    intention: string
    application: string
    storage: string
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// THE LIVING CODEX ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

interface CodexInput {
  oils: Array<{ id: string; ml: number; percentage: number }>
  crystalId: string
  cordId: string
  carrierId: string
  bottleSize: number
  mode: 'pure' | 'carrier'
  carrierRatio?: number
}

export function generateLivingCodex(input: CodexInput): BlendCodex {
  // Generate unique hash incorporating EVERY component
  const soulHash = generateSoulHash(input)
  
  // Get component wisdom
  const crystal = CRYSTAL_WISDOM[input.crystalId] || CRYSTAL_WISDOM['clear-quartz']
  const cord = CORD_WISDOM[input.cordId] || CORD_WISDOM['cotton-natural']
  const carrier = CARRIER_WISDOM[input.carrierId] || CARRIER_WISDOM['jojoba']
  
  // Build oil composition data
  const composition = buildComposition(input.oils)
  
  // Calculate therapeutic scores
  const therapeuticScores = calculateTherapeuticScores(input.oils, crystal, carrier)
  
  // Generate procedural name
  const name = generateBlendName(composition, crystal, cord, input)
  
  // Calculate uniqueness
  const uniquenessScore = calculateUniqueness(input)
  
  // Build aura colors
  const aura = buildAura(composition, crystal)
  
  // Generate THE ESSENCE - the core narrative that changes with EVERY component
  const essence = weaveEssence(composition, crystal, cord, carrier, input)
  
  // Determine best applications
  const applicationMethods = determineApplications(composition, carrier, input.mode)
  
  // Calculate timing
  const timing = calculateTiming(composition, crystal)
  
  // Safety assessment
  const safety = assessSafety(input.oils, input.mode, input.carrierRatio)
  
  // Generate ritual
  const ritual = generateRitual(crystal, cord, composition)
  
  return {
    soulHash,
    name,
    uniquenessScore,
    aura,
    essence,
    composition,
    crystal: {
      id: crystal.id,
      name: crystal.name,
      verb: crystal.verb,
      amplifies: crystal.amplifies,
      frequencyShift: crystal.frequencyShift
    },
    cord: {
      id: cord.id,
      name: cord.name,
      verb: cord.verb,
      effect: cord.effect,
      duration: cord.duration
    },
    carrier: {
      id: carrier.id,
      name: carrier.name,
      absorption: carrier.absorption,
      extendsNotes: carrier.extendsNotes,
      feel: carrier.feel
    },
    therapeuticScores,
    bestFor: determineBestFor(therapeuticScores, composition),
    applicationMethods,
    timing,
    safety,
    ritual
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE GENERATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function generateSoulHash(input: CodexInput): string {
  // Create deterministic hash from ALL components
  const oilData = input.oils
    .map(o => `${o.id}:${o.ml.toFixed(2)}`)
    .join('|')
  
  const componentData = `${oilData}|${input.crystalId}|${input.cordId}|${input.carrierId}|${input.bottleSize}|${input.mode}|${input.carrierRatio || 0}`
  
  // Simple hash function
  let hash = 0
  for (let i = 0; i < componentData.length; i++) {
    const char = componentData.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  
  // Convert to alphanumeric
  const chars = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
  let result = ''
  let num = Math.abs(hash)
  
  for (let i = 0; i < 12; i++) {
    result += chars[num % chars.length]
    num = Math.floor(num / chars.length)
  }
  
  return result.match(/.{4}/g)!.join('-')
}

function buildComposition(oils: Array<{ id: string; ml: number; percentage: number }>) {
  const oilData = oils.map(o => {
    const wisdom = OIL_WISDOM[o.id]
    const archetype = OIL_ARCHETYPES[o.id]
    
    return {
      id: o.id,
      name: wisdom?.name || o.id,
      ml: o.ml,
      percentage: o.percentage,
      frequency: wisdom?.frequency?.hz || 100,
      note: getNoteFromArchetype(archetype),
      element: wisdom?.element || archetype?.element || 'earth'
    }
  })
  
  // Calculate elemental distribution
  const elemental = { fire: 0, water: 0, earth: 0, air: 0 }
  oilData.forEach(o => {
    const weight = o.percentage / 100
    elemental[o.element as keyof typeof elemental] += weight * 100
  })
  
  const dominant = Object.entries(elemental)
    .sort((a, b) => b[1] - a[1])[0][0]
  
  // Calculate note distribution
  const noteDistribution = { top: 0, heart: 0, base: 0 }
  oilData.forEach(o => {
    const weight = o.percentage
    if (o.note === 'top') noteDistribution.top += weight
    else if (o.note === 'heart') noteDistribution.heart += weight
    else if (o.note === 'base') noteDistribution.base += weight
  })
  
  // Calculate vibrational frequency
  const vibrationalFrequency = oilData.reduce((sum, o) => {
    return sum + (o.frequency * (o.percentage / 100))
  }, 0)
  
  return {
    oils: oilData,
    elemental: {
      ...elemental,
      dominant
    },
    noteDistribution,
    vibrationalFrequency: Math.round(vibrationalFrequency * 10) / 10
  }
}

function getNoteFromArchetype(archetype: any): string {
  if (!archetype) return 'heart'
  if (archetype.notes === 'top') return 'top'
  if (archetype.notes === 'base') return 'base'
  if (archetype.notes === 'middle') return 'heart'
  
  // Fallback based on element
  if (archetype.element === 'air' || archetype.element === 'fire') return 'top'
  if (archetype.element === 'earth') return 'base'
  return 'heart'
}

function calculateTherapeuticScores(
  oils: Array<{ id: string; ml: number; percentage: number }>,
  crystal: CrystalWisdom,
  carrier: CarrierWisdom
): Record<string, number> {
  const scores: Record<string, number> = {
    'Stress Relief': 0,
    'Energy & Focus': 0,
    'Sleep Support': 0,
    'Pain Relief': 0,
    'Immune Support': 0,
    'Skin Healing': 0,
    'Respiratory': 0,
    'Emotional Balance': 0
  }
  
  // Aggregate from oils
  oils.forEach(o => {
    const wisdom = OIL_WISDOM[o.id]
    const weight = o.percentage
    
    if (wisdom?.categories) {
      wisdom.categories.forEach((cat: string) => {
        const mapping: Record<string, string> = {
          'stress-relief': 'Stress Relief',
          'mood-uplifting': 'Energy & Focus',
          'mental-clarity': 'Energy & Focus',
          'sleep-support': 'Sleep Support',
          'pain-relief': 'Pain Relief',
          'anti-inflammatory': 'Pain Relief',
          'immune-support': 'Immune Support',
          'antimicrobial': 'Immune Support',
          'skin-care': 'Skin Healing',
          'respiratory': 'Respiratory',
          'grounding': 'Emotional Balance',
          'spiritual-connection': 'Emotional Balance'
        }
        const scoreKey = mapping[cat]
        if (scoreKey) {
          scores[scoreKey] += weight * 0.8
        }
      })
    }
  })
  
  // Crystal amplification
  if (crystal.id === 'amethyst' || crystal.id === 'rose-quartz') {
    scores['Emotional Balance'] += 15
    scores['Stress Relief'] += 10
  }
  if (crystal.id === 'citrine' || crystal.id === 'carnelian') {
    scores['Energy & Focus'] += 20
  }
  if (crystal.id === 'clear-quartz') {
    // Amplifies highest score
    const highest = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]
    scores[highest[0]] += 15
  }
  
  // Carrier contribution
  if (carrier.id === 'jojoba') {
    scores['Skin Healing'] += 10
  }
  if (carrier.id === 'argan') {
    scores['Skin Healing'] += 15
  }
  
  // Cap at 100
  Object.keys(scores).forEach(key => {
    scores[key] = Math.min(Math.round(scores[key]), 100)
  })
  
  return scores
}

function generateBlendName(
  composition: BlendCodex['composition'],
  crystal: CrystalWisdom,
  cord: CordWisdom,
  input: CodexInput
): string {
  const dominant = composition.oils.sort((a, b) => b.percentage - a.percentage)[0]
  const dominantElement = composition.elemental.dominant
  
  // Name patterns based on crystal + element + cord + bottle size
  const patterns: Record<string, string[]> = {
    fire: ['Ember', 'Flame', 'Spark', 'Phoenix', 'Sun'],
    water: ['Tide', 'Mist', 'Depth', 'Wave', 'Rain'],
    earth: ['Stone', 'Root', 'Soil', 'Cedar', 'Moss'],
    air: ['Breeze', 'Cloud', 'Sky', 'Feather', 'Whisper']
  }
  
  const crystalQualities: Record<string, string[]> = {
    'clear-quartz': ['Clarity', 'Prism', 'Crystal'],
    'amethyst': ['Dream', 'Vision', 'Purple'],
    'rose-quartz': ['Heart', 'Rose', 'Gentle'],
    'citrine': ['Gold', 'Sun', 'Abundance'],
    'black-tourmaline': ['Shield', 'Guardian', 'Night'],
    'carnelian': ['Fire', 'Action', 'Courage'],
    'sodalite': ['Truth', 'Voice', 'Blue'],
    'aventurine': ['Luck', 'Growth', 'Green'],
    'hematite': ['Anchor', 'Core', 'Iron'],
    'moonstone': ['Moon', 'Cycle', 'Pearl']
  }
  
  // Size modifiers based on bottle size
  const sizeModifiers: Record<number, string[]> = {
    5: ['Petite', 'Tiny', 'Mini'],
    10: ['Small', 'Compact', 'Travel'],
    15: ['Personal', 'Daily', 'Regular'],
    20: ['Medium', 'Standard', 'Full'],
    30: ['Large', 'Generous', 'Family']
  }
  
  // Strength modifiers for carrier mode
  const strengthModifiers: Record<number, string[]> = {
    5: ['Gentle', 'Mild', 'Soft'],
    10: ['Light', 'Easy', 'Subtle'],
    15: ['Balanced', 'Harmonious', 'Even'],
    25: ['Strong', 'Potent', 'Rich'],
    50: ['Intense', 'Powerful', 'Deep'],
    75: ['Maximum', 'Pure', 'Essence']
  }
  
  const elementNames = patterns[dominantElement as keyof typeof patterns] || patterns.earth
  const crystalNames = crystalQualities[crystal.id] || ['Essence']
  const sizeNames = sizeModifiers[input.bottleSize] || sizeModifiers[30]
  
  // Use hash incorporating ALL components for deterministic selection
  const oilHash = input.oils.reduce((sum, o) => sum + o.ml * 100, 0)
  const componentHash = oilHash + input.bottleSize + (input.carrierRatio || 0)
  const hash = Math.floor(componentHash)
  
  const elementName = elementNames[hash % elementNames.length]
  const crystalName = crystalNames[Math.floor(hash / 10) % crystalNames.length]
  const sizeName = sizeNames[Math.floor(hash / 5) % sizeNames.length]
  
  // Cord adds suffix
  const cordSuffixes: Record<string, string> = {
    'silk': 'Silk',
    'hemp': 'Root',
    'leather': 'Bound',
    'cotton': 'Pure',
    'waxed-cotton': 'Seal'
  }
  
  const cordMaterial = cord.id.includes('silk') ? 'silk' :
                       cord.id.includes('hemp') ? 'hemp' :
                       cord.id.includes('leather') ? 'leather' :
                       cord.id.includes('cotton') ? 'cotton' : 'waxed-cotton'
  
  const suffix = cordSuffixes[cordMaterial]
  
  // Include size in name for larger bottles
  if (input.bottleSize >= 20) {
    return `${sizeName} ${crystalName} ${elementName} ${suffix}`
  }
  
  return `${crystalName} ${elementName} ${suffix}`
}

function calculateUniqueness(input: CodexInput): number {
  let score = 0
  
  // Oil count and complexity
  score += input.oils.length * 5
  
  // Ratio diversity (more varied = more unique)
  const ratios = input.oils.map(o => o.percentage)
  const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length
  const variance = ratios.reduce((sum, r) => sum + Math.abs(r - avgRatio), 0)
  score += variance * 0.5
  
  // Component uniqueness
  if (input.crystalId !== 'clear-quartz') score += 10
  if (input.cordId !== 'cotton-natural') score += 10
  if (input.carrierId !== 'jojoba') score += 5
  if (input.mode === 'pure') score += 15
  
  // Bottle size variation (larger = more potent, more unique)
  score += (input.bottleSize - 5) * 0.5
  
  // Carrier ratio variation in carrier mode
  if (input.mode === 'carrier' && input.carrierRatio) {
    // Higher concentrations (lower carrier ratio) = more unique
    score += (100 - input.carrierRatio) * 0.2
  }
  
  return Math.min(Math.round(score), 100)
}

function buildAura(composition: BlendCodex['composition'], crystal: CrystalWisdom) {
  // Primary from crystal
  const primaryColor = crystal.color
  
  // Secondary from dominant element
  const elementColors: Record<string, string> = {
    fire: '#DC2626',
    water: '#0891B2',
    earth: '#92400E',
    air: '#E0F2FE'
  }
  const secondaryColor = elementColors[composition.elemental.dominant] || '#C9A227'
  
  // Accent from dominant oil frequency
  const dominant = composition.oils[0]
  const accentColor = dominant?.frequency > 300 ? '#C9A227' : '#8B5CF6'
  
  return {
    primaryColor,
    secondaryColor,
    accentColor,
    gradient: `linear-gradient(135deg, ${primaryColor}20 0%, ${secondaryColor}15 50%, ${accentColor}10 100%)`
  }
}

function weaveEssence(
  composition: BlendCodex['composition'],
  crystal: CrystalWisdom,
  cord: CordWisdom,
  carrier: CarrierWisdom,
  input: CodexInput
): string {
  const dominant = composition.oils.sort((a, b) => b.percentage - a.percentage)[0]
  const secondary = composition.oils.sort((a, b) => b.percentage - a.percentage)[1]
  
  // Bottle size descriptor
  const sizeDescriptor = input.bottleSize <= 10 ? 'intimate' : input.bottleSize <= 20 ? 'personal' : 'generous'
  
  // Carrier ratio descriptor for carrier mode
  const strengthDescriptor = input.mode === 'carrier' && input.carrierRatio 
    ? input.carrierRatio <= 10 ? 'delicately diluted' 
      : input.carrierRatio <= 25 ? 'balanced strength'
      : input.carrierRatio <= 50 ? 'concentrated potency'
      : 'maximum intensity'
    : input.mode === 'pure' ? 'pure undiluted potency' : 'balanced strength'
  
  // Sentence 1: The foundation (oils + crystal + bottle size)
  let essence = `This ${sizeDescriptor} ${composition.elemental.dominant}-natured blend carries ${crystal.name}'s ${crystal.property}, `
  essence += `${crystal.verb} the ${dominant.name}'s ${getOilQuality(dominant)}`
  
  if (secondary) {
    essence += ` while ${secondary.name} adds ${getOilQuality(secondary)}`
  }
  essence += '. '
  
  // Sentence 2: Cord influence (MUST change when cord changes)
  essence += `${cord.name} ${cord.verb} the blend, ${cord.effect}, `
  essence += `extending ${cord.extends} ${cord.duration}. `
  
  // Sentence 3: Carrier + delivery + strength
  essence += `Through ${carrier.name}'s ${carrier.absorption} absorption and ${carrier.feel} texture, `
  essence += `${carrier.extendsNotes} at ${strengthDescriptor}. `
  
  // Sentence 4: The complete picture
  const therapeuticFocus = getDominantTherapeutic(composition.oils)
  essence += `A ${getIntensity(composition)} ${therapeuticFocus} formula for ${getUseCase(composition, crystal)}.`
  
  return essence
}

function getOilQuality(oil: BlendCodex['composition']['oils'][0]): string {
  const qualities: Record<string, string> = {
    'lavender': 'calming embrace',
    'lemon': 'clarifying brightness',
    'peppermint': 'invigorating coolness',
    'tea-tree': 'protective purity',
    'eucalyptus': 'expansive openness',
    'frankincense': 'meditative depth',
    'rosemary': 'mental clarity',
    'sweet-orange': 'joyful warmth',
    'bergamot-fcf': 'uplifting balance',
    'geranium': 'harmonizing presence',
    'ylang-ylang': 'sensual sweetness',
    'sandalwood': 'grounding wisdom',
    'cedarwood': 'steadfast strength',
    'vetiver': 'deep anchoring',
    'patchouli': 'earthy richness',
    'clary-sage': 'intuitive vision',
    'juniper-berry': 'cleansing protection',
    'grapefruit': 'energizing lightness',
    'lemongrass': 'purifying clarity',
    'ginger': 'warming courage',
    'cinnamon-leaf': 'stimulating fire',
    'clove-bud': 'potent shield',
    'may-chang': 'refreshing optimism',
    'myrrh': 'ancient healing'
  }
  
  return qualities[oil.id] || `${oil.element} essence`
}

function getDominantTherapeutic(oils: BlendCodex['composition']['oils']): string {
  const categories = oils.flatMap(o => OIL_WISDOM[o.id]?.categories || [])
  const counts: Record<string, number> = {}
  categories.forEach(c => {
    counts[c] = (counts[c] || 0) + 1
  })
  
  const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  
  const mappings: Record<string, string> = {
    'stress-relief': 'calming',
    'mood-uplifting': 'mood-enhancing',
    'sleep-support': 'rest-promoting',
    'pain-relief': 'comforting',
    'immune-support': 'protective',
    'skin-care': 'nourishing',
    'mental-clarity': 'focus-enhancing',
    'spiritual-connection': 'consciousness-expanding',
    'grounding': 'centering',
    'respiratory': 'breath-supporting'
  }
  
  return mappings[dominant?.[0]] || 'therapeutic'
}

function getIntensity(composition: BlendCodex['composition']): string {
  const oilCount = composition.oils.length
  const topNotes = composition.noteDistribution.top
  
  if (oilCount === 1) return 'singular'
  if (oilCount === 2) return 'focused'
  if (oilCount <= 4) return topNotes > 50 ? 'bright and dynamic' : 'complex and layered'
  return 'masterfully intricate'
}

function getUseCase(composition: BlendCodex['composition'], crystal: CrystalWisdom): string {
  const useCases: Record<string, string> = {
    'clear-quartz': 'intention-setting and amplification',
    'amethyst': 'meditation and restful sleep',
    'rose-quartz': 'emotional healing and self-care rituals',
    'citrine': 'morning energizing and manifestation work',
    'black-tourmaline': 'protection and energetic cleansing',
    'carnelian': 'creative projects and courageous action',
    'sodalite': 'communication and study sessions',
    'aventurine': 'new beginnings and heart-centered work',
    'hematite': 'grounding and focused productivity',
    'moonstone': 'honoring cycles and intuitive development'
  }
  
  return useCases[crystal.id] || 'daily aromatherapy practice'
}

function determineApplications(
  composition: BlendCodex['composition'],
  carrier: CarrierWisdom,
  mode: string
): Array<{ method: string; suitability: number; instructions: string }> {
  const methods: Array<{ method: string; suitability: number; instructions: string }> = []
  
  // Diffusion suitability — ONLY for pure essential oil blends
  // Carrier-enhanced blends must never go in diffusers (carrier oils damage devices)
  if (mode === 'pure') {
    const topNoteDominance = composition.noteDistribution.top
    const diffusionSuitability = Math.min(100, topNoteDominance * 1.5 + 20)
    methods.push({
      method: 'Diffusion',
      suitability: Math.round(diffusionSuitability),
      instructions: 'Use 2-3 drops in water-based diffuser for 30 minutes'
    })
  }
  
  // Topical suitability
  const hasBaseNotes = composition.noteDistribution.base > 20
  const topicalSuitability = mode === 'pure' ? 30 : Math.min(100, 70 + (hasBaseNotes ? 20 : 0))
  methods.push({
    method: 'Topical Application',
    suitability: Math.round(topicalSuitability),
    instructions: mode === 'pure'
      ? 'DILUTE before use: 1 drop per 10ml carrier for pulse points only'
      : `Apply directly to pulse points, temples, or areas of concern. ${carrier.extendsNotes}`
  })
  
  // Inhalation suitability
  const respiratoryOils = composition.oils.filter(o => 
    OIL_WISDOM[o.id]?.categories?.includes('respiratory')
  ).length
  const inhaleSuitability = Math.min(100, 40 + (respiratoryOils * 20))
  methods.push({
    method: 'Direct Inhalation',
    suitability: Math.round(inhaleSuitability),
    instructions: 'Cup hands over nose, inhale deeply 3 times. Use as needed throughout day.'
  })
  
  // Bath suitability
  const bathSuitability = mode === 'pure' ? 20 : Math.min(100, 50 + (carrier.absorption === 'slow' ? 30 : 0))
  methods.push({
    method: 'Bath Ritual',
    suitability: Math.round(bathSuitability),
    instructions: mode === 'pure'
      ? 'NOT RECOMMENDED without dilution. Mix 3 drops with 1 tbsp honey or milk first.'
      : `Add 5-8 drops to warm bath. ${carrier.name} creates a ${carrier.feel} experience.`
  })
  
  return methods.sort((a, b) => b.suitability - a.suitability)
}

function determineBestFor(
  scores: Record<string, number>,
  composition: BlendCodex['composition']
): string[] {
  const sorted = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .filter(([_, score]) => score > 30)
    .slice(0, 3)
    .map(([name]) => name)
  
  // Add contextual scenarios based on composition
  const scenarios: string[] = [...sorted]
  
  if (composition.noteDistribution.top > 50) {
    scenarios.push('Morning rituals and energizing routines')
  }
  if (composition.noteDistribution.base > 40) {
    scenarios.push('Evening wind-down and deep relaxation')
  }
  if (composition.oils.length >= 4) {
    scenarios.push('Complex emotional support and multi-layered healing')
  }
  
  return scenarios.slice(0, 3)
}

function calculateTiming(
  composition: BlendCodex['composition'],
  crystal: CrystalWisdom
) {
  // Time of day based on notes
  const times: string[] = []
  if (composition.noteDistribution.top > 30) times.push('Morning', 'Midday')
  if (composition.noteDistribution.heart > 30) times.push('Afternoon', 'Evening')
  if (composition.noteDistribution.base > 30) times.push('Evening', 'Night')
  
  // Season based on elements
  const seasons: Record<string, string> = {
    fire: 'Summer',
    water: 'Winter',
    earth: 'Autumn',
    air: 'Spring'
  }
  const season = seasons[composition.elemental.dominant] || 'All Seasons'
  
  // Lunar phase from crystal
  const lunarPhases: Record<string, string> = {
    'clear-quartz': 'Any phase—amplification',
    'amethyst': 'Waning Moon—release and rest',
    'rose-quartz': 'Full Moon—heart expansion',
    'citrine': 'New Moon—manifestation',
    'black-tourmaline': 'Dark Moon—protection',
    'carnelian': 'Waxing Moon—building energy',
    'sodalite': 'First Quarter—communication',
    'aventurine': 'New Moon—new beginnings',
    'hematite': 'Full Moon—grounding excess',
    'moonstone': 'Full Moon—peak intuition'
  }
  
  // Maturation based on base notes
  const baseNoteAmount = composition.noteDistribution.base
  const peakDay = baseNoteAmount > 40 ? 14 : baseNoteAmount > 20 ? 7 : 3
  const character = baseNoteAmount > 40 ? 'deep and complex' : baseNoteAmount > 20 ? 'balanced and rounded' : 'bright and immediate'
  
  return {
    timeOfDay: [...new Set(times)].slice(0, 2),
    season,
    lunarPhase: lunarPhases[crystal.id] || 'Any phase',
    maturation: {
      peakDay,
      character,
      shelfLife: baseNoteAmount > 40 ? '12-18 months' : '6-12 months'
    }
  }
}

function assessSafety(
  oils: Array<{ id: string; ml: number; percentage: number }>,
  mode: string,
  carrierRatio?: number
) {
  let level: 'safe' | 'caution' | 'warning' = 'safe'
  const contraindications: string[] = []
  
  // Check for photosensitive oils
  const photosensitiveOils = oils.filter(o => {
    const wisdom = OIL_WISDOM[o.id]
    return wisdom?.categories?.includes('citrus') || 
           ['lemon', 'lime', 'bergamot-fcf', 'grapefruit', 'sweet-orange'].includes(o.id)
  })
  const phototoxic = photosensitiveOils.length > 0 && mode === 'pure'
  
  if (phototoxic) {
    contraindications.push('Photosensitivity: Avoid sun exposure for 12 hours after application')
    level = 'warning'
  }
  
  // Check pregnancy safety
  const cautionOils = ['clary-sage', 'rosemary', 'jasmine', 'cinnamon-leaf']
  const hasPregnancyCaution = oils.some(o => cautionOils.includes(o.id))
  
  // Check for pure mode
  if (mode === 'pure') {
    contraindications.push('Undiluted: For experienced users only. Always patch test.')
    level = 'warning'
  }
  
  // Check concentration for carrier mode
  if (mode === 'carrier' && carrierRatio && carrierRatio > 25) {
    contraindications.push('High concentration: Use sparingly, not for daily prolonged use')
    if (level === 'safe') level = 'caution'
  }
  
  return {
    level,
    phototoxic,
    pregnancySafe: !hasPregnancyCaution,
    ageRestriction: mode === 'pure' ? 'Adults only' : 'Age 12+ with supervision',
    contraindications
  }
}

function generateRitual(
  crystal: CrystalWisdom,
  cord: CordWisdom,
  composition: BlendCodex['composition']
): BlendCodex['ritual'] {
  // Intention from crystal
  const intention = `I call upon ${crystal.name}'s ${crystal.property} to ${crystal.amplifies[0] || 'amplify intention'}`
  
  // Application based on cord texture + dominant note
  const note = composition.noteDistribution.top > composition.noteDistribution.base ? 'top' : 'base'
  const application = note === 'top'
    ? `Apply to pulse points and inhale deeply. The ${cord.texture} cord serves as reminder throughout your day.`
    : `Apply to soles of feet and heart center before rest. Hold the ${cord.name} as you set intention.`
  
  // Storage from cord material
  const storageMaterials: Record<string, string> = {
    'silk': 'wrapped in silk or stored in dark glass away from direct light',
    'hemp': 'in a cool, dry place with the cord visible as energetic anchor',
    'leather': 'protected from extreme temperatures, leather will age beautifully with use',
    'cotton': 'clean and simple storage, away from strong odors',
    'waxed-cotton': 'upright position, waxed seal maintains intention'
  }
  
  const cordMaterial = cord.id.includes('silk') ? 'silk' :
                       cord.id.includes('hemp') ? 'hemp' :
                       cord.id.includes('leather') ? 'leather' :
                       cord.id.includes('cotton') ? 'cotton' : 'waxed-cotton'
  
  const storage = `Store ${storageMaterials[cordMaterial]}. ${composition.noteDistribution.base > 30 ? 'The base notes will deepen over time.' : 'Use within 6 months for optimal freshness.'}`
  
  return {
    intention,
    application,
    storage
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export const LivingBlendCodex = {
  generate: generateLivingCodex,
  crystals: CRYSTAL_WISDOM,
  cords: CORD_WISDOM,
  carriers: CARRIER_WISDOM
}

export default LivingBlendCodex
