/**
 * Oil Amor - Master Oil & Crystal Database
 * Enhanced with bottle sizes, crystal counts, and carrier oil synergies
 * 75 unique oil-crystal pairings × 5 carrier oils = 375 total synergies
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type Chakra = 'root' | 'sacral' | 'solar-plexus' | 'heart' | 'throat' | 'third-eye' | 'crown'
export type Element = 'earth' | 'water' | 'fire' | 'air'

export interface Crystal {
  id: string
  name: string
  technicalName: string
  chakra: Chakra
  element: Element
  color: string
  description: string
  energy: string
  properties: string[]
}

export interface CrystalPairing extends Crystal {
  synergyTitle: string
  synergyDescription: string
  ritual: string
  benefits: string[]
  frequency?: string
  // Enhanced carrier-specific synergies
  carrierSynergies?: Record<string, {
    description: string
    ritual: string
    benefits: string[]
  }>
}

export interface OilProfile {
  id: string
  handle?: string
  commonName: string
  technicalName: string
  origin: string
  extractionMethod: string
  baseProperties: string[]
  image: string
  imageAttribution?: string
  description: string
  aroma: string
  strengths: string[]
  crystalPairings: CrystalPairing[]
  recommendedCarrier?: string
  // Size-specific crystal counts (descriptions only - prices in product-config.ts)
  sizeInfo: {
    '30ml': { crystals: 12; description: string }
    '20ml': { crystals: 8; description: string }
    '15ml': { crystals: 6; description: string }
    '10ml': { crystals: 4; description: string }
    '5ml': { crystals: 2; description: string }
  }
}

// ============================================================================
// CRYSTAL REFERENCE (15 Premium Crystals)
// ============================================================================

export const ALL_CRYSTALS: Crystal[] = [
  {
    id: 'amethyst',
    name: 'Amethyst',
    technicalName: 'Silicon dioxide with iron impurities',
    chakra: 'crown',
    element: 'air',
    color: '#9966cc',
    description: 'The stone of spiritual wisdom and inner peace',
    energy: 'Calming, protective, clarifying',
    properties: ['Stress relief', 'Meditation aid', 'Sleep support', 'Intuition'],
  },
  {
    id: 'rose-quartz',
    name: 'Rose Quartz',
    technicalName: 'Silicon dioxide with titanium',
    chakra: 'heart',
    element: 'water',
    color: '#ffb6c1',
    description: 'The stone of unconditional love and compassion',
    energy: 'Nurturing, gentle, heart-opening',
    properties: ['Emotional healing', 'Self-love', 'Relationship harmony', 'Grief support'],
  },
  {
    id: 'clear-quartz',
    name: 'Clear Quartz',
    technicalName: 'Pure silicon dioxide',
    chakra: 'crown',
    element: 'air',
    color: '#e8e8e8',
    description: 'The master healer and energy amplifier',
    energy: 'Clarifying, amplifying, harmonizing',
    properties: ['Energy amplification', 'Mental clarity', 'Manifestation', 'Aura cleansing'],
  },
  {
    id: 'citrine',
    name: 'Citrine',
    technicalName: 'Silicon dioxide with iron',
    chakra: 'solar-plexus',
    element: 'fire',
    color: '#f4d03f',
    description: 'The stone of abundance and personal power',
    energy: 'Uplifting, energizing, manifesting',
    properties: ['Abundance', 'Confidence', 'Creativity', 'Mental focus'],
  },
  {
    id: 'black-tourmaline',
    name: 'Black Tourmaline',
    technicalName: 'Complex boron silicate',
    chakra: 'root',
    element: 'earth',
    color: '#1a1a1a',
    description: 'The ultimate protection and grounding stone',
    energy: 'Protective, grounding, stabilizing',
    properties: ['EMF protection', 'Grounding', 'Anxiety relief', 'Boundary setting'],
  },
  {
    id: 'carnelian',
    name: 'Carnelian',
    technicalName: 'Chalcedony with iron oxide',
    chakra: 'sacral',
    element: 'fire',
    color: '#e85d04',
    description: 'The stone of vitality and creative passion',
    energy: 'Energizing, motivating, passionate',
    properties: ['Creativity', 'Courage', 'Motivation', 'Vitality'],
  },
  {
    id: 'aventurine',
    name: 'Aventurine',
    technicalName: 'Quartz with fuchsite inclusions',
    chakra: 'heart',
    element: 'earth',
    color: '#2ecc71',
    description: 'The stone of opportunity and growth',
    energy: 'Lucky, growth-oriented, comforting',
    properties: ['Good luck', 'Heart healing', 'Prosperity', 'Emotional calm'],
  },
  {
    id: 'lapis-lazuli',
    name: 'Lapis Lazuli',
    technicalName: 'Lazurite with calcite and pyrite',
    chakra: 'third-eye',
    element: 'air',
    color: '#1e3a8a',
    description: 'The stone of truth and inner vision',
    energy: 'Insightful, truthful, expansive',
    properties: ['Intuition', 'Communication', 'Wisdom', 'Spiritual insight'],
  },
  {
    id: 'tigers-eye',
    name: "Tiger's Eye",
    technicalName: 'Crocidolite replaced by quartz',
    chakra: 'solar-plexus',
    element: 'earth',
    color: '#b8860b',
    description: 'The stone of courage and clear perception',
    energy: 'Grounding, protective, empowering',
    properties: ['Confidence', 'Mental clarity', 'Protection', 'Decision making'],
  },
  {
    id: 'moonstone',
    name: 'Moonstone',
    technicalName: 'Feldspar with adularescence',
    chakra: 'sacral',
    element: 'water',
    color: '#e0e0e0',
    description: 'The stone of new beginnings and intuition',
    energy: 'Feminine, cyclical, intuitive',
    properties: ['New beginnings', 'Intuition', 'Emotional balance', 'Fertility'],
  },
  {
    id: 'hematite',
    name: 'Hematite',
    technicalName: 'Iron oxide (Fe₂O₃)',
    chakra: 'root',
    element: 'earth',
    color: '#4a4a4a',
    description: 'The stone of grounding and mental organization',
    energy: 'Grounding, focusing, strengthening',
    properties: ['Focus', 'Grounding', 'Confidence', 'Memory'],
  },
  {
    id: 'sodalite',
    name: 'Sodalite',
    technicalName: 'Sodium aluminum silicate chloride',
    chakra: 'throat',
    element: 'water',
    color: '#1e40af',
    description: 'The stone of logic and communication',
    energy: 'Calming, rational, expressive',
    properties: ['Communication', 'Logic', 'Emotional balance', 'Self-expression'],
  },
  {
    id: 'red-jasper',
    name: 'Red Jasper',
    technicalName: 'Microcrystalline quartz with iron',
    chakra: 'root',
    element: 'earth',
    color: '#8b0000',
    description: 'The stone of endurance and stability',
    energy: 'Stabilizing, nurturing, strengthening',
    properties: ['Endurance', 'Grounding', 'Nurturing', 'Courage'],
  },
  {
    id: 'howlite',
    name: 'Howlite',
    technicalName: 'Calcium borosilicate hydroxide',
    chakra: 'crown',
    element: 'air',
    color: '#f5f5f5',
    description: 'The stone of patience and perspective',
    energy: 'Calming, patient, awareness-inducing',
    properties: ['Patience', 'Stress relief', 'Meditation', 'Emotional expression'],
  },
  {
    id: 'green-aventurine',
    name: 'Green Aventurine',
    technicalName: 'Quartz with fuchsite',
    chakra: 'heart',
    element: 'earth',
    color: '#228b22',
    description: 'The stone of heart-centered abundance',
    energy: 'Compassionate, lucky, healing',
    properties: ['Heart healing', 'Abundance', 'Compassion', 'Well-being'],
  },
  {
    id: 'peridot',
    name: 'Peridot',
    technicalName: 'Magnesium iron silicate',
    chakra: 'heart',
    element: 'earth',
    color: '#9ccc65',
    description: 'The stone of compassion and emotional cleansing',
    energy: 'Cleansing, renewing, heart-opening',
    properties: ['Emotional release', 'Compassion', 'Stress relief', 'Heart healing'],
  },
  {
    id: 'orange-calcite',
    name: 'Orange Calcite',
    technicalName: 'Calcium carbonate',
    chakra: 'sacral',
    element: 'fire',
    color: '#ffa500',
    description: 'The stone of playfulness and emotional balance',
    energy: 'Playful, balancing, uplifting',
    properties: ['Emotional balance', 'Playfulness', 'Optimism', 'Stress relief'],
  },
  {
    id: 'sunstone',
    name: 'Sunstone',
    technicalName: 'Feldspar with hematite inclusions',
    chakra: 'solar-plexus',
    element: 'fire',
    color: '#f4a460',
    description: 'The stone of leadership, independence, and good fortune',
    energy: 'Empowering, lucky, radiant',
    properties: ['Leadership', 'Independence', 'Good luck', 'Personal power'],
  },
  {
    id: 'fluorite',
    name: 'Fluorite',
    technicalName: 'Calcium fluoride',
    chakra: 'third-eye',
    element: 'air',
    color: '#9b59b6',
    description: 'The stone of mental order and clarity',
    energy: 'Focusing, organizing, clarifying',
    properties: ['Mental clarity', 'Focus', 'Organization', 'Learning'],
  },
  {
    id: 'yellow-jasper',
    name: 'Yellow Jasper',
    technicalName: 'Microcrystalline quartz',
    chakra: 'solar-plexus',
    element: 'earth',
    color: '#f4d03f',
    description: 'The stone of endurance and positivity',
    energy: 'Grounding, enduring, protective',
    properties: ['Endurance', 'Protection', 'Positivity', 'Travel safety'],
  },
  {
    id: 'peach-moonstone',
    name: 'Peach Moonstone',
    technicalName: 'Feldspar with orthoclase',
    chakra: 'sacral',
    element: 'water',
    color: '#ffdab9',
    description: 'The stone of new beginnings and emotional balance',
    energy: 'Nurturing, balancing, renewing',
    properties: ['New beginnings', 'Emotional balance', 'Self-love', 'Gentle change'],
  },
  {
    id: 'smoky-quartz',
    name: 'Smoky Quartz',
    technicalName: 'Silicon dioxide with natural irradiation',
    chakra: 'root',
    element: 'earth',
    color: '#5d4037',
    description: 'The stone of transmutation and grounding',
    energy: 'Transmuting, grounding, detoxifying',
    properties: ['Stress transmutation', 'Detoxification', 'Grounding', 'Letting go'],
  },
  {
    id: 'garnet',
    name: 'Garnet',
    technicalName: 'Silicate mineral group (X₃Y₂(SiO₄)₃)',
    chakra: 'root',
    element: 'fire',
    color: '#8b0000',
    description: 'The stone of passion, vitality, and grounded energy',
    energy: 'Energizing, passionate, stabilizing',
    properties: ['Vitality', 'Passion', 'Courage', 'Grounded energy', 'Creative manifestation'],
  },
]

// ============================================================================
// OIL DATABASE WITH ENHANCED SYNERGIES
// ============================================================================

export const OIL_DATABASE: OilProfile[] = [
  // --------------------------------------------------------------------------
  // LAVENDER (5 synergies: 3 original + 2 additional)
  // --------------------------------------------------------------------------
  {
    id: 'lavender',
    handle: 'lavender-essential-oil',
    commonName: 'Lavender',
    technicalName: 'Lavandula angustifolia',
    origin: 'Provence, France',
    extractionMethod: 'Steam distillation of flowering tops',
    baseProperties: ['Calming', 'Sleep support', 'Skin healing', 'Stress relief', 'Headache relief'],
    image: '/images/plants/lavender.jpg',
    imageAttribution: 'Lavandula angustifolia — Photo by avonensis via iNaturalist (CC-BY)',
    description: 'The queen of essential oils, our Bulgarian lavender is harvested at dawn when its calming compounds peak. Each breath carries the soul of endless purple fields dancing in mountain breeze.',
    aroma: 'Floral, herbaceous, fresh with woody undertones',
    strengths: ['Anxiety relief', 'Sleep improvement', 'Skin regeneration', 'Emotional balance'],
    recommendedCarrier: 'apricot-kernel',
    sizeInfo: {
      '30ml': { 
        crystals: 12, 
        description: 'Twelve Amethyst chips create a sleep sanctuary. The largest size for those seeking profound rest and daily anxiety management.' 
      },
      '20ml': { 
        crystals: 8, 
        description: 'Eight Rose Quartz chips for heart-centered calm throughout your day.' 
      },
      '15ml': { 
        crystals: 6, 
        description: 'Six Clear Quartz chips providing focused clarity in a travel-ready size.' 
      },
      '10ml': { 
        crystals: 4, 
        description: 'Four Amethyst chips for portable peace in your bag or on your desk.' 
      },
      '5ml': { 
        crystals: 2, 
        description: 'Two Rose Quartz chips—an introduction to the Lavender experience.' 
      },
    },
    crystalPairings: [
      {
        id: 'amethyst',
        name: 'Amethyst',
        technicalName: 'Silicon dioxide with iron impurities',
        chakra: 'crown',
        element: 'air',
        color: '#9966cc',
        description: 'The stone of spiritual wisdom and inner peace',
        energy: 'Calming, protective, clarifying',
        properties: ['Stress relief', 'Meditation aid', 'Sleep support', 'Intuition'],
        synergyTitle: 'The Sleep Sanctuary',
        synergyDescription: 'Lavender and Amethyst unite to create the ultimate sleep ritual. The crystal amplifies lavender\'s natural sedative properties, creating a cocoon of tranquility that signals the nervous system to release the day.',
        ritual: 'Apply to wrists and temples 30 minutes before bed. Place the bottle beside your pillow and inhale deeply as you release each worry into the amethyst\'s purple light.',
        benefits: ['Deep restful sleep', 'Anxiety relief', 'Mental clarity upon waking', 'Dream recall'],
        frequency: '432 Hz - The universal healing frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba\'s sebum-like composition allows the Amethyst-Lavender synergy to penetrate deeply, creating lasting calm that works with your skin\'s natural rhythms.',
            ritual: 'Apply to clean face and neck before bed. The jojoba carries lavender deep while Amethyst energy works from the surface.',
            benefits: ['Overnight skin nourishment', 'Extended aromatherapy release', 'Balanced oil production'],
          },
          'apricot-kernel': {
            description: 'Apricot kernel\'s heart-nurturing properties merge with Amethyst and Lavender to create profound emotional release and comfort.',
            ritual: 'Massage into chest and heart area before sleep. Feel the warmth of apricot kernel carrying healing to your emotional center.',
            benefits: ['Emotional healing', 'Heart-centered relaxation', 'Skin softening'],
          },
        },
      },
      {
        id: 'rose-quartz',
        name: 'Rose Quartz',
        technicalName: 'Silicon dioxide with titanium',
        chakra: 'heart',
        element: 'water',
        color: '#ffb6c1',
        description: 'The stone of unconditional love and compassion',
        energy: 'Nurturing, gentle, heart-opening',
        properties: ['Emotional healing', 'Self-love', 'Relationship harmony', 'Grief support'],
        synergyTitle: 'The Heart Healer',
        synergyDescription: 'Rose Quartz opens the heart chakra while lavender soothes emotional wounds. This pairing is like a gentle embrace for those processing grief, heartbreak, or simply needing self-compassion.',
        ritual: 'Apply to heart center and inhale deeply. Speak words of kindness to yourself as the rose quartz and lavender work together to mend emotional tears.',
        benefits: ['Emotional healing', 'Self-love cultivation', 'Grief support', 'Heart chakra balance'],
        frequency: '528 Hz - The love frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba enhances Rose Quartz\'s loving energy with its balancing properties, creating harmony between giving and receiving love.',
            ritual: 'Apply to heart and pulse points while setting intentions for self-love and compassion toward others.',
            benefits: ['Balanced emotional energy', 'Self-acceptance', 'Radiant skin'],
          },
          'apricot-kernel': {
            description: 'Apricot kernel and Rose Quartz form the ultimate heart-nurturing combination, deeply soothing emotional wounds with gentle care.',
            ritual: 'Create a heart-centering ritual: apply to chest, place hands over heart, breathe deeply for 3 minutes.',
            benefits: ['Deep emotional comfort', 'Heart chakra opening', 'Gentle skin nourishment'],
          },
        },
      },
      {
        id: 'clear-quartz',
        name: 'Clear Quartz',
        technicalName: 'Pure silicon dioxide',
        chakra: 'crown',
        element: 'air',
        color: '#e8e8e8',
        description: 'The master healer and energy amplifier',
        energy: 'Clarifying, amplifying, harmonizing',
        properties: ['Energy amplification', 'Mental clarity', 'Manifestation', 'Aura cleansing'],
        synergyTitle: 'The Clarity Amplifier',
        synergyDescription: 'Clear Quartz acts as an energetic magnifying glass for lavender\'s calming properties. This pairing is ideal for meditation, energy work, or anytime you need to cut through mental fog with crystalline precision.',
        ritual: 'Hold the bottle in your receiving hand during meditation. Apply to third eye before visualization practices. The quartz amplifies your intentions.',
        benefits: ['Mental clarity', 'Meditation depth', 'Energy amplification', 'Intuitive insight'],
        frequency: '768 Hz - The creation frequency',
      },
    ],
  },
  
  // --------------------------------------------------------------------------
  // BLUE MALLEY EUCALYPTUS
  // --------------------------------------------------------------------------
  {
    id: 'eucalyptus',
    handle: 'blue-mallee-eucalyptus',
    commonName: 'Blue Mallee Eucalyptus',
    technicalName: 'Eucalyptus polybractea',
    origin: 'New South Wales, Australia',
    extractionMethod: 'Steam distillation of leaves',
    baseProperties: ['Respiratory support', 'Mental clarity', 'Immune boosting', 'Muscle relief', 'Focus enhancement'],
    image: '/images/plants/eucalyptus.jpg',
    imageAttribution: 'Eucalyptus polybractea — Photo by andrew_allen via iNaturalist (CC-BY)',
    description: 'Wild-harvested from the ancient Blue Mallee forests of NSW, this eucalyptus carries the clarifying spirit of Australian bushland. Higher cineole content than standard eucalyptus.',
    aroma: 'Fresh, camphoraceous, slightly woody with mint undertones',
    strengths: ['Respiratory health', 'Mental focus', 'Physical vitality', 'Space clearing'],
    recommendedCarrier: 'fractionated-coconut',
    sizeInfo: {
      '30ml': { 
        crystals: 12, 
        description: 'Twelve Black Tourmaline chips for maximum energetic protection and grounding.' 
      },
      '20ml': { 
        crystals: 8, 
        description: 'Eight Citrine chips energizing your day with vitality and mental clarity.' 
      },
      '15ml': { 
        crystals: 6, 
        description: 'Six Tiger\'s Eye chips providing confidence and clear decision-making.' 
      },
      '10ml': { 
        crystals: 4, 
        description: 'Four Black Tourmaline chips for portable EMF protection and grounding.' 
      },
      '5ml': { 
        crystals: 2, 
        description: 'Two Citrine chips—an energizing introduction to Eucalyptus.' 
      },
    },
    crystalPairings: [
      {
        id: 'black-tourmaline',
        name: 'Black Tourmaline',
        technicalName: 'Complex boron silicate',
        chakra: 'root',
        element: 'earth',
        color: '#1a1a1a',
        description: 'The ultimate protection and grounding stone',
        energy: 'Protective, grounding, stabilizing',
        properties: ['EMF protection', 'Grounding', 'Anxiety relief', 'Boundary setting'],
        synergyTitle: 'The Grounding Shield',
        synergyDescription: 'Eucalyptus clears the air while Black Tourmaline grounds your energy field. This powerful pairing creates an energetic shield—perfect for empaths, healers, or anyone navigating demanding environments.',
        ritual: 'Apply to wrists before entering crowded spaces. Inhale deeply while visualizing a protective sphere of black light surrounding your entire being.',
        benefits: ['EMF protection', 'Energetic grounding', 'Space clearing', 'Boundary reinforcement'],
        frequency: '396 Hz - The liberation frequency',
      },
      {
        id: 'citrine',
        name: 'Citrine',
        technicalName: 'Silicon dioxide with iron',
        chakra: 'solar-plexus',
        element: 'fire',
        color: '#f4d03f',
        description: 'The stone of abundance and personal power',
        energy: 'Uplifting, energizing, manifesting',
        properties: ['Abundance', 'Confidence', 'Creativity', 'Mental focus'],
        synergyTitle: 'The Vitality Spark',
        synergyDescription: 'Citrine and Eucalyptus ignite the solar plexus with fresh, invigorating energy. This pairing banishes fatigue and mental fog, replacing them with sunshine-like clarity and motivation.',
        ritual: 'Apply to solar plexus (above navel) and temples each morning. Inhale while setting intentions for an energized, productive day.',
        benefits: ['Energy boost', 'Mental focus', 'Mood elevation', 'Confidence building'],
        frequency: '528 Hz - The transformation frequency',
      },
      {
        id: 'tigers-eye',
        name: "Tiger's Eye",
        technicalName: 'Crocidolite replaced by quartz',
        chakra: 'solar-plexus',
        element: 'earth',
        color: '#b8860b',
        description: 'The stone of courage and clear perception',
        energy: 'Grounding, protective, empowering',
        properties: ['Confidence', 'Mental clarity', 'Protection', 'Decision making'],
        synergyTitle: 'The Clarity Guardian',
        synergyDescription: "Tiger's Eye brings grounded confidence to Eucalyptus' mental clarity. Together they create sharp, focused perception rooted in steady self-assurance—ideal for important decisions.",
        ritual: 'Apply to pulse points before challenging conversations or decisions. Hold the bottle while asking for clear sight and courageous action.',
        benefits: ['Decision clarity', 'Grounded confidence', 'Mental sharpness', 'Courage'],
        frequency: '417 Hz - The facilitating frequency',
      },
    ],
  },
  
  // --------------------------------------------------------------------------
  // TEA TREE
  // --------------------------------------------------------------------------
  {
    id: 'tea-tree',
    handle: 'tea-tree-oil',
    commonName: 'Tea Tree',
    technicalName: 'Melaleuca alternifolia',
    origin: 'Byron Bay Hinterland, Australia',
    extractionMethod: 'Steam distillation of leaves and twigs',
    baseProperties: ['Antimicrobial', 'Skin healing', 'Immune support', 'Cleansing', 'Refreshing'],
    image: '/images/plants/tea-tree.jpg',
    imageAttribution: 'Melaleuca alternifolia — Photo by bruce_c via iNaturalist (CC-BY)',
    description: 'Harvested from organic groves in the pristine Byron hinterland, our Tea Tree carries the purifying essence of Australian wilderness. Renowned for its powerful antimicrobial properties.',
    aroma: 'Fresh, medicinal, camphoraceous with earthy undertones',
    strengths: ['Skin clarity', 'Immune defense', 'Environmental cleansing', 'Purification'],
    recommendedCarrier: 'jojoba',
    sizeInfo: {
      '30ml': { 
        crystals: 12, 
        description: 'Twelve Clear Quartz chips amplifying Tea Tree\'s purifying power to maximum effect.' 
      },
      '20ml': { 
        crystals: 8, 
        description: 'Eight Carnelian chips energizing cleansing rituals with vitality.' 
      },
      '15ml': { 
        crystals: 6, 
        description: 'Six Black Tourmaline chips providing protective cleansing energy.' 
      },
      '10ml': { 
        crystals: 4, 
        description: 'Four Clear Quartz chips for focused purification on the go.' 
      },
      '5ml': { 
        crystals: 2, 
        description: 'Two Carnelian chips—an energizing introduction to Tea Tree.' 
      },
    },
    crystalPairings: [
      {
        id: 'clear-quartz',
        name: 'Clear Quartz',
        technicalName: 'Pure silicon dioxide',
        chakra: 'crown',
        element: 'air',
        color: '#e8e8e8',
        description: 'The master healer and energy amplifier',
        energy: 'Clarifying, amplifying, harmonizing',
        properties: ['Energy amplification', 'Mental clarity', 'Manifestation', 'Aura cleansing'],
        synergyTitle: 'The Purification Amplifier',
        synergyDescription: 'Clear Quartz amplifies Tea Tree\'s natural cleansing properties to create a powerful purification tool. This pairing clears stagnant energy from spaces, auras, and objects with crystalline precision.',
        ritual: 'Add drops to cleaning water, or apply to hands and clap three times to clear room energy. Use for ritual cleansing of spaces and crystals.',
        benefits: ['Energy purification', 'Aura cleansing', 'Space clearing', 'Amplified intentions'],
        frequency: '768 Hz - The creation frequency',
      },
      {
        id: 'carnelian',
        name: 'Carnelian',
        technicalName: 'Chalcedony with iron oxide',
        chakra: 'sacral',
        element: 'fire',
        color: '#e85d04',
        description: 'The stone of vitality and creative passion',
        energy: 'Energizing, motivating, passionate',
        properties: ['Creativity', 'Courage', 'Motivation', 'Vitality'],
        synergyTitle: 'The Vital Purge',
        synergyDescription: 'Carnelian\'s fiery vitality combines with Tea Tree\'s cleansing action to create an energizing purge of negativity. This pairing revitalizes the spirit while clearing what no longer serves.',
        ritual: 'Apply to lower abdomen and wrists. Move your body—stretch, dance, shake—to release stagnant energy while the carnelian and tea tree work synergistically.',
        benefits: ['Energetic release', 'Physical vitality', 'Creative flow', 'Confidence boost'],
        frequency: '396 Hz - The liberation frequency',
      },
      {
        id: 'black-tourmaline',
        name: 'Black Tourmaline',
        technicalName: 'Complex boron silicate',
        chakra: 'root',
        element: 'earth',
        color: '#1a1a1a',
        description: 'The ultimate protection and grounding stone',
        energy: 'Protective, grounding, stabilizing',
        properties: ['EMF protection', 'Grounding', 'Anxiety relief', 'Boundary setting'],
        synergyTitle: 'The Protective Cleanser',
        synergyDescription: 'Black Tourmaline\'s protective shield meets Tea Tree\'s cleansing action to create an impenetrable energetic barrier. This pairing is ideal for those who work in toxic environments.',
        ritual: 'Apply to soles of feet and back of neck before entering challenging environments. Visualize a cleansing shield surrounding your entire body.',
        benefits: ['Energetic protection', 'Environmental shielding', 'Aura cleansing', 'Grounding'],
        frequency: '396 Hz - The liberation frequency',
      },
    ],
  },
  
  // --------------------------------------------------------------------------
  // CLOVE BUD
  // --------------------------------------------------------------------------
  {
    id: 'clove-bud',
    handle: 'clove-bud-oil',
    commonName: 'Clove Bud',
    technicalName: 'Syzygium aromaticum',
    origin: 'Madagascar',
    extractionMethod: 'Steam distillation of flower buds',
    baseProperties: ['Warming', 'Analgesic', 'Antimicrobial', 'Antioxidant', 'Comforting'],
    image: '/images/plants/clove-bud.jpg',
    imageAttribution: 'Syzygium aromaticum — Photo by knightericm via iNaturalist (CC-BY)',
    description: 'Hand-harvested flower buds from Madagascar\'s sun-drenched clove groves. One of nature\'s most potent antioxidants, wrapped in the nostalgic warmth of holiday kitchens.',
    aroma: 'Warm, spicy, sweet, woody with fruity undertones',
    strengths: ['Physical comfort', 'Oral health', 'Immune support', 'Emotional warmth', 'Antioxidant protection'],
    recommendedCarrier: 'sweet-almond',
    sizeInfo: {
      '30ml': { 
        crystals: 12, 
        description: 'Twelve Carnelian chips radiating warmth and creative fire.' 
      },
      '20ml': { 
        crystals: 8, 
        description: 'Eight Red Jasper chips grounding warmth into physical strength.' 
      },
      '15ml': { 
        crystals: 6, 
        description: 'Six Citrine chips warming the solar plexus with golden light.' 
      },
      '10ml': { 
        crystals: 4, 
        description: 'Four Carnelian chips for portable comfort and courage.' 
      },
      '5ml': { 
        crystals: 2, 
        description: 'Two Red Jasper chips—grounding warmth in a small package.' 
      },
    },
    crystalPairings: [
      {
        id: 'carnelian',
        name: 'Carnelian',
        technicalName: 'Chalcedony with iron oxide',
        chakra: 'sacral',
        element: 'fire',
        color: '#e85d04',
        description: 'The stone of vitality and creative passion',
        energy: 'Energizing, motivating, passionate',
        properties: ['Creativity', 'Courage', 'Motivation', 'Vitality'],
        synergyTitle: 'The Fire Starter',
        synergyDescription: 'Carnelian and Clove Bud ignite the sacral chakra with creative fire and physical warmth. This pairing awakens passion, creativity, and the courage to pursue your desires.',
        ritual: 'Apply to sacral chakra (lower abdomen) and wrists before creative work or intimate moments. Feel the warming energy spread through your entire being.',
        benefits: ['Creative inspiration', 'Passion awakening', 'Courage building', 'Physical warmth'],
        frequency: '417 Hz - The facilitating frequency',
      },
      {
        id: 'red-jasper',
        name: 'Red Jasper',
        technicalName: 'Microcrystalline quartz with iron',
        chakra: 'root',
        element: 'earth',
        color: '#8b0000',
        description: 'The stone of endurance and stability',
        energy: 'Stabilizing, nurturing, strengthening',
        properties: ['Endurance', 'Grounding', 'Nurturing', 'Courage'],
        synergyTitle: 'The Grounding Warmth',
        synergyDescription: 'Red Jasper\'s steady strength combines with Clove\'s comforting warmth to create a sense of being deeply rooted and nurtured. This pairing provides endurance during challenging times.',
        ritual: 'Apply to root chakra (base of spine) and soles of feet when feeling ungrounded or exhausted. Breathe in the warming, strengthening energy.',
        benefits: ['Physical endurance', 'Emotional stability', 'Root chakra grounding', 'Nurturing comfort'],
        frequency: '396 Hz - The liberation frequency',
      },
      {
        id: 'citrine',
        name: 'Citrine',
        technicalName: 'Silicon dioxide with iron',
        chakra: 'solar-plexus',
        element: 'fire',
        color: '#f4d03f',
        description: 'The stone of abundance and personal power',
        energy: 'Uplifting, energizing, manifesting',
        properties: ['Abundance', 'Confidence', 'Creativity', 'Mental focus'],
        synergyTitle: 'The Golden Comfort',
        synergyDescription: 'Citrine\'s sunny abundance meets Clove\'s warm embrace to create a sense of prosperous comfort. This pairing attracts abundance while keeping you grounded in gratitude.',
        ritual: 'Apply to solar plexus and heart center while visualizing golden light filling your life with warmth and abundance. Perfect for abundance rituals.',
        benefits: ['Abundance attraction', 'Confidence', 'Warm optimism', 'Gratitude cultivation'],
        frequency: '528 Hz - The transformation frequency',
      },
    ],
  },
  
  // --------------------------------------------------------------------------
  // LEMONGRASS
  // --------------------------------------------------------------------------
  {
    id: 'lemongrass',
    handle: 'lemongrass-oil',
    commonName: 'Lemongrass',
    technicalName: 'Cymbopogon flexuosus',
    origin: 'India (Certified Organic)',
    extractionMethod: 'Steam distillation of fresh grass',
    baseProperties: ['Uplifting', 'Cleansing', 'Digestive support', 'Insect repellent', 'Refreshing'],
    image: '/images/plants/lemongrass.jpg',
    imageAttribution: 'Cymbopogon flexuosus — Photo by patricia_rose via iNaturalist (CC-BY)',
    description: 'Organic lemongrass from India\'s lush highlands, distilled within hours of harvest to capture its vibrant, cleansing essence. Bright citrus-grass notes that instantly elevate any space.',
    aroma: 'Fresh, citrusy, grassy with earthy undertones',
    strengths: ['Mood elevation', 'Environmental cleansing', 'Mental freshness', 'Natural cleansing'],
    recommendedCarrier: 'grapeseed',
    sizeInfo: {
      '30ml': { 
        crystals: 12, 
        description: 'Twelve Citrine chips radiating joyful abundance and clarity.' 
      },
      '20ml': { 
        crystals: 8, 
        description: 'Eight Aventurine chips attracting luck and opportunity.' 
      },
      '15ml': { 
        crystals: 6, 
        description: 'Six Sodalite chips enhancing clear communication and logic.' 
      },
      '10ml': { 
        crystals: 4, 
        description: 'Four Citrine chips for portable joy and mental clarity.' 
      },
      '5ml': { 
        crystals: 2, 
        description: 'Two Aventurine chips—an introduction to Lemongrass optimism.' 
      },
    },
    crystalPairings: [
      {
        id: 'citrine',
        name: 'Citrine',
        technicalName: 'Silicon dioxide with iron',
        chakra: 'solar-plexus',
        element: 'fire',
        color: '#f4d03f',
        description: 'The stone of abundance and personal power',
        energy: 'Uplifting, energizing, manifesting',
        properties: ['Abundance', 'Confidence', 'Creativity', 'Mental focus'],
        synergyTitle: 'The Sunshine Blend',
        synergyDescription: 'Citrine and Lemongrass are pure liquid sunshine. This pairing banishes gloom and mental fog, replacing them with bright optimism, clear thinking, and the confidence to seize opportunities.',
        ritual: 'Apply to wrists and inhale deeply each morning. Set daily intentions while visualizing golden light radiating from your solar plexus.',
        benefits: ['Mood elevation', 'Mental clarity', 'Confidence boost', 'Abundance mindset'],
        frequency: '528 Hz - The transformation frequency',
      },
      {
        id: 'aventurine',
        name: 'Aventurine',
        technicalName: 'Quartz with fuchsite inclusions',
        chakra: 'heart',
        element: 'earth',
        color: '#2ecc71',
        description: 'The stone of opportunity and growth',
        energy: 'Lucky, growth-oriented, comforting',
        properties: ['Good luck', 'Heart healing', 'Prosperity', 'Emotional calm'],
        synergyTitle: 'The Opportunity Opener',
        synergyDescription: 'Aventurine\'s lucky energy combines with Lemongrass\'s freshness to open doors and clear the path to new possibilities. This pairing attracts opportunities while keeping the heart light and optimistic.',
        ritual: 'Apply to heart center before important meetings or new beginnings. Carry with you as a lucky charm throughout your day.',
        benefits: ['Opportunity attraction', 'Heart-centered optimism', 'Good luck', 'Emotional balance'],
        frequency: '639 Hz - The connecting frequency',
      },
      {
        id: 'sodalite',
        name: 'Sodalite',
        technicalName: 'Sodium aluminum silicate chloride',
        chakra: 'throat',
        element: 'water',
        color: '#1e40af',
        description: 'The stone of logic and communication',
        energy: 'Calming, rational, expressive',
        properties: ['Communication', 'Logic', 'Emotional balance', 'Self-expression'],
        synergyTitle: 'The Clear Communicator',
        synergyDescription: 'Sodalite\'s logical clarity meets Lemongrass\'s mental freshness to create crystal-clear communication. This pairing helps you express your truth with confidence and rational precision.',
        ritual: 'Apply to throat center before important conversations, presentations, or writing sessions. Speak your truth with clarity and confidence.',
        benefits: ['Clear communication', 'Logical thinking', 'Confidence in expression', 'Throat chakra balance'],
        frequency: '741 Hz - The awakening frequency',
      },
    ],
  },
  
  // ============================================================================
  // CLARY SAGE
  // ============================================================================
  {
    id: 'clary-sage',
    handle: 'clary-sage-oil',
    commonName: 'Clary Sage',
    technicalName: 'Salvia sclarea',
    origin: 'Bulgaria',
    extractionMethod: 'Steam distillation of flowering tops and leaves',
    baseProperties: ['Hormone balancing', 'Stress relief', 'Euphoric', 'Skin regeneration', 'PMS support'],
    image: '/images/plants/clary-sage.jpg',
    imageAttribution: 'Salvia sclarea — Photo by bernhard_hiller via iNaturalist (CC-BY)',
    description: 'A sacred oil revered since ancient times, our Bulgarian Clary Sage carries the wisdom of the moon. Known for its euphoric, hormone-balancing properties, it guides the spirit through transitions with grace and clarity.',
    aroma: 'Earthy, herbaceous, slightly sweet with floral undertones',
    strengths: ['Hormone balance', 'Emotional euphoria', 'Deep relaxation', 'PMS relief', 'Creative inspiration'],
    recommendedCarrier: 'apricot-kernel',
    sizeInfo: {
      '30ml': { 
        crystals: 12, 
        description: 'Twelve Moonstone chips for deep hormonal harmony and inner wisdom.' 
      },
      '20ml': { 
        crystals: 8, 
        description: 'Eight Amethyst chips for spiritual clarity and relaxation.' 
      },
      '15ml': { 
        crystals: 6, 
        description: 'Six Rose Quartz chips for heart-centered emotional balance.' 
      },
      '10ml': { 
        crystals: 4, 
        description: 'Four Moonstone chips for gentle transitions.' 
      },
      '5ml': { 
        crystals: 2, 
        description: 'Two Amethyst chips—an introduction to Clary Sage wisdom.' 
      },
    },
    crystalPairings: [
      {
        id: 'moonstone',
        name: 'Moonstone',
        technicalName: 'Feldspar with adularescence',
        chakra: 'sacral',
        element: 'water',
        color: '#e0e0e0',
        description: 'The stone of new beginnings and feminine energy',
        energy: 'Feminine, cyclical, intuitive',
        properties: ['Hormone balance', 'Fertility', 'New beginnings', 'Emotional healing'],
        synergyTitle: 'The Moon Goddess',
        synergyDescription: 'Clary Sage and Moonstone form a sacred union for feminine wellness. This pairing supports hormonal balance, menstrual harmony, and the cyclical nature of womanhood. Together they create a gentle, nurturing energy that honors the body\'s natural rhythms.',
        ritual: 'Apply to lower abdomen during menstruation or moon rituals. Inhale deeply while setting intentions for hormonal harmony and emotional balance.',
        benefits: ['Hormone balance', 'PMS relief', 'Emotional stability', 'Fertility support'],
        frequency: '528 Hz - The love frequency',
      },
      {
        id: 'amethyst',
        name: 'Amethyst',
        technicalName: 'Silicon dioxide with iron impurities',
        chakra: 'crown',
        element: 'air',
        color: '#9966cc',
        description: 'The stone of spiritual wisdom and inner peace',
        energy: 'Calming, protective, clarifying',
        properties: ['Stress relief', 'Meditation aid', 'Sleep support', 'Intuition'],
        synergyTitle: 'The Visionary',
        synergyDescription: 'Amethyst enhances Clary Sage\'s visionary and euphoric qualities. This pairing opens the third eye while grounding the spirit, perfect for meditation, creative visualization, and accessing higher states of consciousness.',
        ritual: 'Apply to third eye and temples before meditation or creative work. Allow the synergy to expand your inner vision and spiritual awareness.',
        benefits: ['Enhanced intuition', 'Spiritual clarity', 'Creative inspiration', 'Deep meditation'],
        frequency: '852 Hz - The intuition frequency',
      },
      {
        id: 'rose-quartz',
        name: 'Rose Quartz',
        technicalName: 'Silicon dioxide with titanium',
        chakra: 'heart',
        element: 'water',
        color: '#ffb6c1',
        description: 'The stone of unconditional love and compassion',
        energy: 'Nurturing, gentle, heart-opening',
        properties: ['Emotional healing', 'Self-love', 'Relationship harmony', 'Grief support'],
        synergyTitle: 'The Heart\'s Embrace',
        synergyDescription: 'Rose Quartz softens Clary Sage\'s euphoric energy into gentle heart healing. This pairing soothes emotional wounds, nurtures self-acceptance, and creates a safe space for vulnerability and love.',
        ritual: 'Apply to heart center during times of emotional transition. Breathe in self-love and release old emotional patterns.',
        benefits: ['Emotional healing', 'Self-acceptance', 'Heart chakra balance', 'Compassion'],
        frequency: '639 Hz - The heart frequency',
      },
    ],
  },
  
  // ============================================================================
  // GINGER
  // ============================================================================
  {
    id: 'ginger',
    handle: 'ginger-oil',
    commonName: 'Ginger',
    technicalName: 'Zingiber officinale',
    origin: 'Indonesia',
    extractionMethod: 'Steam distillation of root',
    baseProperties: ['Digestive support', 'Warming', 'Energizing', 'Anti-nausea', 'Circulation boosting'],
    image: '/images/plants/ginger.jpg',
    imageAttribution: 'Zingiber officinale — Photo by greg3ph via iNaturalist (CC-BY)',
    description: 'Warm, spicy, and deeply grounding, our Indonesian Ginger oil ignites the inner fire. A trusted ally for digestion, circulation, and vitality, it awakens the senses and fuels determination.',
    aroma: 'Warm, spicy, earthy with citrus undertones',
    strengths: ['Digestive comfort', 'Energy boost', 'Nausea relief', 'Warming', 'Motivation'],
    recommendedCarrier: 'sweet-almond',
    sizeInfo: {
      '30ml': { 
        crystals: 12, 
        description: 'Twelve Carnelian chips radiating vitality and creative fire.' 
      },
      '20ml': { 
        crystals: 8, 
        description: 'Eight Red Jasper chips grounding warmth into physical strength.' 
      },
      '15ml': { 
        crystals: 6, 
        description: 'Six Tiger\'s Eye chips for confident, grounded energy.' 
      },
      '10ml': { 
        crystals: 4, 
        description: 'Four Carnelian chips for portable warming energy.' 
      },
      '5ml': { 
        crystals: 2, 
        description: 'Two Red Jasper chips—grounding warmth in a small package.' 
      },
    },
    crystalPairings: [
      {
        id: 'carnelian',
        name: 'Carnelian',
        technicalName: 'Chalcedony with iron oxide',
        chakra: 'sacral',
        element: 'fire',
        color: '#e85d04',
        description: 'The stone of vitality and creative passion',
        energy: 'Energizing, motivating, passionate',
        properties: ['Creativity', 'Courage', 'Motivation', 'Vitality'],
        synergyTitle: 'The Fire Starter',
        synergyDescription: 'Carnelian and Ginger ignite the sacral chakra with creative fire and physical warmth. This dynamic pairing boosts motivation, ignites passion, and fuels the inner drive to pursue goals with determination.',
        ritual: 'Apply to sacral chakra (lower abdomen) and solar plexus. Use before workouts, creative projects, or anytime you need an energy boost.',
        benefits: ['Energy boost', 'Creative drive', 'Physical vitality', 'Motivation'],
        frequency: '396 Hz - The liberation frequency',
      },
      {
        id: 'red-jasper',
        name: 'Red Jasper',
        technicalName: 'Microcrystalline quartz with iron',
        chakra: 'root',
        element: 'earth',
        color: '#8b0000',
        description: 'The stone of endurance and stability',
        energy: 'Stabilizing, nurturing, strengthening',
        properties: ['Endurance', 'Grounding', 'Nurturing', 'Courage'],
        synergyTitle: 'The Grounding Fire',
        synergyDescription: 'Red Jasper grounds Ginger\'s warming energy deep into the root chakra. This pairing provides sustained physical stamina, courage, and the strength to endure challenges while staying centered.',
        ritual: 'Apply to root chakra (base of spine) and soles of feet before physical activity. Feel the grounding warmth spread through your entire being.',
        benefits: ['Physical endurance', 'Grounding', 'Courage', 'Root chakra balance'],
        frequency: '396 Hz - The liberation frequency',
      },
      {
        id: 'tigers-eye',
        name: "Tiger's Eye",
        technicalName: 'Crocidolite replaced by quartz',
        chakra: 'solar-plexus',
        element: 'earth',
        color: '#b8860b',
        description: 'The stone of courage and clear perception',
        energy: 'Grounding, protective, empowering',
        properties: ['Confidence', 'Mental clarity', 'Protection', 'Decision making'],
        synergyTitle: 'The Courageous Will',
        synergyDescription: "Tiger's Eye combines with Ginger\'s warming energy to create unshakable confidence and willpower. This pairing emboldens you to take decisive action while maintaining grounded clarity.",
        ritual: 'Apply to solar plexus before challenging situations. Stand tall and feel your personal power amplified by this courageous synergy.',
        benefits: ['Confidence boost', 'Mental clarity', 'Personal power', 'Grounded action'],
        frequency: '417 Hz - The facilitating frequency',
      },
    ],
  },
  
  // ============================================================================
  // CINNAMON BARK
  // ============================================================================
  {
    id: 'cinnamon-bark',
    handle: 'cinnamon-bark-oil',
    commonName: 'Cinnamon Bark',
    technicalName: 'Cinnamomum zeylancium',
    origin: 'Sri Lanka',
    extractionMethod: 'Steam distillation of bark',
    baseProperties: ['Warming', 'Antimicrobial', 'Stimulating', 'Aphrodisiac', 'Immune support'],
    image: '/images/plants/cinnamon-bark.jpg',
    imageAttribution: 'Cinnamomum verum — Photo by sayeegirdhari via iNaturalist (CC-BY)',
    description: 'Ancient, sacred, and powerfully warming, our Cinnamon Bark oil kindles the inner fire. Revered for millennia for its protective and stimulating properties, it awakens passion, vitality, and abundance.',
    aroma: 'Warm, sweet, spicy, deeply rich and exotic',
    strengths: ['Deep warming', 'Immune defense', 'Passion ignition', 'Prosperity', 'Protection'],
    recommendedCarrier: 'sweet-almond',
    sizeInfo: {
      '30ml': { 
        crystals: 12, 
        description: 'Twelve Citrine chips radiating abundance and golden warmth.' 
      },
      '20ml': { 
        crystals: 8, 
        description: 'Eight Carnelian chips for passionate creative fire.' 
      },
      '15ml': { 
        crystals: 6, 
        description: 'Six Tiger\'s Eye chips for confident, prosperous energy.' 
      },
      '10ml': { 
        crystals: 4, 
        description: 'Four Citrine chips for portable abundance.' 
      },
      '5ml': { 
        crystals: 2, 
        description: 'Two Carnelian chips—passionate warmth in a small package.' 
      },
    },
    crystalPairings: [
      {
        id: 'citrine',
        name: 'Citrine',
        technicalName: 'Silicon dioxide with iron',
        chakra: 'solar-plexus',
        element: 'fire',
        color: '#f4d03f',
        description: 'The stone of abundance and personal power',
        energy: 'Uplifting, energizing, manifesting',
        properties: ['Abundance', 'Confidence', 'Creativity', 'Mental focus'],
        synergyTitle: 'The Abundance Flame',
        synergyDescription: 'Citrine and Cinnamon Bark unite to create a powerful manifestation tool. This pairing ignites the solar plexus with golden abundance energy, attracting prosperity, success, and joyful vitality.',
        ritual: 'Apply to solar plexus and wrists during abundance rituals. Visualize golden light flowing into your life as you set intentions for prosperity.',
        benefits: ['Abundance attraction', 'Prosperity', 'Confidence', 'Solar plexus activation'],
        frequency: '528 Hz - The transformation frequency',
      },
      {
        id: 'carnelian',
        name: 'Carnelian',
        technicalName: 'Chalcedony with iron oxide',
        chakra: 'sacral',
        element: 'fire',
        color: '#e85d04',
        description: 'The stone of vitality and creative passion',
        energy: 'Energizing, motivating, passionate',
        properties: ['Creativity', 'Courage', 'Motivation', 'Vitality'],
        synergyTitle: 'The Passion Fire',
        synergyDescription: 'Carnelian amplifies Cinnamon Bark\'s warming, stimulating properties into pure creative passion. This pairing fuels desire, motivation, and the courage to pursue what sets your soul on fire.',
        ritual: 'Apply to sacral chakra before creative work or intimate moments. Feel the warming energy ignite your inner passion and drive.',
        benefits: ['Passion awakening', 'Creative fire', 'Desire', 'Motivation'],
        frequency: '417 Hz - The facilitating frequency',
      },
      {
        id: 'tigers-eye',
        name: "Tiger's Eye",
        technicalName: 'Crocidolite replaced by quartz',
        chakra: 'solar-plexus',
        element: 'earth',
        color: '#b8860b',
        description: 'The stone of courage and clear perception',
        energy: 'Grounding, protective, empowering',
        properties: ['Confidence', 'Mental clarity', 'Protection', 'Decision making'],
        synergyTitle: 'The Protective Warrior',
        synergyDescription: "Tiger's Eye adds grounded protection to Cinnamon Bark's warming strength. This pairing creates an energetic shield of confidence and courage, perfect for facing challenges with clarity and determination.",
        ritual: 'Apply to solar plexus and visualize a golden shield of protection surrounding you. Stand in your power with confidence.',
        benefits: ['Protection', 'Confidence', 'Courage', 'Grounded strength'],
        frequency: '396 Hz - The liberation frequency',
      },
    ],
  },
  
  // ============================================================================
  // MAY CHANG
  // ============================================================================
  {
    id: 'may-chang',
    handle: 'may-chang-oil',
    commonName: 'May Chang',
    technicalName: 'Litsea cubeba',
    origin: 'Malaysia',
    extractionMethod: 'Steam distillation of fruit',
    baseProperties: ['Uplifting', 'Digestive support', 'Skin balancing', 'Calming', 'Air purifying'],
    image: '/images/plants/may-chang.jpg',
    imageAttribution: 'Litsea cubeba — Photo by leaf0605 via iNaturalist (CC0)',
    description: 'Bright, lemony, and refreshingly uplifting, our Malaysian May Chang oil brings sunshine to the spirit. Known as "mountain pepper," it cleanses the air, lifts the mood, and brings clarity to the mind.',
    aroma: 'Fresh, lemony, sweet, fruity with subtle spicy notes',
    strengths: ['Mood elevation', 'Mental clarity', 'Digestive comfort', 'Skin balance', 'Air cleansing'],
    recommendedCarrier: 'grapeseed',
    sizeInfo: {
      '30ml': { 
        crystals: 12, 
        description: 'Twelve Citrine chips radiating joyful abundance and clarity.' 
      },
      '20ml': { 
        crystals: 8, 
        description: 'Eight Sodalite chips enhancing clear communication.' 
      },
      '15ml': { 
        crystals: 6, 
        description: 'Six Aventurine chips attracting luck and fresh opportunities.' 
      },
      '10ml': { 
        crystals: 4, 
        description: 'Four Citrine chips for portable joy and mental clarity.' 
      },
      '5ml': { 
        crystals: 2, 
        description: 'Two Sodalite chips—clear expression in a small package.' 
      },
    },
    crystalPairings: [
      {
        id: 'citrine',
        name: 'Citrine',
        technicalName: 'Silicon dioxide with iron',
        chakra: 'solar-plexus',
        element: 'fire',
        color: '#f4d03f',
        description: 'The stone of abundance and personal power',
        energy: 'Uplifting, energizing, manifesting',
        properties: ['Abundance', 'Confidence', 'Creativity', 'Mental focus'],
        synergyTitle: 'The Sunshine Burst',
        synergyDescription: 'Citrine and May Chang are pure liquid sunshine. This pairing instantly lifts the mood, clears mental fog, and infuses the spirit with optimism, joy, and the confidence to embrace new opportunities.',
        ritual: 'Apply to wrists and inhale deeply each morning. Set daily intentions while visualizing golden light filling your solar plexus with positivity.',
        benefits: ['Mood elevation', 'Mental clarity', 'Optimism', 'Confidence boost'],
        frequency: '528 Hz - The transformation frequency',
      },
      {
        id: 'sodalite',
        name: 'Sodalite',
        technicalName: 'Sodium aluminum silicate chloride',
        chakra: 'throat',
        element: 'water',
        color: '#1e40af',
        description: 'The stone of logic and communication',
        energy: 'Calming, rational, expressive',
        properties: ['Communication', 'Logic', 'Emotional balance', 'Self-expression'],
        synergyTitle: 'The Clear Communicator',
        synergyDescription: 'Sodalite\'s throat chakra activation meets May Chang\'s clarifying freshness to create powerful communication synergy. This pairing helps you express your truth with confidence, logic, and emotional intelligence—perfect for important conversations.',
        ritual: 'Apply to throat center before important conversations or presentations. Speak your truth with clarity and calm confidence.',
        benefits: ['Clear communication', 'Confident expression', 'Logical thinking', 'Throat chakra balance'],
        frequency: '741 Hz - The awakening frequency',
      },
      {
        id: 'aventurine',
        name: 'Aventurine',
        technicalName: 'Quartz with fuchsite inclusions',
        chakra: 'heart',
        element: 'earth',
        color: '#2ecc71',
        description: 'The stone of opportunity and growth',
        energy: 'Lucky, growth-oriented, comforting',
        properties: ['Good luck', 'Heart healing', 'Prosperity', 'Emotional calm'],
        synergyTitle: 'The Opportunity Opener',
        synergyDescription: 'Aventurine\'s lucky energy combines with May Chang\'s freshness to open doors and clear the path to new possibilities. This pairing attracts opportunities while keeping the heart light and optimistic.',
        ritual: 'Apply to heart center before new ventures or important meetings. Carry with you as a lucky charm throughout your day.',
        benefits: ['Opportunity attraction', 'Good luck', 'Heart-centered optimism', 'Emotional balance'],
        frequency: '639 Hz - The connecting frequency',
      },
    ],
  },
  
  // ============================================================================
  // PATCHOULI DARK
  // ============================================================================
  {
    id: 'patchouli-dark',
    handle: 'patchouli-dark-oil',
    commonName: 'Patchouli Dark',
    technicalName: 'Pogostemon cablin',
    origin: 'Indonesia',
    extractionMethod: 'Steam distillation of dried, aged leaves',
    baseProperties: ['Grounding', 'Meditation aid', 'Skin regeneration', 'Aphrodisiac', 'Emotional balance'],
    image: '/images/plants/patchouli-dark.jpg',
    imageAttribution: 'Pogostemon auricularius (related species) — Photo via iNaturalist (CC-BY)',
    description: 'Deep, earthy, and profoundly grounding, our Indonesian Patchouli Dark carries the wisdom of aged leaves. Sacred in spiritual traditions, it anchors the spirit, enhances meditation, and connects us to earth\'s ancient wisdom.',
    aroma: 'Rich, earthy, woody, sweet-balsamic with musky undertones',
    strengths: ['Deep grounding', 'Meditation depth', 'Skin healing', 'Emotional centering', 'Sensuality'],
    recommendedCarrier: 'jojoba',
    sizeInfo: {
      '30ml': { 
        crystals: 12, 
        description: 'Twelve Black Tourmaline chips for maximum grounding and protection.' 
      },
      '20ml': { 
        crystals: 8, 
        description: 'Eight Hematite chips for deep earth connection.' 
      },
      '15ml': { 
        crystals: 6, 
        description: 'Six Red Jasper chips providing stability and endurance.' 
      },
      '10ml': { 
        crystals: 4, 
        description: 'Four Black Tourmaline chips for portable grounding.' 
      },
      '5ml': { 
        crystals: 2, 
        description: 'Two Hematite chips—deep grounding in a small package.' 
      },
    },
    crystalPairings: [
      {
        id: 'black-tourmaline',
        name: 'Black Tourmaline',
        technicalName: 'Complex boron silicate',
        chakra: 'root',
        element: 'earth',
        color: '#1a1a1a',
        description: 'The ultimate protection and grounding stone',
        energy: 'Protective, grounding, stabilizing',
        properties: ['EMF protection', 'Grounding', 'Anxiety relief', 'Boundary setting'],
        synergyTitle: 'The Earth Anchor',
        synergyDescription: 'Black Tourmaline and Patchouli Dark create the ultimate grounding combination. This pairing anchors you deeply into earth\'s energy, providing protection, stability, and a profound sense of being centered and secure.',
        ritual: 'Apply to soles of feet and root chakra before meditation or grounding practices. Visualize roots extending deep into the earth.',
        benefits: ['Deep grounding', 'EMF protection', 'Anxiety relief', 'Root chakra balance'],
        frequency: '396 Hz - The liberation frequency',
      },
      {
        id: 'hematite',
        name: 'Hematite',
        technicalName: 'Iron oxide (Fe₂O₃)',
        chakra: 'root',
        element: 'earth',
        color: '#4a4a4a',
        description: 'The stone of grounding and mental organization',
        energy: 'Grounding, focusing, strengthening',
        properties: ['Focus', 'Grounding', 'Confidence', 'Memory'],
        synergyTitle: 'The Grounding Focus',
        synergyDescription: 'Hematite adds mental clarity to Patchouli Dark\'s deep grounding. This pairing helps organize scattered thoughts while maintaining a strong connection to earth, perfect for focused work and decision-making.',
        ritual: 'Apply to wrists before tasks requiring concentration. Feel the grounding energy stabilize your mind and enhance focus.',
        benefits: ['Mental focus', 'Grounding', 'Organization', 'Clarity'],
        frequency: '396 Hz - The liberation frequency',
      },
      {
        id: 'red-jasper',
        name: 'Red Jasper',
        technicalName: 'Microcrystalline quartz with iron',
        chakra: 'root',
        element: 'earth',
        color: '#8b0000',
        description: 'The stone of endurance and stability',
        energy: 'Stabilizing, nurturing, strengthening',
        properties: ['Endurance', 'Grounding', 'Nurturing', 'Courage'],
        synergyTitle: 'The Stabilizing Earth',
        synergyDescription: 'Red Jasper brings nurturing strength to Patchouli Dark\'s grounding energy. This pairing provides endurance during challenging times, offering emotional stability and the courage to persist.',
        ritual: 'Apply to root chakra when feeling ungrounded or exhausted. Breathe in the stabilizing, nurturing energy of earth.',
        benefits: ['Emotional stability', 'Endurance', 'Nurturing', 'Root chakra grounding'],
        frequency: '396 Hz - The liberation frequency',
      },
    ],
  },
  
  // ============================================================================
  // CARROT SEED
  // ============================================================================
  {
    id: 'carrot-seed',
    handle: 'carrot-seed-oil',
    commonName: 'Carrot Seed',
    technicalName: 'Daucus carota',
    origin: 'India',
    extractionMethod: 'Steam distillation of seeds',
    baseProperties: ['Skin regeneration', 'Detoxifying', 'Antioxidant', 'Anti-aging', 'Liver support'],
    image: '/images/plants/carrot-seed.jpg',
    imageAttribution: 'Daucus carota — Photo by eleftherioskats via iNaturalist (CC-BY)',
    description: 'Earthy, herbaceous, and rejuvenating, our Indian Carrot Seed oil is a skin\'s best ally. Revered for its regenerative properties, it helps turn back time on skin while supporting the body\'s natural detoxification.',
    aroma: 'Earthy, herbaceous, woody with slight sweet undertones',
    strengths: ['Skin regeneration', 'Anti-aging', 'Detoxification', 'Cellular renewal', 'Antioxidant protection'],
    recommendedCarrier: 'apricot-kernel',
    sizeInfo: {
      '30ml': { 
        crystals: 12, 
        description: 'Twelve Clear Quartz chips amplifying regeneration and renewal.' 
      },
      '20ml': { 
        crystals: 8, 
        description: 'Eight Citrine chips energizing vitality and renewal.' 
      },
      '15ml': { 
        crystals: 6, 
        description: 'Six Rose Quartz chips nurturing skin with loving energy.' 
      },
      '10ml': { 
        crystals: 4, 
        description: 'Four Clear Quartz chips for focused regeneration.' 
      },
      '5ml': { 
        crystals: 2, 
        description: 'Two Citrine chips—vitality in a small package.' 
      },
    },
    crystalPairings: [
      {
        id: 'clear-quartz',
        name: 'Clear Quartz',
        technicalName: 'Pure silicon dioxide',
        chakra: 'crown',
        element: 'air',
        color: '#e8e8e8',
        description: 'The master healer and energy amplifier',
        energy: 'Clarifying, amplifying, harmonizing',
        properties: ['Energy amplification', 'Mental clarity', 'Manifestation', 'Aura cleansing'],
        synergyTitle: 'The Regenerator',
        synergyDescription: 'Clear Quartz amplifies Carrot Seed\'s regenerative properties to create powerful cellular renewal. This pairing supports skin healing, detoxification, and the body\'s natural ability to regenerate and renew.',
        ritual: 'Apply to face and neck during skincare rituals. Visualize clear light amplifying your skin\'s natural regeneration process.',
        benefits: ['Skin regeneration', 'Cellular renewal', 'Amplified healing', 'Clarity'],
        frequency: '768 Hz - The creation frequency',
      },
      {
        id: 'citrine',
        name: 'Citrine',
        technicalName: 'Silicon dioxide with iron',
        chakra: 'solar-plexus',
        element: 'fire',
        color: '#f4d03f',
        description: 'The stone of abundance and personal power',
        energy: 'Uplifting, energizing, manifesting',
        properties: ['Abundance', 'Confidence', 'Creativity', 'Mental focus'],
        synergyTitle: 'The Vitality Spark',
        synergyDescription: 'Citrine adds solar vitality to Carrot Seed\'s regenerative properties. This pairing energizes cellular renewal, bringing a youthful glow and vibrant energy to both skin and spirit.',
        ritual: 'Apply to solar plexus and face while setting intentions for vitality and renewal. Feel the warming energy activate your inner glow.',
        benefits: ['Vitality', 'Youthful energy', 'Cellular renewal', 'Confidence'],
        frequency: '528 Hz - The transformation frequency',
      },
      {
        id: 'rose-quartz',
        name: 'Rose Quartz',
        technicalName: 'Silicon dioxide with titanium',
        chakra: 'heart',
        element: 'water',
        color: '#ffb6c1',
        description: 'The stone of unconditional love and compassion',
        energy: 'Nurturing, gentle, heart-opening',
        properties: ['Emotional healing', 'Self-love', 'Relationship harmony', 'Grief support'],
        synergyTitle: 'The Loving Renewal',
        synergyDescription: 'Rose Quartz brings heart-centered nurturing to Carrot Seed\'s skin regeneration. This loving pairing supports beauty from within, self-acceptance, and the gentle renewal of both skin and self-love.',
        ritual: 'Apply to face and heart center during self-care rituals. Speak words of loving kindness to your skin and yourself.',
        benefits: ['Skin nurturing', 'Self-love', 'Gentle renewal', 'Heart-centered beauty'],
        frequency: '528 Hz - The love frequency',
      },
    ],
  },
  
  // ============================================================================
  // GERANIUM BOURBON
  // ============================================================================
  {
    id: 'geranium-bourbon',
    handle: 'geranium-bourbon-oil',
    commonName: 'Geranium Bourbon',
    technicalName: 'Pelargonium graveolens',
    origin: 'Réunion Island (Bourbon)',
    extractionMethod: 'Steam distillation of leaves and flowers',
    baseProperties: ['Hormone balancing', 'Skin balancing', 'Calming', 'Uplifting', 'Adrenal support'],
    image: '/images/plants/geranium-bourbon.jpg',
    imageAttribution: 'Pelargonium graveolens — Photo by jeremygilmore via iNaturalist (CC-BY)',
    description: 'Floral, rosy, and harmonizing, our Réunion Island Geranium Bourbon is the queen of balance. Rare and precious from the original Bourbon cultivar, it brings equilibrium to hormones, skin, and emotions alike.',
    aroma: 'Sweet, floral, rosy with minty undertones and herbaceous notes',
    strengths: ['Hormone balance', 'Skin harmony', 'Emotional balance', 'Adrenal support', 'Stress relief'],
    recommendedCarrier: 'jojoba',
    sizeInfo: {
      '30ml': { 
        crystals: 12, 
        description: 'Twelve Rose Quartz chips for heart-centered hormonal harmony.' 
      },
      '20ml': { 
        crystals: 8, 
        description: 'Eight Green Aventurine chips balancing heart and growth.' 
      },
      '15ml': { 
        crystals: 6, 
        description: 'Six Amethyst chips bringing calm and spiritual balance.' 
      },
      '10ml': { 
        crystals: 4, 
        description: 'Four Rose Quartz chips for portable heart healing.' 
      },
      '5ml': { 
        crystals: 2, 
        description: 'Two Green Aventurine chips—balance in a small package.' 
      },
    },
    crystalPairings: [
      {
        id: 'rose-quartz',
        name: 'Rose Quartz',
        technicalName: 'Silicon dioxide with titanium',
        chakra: 'heart',
        element: 'water',
        color: '#ffb6c1',
        description: 'The stone of unconditional love and compassion',
        energy: 'Nurturing, gentle, heart-opening',
        properties: ['Emotional healing', 'Self-love', 'Relationship harmony', 'Grief support'],
        synergyTitle: 'The Heart Balancer',
        synergyDescription: 'Rose Quartz and Geranium Bourbon create the ultimate heart-centered harmony. This pairing balances emotions, soothes the heart, and nurtures self-love while supporting hormonal equilibrium through emotional balance.',
        ritual: 'Apply to heart center and wrists during times of emotional or hormonal imbalance. Breathe in self-love and exhale tension.',
        benefits: ['Emotional balance', 'Hormone harmony', 'Self-love', 'Heart healing'],
        frequency: '528 Hz - The love frequency',
      },
      {
        id: 'green-aventurine',
        name: 'Green Aventurine',
        technicalName: 'Quartz with fuchsite',
        chakra: 'heart',
        element: 'earth',
        color: '#228b22',
        description: 'The stone of heart-centered abundance',
        energy: 'Compassionate, lucky, healing',
        properties: ['Heart healing', 'Abundance', 'Compassion', 'Well-being'],
        synergyTitle: 'The Growth Harmonizer',
        synergyDescription: 'Green Aventurine brings growth and abundance to Geranium Bourbon\'s balancing energy. This pairing supports heart-centered growth, prosperity, and the well-being that comes from being in harmony with oneself.',
        ritual: 'Apply to heart center while setting intentions for growth and balance. Feel the energy of abundance flow through your heart.',
        benefits: ['Heart healing', 'Abundance', 'Growth', 'Well-being'],
        frequency: '639 Hz - The connecting frequency',
      },
      {
        id: 'amethyst',
        name: 'Amethyst',
        technicalName: 'Silicon dioxide with iron impurities',
        chakra: 'crown',
        element: 'air',
        color: '#9966cc',
        description: 'The stone of spiritual wisdom and inner peace',
        energy: 'Calming, protective, clarifying',
        properties: ['Stress relief', 'Meditation aid', 'Sleep support', 'Intuition'],
        synergyTitle: 'The Peaceful Balance',
        synergyDescription: 'Amethyst adds spiritual calm to Geranium Bourbon\'s harmonizing properties. This pairing creates deep inner peace and balance, supporting restful sleep and hormonal harmony through spiritual tranquility.',
        ritual: 'Apply to temples and third eye before bed. Inhale deeply and allow the calming energy to bring peace and balance.',
        benefits: ['Sleep support', 'Hormonal calm', 'Spiritual balance', 'Stress relief'],
        frequency: '432 Hz - The universal healing frequency',
      },
    ],
  },
  
  // ============================================================================
  // JUNIPER BERRY
  // ============================================================================
  {
    id: 'juniper-berry',
    handle: 'juniper-berry-oil',
    commonName: 'Juniper Berry',
    technicalName: 'Juniperus communis',
    origin: 'Himalayan Region',
    extractionMethod: 'Steam distillation of berries',
    baseProperties: ['Detoxifying', 'Purifying', 'Diuretic', 'Grounding', 'Protection'],
    image: '/images/plants/juniper-berry.jpg',
    imageAttribution: 'Juniperus communis — Photo by gcart043 via iNaturalist (CC0)',
    description: 'Crisp, woody, and cleansing, our Himalayan Juniper Berry oil carries the purity of mountain air. Sacred to ancient purification rituals, it cleanses body, mind, and spirit while providing grounded protection.',
    aroma: 'Fresh, woody, balsamic, slightly fruity with peppery undertones',
    strengths: ['Detoxification', 'Purification', 'Grounding', 'Protection', 'Clarity'],
    recommendedCarrier: 'fractionated-coconut',
    sizeInfo: {
      '30ml': { 
        crystals: 12, 
        description: 'Twelve Amethyst chips for spiritual purification and clarity.' 
      },
      '20ml': { 
        crystals: 8, 
        description: 'Eight Clear Quartz chips amplifying cleansing energy.' 
      },
      '15ml': { 
        crystals: 6, 
        description: 'Six Lapis Lazuli chips for truth and inner vision.' 
      },
      '10ml': { 
        crystals: 4, 
        description: 'Four Amethyst chips for portable purification.' 
      },
      '5ml': { 
        crystals: 2, 
        description: 'Two Clear Quartz chips—clarity in a small package.' 
      },
    },
    crystalPairings: [
      {
        id: 'amethyst',
        name: 'Amethyst',
        technicalName: 'Silicon dioxide with iron impurities',
        chakra: 'crown',
        element: 'air',
        color: '#9966cc',
        description: 'The stone of spiritual wisdom and inner peace',
        energy: 'Calming, protective, clarifying',
        properties: ['Stress relief', 'Meditation aid', 'Sleep support', 'Intuition'],
        synergyTitle: 'The Purifier',
        synergyDescription: 'Amethyst enhances Juniper Berry\'s purifying properties with spiritual clarity. This pairing cleanses the aura, protects the energy field, and brings crystalline clarity to mind and spirit.',
        ritual: 'Use during space cleansing rituals. Apply to pulse points while visualizing purple light purifying your energy field.',
        benefits: ['Aura cleansing', 'Spiritual protection', 'Mental clarity', 'Purification'],
        frequency: '852 Hz - The intuition frequency',
      },
      {
        id: 'clear-quartz',
        name: 'Clear Quartz',
        technicalName: 'Pure silicon dioxide',
        chakra: 'crown',
        element: 'air',
        color: '#e8e8e8',
        description: 'The master healer and energy amplifier',
        energy: 'Clarifying, amplifying, harmonizing',
        properties: ['Energy amplification', 'Mental clarity', 'Manifestation', 'Aura cleansing'],
        synergyTitle: 'The Amplified Cleanse',
        synergyDescription: 'Clear Quartz amplifies Juniper Berry\'s cleansing energy to the highest degree. This pairing is the ultimate detoxification tool, clearing stagnant energy and amplifying the body\'s natural purification processes.',
        ritual: 'Add to cleaning water or apply to body during detox rituals. Visualize clear light amplifying the cleansing process.',
        benefits: ['Amplified detox', 'Energy clearing', 'Purification', 'Clarity'],
        frequency: '768 Hz - The creation frequency',
      },
      {
        id: 'lapis-lazuli',
        name: 'Lapis Lazuli',
        technicalName: 'Lazurite with calcite and pyrite',
        chakra: 'third-eye',
        element: 'air',
        color: '#1e3a8a',
        description: 'The stone of truth and inner vision',
        energy: 'Insightful, truthful, expansive',
        properties: ['Intuition', 'Communication', 'Wisdom', 'Spiritual insight'],
        synergyTitle: 'The Truth Seer',
        synergyDescription: 'Lapis Lazuli adds inner vision to Juniper Berry\'s cleansing energy. This pairing helps you see truth clearly, cutting through illusions while purifying mind and spirit of falsehoods.',
        ritual: 'Apply to third eye during meditation or journaling. Ask for clarity and truth as you cleanse mental and spiritual blockages.',
        benefits: ['Inner vision', 'Truth clarity', 'Spiritual insight', 'Mental purification'],
        frequency: '741 Hz - The awakening frequency',
      },
    ],
  },
  
  // ============================================================================
  // CINNAMON LEAF
  // ============================================================================
  {
    id: 'cinnamon-leaf',
    handle: 'cinnamon-leaf-oil',
    commonName: 'Cinnamon Leaf',
    technicalName: 'Cinnamomum zeylancium',
    origin: 'Sri Lanka',
    extractionMethod: 'Steam distillation of leaves',
    baseProperties: ['Warming', 'Circulation boosting', 'Antimicrobial', 'Stimulating', 'Respiratory support'],
    image: '/images/plants/cinnamon-leaf.jpg',
    imageAttribution: 'Cinnamomum verum — Photo by sayeegirdhari via iNaturalist (CC-BY)',
    description: 'Warm, spicy, and invigorating, our Sri Lankan Cinnamon Leaf oil awakens the senses. Milder than the bark yet powerfully warming, it stimulates circulation, supports immunity, and kindles the inner fire.',
    aroma: 'Warm, spicy, sweet-clove like with woody undertones',
    strengths: ['Circulation support', 'Immune boosting', 'Warming', 'Respiratory health', 'Mental stimulation'],
    recommendedCarrier: 'sweet-almond',
    sizeInfo: {
      '30ml': { 
        crystals: 12, 
        description: 'Twelve Carnelian chips for vitality and creative fire.' 
      },
      '20ml': { 
        crystals: 8, 
        description: 'Eight Citrine chips energizing warmth and abundance.' 
      },
      '15ml': { 
        crystals: 6, 
        description: 'Six Tiger\'s Eye chips for confident, grounded energy.' 
      },
      '10ml': { 
        crystals: 4, 
        description: 'Four Carnelian chips for portable warming energy.' 
      },
      '5ml': { 
        crystals: 2, 
        description: 'Two Citrine chips—warmth in a small package.' 
      },
    },
    crystalPairings: [
      {
        id: 'carnelian',
        name: 'Carnelian',
        technicalName: 'Chalcedony with iron oxide',
        chakra: 'sacral',
        element: 'fire',
        color: '#e85d04',
        description: 'The stone of vitality and creative passion',
        energy: 'Energizing, motivating, passionate',
        properties: ['Creativity', 'Courage', 'Motivation', 'Vitality'],
        synergyTitle: 'The Vitality Spark',
        synergyDescription: 'Carnelian amplifies Cinnamon Leaf\'s warming, stimulating properties into pure vitality. This pairing boosts circulation, ignites passion, and fuels the inner fire of motivation and drive.',
        ritual: 'Apply to sacral chakra and lower back. Feel the warming energy stimulate circulation and ignite your vitality.',
        benefits: ['Vitality boost', 'Circulation support', 'Motivation', 'Creative fire'],
        frequency: '396 Hz - The liberation frequency',
      },
      {
        id: 'citrine',
        name: 'Citrine',
        technicalName: 'Silicon dioxide with iron',
        chakra: 'solar-plexus',
        element: 'fire',
        color: '#f4d03f',
        description: 'The stone of abundance and personal power',
        energy: 'Uplifting, energizing, manifesting',
        properties: ['Abundance', 'Confidence', 'Creativity', 'Mental focus'],
        synergyTitle: 'The Warm Abundance',
        synergyDescription: 'Citrine brings golden abundance energy to Cinnamon Leaf\'s warming properties. This pairing attracts prosperity while maintaining the warm, stimulating energy needed to pursue goals.',
        ritual: 'Apply to solar plexus while setting intentions for abundance and success. Feel the warming energy fuel your manifestation power.',
        benefits: ['Abundance', 'Confidence', 'Warming energy', 'Manifestation'],
        frequency: '528 Hz - The transformation frequency',
      },
      {
        id: 'tigers-eye',
        name: "Tiger's Eye",
        technicalName: 'Crocidolite replaced by quartz',
        chakra: 'solar-plexus',
        element: 'earth',
        color: '#b8860b',
        description: 'The stone of courage and clear perception',
        energy: 'Grounding, protective, empowering',
        properties: ['Confidence', 'Mental clarity', 'Protection', 'Decision making'],
        synergyTitle: 'The Grounded Fire',
        synergyDescription: "Tiger's Eye grounds Cinnamon Leaf's warming energy while maintaining its stimulating power. This pairing creates confident, grounded action—perfect for taking decisive steps forward.",
        ritual: 'Apply to solar plexus before taking action on goals. Stand in your power with grounded confidence and clarity.',
        benefits: ['Grounded confidence', 'Clear action', 'Protection', 'Empowerment'],
        frequency: '417 Hz - The facilitating frequency',
      },
    ],
  },
  
  // ============================================================================
  // LEMON MYRTLE
  // ============================================================================
  {
    id: 'lemon-myrtle',
    handle: 'lemon-myrtle-oil',
    commonName: 'Lemon Myrtle',
    technicalName: 'Backhousia citriodora',
    origin: 'Australia',
    extractionMethod: 'Steam distillation of leaves',
    baseProperties: ['Antimicrobial', 'Uplifting', 'Calming', 'Air purifying', 'Digestive support'],
    image: '/images/plants/lemon-myrtle.jpg',
    imageAttribution: 'Backhousia citriodora — Photo by xanthosia via iNaturalist (CC-BY)',
    description: 'Bright, lemony, and powerfully cleansing, our Australian Lemon Myrtle oil is nature\'s citrus burst. More lemony than lemon itself, it purifies the air, lifts the spirit, and brings clarity to mind and space.',
    aroma: 'Intensely lemony, sweet, fresh with subtle herbal notes',
    strengths: ['Air purification', 'Mood elevation', 'Antimicrobial', 'Mental clarity', 'Calming energy'],
    recommendedCarrier: 'grapeseed',
    sizeInfo: {
      '30ml': { 
        crystals: 12, 
        description: 'Twelve Citrine chips radiating joyful clarity and brightness.' 
      },
      '20ml': { 
        crystals: 8, 
        description: 'Eight Clear Quartz chips amplifying cleansing energy.' 
      },
      '15ml': { 
        crystals: 6, 
        description: 'Six Aventurine chips attracting fresh opportunities.' 
      },
      '10ml': { 
        crystals: 4, 
        description: 'Four Citrine chips for portable joy and clarity.' 
      },
      '5ml': { 
        crystals: 2, 
        description: 'Two Clear Quartz chips—clarity in a small package.' 
      },
    },
    crystalPairings: [
      {
        id: 'citrine',
        name: 'Citrine',
        technicalName: 'Silicon dioxide with iron',
        chakra: 'solar-plexus',
        element: 'fire',
        color: '#f4d03f',
        description: 'The stone of abundance and personal power',
        energy: 'Uplifting, energizing, manifesting',
        properties: ['Abundance', 'Confidence', 'Creativity', 'Mental focus'],
        synergyTitle: 'The Sunshine Burst',
        synergyDescription: 'Citrine and Lemon Myrtle create an explosion of lemony sunshine. This pairing instantly lifts the mood, clears mental fog, and infuses the spirit with optimism, joy, and bright clarity.',
        ritual: 'Diffuse or apply to wrists each morning. Set daily intentions while visualizing golden-lemon light filling your solar plexus with positivity.',
        benefits: ['Mood elevation', 'Mental clarity', 'Optimism', 'Joyful energy'],
        frequency: '528 Hz - The transformation frequency',
      },
      {
        id: 'clear-quartz',
        name: 'Clear Quartz',
        technicalName: 'Pure silicon dioxide',
        chakra: 'crown',
        element: 'air',
        color: '#e8e8e8',
        description: 'The master healer and energy amplifier',
        energy: 'Clarifying, amplifying, harmonizing',
        properties: ['Energy amplification', 'Mental clarity', 'Manifestation', 'Aura cleansing'],
        synergyTitle: 'The Amplified Cleanse',
        synergyDescription: 'Clear Quartz amplifies Lemon Myrtle\'s cleansing properties to the highest degree. This pairing purifies air, mind, and spirit with crystalline clarity, making it ideal for space clearing.',
        ritual: 'Diffuse in any space needing purification, or apply to pulse points while visualizing clear light cleansing your aura.',
        benefits: ['Air purification', 'Aura cleansing', 'Amplified clarity', 'Space clearing'],
        frequency: '768 Hz - The creation frequency',
      },
      {
        id: 'aventurine',
        name: 'Aventurine',
        technicalName: 'Quartz with fuchsite inclusions',
        chakra: 'heart',
        element: 'earth',
        color: '#2ecc71',
        description: 'The stone of opportunity and growth',
        energy: 'Lucky, growth-oriented, comforting',
        properties: ['Good luck', 'Heart healing', 'Prosperity', 'Emotional calm'],
        synergyTitle: 'The Fresh Opportunity',
        synergyDescription: 'Aventurine\'s lucky energy combines with Lemon Myrtle\'s freshness to open doors and clear the path to new possibilities. This pairing attracts opportunities while keeping the heart light.',
        ritual: 'Apply to heart center before new ventures or important meetings. Carry with you as a lucky charm for fresh starts.',
        benefits: ['Opportunity attraction', 'Fresh starts', 'Good luck', 'Heart-centered clarity'],
        frequency: '639 Hz - The connecting frequency',
      },
    ],
  },
  
  // ============================================================================
  // LEMON
  // ============================================================================
  {
    id: 'lemon',
    handle: 'lemon-oil',
    commonName: 'Lemon',
    technicalName: 'Citrus limon',
    origin: 'Australia',
    extractionMethod: 'Cold pressed peel',
    baseProperties: ['Uplifting', 'Cleansing', 'Focus enhancing', 'Immune support', 'Detoxifying'],
    image: '/images/plants/lemon.jpg',
    imageAttribution: 'Citrus limon — Photo by lanechaffin via iNaturalist (CC0)',
    description: 'Bright, zesty, and invigorating, our Australian Lemon oil captures sunshine in a bottle. Cold-pressed from fresh peels, it cleanses the mind, lifts the spirit, and brings crystal-clear focus to any task.',
    aroma: 'Fresh, zesty, citrusy, bright and clean',
    strengths: ['Mood elevation', 'Mental focus', 'Cleansing', 'Immune support', 'Clarity'],
    recommendedCarrier: 'grapeseed',
    sizeInfo: {
      '30ml': { 
        crystals: 12, 
        description: 'Twelve Citrine chips radiating joyful clarity and brightness.' 
      },
      '20ml': { 
        crystals: 8, 
        description: 'Eight Clear Quartz chips amplifying mental clarity.' 
      },
      '15ml': { 
        crystals: 6, 
        description: 'Six Aventurine chips attracting fresh opportunities.' 
      },
      '10ml': { 
        crystals: 4, 
        description: 'Four Citrine chips for portable joy and clarity.' 
      },
      '5ml': { 
        crystals: 2, 
        description: 'Two Clear Quartz chips—clarity in a small package.' 
      },
    },
    crystalPairings: [
      {
        id: 'citrine',
        name: 'Citrine',
        technicalName: 'Silicon dioxide with iron',
        chakra: 'solar-plexus',
        element: 'fire',
        color: '#f4d03f',
        description: 'The stone of abundance and personal power',
        energy: 'Uplifting, energizing, manifesting',
        properties: ['Abundance', 'Confidence', 'Creativity', 'Mental focus'],
        synergyTitle: 'The Liquid Sunshine',
        synergyDescription: 'Citrine and Lemon are pure liquid sunshine. This pairing instantly lifts the mood, clears mental fog, and infuses the spirit with optimism, joy, and the confidence to seize opportunities.',
        ritual: 'Apply to wrists and inhale deeply each morning. Set daily intentions while visualizing golden-yellow light filling you with positivity.',
        benefits: ['Mood elevation', 'Mental clarity', 'Optimism', 'Confidence boost'],
        frequency: '528 Hz - The transformation frequency',
      },
      {
        id: 'clear-quartz',
        name: 'Clear Quartz',
        technicalName: 'Pure silicon dioxide',
        chakra: 'crown',
        element: 'air',
        color: '#e8e8e8',
        description: 'The master healer and energy amplifier',
        energy: 'Clarifying, amplifying, harmonizing',
        properties: ['Energy amplification', 'Mental clarity', 'Manifestation', 'Aura cleansing'],
        synergyTitle: 'The Crystal Clarity',
        synergyDescription: 'Clear Quartz amplifies Lemon\'s clarifying properties to create crystal-clear mental focus. This pairing cuts through confusion and brings pure, focused awareness perfect for studying or decision-making.',
        ritual: 'Apply to temples and third eye before studying or important decisions. Hold the bottle while asking for clear sight and mental focus.',
        benefits: ['Mental clarity', 'Focus', 'Energy amplification', 'Clear thinking'],
        frequency: '768 Hz - The creation frequency',
      },
      {
        id: 'aventurine',
        name: 'Aventurine',
        technicalName: 'Quartz with fuchsite inclusions',
        chakra: 'heart',
        element: 'earth',
        color: '#2ecc71',
        description: 'The stone of opportunity and growth',
        energy: 'Lucky, growth-oriented, comforting',
        properties: ['Good luck', 'Heart healing', 'Prosperity', 'Emotional calm'],
        synergyTitle: 'The Opportunity Fresh',
        synergyDescription: 'Aventurine\'s lucky energy combines with Lemon\'s freshness to open doors and clear the path to new possibilities. This pairing attracts opportunities while keeping the heart light and optimistic.',
        ritual: 'Apply to heart center before important meetings or new beginnings. Carry with you as a lucky charm throughout your day.',
        benefits: ['Opportunity attraction', 'Fresh starts', 'Good luck', 'Heart-centered optimism'],
        frequency: '639 Hz - The connecting frequency',
      },
    ],
  },
  
  // ============================================================================
  // MYRRH
  // ============================================================================
  {
    id: 'myrrh',
    handle: 'myrrh-oil',
    commonName: 'Myrrh',
    technicalName: 'Commiphora myrrha',
    origin: 'Ethiopia',
    extractionMethod: 'Steam distillation of resin',
    baseProperties: ['Spiritual grounding', 'Skin healing', 'Meditation aid', 'Antimicrobial', 'Emotional healing'],
    image: '/images/plants/myrrh.jpg',
    imageAttribution: "Commiphora myrrha — Botanical illustration from Köhler's Medizinal-Pflanzen (public domain)",
    description: 'Ancient, sacred, and deeply meditative, our Ethiopian Myrrh oil carries millennia of spiritual wisdom. Revered since ancient Egypt, it grounds the spirit, heals the skin, and connects us to divine mystery.',
    aroma: 'Rich, warm, balsamic, smoky with subtle sweetness',
    strengths: ['Spiritual connection', 'Deep meditation', 'Skin regeneration', 'Emotional grounding', 'Ancient wisdom'],
    recommendedCarrier: 'jojoba',
    sizeInfo: {
      '30ml': { 
        crystals: 12, 
        description: 'Twelve Amethyst chips for deep spiritual connection and meditation.' 
      },
      '20ml': { 
        crystals: 8, 
        description: 'Eight Black Tourmaline chips grounding spiritual energy.' 
      },
      '15ml': { 
        crystals: 6, 
        description: 'Six Lapis Lazuli chips opening inner vision and truth.' 
      },
      '10ml': { 
        crystals: 4, 
        description: 'Four Amethyst chips for portable spiritual connection.' 
      },
      '5ml': { 
        crystals: 2, 
        description: 'Two Black Tourmaline chips—grounded spirituality in a small package.' 
      },
    },
    crystalPairings: [
      {
        id: 'amethyst',
        name: 'Amethyst',
        technicalName: 'Silicon dioxide with iron impurities',
        chakra: 'crown',
        element: 'air',
        color: '#9966cc',
        description: 'The stone of spiritual wisdom and inner peace',
        energy: 'Calming, protective, clarifying',
        properties: ['Stress relief', 'Meditation aid', 'Sleep support', 'Intuition'],
        synergyTitle: 'The Sacred Mystic',
        synergyDescription: 'Amethyst and Myrrh form a sacred union for deep spiritual practice. This pairing opens the crown chakra, deepens meditation, and connects you to ancient wisdom and divine mystery.',
        ritual: 'Use during meditation or spiritual rituals. Apply to third eye and crown while setting intentions for spiritual connection.',
        benefits: ['Deep meditation', 'Spiritual connection', 'Crown chakra opening', 'Ancient wisdom'],
        frequency: '852 Hz - The intuition frequency',
      },
      {
        id: 'black-tourmaline',
        name: 'Black Tourmaline',
        technicalName: 'Complex boron silicate',
        chakra: 'root',
        element: 'earth',
        color: '#1a1a1a',
        description: 'The ultimate protection and grounding stone',
        energy: 'Protective, grounding, stabilizing',
        properties: ['EMF protection', 'Grounding', 'Anxiety relief', 'Boundary setting'],
        synergyTitle: 'The Grounded Spirit',
        synergyDescription: 'Black Tourmaline grounds Myrrh\'s spiritual energy deeply into the physical body. This pairing creates a protective shield while maintaining spiritual connection—perfect for grounded spiritual practice.',
        ritual: 'Apply to root chakra and soles of feet before spiritual work. Feel protected and grounded while exploring higher realms.',
        benefits: ['Grounded spirituality', 'Protection', 'Anxiety relief', 'Root chakra balance'],
        frequency: '396 Hz - The liberation frequency',
      },
      {
        id: 'lapis-lazuli',
        name: 'Lapis Lazuli',
        technicalName: 'Lazurite with calcite and pyrite',
        chakra: 'third-eye',
        element: 'air',
        color: '#1e3a8a',
        description: 'The stone of truth and inner vision',
        energy: 'Insightful, truthful, expansive',
        properties: ['Intuition', 'Communication', 'Wisdom', 'Spiritual insight'],
        synergyTitle: 'The Ancient Seer',
        synergyDescription: 'Lapis Lazuli and Myrrh connect you to ancient wisdom and inner vision. This pairing was prized by Egyptian priests for spiritual insight, truth-seeking, and accessing divine knowledge.',
        ritual: 'Apply to third eye during deep meditation or before sleep. Ask for ancient wisdom and spiritual insight.',
        benefits: ['Inner vision', 'Ancient wisdom', 'Spiritual insight', 'Truth seeking'],
        frequency: '741 Hz - The awakening frequency',
      },
    ],
  },
  
  // --------------------------------------------------------------------------
  // BERGAMOT FCF ORGANIC (New Addition)
  // --------------------------------------------------------------------------
  {
    id: 'bergamot-fcf',
    handle: 'bergamot-fcf-organic',
    commonName: 'Bergamot (FCF)',
    technicalName: 'Citrus aurantium ssp. bergamia (bergapten-free)',
    origin: 'Calabria, Italy',
    extractionMethod: 'Cold expression (cold pressed) from fruit peel, then washed to remove furocoumarins (bergapten)',
    baseProperties: ['Uplifting', 'Stress relief', 'Antidepressant', 'Antiseptic', 'Digestive support'],
    image: '/images/plants/bergamot-fcf.jpg',
    imageAttribution: 'Citrus × aurantium (bitter orange, bergamot parent species) — Photo via iNaturalist (CC-BY)',
    description: 'Sunshine captured in a bottle. Our certified organic FCF Bergamot from Calabria, Italy carries the joyful essence of Mediterranean citrus groves without the phototoxicity of regular bergamot. The unique bergapten-free extraction makes it safe for daytime use, while its distinctive Earl Grey tea aroma uplifts the spirit and calms the mind.',
    aroma: 'Fresh, citrusy, floral with subtle spicy notes, reminiscent of Earl Grey tea',
    strengths: ['Mood enhancement', 'Anxiety relief', 'Daytime-safe citrus', 'Emotional balance', 'Skin-friendly'],
    recommendedCarrier: 'jojoba',
    sizeInfo: {
      '30ml': { 
        crystals: 12, 
        description: 'Twelve Green Aventurine chips bring abundance and heart-centered joy. The full-size experience for daily emotional wellness.' 
      },
      '20ml': { 
        crystals: 8, 
        description: 'Eight Citrine chips radiate sunny optimism and creative energy.' 
      },
      '15ml': { 
        crystals: 6, 
        description: 'Six Peridot chips for heart healing and stress relief on the go.' 
      },
      '10ml': { 
        crystals: 4, 
        description: 'Four Green Aventurine chips for portable positivity and calm.' 
      },
      '5ml': { 
        crystals: 2, 
        description: 'Two Citrine chips—an introduction to Bergamot\'s uplifting embrace.' 
      },
    },
    crystalPairings: [
      {
        id: 'green-aventurine',
        name: 'Green Aventurine',
        technicalName: 'Quartz with fuchsite inclusions',
        chakra: 'heart',
        element: 'earth',
        color: '#7cb342',
        description: 'The stone of opportunity and heart-centered abundance',
        energy: 'Uplifting, lucky, heart-healing',
        properties: ['Emotional healing', 'Optimism', 'Heart chakra', 'Stress relief'],
        synergyTitle: 'The Sunshine Embrace',
        synergyDescription: 'Green Aventurine and Bergamot FCF create a heart-centered upliftment that dissolves worry and welcomes joy. The crystal\'s lucky, abundant energy amplifies bergamot\'s natural antidepressant properties, making this the perfect daytime mood enhancer.',
        ritual: 'Apply to wrists and heart center in the morning. Inhale deeply while setting intentions for a positive, abundant day. Carry the energy of Italian sunshine with you.',
        benefits: ['Daytime mood lift', 'Heart-centered optimism', 'Stress resilience', 'Emotional balance'],
        frequency: '528 Hz - The love frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba\'s balancing nature allows Bergamot and Green Aventurine to work harmoniously throughout the day, providing sustained emotional support.',
            ritual: 'Apply to pulse points each morning. The jojoba carries the citrus-herbaceous notes while Green Aventurine maintains heart-centered calm.',
            benefits: ['All-day mood support', 'Balanced emotions', 'Skin harmony'],
          },
          'apricot-kernel': {
            description: 'Apricot kernel\s heart-nurturing warmth combines with Green Aventurine and Bergamot for gentle emotional healing and self-love.',
            ritual: 'Massage into chest and heart area when feeling anxious or low. Feel the warmth spreading optimism through your being.',
            benefits: ['Emotional comfort', 'Heart healing', 'Gentle upliftment'],
          },
        },
      },
      {
        id: 'citrine',
        name: 'Citrine',
        technicalName: 'Silicon dioxide with iron',
        chakra: 'solar-plexus',
        element: 'fire',
        color: '#ffb300',
        description: 'The merchant\'s stone of abundance and personal power',
        energy: 'Energizing, manifesting, confident',
        properties: ['Abundance', 'Confidence', 'Creativity', 'Mental clarity'],
        synergyTitle: 'The Creative Spark',
        synergyDescription: 'Citrine and Bergamot FCF ignite the solar plexus with creative confidence and mental clarity. This pairing banishes lethargy and self-doubt, replacing them with sunny motivation and the courage to pursue your dreams.',
        ritual: 'Apply to solar plexus (upper abdomen) before creative work or important meetings. Inhale deeply as Citrine and Bergamot activate your personal power.',
        benefits: ['Creative inspiration', 'Confidence boost', 'Mental clarity', 'Motivation'],
        frequency: '528 Hz - The manifestation frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba enhances Citrine\'s clarifying energy with Bergamot\'s upliftment, creating sustained mental focus and creative flow.',
            ritual: 'Apply to wrists and temples before creative projects. Let the citrus-solar energy activate your imagination.',
            benefits: ['Creative flow', 'Mental stamina', 'Clear thinking'],
          },
          'sweet-almond': {
            description: 'Sweet almond\'s nourishing warmth supports Citrine and Bergamot in building lasting confidence and self-assurance.',
            ritual: 'Use during morning intention-setting. Apply to solar plexus while visualizing success and abundance.',
            benefits: ['Confidence building', 'Abundance mindset', 'Nurtured ambition'],
          },
        },
      },
      {
        id: 'peridot',
        name: 'Peridot',
        technicalName: 'Magnesium iron silicate',
        chakra: 'heart',
        element: 'earth',
        color: '#9ccc65',
        description: 'The stone of compassion and emotional cleansing',
        energy: 'Cleansing, renewing, heart-opening',
        properties: ['Emotional release', 'Compassion', 'Stress relief', 'Heart healing'],
        synergyTitle: 'The Heart\'s Renewal',
        synergyDescription: 'Peridot and Bergamot FCF work together to cleanse the heart of old emotional burdens while inviting fresh, positive energy. This pairing helps release resentment, jealousy, and heartache, replacing them with compassion and emotional freedom.',
        ritual: 'Apply to heart center during emotional processing or when releasing old patterns. Breathe in renewal, breathe out what no longer serves.',
        benefits: ['Emotional cleansing', 'Compassion cultivation', 'Heart healing', 'Stress release'],
        frequency: '639 Hz - The heart connection frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba allows Peridot\'s heart-cleansing and Bergamot\'s upliftment to penetrate deeply, creating lasting emotional transformation.',
            ritual: 'Apply to heart and inhale during meditation on forgiveness or letting go.',
            benefits: ['Deep emotional healing', 'Lasting transformation', 'Balanced heart energy'],
          },
          'apricot-kernel': {
            description: 'Apricot kernel\'s gentle nurturing supports Peridot and Bergamot in tender emotional work with extra care.',
            ritual: 'Use during heart-centered meditation or emotional healing work. Apply to chest with gentle, loving touch.',
            benefits: ['Gentle emotional release', 'Self-compassion', 'Tender healing'],
          },
        },
      },
    ],
  },
  
  // --------------------------------------------------------------------------
  // SWEET ORANGE (New Addition)
  // --------------------------------------------------------------------------
  {
    id: 'sweet-orange',
    handle: 'sweet-orange-oil',
    commonName: 'Sweet Orange',
    technicalName: 'Citrus sinensis',
    origin: 'Australia',
    extractionMethod: 'Cold pressed from the peel',
    baseProperties: ['Uplifting', 'Cheerful', 'Calming', 'Digestive support', 'Immune support'],
    image: '/images/plants/sweet-orange.jpg',
    imageAttribution: 'Citrus sinensis — Photo by brandoncorder via iNaturalist (CC-BY)',
    description: 'Liquid sunshine from the Australian orchards. Our certified organic Sweet Orange captures the pure joy of citrus groves in every drop. Cold-pressed from the peel to preserve the full spectrum of beneficial compounds, this oil radiates cheerful warmth that lifts spirits and brightens spaces. Gentle enough for children yet potent enough to transform moods.',
    aroma: 'Sweet, bright, citrusy, cheerful, reminiscent of fresh orange peel',
    strengths: ['Mood enhancement', 'Child-friendly', 'Daytime safe', 'Stress relief', 'Air freshening'],
    recommendedCarrier: 'jojoba',
    sizeInfo: {
      '30ml': { 
        crystals: 12, 
        description: 'Twelve Carnelian chips radiate creative energy and joy. The full-size burst of sunshine for daily optimism.' 
      },
      '20ml': { 
        crystals: 8, 
        description: 'Eight Orange Calcite chips amplify the playful, uplifting energy.' 
      },
      '15ml': { 
        crystals: 6, 
        description: 'Six Sunstone chips for portable positivity and empowerment.' 
      },
      '10ml': { 
        crystals: 4, 
        description: 'Four Carnelian chips for on-the-go cheerfulness.' 
      },
      '5ml': { 
        crystals: 2, 
        description: 'Two Orange Calcite chips—a drop of sunshine to sample.' 
      },
    },
    crystalPairings: [
      {
        id: 'carnelian',
        name: 'Carnelian',
        technicalName: 'Chalcedony variety',
        chakra: 'sacral',
        element: 'fire',
        color: '#ff6b35',
        description: 'The stone of creativity, courage, and motivation',
        energy: 'Energizing, creative, confident',
        properties: ['Creativity', 'Motivation', 'Courage', 'Vitality'],
        synergyTitle: 'The Joy Spark',
        synergyDescription: 'Carnelian and Sweet Orange ignite the sacral chakra with creative fire and infectious joy. This pairing banishes lethargy and replaces it with playful enthusiasm, making it perfect for creative projects, social gatherings, or anytime you need a boost of sunshine energy.',
        ritual: 'Apply to wrists and solar plexus when feeling low energy. Inhale deeply while visualizing bright orange light filling your being with vitality.',
        benefits: ['Creative inspiration', 'Mood uplift', 'Energy boost', 'Social confidence'],
        frequency: '417 Hz - The creative awakening frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba carries Sweet Orange and Carnelian deeply into the skin for sustained energy and creative flow throughout the day.',
            ritual: 'Apply to pulse points before creative work or social events. Feel the warm citrus-fire energy activate your confidence.',
            benefits: ['Sustained energy', 'Creative focus', 'Balanced enthusiasm'],
          },
          'sweet-almond': {
            description: 'Sweet almond\'s nurturing warmth combines with Carnelian and Sweet Orange for gentle yet potent mood enhancement.',
            ritual: 'Massage into chest and abdomen while setting intentions for a joyful, productive day.',
            benefits: ['Emotional warmth', 'Nurtured creativity', 'Gentle energy lift'],
          },
        },
      },
      {
        id: 'orange-calcite',
        name: 'Orange Calcite',
        technicalName: 'Calcium carbonate',
        chakra: 'sacral',
        element: 'fire',
        color: '#ffa500',
        description: 'The stone of playfulness and emotional balance',
        energy: 'Playful, balancing, uplifting',
        properties: ['Emotional balance', 'Playfulness', 'Optimism', 'Stress relief'],
        synergyTitle: 'The Sunshine Play',
        synergyDescription: 'Orange Calcite and Sweet Orange create a bubble of pure playfulness and lightheartedness. This pairing reminds you not to take life too seriously, dissolving stress and inviting childlike wonder back into your day.',
        ritual: 'Apply to heart and wrists when feeling stressed or overly serious. Take three deep breaths and allow playfulness to return.',
        benefits: ['Stress melting', 'Playful mindset', 'Emotional lightness', 'Inner child healing'],
        frequency: '528 Hz - The joy frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba allows Orange Calcite and Sweet Orange to work in harmony, providing balanced emotional uplift.',
            ritual: 'Use during breaks from work or stressful situations. Apply and step outside for sunshine exposure.',
            benefits: ['Emotional balance', 'Stress resilience', 'Mood stability'],
          },
          'coconut': {
            description: 'Coconut\'s tropical essence amplifies the playful, vacation-like energy of Orange Calcite and Sweet Orange.',
            ritual: 'Apply before leisure activities or weekends. Creates a "mental vacation" anytime.',
            benefits: ['Vacation mindset', 'Playful relaxation', 'Tropical bliss'],
          },
        },
      },
      {
        id: 'sunstone',
        name: 'Sunstone',
        technicalName: 'Feldspar with hematite inclusions',
        chakra: 'solar-plexus',
        element: 'fire',
        color: '#f4a460',
        description: 'The stone of leadership, independence, and good fortune',
        energy: 'Empowering, lucky, radiant',
        properties: ['Leadership', 'Independence', 'Good luck', 'Personal power'],
        synergyTitle: 'The Radiant Leader',
        synergyDescription: 'Sunstone and Sweet Orange activate the solar plexus with radiant confidence and magnetic charm. This pairing is perfect for those stepping into leadership roles, giving presentations, or anytime you need to shine your brightest.',
        ritual: 'Apply to solar plexus (upper abdomen) before important meetings or presentations. Stand tall and radiate your authentic power.',
        benefits: ['Confidence boost', 'Leadership presence', 'Personal power', 'Optimistic outlook'],
        frequency: '396 Hz - The liberation frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba supports Sunstone and Sweet Orange in building lasting confidence that feels authentic, not forced.',
            ritual: 'Apply daily to solar plexus while affirming your worth and capabilities.',
            benefits: ['Authentic confidence', 'Sustained empowerment', 'Natural leadership'],
          },
          'apricot-kernel': {
            description: 'Apricot kernel\'s gentle confidence-building combines with Sunstone and Sweet Orange for nurturing self-assurance.',
            ritual: 'Use before situations requiring courage. Apply to chest and breathe deeply.',
            benefits: ['Courageous heart', 'Nurtured confidence', 'Warm empowerment'],
          },
        },
      },
    ],
  },
  
  // --------------------------------------------------------------------------
  // FRANKINCENSE (Boswellia serrata) - India
  // --------------------------------------------------------------------------
  {
    id: 'frankincense',
    handle: 'frankincense-oil',
    commonName: 'Frankincense',
    technicalName: 'Boswellia serrata',
    origin: 'India',
    extractionMethod: 'Steam distilled from resin',
    baseProperties: ['Spiritual', 'Meditative', 'Anti-inflammatory', 'Grounding', 'Sacred'],
    image: '/images/plants/frankincense.jpg',
    imageAttribution: 'Boswellia serrata — Photo by siddarthmachado via iNaturalist (CC-BY)',
    description: 'The sacred tears of the Boswellia tree, harvested from the arid mountains of India. Frankincense has been treasured for over 5,000 years as a pathway to the divine. Its woody, resinous aroma quiets the mind, deepens meditation, and connects you to ancient wisdom. A grounding presence for spiritual practice and inner peace.',
    aroma: 'Resinous, woody, earthy, spicy, with citrus-terpenic notes',
    strengths: ['Meditation aid', 'Spiritual connection', 'Anti-inflammatory', 'Stress relief', 'Skin rejuvenation'],
    recommendedCarrier: 'jojoba',
    sizeInfo: {
      '30ml': { 
        crystals: 12, 
        description: 'Twelve Lapis Lazuli chips open the third eye and crown chakras. The ultimate meditation companion.' 
      },
      '20ml': { 
        crystals: 8, 
        description: 'Eight Clear Quartz chips amplify the sacred frequency of this ancient resin.' 
      },
      '15ml': { 
        crystals: 6, 
        description: 'Six Amethyst chips for portable spiritual practice and prayer.' 
      },
      '10ml': { 
        crystals: 4, 
        description: 'Four Lapis Lazuli chips for on-the-go mindfulness.' 
      },
      '5ml': { 
        crystals: 2, 
        description: 'Two Clear Quartz chips—an introduction to sacred Frankincense.' 
      },
    },
    crystalPairings: [
      {
        id: 'lapis-lazuli',
        name: 'Lapis Lazuli',
        technicalName: 'Lazurite with calcite and pyrite',
        chakra: 'third-eye',
        element: 'air',
        color: '#1e3a8a',
        description: 'The stone of wisdom and spiritual insight',
        energy: 'Insightful, truthful, expansive',
        properties: ['Intuition', 'Wisdom', 'Truth', 'Spiritual insight'],
        synergyTitle: 'The Ancient Seer',
        synergyDescription: 'Lapis Lazuli and Frankincense open the third eye and crown chakras, creating a portal to higher consciousness. This sacred pairing has been used for millennia in spiritual ceremonies, meditation, and accessing divine wisdom.',
        ritual: 'Apply to third eye and crown before meditation or prayer. Inhale deeply as you connect to ancient wisdom and inner vision.',
        benefits: ['Deep meditation', 'Spiritual insight', 'Inner vision', 'Truth seeking'],
        frequency: '741 Hz - The awakening frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba allows Lapis Lazuli and Frankincense to penetrate deeply, creating lasting spiritual connection and skin nourishment.',
            ritual: 'Apply to third eye, wrists, and heart before spiritual practice. The jojoba carries the sacred energy deep into your being.',
            benefits: ['Deep spiritual work', 'Lasting meditation support', 'Nourished skin'],
          },
          'fractionated-coconut': {
            description: 'Fractionated coconut provides a neutral base that lets Frankincense and Lapis Lazuli shine in their purest form.',
            ritual: 'Use for anointing before sacred ceremonies or deep meditation. The lightweight carrier allows quick absorption.',
            benefits: ['Quick absorption', 'Pure spiritual connection', 'Clean application'],
          },
        },
      },
      {
        id: 'clear-quartz',
        name: 'Clear Quartz',
        technicalName: 'Pure silicon dioxide',
        chakra: 'crown',
        element: 'air',
        color: '#e8e8e8',
        description: 'The master healer and energy amplifier',
        energy: 'Amplifying, clarifying, harmonizing',
        properties: ['Amplification', 'Clarity', 'Healing', 'Energy work'],
        synergyTitle: 'The Master Amplifier',
        synergyDescription: 'Clear Quartz amplifies the spiritual properties of Frankincense tenfold. This pairing is the ultimate tool for energy workers, healers, and anyone seeking to amplify their intentions and spiritual practice.',
        ritual: 'Apply to any chakra needing attention while setting clear intentions. The quartz amplifies both the oil and your intention.',
        benefits: ['Intention amplification', 'Energy clearing', 'Chakra balancing', 'Manifestation support'],
        frequency: '432 Hz - The universal healing frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba and Clear Quartz create a stable, lasting foundation for Frankincense energy to work throughout the day.',
            ritual: 'Apply to pulse points while holding specific intentions. Reapply throughout the day to maintain energetic alignment.',
            benefits: ['Sustained intention', 'All-day energy work', 'Consistent amplification'],
          },
          'sweet-almond': {
            description: 'Sweet almond adds nurturing warmth to the Clear Quartz-Frankincense pairing, making spiritual work feel safe and supported.',
            ritual: 'Use during self-healing sessions. Massage into heart and solar plexus while sending healing energy.',
            benefits: ['Nurtured healing', 'Supported energy work', 'Gentle amplification'],
          },
        },
      },
      {
        id: 'amethyst',
        name: 'Amethyst',
        technicalName: 'Silicon dioxide with iron',
        chakra: 'crown',
        element: 'air',
        color: '#9966cc',
        description: 'The stone of spiritual wisdom and peace',
        energy: 'Calming, protective, clarifying',
        properties: ['Spiritual wisdom', 'Peace', 'Protection', 'Intuition'],
        synergyTitle: 'The Sacred Peace',
        synergyDescription: 'Amethyst and Frankincense create a sanctuary of spiritual peace and protection. This calming yet elevating combination soothes the mind while opening higher consciousness—perfect for prayer, sleep, or any time you need divine connection.',
        ritual: 'Apply to temples, wrists, and heart before sleep or prayer. Allow the sacred peace to wash over you.',
        benefits: ['Spiritual peace', 'Sleep support', 'Divine connection', 'Mental clarity'],
        frequency: '852 Hz - The spiritual order frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba provides a gentle, lasting base for Amethyst and Frankincense to work their calming magic through the night.',
            ritual: 'Apply to pulse points and temples before bed. Place hands on heart and drift into peaceful sleep.',
            benefits: ['Restful sleep', 'Dream clarity', 'Overnight spiritual nourishment'],
          },
          'apricot-kernel': {
            description: 'Apricot kernel\'s heart-centered warmth complements Amethyst and Frankincense for gentle spiritual comfort.',
            ritual: 'Use during evening wind-down or prayer. Apply to heart and third eye with reverence.',
            benefits: ['Heart-centered peace', 'Gentle spiritual comfort', 'Emotional calm'],
          },
        },
      },
    ],
  },
  
  // --------------------------------------------------------------------------
  // PEPPERMINT (Mentha piperita) - India, Organic, Whole plant steam distilled
  // --------------------------------------------------------------------------
  {
    id: 'peppermint',
    handle: 'peppermint-oil',
    commonName: 'Peppermint',
    technicalName: 'Mentha piperita',
    origin: 'India',
    extractionMethod: 'Steam distilled from whole plant',
    baseProperties: ['Cooling', 'Energizing', 'Digestive support', 'Mental clarity', 'Pain relief'],
    image: '/images/plants/peppermint.jpg',
    imageAttribution: 'Mentha piperita — Photo by alex_abair via iNaturalist (CC-BY)',
    description: 'Cool crystalline clarity from the Indian highlands. Our certified organic Peppermint is distilled from the whole plant to capture the full spectrum of menthol magic. One breath awakens the senses, clears mental fog, and brings sharp focus. The ultimate reset button for mind and body.',
    aroma: 'Sharp, cooling, minty, fresh, penetrating',
    strengths: ['Mental focus', 'Headache relief', 'Digestive aid', 'Energy boost', 'Cooling relief'],
    recommendedCarrier: 'jojoba',
    sizeInfo: {
      '30ml': { 
        crystals: 12, 
        description: 'Twelve Fluorite chips bring mental order and clarity. The full focus formula.' 
      },
      '20ml': { 
        crystals: 8, 
        description: 'Eight Clear Quartz chips amplify the cooling, clarifying energy.' 
      },
      '15ml': { 
        crystals: 6, 
        description: 'Six Sodalite chips for portable mental clarity and communication.' 
      },
      '10ml': { 
        crystals: 4, 
        description: 'Four Fluorite chips for desk-side focus and concentration.' 
      },
      '5ml': { 
        crystals: 2, 
        description: 'Two Clear Quartz chips—a burst of peppermint clarity.' 
      },
    },
    crystalPairings: [
      {
        id: 'fluorite',
        name: 'Fluorite',
        technicalName: 'Calcium fluoride',
        chakra: 'third-eye',
        element: 'air',
        color: '#9b59b6',
        description: 'The stone of mental order and clarity',
        energy: 'Focusing, organizing, clarifying',
        properties: ['Mental clarity', 'Focus', 'Organization', 'Learning'],
        synergyTitle: 'The Mental Reset',
        synergyDescription: 'Fluorite and Peppermint cut through mental fog like a cold mountain stream. This pairing organizes scattered thoughts, enhances focus, and brings crystalline clarity to complex tasks. The ultimate study and work companion.',
        ritual: 'Apply to temples, wrists, and third eye before demanding mental work. Inhale deeply as the cooling clarity activates your mind.',
        benefits: ['Mental focus', 'Study aid', 'Organized thinking', 'Decision clarity'],
        frequency: '741 Hz - The mental clarity frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba provides sustained release of Peppermint and Fluorite energy, keeping you focused for hours.',
            ritual: 'Apply before work or study sessions. Reapply when mental fatigue sets in.',
            benefits: ['Sustained focus', 'Long-lasting clarity', 'Consistent mental energy'],
          },
          'fractionated-coconut': {
            description: 'Fractionated coconut offers quick absorption for rapid Peppermint-Fluorite mental activation.',
            ritual: 'Use when immediate clarity is needed. Perfect for meetings, exams, or deadlines.',
            benefits: ['Quick activation', 'Rapid clarity', 'Instant refresh'],
          },
        },
      },
      {
        id: 'clear-quartz',
        name: 'Clear Quartz',
        technicalName: 'Pure silicon dioxide',
        chakra: 'crown',
        element: 'air',
        color: '#e8e8e8',
        description: 'The master healer and energy amplifier',
        energy: 'Amplifying, clarifying, energizing',
        properties: ['Amplification', 'Energy', 'Clarity', 'Power'],
        synergyTitle: 'The Energy Surge',
        synergyDescription: 'Clear Quartz amplifies Peppermint\'s natural energizing properties into a powerful surge of vitality. This dynamic pairing banishes fatigue, sharpens awareness, and fuels physical and mental endurance.',
        ritual: 'Apply to temples, wrists, and solar plexus when energy is low. Feel the cooling surge revitalize your entire being.',
        benefits: ['Energy boost', 'Fatigue relief', 'Physical vitality', 'Mental alertness'],
        frequency: '528 Hz - The energy frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba carries Peppermint and Clear Quartz for sustained energy without the crash.',
            ritual: 'Apply in the morning or afternoon slump. The energy lasts for hours.',
            benefits: ['Sustained energy', 'No crash', 'All-day vitality'],
          },
          'sweet-almond': {
            description: 'Sweet almond adds warmth to balance Peppermint\'s cooling with Clear Quartz amplification.',
            ritual: 'Use before physical activity or when needing gentle but potent energy.',
            benefits: ['Balanced energy', 'Warm vitality', 'Grounded alertness'],
          },
        },
      },
      {
        id: 'sodalite',
        name: 'Sodalite',
        technicalName: 'Sodium aluminum silicate with chlorine',
        chakra: 'throat',
        element: 'water',
        color: '#1e3a8a',
        description: 'The stone of communication and truth',
        energy: 'Truthful, communicative, calming',
        properties: ['Communication', 'Truth', 'Calm confidence', 'Self-expression'],
        synergyTitle: 'The Confident Voice',
        synergyDescription: 'Sodalite and Peppermint combine mental clarity with confident communication. This pairing helps you speak your truth with calm authority, making it perfect for presentations, difficult conversations, or any time you need to express yourself clearly.',
        ritual: 'Apply to throat, wrists, and temples before speaking engagements. Inhale confidence, exhale clarity.',
        benefits: ['Confident speaking', 'Clear communication', 'Calm under pressure', 'Truthful expression'],
        frequency: '639 Hz - The communication frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba allows Sodalite and Peppermint to support your voice throughout long presentations or conversations.',
            ritual: 'Apply before important calls, meetings, or speeches. Keep with you for touch-ups.',
            benefits: ['Sustained confidence', 'Enduring clarity', 'Consistent voice support'],
          },
          'apricot-kernel': {
            description: 'Apricot kernel nurtures the throat area while Sodalite and Peppermint boost communication.',
            ritual: 'Massage into throat and chest before speaking. Breathe deeply and speak your truth.',
            benefits: ['Nurtured voice', 'Heart-centered communication', 'Gentle confidence'],
          },
        },
      },
    ],
  },
  
  // --------------------------------------------------------------------------
  // GRAPEFRUIT (Citrus paradisi) - Pink Grapefruit, Cold pressed peels
  // --------------------------------------------------------------------------
  {
    id: 'grapefruit',
    handle: 'grapefruit-oil',
    commonName: 'Pink Grapefruit',
    technicalName: 'Citrus paradisi',
    origin: 'Various',
    extractionMethod: 'Cold pressed from peels',
    baseProperties: ['Uplifting', 'Energizing', 'Cleansing', 'Weight loss support', 'Refresh'],
    image: '/images/plants/grapefruit.jpg',
    imageAttribution: 'Citrus paradisi — Photo via iNaturalist (CC-BY)',
    description: 'The zestiest citrus burst for body and spirit. Our Pink Grapefruit captures the tangy-sweet essence of sun-ripened fruit. Its bright, slightly bitter aroma awakens the senses, lifts heavy moods, and invites playfulness back into your day. A refreshing reset button for when life feels too serious.',
    aroma: 'Tangy, sweet, citrusy, fresh, slightly bitter',
    strengths: ['Mood lift', 'Energy boost', 'Cleansing', 'Motivation', 'Playfulness'],
    recommendedCarrier: 'jojoba',
    sizeInfo: {
      '30ml': { 
        crystals: 12, 
        description: 'Twelve Carnelian chips spark creative fire and playful energy. The full zest experience.' 
      },
      '20ml': { 
        crystals: 8, 
        description: 'Eight Sunstone chips radiate confidence and joyful empowerment.' 
      },
      '15ml': { 
        crystals: 6, 
        description: 'Six Peach Moonstone chips for gentle emotional balance and self-love.' 
      },
      '10ml': { 
        crystals: 4, 
        description: 'Four Carnelian chips for portable motivation and creative spark.' 
      },
      '5ml': { 
        crystals: 2, 
        description: 'Two Sunstone chips—a burst of grapefruit confidence.' 
      },
    },
    crystalPairings: [
      {
        id: 'carnelian',
        name: 'Carnelian',
        technicalName: 'Chalcedony variety',
        chakra: 'sacral',
        element: 'fire',
        color: '#ff6b35',
        description: 'The stone of creativity and motivation',
        energy: 'Energizing, creative, confident',
        properties: ['Creativity', 'Motivation', 'Courage', 'Vitality'],
        synergyTitle: 'The Creative Spark',
        synergyDescription: 'Carnelian and Grapefruit ignite the sacral chakra with creative fire and playful motivation. This dynamic pairing gets you moving, creating, and embracing life with enthusiasm. Perfect for when you feel stuck or uninspired.',
        ritual: 'Apply to sacral chakra (lower abdomen) and wrists when needing creative inspiration. Move your body as you inhale the energizing aroma.',
        benefits: ['Creative inspiration', 'Motivation boost', 'Physical energy', 'Creative confidence'],
        frequency: '417 Hz - The creative frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba provides sustained release of Carnelian and Grapefruit energy for all-day creative flow.',
            ritual: 'Apply before creative projects or workouts. The energy carries you through.',
            benefits: ['Sustained creativity', 'Long-lasting motivation', 'Consistent energy'],
          },
          'grapeseed': {
            description: 'Grapeseed\'s lightness matches the uplifting energy of Carnelian and Grapefruit perfectly.',
            ritual: 'Use for quick energy boosts before activities. Lightweight and fast-absorbing.',
            benefits: ['Quick absorption', 'Light energy', 'Rapid motivation'],
          },
        },
      },
      {
        id: 'sunstone',
        name: 'Sunstone',
        technicalName: 'Feldspar with hematite',
        chakra: 'solar-plexus',
        element: 'fire',
        color: '#f4a460',
        description: 'The stone of leadership and good fortune',
        energy: 'Empowering, lucky, radiant',
        properties: ['Leadership', 'Independence', 'Good luck', 'Personal power'],
        synergyTitle: 'The Radiant Leader',
        synergyDescription: 'Sunstone and Grapefruit activate the solar plexus with radiant confidence and magnetic charm. This pairing is perfect for those stepping into their power, leading others, or anytime you need to shine with authentic confidence.',
        ritual: 'Apply to solar plexus (upper abdomen) before important moments. Stand tall and radiate your light.',
        benefits: ['Confidence boost', 'Leadership presence', 'Personal power', 'Magnetic charm'],
        frequency: '396 Hz - The empowerment frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba supports Sunstone and Grapefruit in building lasting, authentic confidence.',
            ritual: 'Apply daily to solar plexus while affirming your worth and capabilities.',
            benefits: ['Authentic confidence', 'Sustained empowerment', 'Natural leadership'],
          },
          'apricot-kernel': {
            description: 'Apricot kernel nurtures while Sunstone and Grapefruit build confidence from within.',
            ritual: 'Use before situations requiring courage and presence. Apply to heart and solar plexus.',
            benefits: ['Nurtured confidence', 'Heart-centered power', 'Warm empowerment'],
          },
        },
      },
      {
        id: 'peach-moonstone',
        name: 'Peach Moonstone',
        technicalName: 'Feldspar with orthoclase',
        chakra: 'sacral',
        element: 'water',
        color: '#ffdab9',
        description: 'The stone of new beginnings and emotional balance',
        energy: 'Nurturing, balancing, renewing',
        properties: ['New beginnings', 'Emotional balance', 'Self-love', 'Gentle change'],
        synergyTitle: 'The Gentle Reset',
        synergyDescription: 'Peach Moonstone and Grapefruit offer a gentle emotional reset that softens harsh transitions. This nurturing pairing supports you through change while maintaining optimism and emotional equilibrium.',
        ritual: 'Apply to heart and sacral chakra during times of change or stress. Breathe in gentle renewal.',
        benefits: ['Emotional balance', 'Gentle transitions', 'Self-compassion', 'Renewed optimism'],
        frequency: '528 Hz - The renewal frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba provides sustained emotional support as Peach Moonstone and Grapefruit guide gentle change.',
            ritual: 'Apply daily during transition periods. The support is constant and gentle.',
            benefits: ['Sustained balance', 'Gentle support', 'Lasting renewal'],
          },
          'sweet-almond': {
            description: 'Sweet almond adds deep nurturing to Peach Moonstone and Grapefruit for profound emotional comfort.',
            ritual: 'Use during emotional processing or self-care rituals. Massage into heart area.',
            benefits: ['Deep comfort', 'Heart-nurtured healing', 'Profound self-love'],
          },
        },
      },
    ],
  },
  
  // --------------------------------------------------------------------------
  // CEDARWOOD ATLAS (Cedrus atlantica) - Morocco, Organic, Steam distilled wood
  // --------------------------------------------------------------------------
  {
    id: 'cedarwood',
    handle: 'cedarwood-oil',
    commonName: 'Cedarwood Atlas',
    technicalName: 'Cedrus atlantica',
    origin: 'Morocco',
    extractionMethod: 'Steam distilled from wood',
    baseProperties: ['Grounding', 'Calming', 'Insect repellent', 'Respiratory support', 'Steadying'],
    image: '/images/plants/cedarwood.jpg',
    imageAttribution: 'Cedrus atlantica — Photo by mourad-harzallah via iNaturalist (CC-BY)',
    description: 'Ancient wisdom from the Moroccan Atlas Mountains. Our certified organic Cedarwood Atlas carries the steadfast strength of trees that have stood for centuries. Warm, woody, and deeply grounding—like a forest embrace that centers your spirit and anchors scattered energy.',
    aroma: 'Warm, woody, balsamic, sweet, grounding',
    strengths: ['Grounding', 'Calming anxiety', 'Sleep support', 'Respiratory health', 'Insect repellent'],
    recommendedCarrier: 'jojoba',
    sizeInfo: {
      '30ml': { 
        crystals: 12, 
        description: 'Twelve Red Jasper chips provide deep earth connection and stability. The full forest embrace.' 
      },
      '20ml': { 
        crystals: 8, 
        description: 'Eight Hematite chips offer strong grounding and protective energy.' 
      },
      '15ml': { 
        crystals: 6, 
        description: 'Six Smoky Quartz chips for portable grounding and stress relief.' 
      },
      '10ml': { 
        crystals: 4, 
        description: 'Four Red Jasper chips for on-the-go stability and calm.' 
      },
      '5ml': { 
        crystals: 2, 
        description: 'Two Hematite chips—a touch of forest grounding.' 
      },
    },
    crystalPairings: [
      {
        id: 'red-jasper',
        name: 'Red Jasper',
        technicalName: 'Microcrystalline quartz with iron',
        chakra: 'root',
        element: 'earth',
        color: '#a0522d',
        description: 'The stone of endurance and grounding',
        energy: 'Grounding, stabilizing, nurturing',
        properties: ['Endurance', 'Grounding', 'Stability', 'Nurturing'],
        synergyTitle: 'The Earth Anchor',
        synergyDescription: 'Red Jasper and Cedarwood Atlas create a profound connection to earth energy that steadies and supports. This grounding pairing anchors scattered thoughts, calms anxiety, and provides the stable foundation needed to weather life\'s storms.',
        ritual: 'Apply to feet, legs, and root chakra when feeling ungrounded. Stand barefoot on earth if possible while inhaling the woody aroma.',
        benefits: ['Deep grounding', 'Anxiety relief', 'Steady energy', 'Earth connection'],
        frequency: '396 Hz - The grounding frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba provides lasting carry of Red Jasper and Cedarwood grounding energy throughout the day.',
            ritual: 'Apply to feet and lower legs each morning for all-day grounding.',
            benefits: ['All-day grounding', 'Sustained stability', 'Consistent calm'],
          },
          'coconut': {
            description: 'Coconut enhances the earthy, tropical forest energy of Red Jasper and Cedarwood.',
            ritual: 'Use before sleep or meditation for deep grounding and connection to nature.',
            benefits: ['Deep relaxation', 'Nature connection', 'Tropical grounding'],
          },
        },
      },
      {
        id: 'hematite',
        name: 'Hematite',
        technicalName: 'Iron oxide',
        chakra: 'root',
        element: 'earth',
        color: '#2f2f2f',
        description: 'The stone of protection and grounding',
        energy: 'Protective, grounding, stabilizing',
        properties: ['Protection', 'Grounding', 'Focus', 'Stress absorption'],
        synergyTitle: 'The Protective Shield',
        synergyDescription: 'Hematite and Cedarwood Atlas create a protective shield that grounds and guards. This powerful pairing absorbs negative energy, shields from environmental stress, and provides a stable foundation from which to face challenges.',
        ritual: 'Apply to wrists, ankles, and root chakra before entering stressful environments. Feel the protective shield form.',
        benefits: ['Energy protection', 'Stress absorption', 'Grounded strength', 'Environmental shielding'],
        frequency: '285 Hz - The protection frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba carries Hematite and Cedarwood protection for hours of shielded stability.',
            ritual: 'Apply before work, travel, or crowded places. Reapply when feeling drained.',
            benefits: ['Lasting protection', 'Sustained grounding', 'Consistent shielding'],
          },
          'sweet-almond': {
            description: 'Sweet almond adds nurturing warmth to Hematite and Cedarwood for protected comfort.',
            ritual: 'Use during challenging times when you need both protection and nurturing.',
            benefits: ['Nurtured protection', 'Warm grounding', 'Comforted strength'],
          },
        },
      },
      {
        id: 'smoky-quartz',
        name: 'Smoky Quartz',
        technicalName: 'Silicon dioxide with natural irradiation',
        chakra: 'root',
        element: 'earth',
        color: '#5d4037',
        description: 'The stone of transmutation and grounding',
        energy: 'Transmuting, grounding, detoxifying',
        properties: ['Stress transmutation', 'Detoxification', 'Grounding', 'Letting go'],
        synergyTitle: 'The Stress Transmuter',
        synergyDescription: 'Smoky Quartz and Cedarwood Atlas transmute stress and negative energy into grounded calm. This transformative pairing helps release what no longer serves you while providing the stability to move forward lighter and clearer.',
        ritual: 'Apply to any area holding tension while visualizing stress transforming into grounded peace. Breathe out what you\'re ready to release.',
        benefits: ['Stress transmutation', 'Negative energy release', 'Grounded calm', 'Emotional clearing'],
        frequency: '396 Hz - The transmutation frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba supports Smoky Quartz and Cedarwood in continuous stress transmutation throughout the day.',
            ritual: 'Apply during stressful periods or transitions. Use whenever you need to release and ground.',
            benefits: ['Continuous release', 'Sustained transmutation', 'Ongoing clearing'],
          },
          'apricot-kernel': {
            description: 'Apricot kernel provides gentle support as Smoky Quartz and Cedarwood help release heavy energies.',
            ritual: 'Use during emotional release work or endings. Apply to heart and solar plexus with self-compassion.',
            benefits: ['Gentle release', 'Nurtured clearing', 'Compassionate grounding'],
          },
        },
      },
    ],
  },

  // ============================================================================
  // YLANG YLANG
  // ============================================================================
  {
    id: 'ylang-ylang',
    handle: 'ylang-ylang-oil',
    commonName: 'Ylang Ylang',
    technicalName: 'Cananga odorata',
    origin: 'Madagascar',
    extractionMethod: 'Steam distillation of fresh flowers',
    baseProperties: ['Aphrodisiac', 'Calming', 'Skin balancing', 'Heart-opening', 'Sensual'],
    image: '/images/plants/ylang-ylang.jpg',
    imageAttribution: 'Cananga odorata — Photo via Wikimedia Commons (CC BY-SA 3.0)',
    description: 'The flower of flowers, our certified organic Madagascar Ylang Ylang is harvested at dawn when its intoxicating aroma is most potent. A tropical treasure that opens the heart, soothes the spirit, and awakens sensuality.',
    aroma: 'Rich, sweet, floral with hints of jasmine and banana',
    strengths: ['Emotional balance', 'Aphrodisiac', 'Skin care', 'Heart chakra', 'Stress relief'],
    recommendedCarrier: 'jojoba',
    sizeInfo: {
      '30ml': { 
        crystals: 12, 
        description: 'Twelve Rose Quartz chips amplify the heart-opening, sensual energy. The ultimate self-love and romance blend.' 
      },
      '20ml': { 
        crystals: 8, 
        description: 'Eight Peach Moonstone chips for gentle emotional balance and new beginnings.' 
      },
      '15ml': { 
        crystals: 6, 
        description: 'Six Orange Calcite chips bringing joy, playfulness and creative spark.' 
      },
      '10ml': { 
        crystals: 4, 
        description: 'Four Rose Quartz chips—portable heart healing for your daily journey.' 
      },
      '5ml': { 
        crystals: 2, 
        description: 'Two Rose Quartz chips—an introduction to Ylang Ylang sensual embrace.' 
      },
    },
    crystalPairings: [
      {
        id: 'rose-quartz',
        name: 'Rose Quartz',
        technicalName: 'Silicon dioxide with titanium',
        chakra: 'heart',
        element: 'water',
        color: '#ffb6c1',
        description: 'The stone of unconditional love and compassion',
        energy: 'Nurturing, gentle, heart-opening',
        properties: ['Emotional healing', 'Self-love', 'Relationship harmony', 'Grief support'],
        synergyTitle: 'The Heart Opener',
        synergyDescription: 'Rose Quartz and Ylang Ylang create the ultimate heart-opening synergy. This pairing dissolves emotional barriers, nurtures self-acceptance, and invites deep, authentic connection. Perfect for healing heart wounds and awakening sensuality.',
        ritual: 'Apply to heart center and pulse points during self-care rituals. Inhale deeply while affirming: "I am worthy of love and pleasure."',
        benefits: ['Heart chakra healing', 'Self-love boost', 'Emotional release', 'Sensual awakening'],
        frequency: '528 Hz - The love frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba extends Rose Quartz and Ylang Ylang heart-opening effects for hours of loving energy.',
            ritual: 'Apply before intimacy, dates, or self-love rituals. Let the synergy open your heart.',
            benefits: ['Extended heart energy', 'Deep emotional opening', 'Lasting sensuality'],
          },
          'fractionated-coconut': {
            description: 'Coconut lets the pure floral notes shine while carrying Rose Quartz gentle love.',
            ritual: 'Use as a light perfume for daily heart-centered presence and attraction.',
            benefits: ['Light floral presence', 'Daily heart opening', 'Subtle attraction'],
          },
        },
      },
      {
        id: 'peach-moonstone',
        name: 'Peach Moonstone',
        technicalName: 'Feldspar with orthoclase',
        chakra: 'sacral',
        element: 'water',
        color: '#ffdab9',
        description: 'The stone of new beginnings and emotional balance',
        energy: 'Nurturing, balancing, renewing',
        properties: ['New beginnings', 'Emotional balance', 'Self-love', 'Gentle change'],
        synergyTitle: 'The Sensual Embrace',
        synergyDescription: 'Peach Moonstone and Ylang Ylang weave a gentle embrace that balances emotions and awakens feminine sensuality. This nurturing pairing supports emotional transitions, soothes anxiety with depression, and invites pleasure without guilt.',
        ritual: 'Apply to sacral and heart chakras during moon rituals or times of change. Allow the synergy to nurture your emotional body.',
        benefits: ['Emotional balance', 'Feminine awakening', 'Transition support', 'Sensual confidence'],
        frequency: '639 Hz - The heart frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba provides sustained release of Peach Moonstone and Ylang Ylang balancing energy.',
            ritual: 'Use during PMS, hormonal shifts, or emotional transitions. Apply with self-compassion.',
            benefits: ['Hormonal harmony', 'Sustained balance', 'Gentle transitions'],
          },
          'fractionated-coconut': {
            description: 'Coconut offers quick-absorbing support for Peach Moonstone and Ylang Ylang emotional needs.',
            ritual: 'Apply when feeling overwhelmed or anxious. Quick emotional reset.',
            benefits: ['Fast relief', 'Light emotional support', 'Rapid balancing'],
          },
        },
      },
      {
        id: 'orange-calcite',
        name: 'Orange Calcite',
        technicalName: 'Calcium carbonate',
        chakra: 'sacral',
        element: 'fire',
        color: '#ffa500',
        description: 'The stone of playfulness and emotional balance',
        energy: 'Playful, balancing, uplifting',
        properties: ['Emotional balance', 'Playfulness', 'Optimism', 'Stress relief'],
        synergyTitle: 'The Joyful Seduction',
        synergyDescription: 'Orange Calcite and Ylang Ylang spark joy and playfulness while maintaining deep sensual undertones. This uplifting pairing dispels depression, ignites creative passion, and reminds you that pleasure is your birthright.',
        ritual: 'Apply to sacral chakra before creative work, dancing, or playful activities. Let joy and sensuality flow together.',
        benefits: ['Joyful sensuality', 'Creative passion', 'Depression relief', 'Playful confidence'],
        frequency: '417 Hz - The transformation frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba carries Orange Calcite and Ylang Ylang joyful energy for extended creative sessions.',
            ritual: 'Use during creative projects, performances, or anytime you need sustained inspiration.',
            benefits: ['Sustained creativity', 'Lasting joy', 'Ongoing inspiration'],
          },
          'fractionated-coconut': {
            description: 'Coconut provides light, quick support for Orange Calcite and Ylang Ylang spontaneous moments.',
            ritual: 'Apply before social events, dates, or anytime you want to radiate playful confidence.',
            benefits: ['Quick confidence', 'Social ease', 'Spontaneous joy'],
          },
        },
      },
    ],
  },

  // ============================================================================
  // ROSEMARY CT CINEOLE
  // ============================================================================
  {
    id: 'rosemary',
    handle: 'rosemary-oil',
    commonName: 'Rosemary CT Cineole',
    technicalName: 'Rosmarinus officinalis',
    origin: 'Spain',
    extractionMethod: 'Steam distillation of flowering tops and leaves',
    baseProperties: ['Mental clarity', 'Memory support', 'Respiratory', 'Circulation', 'Focus'],
    image: '/images/plants/rosemary.jpg',
    imageAttribution: 'Rosmarinus officinalis — Photo by anna_c56 via iNaturalist (CC0)',
    description: 'The dew of the sea, our certified organic Spanish Rosemary CT Cineole is distilled from flowering tops and leaves harvested at peak potency. The cineole chemotype offers the safest, most clarifying rosemary experience—perfect for study, work, and mental focus.',
    aroma: 'Fresh, herbaceous, camphoraceous with eucalyptus notes',
    strengths: ['Cognitive enhancement', 'Memory improvement', 'Respiratory support', 'Mental stamina', 'Concentration'],
    recommendedCarrier: 'jojoba',
    sizeInfo: {
      '30ml': { 
        crystals: 12, 
        description: 'Twelve Fluorite chips create a focus sanctuary. The ultimate study and work blend for sustained mental clarity.' 
      },
      '20ml': { 
        crystals: 8, 
        description: 'Eight Clear Quartz chips amplify rosemary cognitive enhancement throughout your day.' 
      },
      '15ml': { 
        crystals: 6, 
        description: 'Six Citrine chips bring sunny confidence and mental vitality to your workspace.' 
      },
      '10ml': { 
        crystals: 4, 
        description: 'Four Fluorite chips—portable focus for students and professionals.' 
      },
      '5ml': { 
        crystals: 2, 
        description: 'Two Clear Quartz chips—an introduction to rosemary mental clarity.' 
      },
    },
    crystalPairings: [
      {
        id: 'fluorite',
        name: 'Fluorite',
        technicalName: 'Calcium fluoride',
        chakra: 'third-eye',
        element: 'air',
        color: '#9b59b6',
        description: 'The stone of mental order and clarity',
        energy: 'Focusing, organizing, clarifying',
        properties: ['Mental clarity', 'Focus', 'Organization', 'Learning'],
        synergyTitle: 'The Mental Architect',
        synergyDescription: 'Fluorite and Rosemary CT Cineole form the ultimate study and work synergy. This pairing organizes scattered thoughts, enhances focus, and supports complex mental tasks. Together they create a structured, clear mental space perfect for learning and productivity.',
        ritual: 'Apply to temples and third eye before studying, working, or any mental task. Inhale deeply while setting your intention for clarity and focus.',
        benefits: ['Enhanced focus', 'Mental organization', 'Learning support', 'Memory retention'],
        frequency: '852 Hz - The intuition frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba extends Fluorite and Rosemary cognitive enhancement for hours of sustained focus.',
            ritual: 'Apply before long work sessions, exams, or study periods. Reapply when mental fatigue sets in.',
            benefits: ['Sustained concentration', 'Extended clarity', 'All-day focus'],
          },
          'fractionated-coconut': {
            description: 'Coconut offers quick-absorbing mental clarity for immediate focus needs.',
            ritual: 'Use for quick mental resets, before meetings, or anytime you need immediate clarity.',
            benefits: ['Quick focus', 'Rapid clarity', 'Immediate alertness'],
          },
        },
      },
      {
        id: 'clear-quartz',
        name: 'Clear Quartz',
        technicalName: 'Pure silicon dioxide',
        chakra: 'crown',
        element: 'air',
        color: '#e8e8e8',
        description: 'The master healer and energy amplifier',
        energy: 'Clarifying, amplifying, harmonizing',
        properties: ['Amplification', 'Clarity', 'Healing', 'Energy'],
        synergyTitle: 'The Amplified Mind',
        synergyDescription: 'Clear Quartz amplifies Rosemary CT Cineole cognitive-enhancing properties to their fullest potential. This pairing creates a powerful mental boost that enhances memory, sharpens focus, and elevates overall cognitive function.',
        ritual: 'Apply to crown and temples before important mental tasks, presentations, or creative work. Visualize your mind becoming crystal clear.',
        benefits: ['Amplified cognition', 'Enhanced memory', 'Mental sharpness', 'Clear thinking'],
        frequency: '963 Hz - The divine frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba carries Clear Quartz amplification with Rosemary for sustained mental enhancement.',
            ritual: 'Use daily for ongoing cognitive support and mental vitality.',
            benefits: ['Daily mental clarity', 'Sustained amplification', 'Ongoing focus'],
          },
          'fractionated-coconut': {
            description: 'Coconut delivers Clear Quartz and Rosemary mental boost quickly for immediate needs.',
            ritual: 'Apply before tests, speeches, or anytime you need your sharpest mental state.',
            benefits: ['Quick mental boost', 'Immediate clarity', 'Rapid amplification'],
          },
        },
      },
      {
        id: 'citrine',
        name: 'Citrine',
        technicalName: 'Silicon dioxide with iron',
        chakra: 'solar-plexus',
        element: 'fire',
        color: '#e4d00a',
        description: 'The stone of abundance and personal power',
        energy: 'Empowering, energizing, abundant',
        properties: ['Confidence', 'Abundance', 'Energy', 'Creativity'],
        synergyTitle: 'The Confident Intellect',
        synergyDescription: 'Citrine and Rosemary CT Cineole combine mental clarity with sunny confidence. This empowering pairing boosts not just focus but also the self-assurance to execute ideas. Perfect for entrepreneurs, leaders, and anyone needing confident mental energy.',
        ritual: 'Apply to solar plexus and temples before important decisions, presentations, or leadership tasks. Affirm: "My mind is sharp and my confidence is strong."',
        benefits: ['Confident focus', 'Mental energy', 'Personal power', 'Leadership clarity'],
        frequency: '528 Hz - The transformation frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba extends Citrine and Rosemary confident energy throughout the workday.',
            ritual: 'Use as a daily empowerment ritual for ongoing professional confidence.',
            benefits: ['Sustained confidence', 'All-day empowerment', 'Consistent clarity'],
          },
          'fractionated-coconut': {
            description: 'Coconut provides quick-absorbing Citrine and Rosemary for immediate confidence needs.',
            ritual: 'Apply before interviews, presentations, or challenging conversations.',
            benefits: ['Quick confidence', 'Immediate empowerment', 'Rapid focus'],
          },
        },
      },
    ],
  },

  // ============================================================================
  // CAMPHOR WHITE
  // ============================================================================
  {
    id: 'camphor-white',
    handle: 'camphor-white-oil',
    commonName: 'Camphor White',
    technicalName: 'Cinnamomum camphora',
    origin: 'China',
    extractionMethod: 'Steam distillation of leaves and branches',
    baseProperties: ['Pain relief', 'Respiratory', 'Circulation', 'Warming', 'Antimicrobial'],
    image: '/images/plants/camphor-white.jpg',
    imageAttribution: 'Cinnamomum camphora — Photo by belvedere04 via iNaturalist (CC-BY)',
    description: 'The intense healer from ancient China, our Camphor White oil delivers powerful warming and penetrating relief. Used for millennia in Traditional Chinese Medicine and temple ceremonies, it brings fierce energy to muscle relief and respiratory support.',
    aroma: 'Intense, medicinal, penetrating, camphoraceous',
    strengths: ['Deep muscle warming', 'Respiratory clearing', 'Circulation boost', 'Pain relief', 'Energetic protection'],
    recommendedCarrier: 'jojoba',
    sizeInfo: {
      '30ml': { 
        crystals: 12, 
        description: 'Twelve Red Jasper chips amplify camphor intense warming and grounding energy. Use sparingly—very potent.' 
      },
      '20ml': { 
        crystals: 8, 
        description: 'Eight Black Tourmaline chips provide protective grounding for this powerful oil.' 
      },
      '15ml': { 
        crystals: 6, 
        description: 'Six Carnelian chips boost circulation and vitality alongside camphor warming action.' 
      },
      '10ml': { 
        crystals: 4, 
        description: 'Four Red Jasper chips—portable warming relief for muscles and congestion.' 
      },
      '5ml': { 
        crystals: 2, 
        description: 'Two Black Tourmaline chips—an introduction to camphor intense energy.' 
      },
    },
    crystalPairings: [
      {
        id: 'red-jasper',
        name: 'Red Jasper',
        technicalName: 'Microcrystalline quartz with iron',
        chakra: 'root',
        element: 'earth',
        color: '#8b0000',
        description: 'The stone of endurance and stability',
        energy: 'Stabilizing, nurturing, strengthening',
        properties: ['Endurance', 'Grounding', 'Stability', 'Nurturing'],
        synergyTitle: 'The Grounded Warrior',
        synergyDescription: 'Red Jasper grounds Camphor White intense energy, creating a stable foundation for deep healing. This pairing delivers powerful warming relief while keeping you centered and strong. Perfect for those who need strength through physical challenges.',
        ritual: 'Apply to areas of pain or congestion while visualizing red healing energy grounding and strengthening you. Use for muscle recovery and respiratory support.',
        benefits: ['Grounded strength', 'Deep warming relief', 'Physical endurance', 'Rooted power'],
        frequency: '396 Hz - The grounding frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba extends Red Jasper and Camphor warming relief for sustained muscle comfort.',
            ritual: 'Apply to sore muscles, joints, or chest congestion. Allow the warming energy to penetrate deeply.',
            benefits: ['Sustained warming', 'Deep muscle relief', 'Extended comfort'],
          },
          'fractionated-coconut': {
            description: 'Coconut delivers quick Red Jasper and Camphor relief for immediate needs.',
            ritual: 'Use when you need rapid warming relief or quick respiratory clearing.',
            benefits: ['Quick relief', 'Rapid warming', 'Immediate action'],
          },
        },
      },
      {
        id: 'black-tourmaline',
        name: 'Black Tourmaline',
        technicalName: 'Complex borosilicate with iron',
        chakra: 'root',
        element: 'earth',
        color: '#1a1a1a',
        description: 'The stone of ultimate protection and grounding',
        energy: 'Protective, purifying, grounding',
        properties: ['Protection', 'Grounding', 'Purification', 'EMF shielding'],
        synergyTitle: 'The Protective Shield',
        synergyDescription: 'Black Tourmaline shields and grounds while Camphor White purifies and penetrates. This powerful pairing creates a protective energetic barrier while delivering intense physical relief. Used in purification rituals across cultures.',
        ritual: 'Apply while visualizing a protective black shield around you. Use for energetic cleansing, protection, and deep physical relief.',
        benefits: ['Energetic protection', 'Deep purification', 'Grounded strength', 'Physical relief'],
        frequency: '396 Hz - The liberation frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba carries Black Tourmaline and Camphor protection and relief throughout the day.',
            ritual: 'Apply before entering challenging environments or when feeling energetically drained.',
            benefits: ['All-day protection', 'Sustained grounding', 'Continuous relief'],
          },
          'fractionated-coconut': {
            description: 'Coconut provides quick Black Tourmaline and Camphor shield for immediate protection.',
            ritual: 'Use for quick energetic clearing or when you need immediate protection and relief.',
            benefits: ['Quick shielding', 'Rapid clearing', 'Immediate protection'],
          },
        },
      },
      {
        id: 'carnelian',
        name: 'Carnelian',
        technicalName: 'Chalcedony with iron oxide',
        chakra: 'sacral',
        element: 'fire',
        color: '#e35e38',
        description: 'The stone of vitality and courage',
        energy: 'Energizing, motivating, courageous',
        properties: ['Vitality', 'Courage', 'Motivation', 'Creativity'],
        synergyTitle: 'The Fiery Vitality',
        synergyDescription: 'Carnelian and Camphor White ignite a powerful fire of vitality and circulation. This dynamic pairing boosts physical energy, warms cold extremities, and stimulates life force. Perfect for those needing an energetic reboot.',
        ritual: 'Apply to sacral chakra and areas needing circulation boost. Visualize orange fire warming and energizing your entire being.',
        benefits: ['Circulation boost', 'Physical vitality', 'Energetic warming', 'Life force activation'],
        frequency: '417 Hz - The transmutation frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba extends Carnelian and Camphor warming vitality for sustained energy.',
            ritual: 'Use for ongoing circulation support or when dealing with chronic coldness or stagnation.',
            benefits: ['Sustained warming', 'Extended vitality', 'Continuous circulation'],
          },
          'fractionated-coconut': {
            description: 'Coconut offers quick Carnelian and Camphor energy for immediate warming needs.',
            ritual: 'Apply when feeling cold, sluggish, or energetically stuck. Quick warming reset.',
            benefits: ['Quick warming', 'Rapid energy', 'Immediate vitality'],
          },
        },
      },
    ],
  },

  // ============================================================================
  // VETIVER
  // ============================================================================
  {
    id: 'vetiver',
    handle: 'vetiver-oil',
    commonName: 'Vetiver',
    technicalName: 'Vetiveria zizanioides',
    origin: 'Haiti/India',
    extractionMethod: 'Steam distillation of roots',
    baseProperties: ['Grounding', 'Sleep support', 'Nervous system calming', 'Skin regeneration', 'Focus'],
    image: '/images/plants/vetiver.jpg',
    imageAttribution: 'Chrysopogon zizanioides — Photo by vorontsovams via iNaturalist (CC0)',
    description: 'The Oil of Tranquility, our Vetiver is steam distilled from deep roots that have anchored the earth for years. A thick, earthy elixir that grounds like no other—bringing the nervous system into deep calm and the spirit into profound stability.',
    aroma: 'Deep, smoky, earthy, woody, sweet-balsamic',
    strengths: ['Deep grounding', 'Sleep enhancement', 'Nervous system support', 'Skin healing', 'Emotional stability'],
    recommendedCarrier: 'jojoba',
    sizeInfo: {
      '30ml': { 
        crystals: 12, 
        description: 'Twelve Smoky Quartz chips create the ultimate grounding sanctuary. Deep sleep and profound earth connection.' 
      },
      '20ml': { 
        crystals: 8, 
        description: 'Eight Hematite chips anchor vetiver energy for all-day stability and focus.' 
      },
      '15ml': { 
        crystals: 6, 
        description: 'Six Red Jasper chips bring grounded strength and endurance to your daily practice.' 
      },
      '10ml': { 
        crystals: 4, 
        description: 'Four Smoky Quartz chips—portable grounding for anxiety and scattered energy.' 
      },
      '5ml': { 
        crystals: 2, 
        description: 'Two Hematite chips—an introduction to vetiver deep earth medicine.' 
      },
    },
    crystalPairings: [
      {
        id: 'smoky-quartz',
        name: 'Smoky Quartz',
        technicalName: 'Silicon dioxide with natural irradiation',
        chakra: 'root',
        element: 'earth',
        color: '#5d4037',
        description: 'The stone of transmutation and grounding',
        energy: 'Transmuting, grounding, detoxifying',
        properties: ['Stress transmutation', 'Detoxification', 'Grounding', 'Letting go'],
        synergyTitle: 'The Deep Earth Anchor',
        synergyDescription: 'Smoky Quartz and Vetiver form the ultimate grounding synergy—like roots reaching deep into the earth. This pairing transmutes stress and anxiety into grounded peace, creating a profound sense of safety and stability. Perfect for those who feel ungrounded, anxious, or disconnected.',
        ritual: 'Apply to feet, legs, and root chakra before sleep or meditation. Visualize roots growing deep into the earth, anchoring you in stability and peace.',
        benefits: ['Deep grounding', 'Stress transmutation', 'Sleep support', 'Emotional stability', 'Earth connection'],
        frequency: '396 Hz - The grounding frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba extends Smoky Quartz and Vetiver grounding energy for hours of sustained calm.',
            ritual: 'Apply before bed for deep sleep, or in the morning for all-day grounded energy.',
            benefits: ['Sustained grounding', 'All-day calm', 'Deep sleep support'],
          },
          'fractionated-coconut': {
            description: 'Coconut delivers quick-absorbing Smoky Quartz and Vetiver for immediate grounding needs.',
            ritual: 'Use for quick anxiety relief or when you need to center yourself rapidly.',
            benefits: ['Quick grounding', 'Rapid centering', 'Immediate calm'],
          },
        },
      },
      {
        id: 'hematite',
        name: 'Hematite',
        technicalName: 'Iron oxide',
        chakra: 'root',
        element: 'earth',
        color: '#2f2f2f',
        description: 'The stone of protection and grounding',
        energy: 'Protective, grounding, stabilizing',
        properties: ['Protection', 'Grounding', 'Focus', 'Stress absorption'],
        synergyTitle: 'The Iron Anchor',
        synergyDescription: 'Hematite and Vetiver create an iron-clad grounding that protects and stabilizes. This powerful pairing absorbs scattered energy, shields from environmental stress, and provides the mental focus that comes from being truly grounded. Ideal for those with ADHD or who feel easily overwhelmed.',
        ritual: 'Apply to wrists, ankles, and base of spine when feeling scattered or ungrounded. Feel the heavy, protective energy anchor you.',
        benefits: ['Mental focus', 'Protection', 'Grounded strength', 'Scattered energy absorption'],
        frequency: '285 Hz - The protection frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba carries Hematite and Vetiver protective grounding for hours of focused stability.',
            ritual: 'Use during work, study, or anytime you need sustained mental clarity and focus.',
            benefits: ['Sustained focus', 'All-day grounding', 'Protected stability'],
          },
          'fractionated-coconut': {
            description: 'Coconut provides quick Hematite and Vetiver grounding for immediate focus needs.',
            ritual: 'Apply before important tasks, meetings, or when you need to quickly center yourself.',
            benefits: ['Quick focus', 'Rapid grounding', 'Immediate protection'],
          },
        },
      },
      {
        id: 'red-jasper',
        name: 'Red Jasper',
        technicalName: 'Microcrystalline quartz with iron',
        chakra: 'root',
        element: 'earth',
        color: '#a0522d',
        description: 'The stone of endurance and stability',
        energy: 'Stabilizing, nurturing, strengthening',
        properties: ['Endurance', 'Grounding', 'Stability', 'Nurturing'],
        synergyTitle: 'The Earth Warrior',
        synergyDescription: 'Red Jasper and Vetiver combine to create the ultimate earth warrior energy—grounded, strong, and enduring. This nurturing pairing provides the stability to face challenges with strength and the endurance to persist through difficulties. Perfect for those needing both grounding and courage.',
        ritual: 'Apply to root chakra and solar plexus before challenging situations. Affirm: "I am grounded. I am strong. I endure."',
        benefits: ['Grounded strength', 'Endurance', 'Emotional stability', 'Courage through grounding'],
        frequency: '396 Hz - The liberation frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba extends Red Jasper and Vetiver warrior energy throughout the day.',
            ritual: 'Use as a daily anchor for ongoing strength and grounded courage.',
            benefits: ['Daily strength', 'Sustained endurance', 'Consistent grounding'],
          },
          'fractionated-coconut': {
            description: 'Coconut offers quick Red Jasper and Vetiver support for immediate grounding needs.',
            ritual: 'Apply when facing challenges or when you need quick access to your inner strength.',
            benefits: ['Quick strength', 'Rapid grounding', 'Immediate courage'],
          },
        },
      },
    ],
  },

  // ============================================================================
  // HO WOOD
  // ============================================================================
  {
    id: 'ho-wood',
    handle: 'ho-wood-oil',
    commonName: 'Ho Wood',
    technicalName: 'Cinnamomum camphora',
    origin: 'China',
    extractionMethod: 'Steam distillation of branches and leaves',
    baseProperties: ['Skin healing', 'Anxiety relief', 'Emotional comfort', 'Immune support', 'Gentle calming'],
    image: '/images/plants/ho-wood.jpg',
    imageAttribution: 'Cinnamomum camphora — Photo by belvedere04 via iNaturalist (CC-BY)',
    description: 'The Gentle Rosewood, our Ho Wood oil is a sustainable alternative to endangered rosewood, distilled from branches and leaves rather than heartwood. With 80-90% linalool, it delivers sweet, floral healing for skin and heart alike.',
    aroma: 'Sweet, floral, woody, rose-like, gentle',
    strengths: ['Skin regeneration', 'Gentle anxiety relief', 'Emotional healing', 'Sensitive skin safe', 'Sustainable sourcing'],
    recommendedCarrier: 'jojoba',
    sizeInfo: {
      '30ml': { 
        crystals: 12, 
        description: 'Twelve Rose Quartz chips create a heart-healing sanctuary. Gentle skin regeneration and emotional comfort.' 
      },
      '20ml': { 
        crystals: 8, 
        description: 'Eight Amethyst chips bring gentle spiritual healing and skin regeneration.' 
      },
      '15ml': { 
        crystals: 6, 
        description: 'Six Green Aventurine chips support heart-centered abundance and skin healing.' 
      },
      '10ml': { 
        crystals: 4, 
        description: 'Four Rose Quartz chips—portable heart healing for daily anxiety relief.' 
      },
      '5ml': { 
        crystals: 2, 
        description: 'Two Amethyst chips—an introduction to ho wood gentle healing.' 
      },
    },
    crystalPairings: [
      {
        id: 'rose-quartz',
        name: 'Rose Quartz',
        technicalName: 'Silicon dioxide with titanium',
        chakra: 'heart',
        element: 'water',
        color: '#ffb6c1',
        description: 'The stone of unconditional love and compassion',
        energy: 'Nurturing, gentle, heart-opening',
        properties: ['Emotional healing', 'Self-love', 'Relationship harmony', 'Grief support'],
        synergyTitle: 'The Gentle Heart Healer',
        synergyDescription: 'Rose Quartz and Ho Wood create a gentle heart-healing synergy that soothes both skin and emotions. This nurturing pairing brings self-acceptance, emotional comfort, and gentle skin regeneration. Perfect for those seeking tender healing.',
        ritual: 'Apply to heart center and areas of skin concern while affirming self-love. Use in gentle self-massage for emotional and physical healing.',
        benefits: ['Heart healing', 'Gentle skin regeneration', 'Emotional comfort', 'Self-love'],
        frequency: '528 Hz - The love frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba extends Rose Quartz and Ho Wood heart-healing for prolonged gentle care.',
            ritual: 'Apply to face and heart daily for ongoing skin and emotional healing.',
            benefits: ['Sustained heart healing', 'Extended skin care', 'Continuous comfort'],
          },
          'fractionated-coconut': {
            description: 'Coconut delivers light, quick-absorbing Rose Quartz and Ho Wood for daily use.',
            ritual: 'Use for quick emotional resets or as a light daily facial oil.',
            benefits: ['Light healing', 'Quick comfort', 'Daily gentle care'],
          },
        },
      },
      {
        id: 'amethyst',
        name: 'Amethyst',
        technicalName: 'Silicon dioxide with iron impurities',
        chakra: 'crown',
        element: 'air',
        color: '#9966cc',
        description: 'The stone of spiritual wisdom and inner peace',
        energy: 'Calming, protective, clarifying',
        properties: ['Stress relief', 'Meditation aid', 'Sleep support', 'Intuition'],
        synergyTitle: 'The Peaceful Healer',
        synergyDescription: 'Amethyst and Ho Wood combine spiritual calm with gentle physical healing. This peaceful pairing soothes anxiety, supports restful sleep, and promotes gentle skin regeneration. Ideal for those who need healing on multiple levels.',
        ritual: 'Apply to temples, crown, and heart before meditation or sleep. Allow the gentle energy to bring peace and healing.',
        benefits: ['Peaceful sleep', 'Anxiety relief', 'Spiritual healing', 'Gentle regeneration'],
        frequency: '852 Hz - The intuition frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba carries Amethyst and Ho Wood peaceful energy throughout the day or night.',
            ritual: 'Use before bed for restful sleep or during the day for calm, clear energy.',
            benefits: ['Sustained peace', 'All-day calm', 'Restful sleep support'],
          },
          'fractionated-coconut': {
            description: 'Coconut provides quick-absorbing Amethyst and Ho Wood for immediate calm.',
            ritual: 'Apply when feeling anxious or overwhelmed for quick gentle relief.',
            benefits: ['Quick calm', 'Rapid relief', 'Immediate peace'],
          },
        },
      },
      {
        id: 'green-aventurine',
        name: 'Green Aventurine',
        technicalName: 'Quartz with fuchsite',
        chakra: 'heart',
        element: 'earth',
        color: '#228b22',
        description: 'The stone of heart-centered abundance',
        energy: 'Compassionate, lucky, healing',
        properties: ['Heart healing', 'Abundance', 'Compassion', 'Well-being'],
        synergyTitle: 'The Abundant Healer',
        synergyDescription: 'Green Aventurine and Ho Wood combine heart healing with abundant well-being. This fortunate pairing supports skin health, emotional balance, and a sense of being blessed. Perfect for those healing their heart while nurturing their skin.',
        ritual: 'Apply to heart and any skin areas while setting intentions for healing and abundance. Use with gratitude.',
        benefits: ['Heart abundance', 'Skin vitality', 'Emotional balance', 'Healing gratitude'],
        frequency: '639 Hz - The heart frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba extends Green Aventurine and Ho Wood abundant healing for sustained well-being.',
            ritual: 'Use daily as a heart-opening, skin-nurturing ritual with abundance intentions.',
            benefits: ['Sustained abundance', 'Ongoing healing', 'Continuous heart opening'],
          },
          'fractionated-coconut': {
            description: 'Coconut offers light Green Aventurine and Ho Wood for quick heart-centering.',
            ritual: 'Apply before social interactions or when you need quick heart alignment.',
            benefits: ['Quick heart opening', 'Rapid centering', 'Light abundance'],
          },
        },
      },
    ],
  },

  // ============================================================================
  // WINTERGREEN
  // ============================================================================
  {
    id: 'wintergreen',
    handle: 'wintergreen-oil',
    commonName: 'Wintergreen',
    technicalName: 'Gaultheria fragrantissima',
    origin: 'Nepal',
    extractionMethod: 'Steam distillation of leaves',
    baseProperties: ['Pain relief', 'Anti-inflammatory', 'Warming', 'Circulation', 'Respiratory'],
    image: '/images/plants/wintergreen.jpg',
    imageAttribution: 'Gaultheria procumbens — Photo by lynnharper via iNaturalist (CC0)',
    description: 'The Pain Reliever, our certified organic Nepalese Wintergreen is a potent powerhouse with 98-100% methyl salicylate. This deeply warming oil penetrates muscles and joints to dissolve pain and inflammation. Use with respect and proper dilution.',
    aroma: 'Sweet, minty, fresh, penetrating, intensely medicinal',
    strengths: ['Deep pain relief', 'Anti-inflammatory', 'Intense warming', 'Muscle recovery', 'Joint comfort'],
    recommendedCarrier: 'jojoba',
    sizeInfo: {
      '30ml': { 
        crystals: 12, 
        description: 'Twelve Red Jasper chips amplify wintergreen warrior energy for deep pain relief. Use with extreme respect—very potent.' 
      },
      '20ml': { 
        crystals: 8, 
        description: 'Eight Garnet chips bring grounding strength and circulation support to this powerful blend.' 
      },
      '15ml': { 
        crystals: 6, 
        description: 'Six Carnelian chips boost warming circulation and physical vitality alongside wintergreen intensity.' 
      },
      '10ml': { 
        crystals: 4, 
        description: 'Four Red Jasper chips—portable warrior strength for pain relief on the go.' 
      },
      '5ml': { 
        crystals: 2, 
        description: 'Two Garnet chips—an introduction to wintergreen potent pain-relieving power.' 
      },
    },
    crystalPairings: [
      {
        id: 'red-jasper',
        name: 'Red Jasper',
        technicalName: 'Microcrystalline quartz with iron',
        chakra: 'root',
        element: 'earth',
        color: '#8b0000',
        description: 'The stone of endurance and stability',
        energy: 'Stabilizing, nurturing, strengthening',
        properties: ['Endurance', 'Grounding', 'Stability', 'Nurturing'],
        synergyTitle: 'The Pain Warrior',
        synergyDescription: 'Red Jasper grounds Wintergreen intense energy, creating a warrior-like strength for facing pain. This pairing brings grounded endurance to physical challenges, supporting the body through discomfort with stable, nurturing strength.',
        ritual: 'Apply to areas of pain while visualizing red healing energy grounding and strengthening you. Use for muscle recovery and joint comfort.',
        benefits: ['Grounded strength', 'Pain endurance', 'Physical stability', 'Warrior energy'],
        frequency: '396 Hz - The grounding frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba extends Red Jasper and Wintergreen pain-relieving warmth for sustained relief.',
            ritual: 'Apply to sore muscles, joints, or areas of chronic pain. Allow deep penetration.',
            benefits: ['Sustained relief', 'Deep warming', 'Extended comfort'],
          },
          'fractionated-coconut': {
            description: 'Coconut delivers quick Red Jasper and Wintergreen relief for immediate pain needs.',
            ritual: 'Use for quick pain relief or when you need rapid warming comfort.',
            benefits: ['Quick relief', 'Rapid warming', 'Immediate action'],
          },
        },
      },
      {
        id: 'garnet',
        name: 'Garnet',
        technicalName: 'Silicate mineral with aluminum',
        chakra: 'root',
        element: 'fire',
        color: '#8b0000',
        description: 'The stone of passion and vitality',
        energy: 'Energizing, regenerating, passionate',
        properties: ['Vitality', 'Passion', 'Regeneration', 'Courage'],
        synergyTitle: 'The Fiery Healer',
        synergyDescription: 'Garnet and Wintergreen ignite a powerful fire of healing and regeneration. This dynamic pairing stimulates circulation, boosts physical vitality, and brings passionate energy to the healing process. Ideal for those needing intense physical support.',
        ritual: 'Apply to areas of pain or poor circulation while visualizing red fire healing and regenerating tissue. Use with intention.',
        benefits: ['Circulation boost', 'Physical regeneration', 'Passionate healing', 'Vitality restoration'],
        frequency: '417 Hz - The transmutation frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba carries Garnet and Wintergreen regenerative fire for sustained healing.',
            ritual: 'Use for ongoing pain management or recovery from physical exertion.',
            benefits: ['Sustained regeneration', 'Extended vitality', 'Continuous healing'],
          },
          'fractionated-coconut': {
            description: 'Coconut offers quick Garnet and Wintergreen energy for immediate physical needs.',
            ritual: 'Apply before physical activity or when you need quick warming relief.',
            benefits: ['Quick vitality', 'Rapid warming', 'Immediate energy'],
          },
        },
      },
      {
        id: 'carnelian',
        name: 'Carnelian',
        technicalName: 'Chalcedony with iron oxide',
        chakra: 'sacral',
        element: 'fire',
        color: '#e35e38',
        description: 'The stone of vitality and courage',
        energy: 'Energizing, motivating, courageous',
        properties: ['Vitality', 'Courage', 'Motivation', 'Creativity'],
        synergyTitle: 'The Courageous Vitality',
        synergyDescription: 'Carnelian and Wintergreen combine to create courageous vitality— the strength to face pain and the energy to heal. This empowering pairing boosts circulation, warms cold areas, and brings the courage needed for physical recovery.',
        ritual: 'Apply to sacral chakra and areas of pain while affirming your strength and vitality. Use for menstrual cramps or lower body pain.',
        benefits: ['Courage through pain', 'Warming vitality', 'Circulation boost', 'Physical empowerment'],
        frequency: '417 Hz - The transformation frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba extends Carnelian and Wintergreen courageous warming for sustained physical support.',
            ritual: 'Use daily for chronic pain or during menstrual cycles for cramp relief.',
            benefits: ['Sustained courage', 'Extended warming', 'Ongoing vitality'],
          },
          'fractionated-coconut': {
            description: 'Coconut provides quick Carnelian and Wintergreen for immediate warming courage.',
            ritual: 'Apply when pain strikes or when you need quick warming relief.',
            benefits: ['Quick courage', 'Rapid warming', 'Immediate relief'],
          },
        },
      },
    ],
  },

  // ============================================================================
  // CYPRESS
  // ============================================================================
  {
    id: 'cypress',
    handle: 'cypress-oil',
    commonName: 'Cypress',
    technicalName: 'Cupressus sempervirens',
    origin: 'Spain',
    extractionMethod: 'Steam distillation of needles and twigs',
    baseProperties: ['Circulation', 'Respiratory', 'Skin toning', 'Emotional release', 'Transitions'],
    image: '/images/plants/cypress.jpg',
    imageAttribution: 'Cupressus sempervirens — Photo by eleftherioskats via iNaturalist (CC-BY)',
    description: 'The Oil of Flow, our certified organic Spanish Cypress has stood tall for millennia as a symbol of eternal life and graceful transition. Distilled from needles and twigs, it brings circulation support, respiratory clearing, and the courage to release and flow forward.',
    aroma: 'Fresh, woody, balsamic, clean, slightly spicy',
    strengths: ['Venous tonic', 'Circulation support', 'Respiratory decongestant', 'Skin astringent', 'Emotional release'],
    recommendedCarrier: 'jojoba',
    sizeInfo: {
      '30ml': { 
        crystals: 12, 
        description: 'Twelve Smoky Quartz chips create a powerful release sanctuary. Deep circulation support and graceful transition.' 
      },
      '20ml': { 
        crystals: 8, 
        description: 'Eight Hematite chips ground cypress flowing energy for stable circulation and strength.' 
      },
      '15ml': { 
        crystals: 6, 
        description: 'Six Clear Quartz chips amplify cypress toning and circulatory effects.' 
      },
      '10ml': { 
        crystals: 4, 
        description: 'Four Smoky Quartz chips—portable release and circulation support.' 
      },
      '5ml': { 
        crystals: 2, 
        description: 'Two Hematite chips—an introduction to cypress grounding flow.' 
      },
    },
    crystalPairings: [
      {
        id: 'smoky-quartz',
        name: 'Smoky Quartz',
        technicalName: 'Silicon dioxide with natural irradiation',
        chakra: 'root',
        element: 'earth',
        color: '#5d4037',
        description: 'The stone of transmutation and grounding',
        energy: 'Transmuting, grounding, detoxifying',
        properties: ['Stress transmutation', 'Detoxification', 'Grounding', 'Letting go'],
        synergyTitle: 'The Flowing Release',
        synergyDescription: 'Smoky Quartz and Cypress create a powerful synergy for release and flow. This pairing helps let go of what no longer serves while maintaining grounded stability. Perfect for life transitions, grief support, and emotional detoxification.',
        ritual: 'Apply to areas of stagnation—physical or emotional—while visualizing grey smoke carrying away what you wish to release. Use for varicose veins and emotional letting go.',
        benefits: ['Emotional release', 'Physical detoxification', 'Grounded flow', 'Transition support'],
        frequency: '396 Hz - The grounding frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba extends Smoky Quartz and Cypress release energy for sustained letting go.',
            ritual: 'Apply to legs for varicose veins or to heart for grief. Allow the energy to flow and release.',
            benefits: ['Sustained release', 'Ongoing flow', 'Continuous detoxification'],
          },
          'fractionated-coconut': {
            description: 'Coconut delivers quick Smoky Quartz and Cypress for immediate release needs.',
            ritual: 'Use when feeling stuck or overwhelmed for quick energetic clearing.',
            benefits: ['Quick release', 'Rapid clearing', 'Immediate flow'],
          },
        },
      },
      {
        id: 'hematite',
        name: 'Hematite',
        technicalName: 'Iron oxide',
        chakra: 'root',
        element: 'earth',
        color: '#2f2f2f',
        description: 'The stone of protection and grounding',
        energy: 'Protective, grounding, stabilizing',
        properties: ['Protection', 'Grounding', 'Focus', 'Stress absorption'],
        synergyTitle: 'The Grounded Flow',
        synergyDescription: 'Hematite grounds Cypress flowing energy, creating stable support for circulation and transitions. This pairing brings strength through change, protecting and grounding while allowing necessary flow. Ideal for those who need to move forward but feel unsteady.',
        ritual: 'Apply to root chakra and legs while affirming your strength through transition. Use for circulatory support and grounded movement forward.',
        benefits: ['Grounded transition', 'Stable circulation', 'Protected flow', 'Strength through change'],
        frequency: '285 Hz - The protection frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba carries Hematite and Cypress protective grounding throughout the day.',
            ritual: 'Use daily during transitions or for ongoing circulatory support.',
            benefits: ['Daily grounding', 'Sustained protection', 'Continuous support'],
          },
          'fractionated-coconut': {
            description: 'Coconut provides quick Hematite and Cypress grounding for immediate stability.',
            ritual: 'Apply when feeling unsteady or when you need quick grounding during change.',
            benefits: ['Quick grounding', 'Rapid stability', 'Immediate protection'],
          },
        },
      },
      {
        id: 'clear-quartz',
        name: 'Clear Quartz',
        technicalName: 'Pure silicon dioxide',
        chakra: 'crown',
        element: 'air',
        color: '#e8e8e8',
        description: 'The master healer and energy amplifier',
        energy: 'Clarifying, amplifying, harmonizing',
        properties: ['Amplification', 'Clarity', 'Healing', 'Energy'],
        synergyTitle: 'The Amplified Flow',
        synergyDescription: 'Clear Quartz amplifies Cypress circulatory and releasing properties to their fullest potential. This pairing creates enhanced flow—both physical circulation and energetic release. Perfect for those needing maximum support for movement and letting go.',
        ritual: 'Apply to areas needing circulation boost or anywhere you feel stagnant while visualizing crystal clear energy flowing through.',
        benefits: ['Amplified circulation', 'Enhanced release', 'Clear flow', 'Maximum support'],
        frequency: '963 Hz - The divine frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba carries Clear Quartz amplification with Cypress for sustained enhanced flow.',
            ritual: 'Use for ongoing circulatory issues or chronic stagnation.',
            benefits: ['Sustained amplification', 'Extended clarity', 'Ongoing enhanced flow'],
          },
          'fractionated-coconut': {
            description: 'Coconut delivers Clear Quartz and Cypress quickly for immediate amplified support.',
            ritual: 'Apply when you need quick circulatory boost or rapid energetic clearing.',
            benefits: ['Quick amplification', 'Rapid clarity', 'Immediate enhanced flow'],
          },
        },
      },
    ],
  },

  // ============================================================================
  // BASIL CT LINALOOL
  // ============================================================================
  {
    id: 'basil-linalool',
    handle: 'basil-linalool-oil',
    commonName: 'Basil CT Linalool',
    technicalName: 'Ocimum basilicum',
    origin: 'Egypt',
    extractionMethod: 'Steam distillation of flowering heads',
    baseProperties: ['Mental clarity', 'Nervous system calm', 'Respiratory', 'Mood uplift', 'Immune support'],
    image: '/images/plants/basil-linalool.jpg',
    imageAttribution: 'Ocimum basilicum — Photo by leaf0605 via iNaturalist (CC0)',
    description: 'The Sacred Herb, our certified organic Egyptian Basil CT Linalool is distilled from flowering heads at peak potency. With 40-55% linalool, this is the gentlest, safest basil chemotype—bringing mental clarity and heart-opening calm without the toxicity of other basil varieties.',
    aroma: 'Sweet, herbaceous, slightly anise-like, fresh, uplifting',
    strengths: ['Mental clarity', 'Nervous system calm', 'Respiratory support', 'Mood uplift', 'Gentle strength'],
    recommendedCarrier: 'jojoba',
    sizeInfo: {
      '30ml': { 
        crystals: 12, 
        description: 'Twelve Clear Quartz chips amplify basil mental clarity and heart-opening energy. Sacred focus and calm alertness.' 
      },
      '20ml': { 
        crystals: 8, 
        description: 'Eight Amethyst chips bring spiritual clarity and nervous system calm to this gentle powerhouse.' 
      },
      '15ml': { 
        crystals: 6, 
        description: 'Six Citrine chips uplift and energize basil properties for confident mental clarity.' 
      },
      '10ml': { 
        crystals: 4, 
        description: 'Four Clear Quartz chips—portable mental clarity and calm focus.' 
      },
      '5ml': { 
        crystals: 2, 
        description: 'Two Amethyst chips—an introduction to sacred basil gentle wisdom.' 
      },
    },
    crystalPairings: [
      {
        id: 'clear-quartz',
        name: 'Clear Quartz',
        technicalName: 'Pure silicon dioxide',
        chakra: 'crown',
        element: 'air',
        color: '#e8e8e8',
        description: 'The master healer and energy amplifier',
        energy: 'Clarifying, amplifying, harmonizing',
        properties: ['Amplification', 'Clarity', 'Healing', 'Energy'],
        synergyTitle: 'The Amplified Mind',
        synergyDescription: 'Clear Quartz amplifies Basil CT Linalool mental clarity and heart-opening properties to their fullest potential. This pairing creates enhanced focus, mental sharpness, and spiritual clarity. Perfect for study, meditation, or anytime you need amplified calm alertness.',
        ritual: 'Apply to temples, crown, and heart before study, work, or meditation. Visualize crystal clear energy flowing through mind and heart.',
        benefits: ['Amplified clarity', 'Enhanced focus', 'Spiritual clarity', 'Calm alertness'],
        frequency: '963 Hz - The divine frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba extends Clear Quartz and Basil mental amplification for sustained clarity.',
            ritual: 'Use during long study sessions, work projects, or daily for ongoing mental support.',
            benefits: ['Sustained clarity', 'Extended focus', 'Ongoing amplification'],
          },
          'fractionated-coconut': {
            description: 'Coconut delivers quick Clear Quartz and Basil for immediate mental clarity.',
            ritual: 'Apply before tests, presentations, or anytime you need quick mental sharpness.',
            benefits: ['Quick clarity', 'Rapid focus', 'Immediate amplification'],
          },
        },
      },
      {
        id: 'amethyst',
        name: 'Amethyst',
        technicalName: 'Silicon dioxide with iron impurities',
        chakra: 'crown',
        element: 'air',
        color: '#9966cc',
        description: 'The stone of spiritual wisdom and inner peace',
        energy: 'Calming, protective, clarifying',
        properties: ['Stress relief', 'Meditation aid', 'Sleep support', 'Intuition'],
        synergyTitle: 'The Sacred Clarity',
        synergyDescription: 'Amethyst and Basil CT Linalool create sacred clarity—mental sharpness with spiritual depth. This pairing calms nervous tension while maintaining alertness, perfect for meditation, study, or anytime you need peaceful focus. Honors the sacred nature of Tulsi.',
        ritual: 'Apply to third eye and heart before meditation or spiritual practice. Allow the sacred energy to bring clarity and peace.',
        benefits: ['Sacred clarity', 'Peaceful focus', 'Spiritual wisdom', 'Nervous system calm'],
        frequency: '852 Hz - The intuition frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba carries Amethyst and Basil sacred clarity for extended spiritual practice.',
            ritual: 'Use for meditation, prayer, or daily spiritual connection with calm alertness.',
            benefits: ['Sustained sacred clarity', 'Extended peace', 'Ongoing spiritual focus'],
          },
          'fractionated-coconut': {
            description: 'Coconut provides quick Amethyst and Basil for immediate sacred clarity.',
            ritual: 'Apply when you need quick calm focus or before spiritual activities.',
            benefits: ['Quick sacred clarity', 'Rapid peace', 'Immediate spiritual focus'],
          },
        },
      },
      {
        id: 'citrine',
        name: 'Citrine',
        technicalName: 'Silicon dioxide with iron',
        chakra: 'solar-plexus',
        element: 'fire',
        color: '#e4d00a',
        description: 'The stone of abundance and personal power',
        energy: 'Empowering, energizing, abundant',
        properties: ['Confidence', 'Abundance', 'Energy', 'Creativity'],
        synergyTitle: 'The Confident Clarity',
        synergyDescription: 'Citrine and Basil CT Linalool combine mental clarity with confident energy. This uplifting pairing boosts focus while bringing sunny confidence and personal power. Perfect for creative work, presentations, or anytime you need clarity with courage.',
        ritual: 'Apply to solar plexus and temples before creative work, presentations, or challenging tasks. Affirm: "My mind is clear and my confidence is strong."',
        benefits: ['Confident clarity', 'Creative focus', 'Personal power', 'Uplifted alertness'],
        frequency: '528 Hz - The transformation frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba extends Citrine and Basil confident clarity throughout the day.',
            ritual: 'Use as a daily empowerment ritual for ongoing confident mental energy.',
            benefits: ['Sustained confidence', 'All-day clarity', 'Continuous empowerment'],
          },
          'fractionated-coconut': {
            description: 'Coconut offers quick Citrine and Basil for immediate confident clarity.',
            ritual: 'Apply before meetings, creative sessions, or anytime you need quick confidence.',
            benefits: ['Quick confidence', 'Rapid clarity', 'Immediate empowerment'],
          },
        },
      },
    ],
  },

  // ============================================================================
  // OREGANO
  // ============================================================================
  {
    id: 'oregano',
    handle: 'oregano-oil',
    commonName: 'Oregano',
    technicalName: 'Origanum vulgare',
    origin: 'Spain',
    extractionMethod: 'Steam distillation of dried herb',
    baseProperties: ['Antimicrobial', 'Immune support', 'Respiratory', 'Circulation', 'Protection'],
    image: '/images/plants/oregano.jpg',
    imageAttribution: 'Origanum vulgare — Photo by bobwardell via iNaturalist (CC0)',
    description: 'The Mighty Shield, our Spanish Oregano is one of nature most potent antimicrobial defenders. Steam distilled from dried herb with 60-80% carvacrol, it brings fierce immune support, powerful protection, and warrior strength. Use with respect and proper dilution.',
    aroma: 'Strong, spicy, herbaceous, warm, intensely medicinal',
    strengths: ['Potent antimicrobial', 'Broad spectrum defense', 'Immune powerhouse', 'Respiratory clearing', 'Fierce protection'],
    recommendedCarrier: 'jojoba',
    sizeInfo: {
      '30ml': { 
        crystals: 12, 
        description: 'Twelve Black Tourmaline chips create a powerful protective shield. Maximum immune defense and energetic protection.' 
      },
      '20ml': { 
        crystals: 8, 
        description: 'Eight Red Jasper chips ground oregano fiery energy for stable strength and endurance.' 
      },
      '15ml': { 
        crystals: 6, 
        description: 'Six Carnelian chips boost vitality and circulation alongside oregano warming power.' 
      },
      '10ml': { 
        crystals: 4, 
        description: 'Four Black Tourmaline chips—portable protection and immune support.' 
      },
      '5ml': { 
        crystals: 2, 
        description: 'Two Red Jasper chips—an introduction to oregano warrior strength.' 
      },
    },
    crystalPairings: [
      {
        id: 'black-tourmaline',
        name: 'Black Tourmaline',
        technicalName: 'Complex borosilicate with iron',
        chakra: 'root',
        element: 'earth',
        color: '#1a1a1a',
        description: 'The stone of ultimate protection and grounding',
        energy: 'Protective, purifying, grounding',
        properties: ['Protection', 'Grounding', 'Purification', 'EMF shielding'],
        synergyTitle: 'The Protective Shield',
        synergyDescription: 'Black Tourmaline and Oregano create the ultimate protective shield—physical and energetic. This pairing guards against illness, negative energy, and environmental threats. Perfect for immune defense, energetic protection, and establishing strong boundaries.',
        ritual: 'Apply to feet, lower back, and solar plexus while visualizing a black protective shield around you. Use when feeling vulnerable or during illness.',
        benefits: ['Immune protection', 'Energetic shielding', 'Physical defense', 'Boundary strengthening'],
        frequency: '396 Hz - The liberation frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba extends Black Tourmaline and Oregano protection for sustained immune defense.',
            ritual: 'Apply daily during cold/flu season or when around illness. Wear as protective armor.',
            benefits: ['Sustained protection', 'All-day defense', 'Continuous shielding'],
          },
          'fractionated-coconut': {
            description: 'Coconut delivers quick Black Tourmaline and Oregano for immediate protection needs.',
            ritual: 'Use when you feel threatened, exposed to illness, or need quick energetic cleansing.',
            benefits: ['Quick protection', 'Rapid shielding', 'Immediate defense'],
          },
        },
      },
      {
        id: 'red-jasper',
        name: 'Red Jasper',
        technicalName: 'Microcrystalline quartz with iron',
        chakra: 'root',
        element: 'earth',
        color: '#8b0000',
        description: 'The stone of endurance and stability',
        energy: 'Stabilizing, nurturing, strengthening',
        properties: ['Endurance', 'Grounding', 'Stability', 'Nurturing'],
        synergyTitle: 'The Warrior Ground',
        synergyDescription: 'Red Jasper grounds Oregano fiery intensity, creating stable warrior strength. This pairing brings endurance through challenges, grounded power, and the stamina to fight off illness. Ideal for those needing strength during recovery or prolonged defense.',
        ritual: 'Apply to root chakra and feet while affirming your strength and endurance. Use during illness recovery or prolonged stress.',
        benefits: ['Grounded strength', 'Physical endurance', 'Stable power', 'Warrior stamina'],
        frequency: '396 Hz - The grounding frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba extends Red Jasper and Oregano warrior energy for sustained strength.',
            ritual: 'Use throughout illness recovery or during prolonged periods of stress.',
            benefits: ['Sustained strength', 'Extended endurance', 'Ongoing stability'],
          },
          'fractionated-coconut': {
            description: 'Coconut offers quick Red Jasper and Oregano for immediate grounding strength.',
            ritual: 'Apply when you need quick access to your inner warrior and physical resilience.',
            benefits: ['Quick strength', 'Rapid grounding', 'Immediate endurance'],
          },
        },
      },
      {
        id: 'carnelian',
        name: 'Carnelian',
        technicalName: 'Chalcedony with iron oxide',
        chakra: 'sacral',
        element: 'fire',
        color: '#e35e38',
        description: 'The stone of vitality and courage',
        energy: 'Energizing, motivating, courageous',
        properties: ['Vitality', 'Courage', 'Motivation', 'Creativity'],
        synergyTitle: 'The Fiery Defender',
        synergyDescription: 'Carnelian and Oregano ignite a powerful fire of defense and vitality. This dynamic pairing boosts immune response, stimulates circulation, and brings courageous energy to fight off threats. Perfect for those needing active, energetic protection.',
        ritual: 'Apply to solar plexus and lower abdomen while visualizing red fire burning away threats. Use for active immune support.',
        benefits: ['Immune vitality', 'Courageous defense', 'Circulation boost', 'Active protection'],
        frequency: '417 Hz - The transmutation frequency',
        carrierSynergies: {
          'jojoba': {
            description: 'Jojoba extends Carnelian and Oregano fiery defense for sustained active protection.',
            ritual: 'Use daily during active infection or when fighting off illness.',
            benefits: ['Sustained vitality', 'Extended defense', 'Ongoing courage'],
          },
          'fractionated-coconut': {
            description: 'Coconut provides quick Carnelian and Oregano for immediate immune activation.',
            ritual: 'Apply at first sign of illness or when you need quick immune support.',
            benefits: ['Quick activation', 'Rapid defense', 'Immediate vitality'],
          },
        },
      },
    ],
  },
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getOilById(id: string): OilProfile | undefined {
  return OIL_DATABASE.find(oil => oil.id === id)
}

export function getOilByHandle(handle: string): OilProfile | undefined {
  return OIL_DATABASE.find(oil => oil.handle === handle)
}

export function getCrystalById(id: string): Crystal | undefined {
  return ALL_CRYSTALS.find(crystal => crystal.id === id)
}

export function getCrystalPairing(oilId: string, crystalId: string): CrystalPairing | undefined {
  const oil = getOilById(oilId)
  if (!oil) return undefined
  return oil.crystalPairings.find(pairing => pairing.id === crystalId)
}

export function getAllOils(): OilProfile[] {
  return OIL_DATABASE
}

export function getAllCrystals(): Crystal[] {
  return ALL_CRYSTALS
}

export function getSizeInfo(oilId: string, sizeId: string): { crystals: number; description: string } | undefined {
  const oil = getOilById(oilId)
  if (!oil) return undefined
  
  const sizeMap: Record<string, keyof OilProfile['sizeInfo']> = {
    '30ml': '30ml',
    '20ml': '20ml',
    '15ml': '15ml',
    '10ml': '10ml',
    '5ml': '5ml',
  }
  
  const key = sizeMap[sizeId]
  if (!key) return undefined
  
  return oil.sizeInfo[key]
}

// Get all synergies for a specific carrier oil across all oils
export function getSynergiesByCarrier(carrierId: string): Array<{
  oil: OilProfile
  crystal: CrystalPairing
  synergy: { description: string; ritual: string; benefits: string[] }
}> {
  const results: Array<{
    oil: OilProfile
    crystal: CrystalPairing
    synergy: { description: string; ritual: string; benefits: string[] }
  }> = []
  
  for (const oil of OIL_DATABASE) {
    for (const crystal of oil.crystalPairings) {
      if (crystal.carrierSynergies?.[carrierId]) {
        results.push({
          oil,
          crystal,
          synergy: crystal.carrierSynergies[carrierId],
        })
      }
    }
  }
  
  return results
}

// Get total synergy count
export function getTotalSynergyCount(): number {
  // 5 oils × 3 crystals × 5 carrier oils = 75 base combinations
  // Plus the pure essential oil variations = 75 more
  // Total: 150 unique product combinations
  return OIL_DATABASE.length * 3 * 5
}

// Get oils by crystal chakra
export function getOilsByChakra(chakra: Chakra): OilProfile[] {
  return OIL_DATABASE.filter(oil => 
    oil.crystalPairings.some(pairing => pairing.chakra === chakra)
  )
}

// Get oils by element
export function getOilsByElement(element: Element): OilProfile[] {
  return OIL_DATABASE.filter(oil => 
    oil.crystalPairings.some(pairing => pairing.element === element)
  )
}
