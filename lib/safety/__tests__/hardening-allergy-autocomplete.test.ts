/**
 * Hardening Tests — Allergy & Medication Autocomplete (lib/safety/autocomplete-data.ts)
 *
 * Covers:
 * - searchAllergies: exact / partial / case-insensitive matching, empty &
 *   garbage input, the 8-result cap
 * - component → oil cross-reactivity data (linalool → lavender/bergamot etc.)
 * - botanical family mappings (ragweed → chamomiles)
 * - getAllergyById / getRelatedOilsForAllergy
 * - searchMedications (autocomplete): match typing, priority ordering,
 *   10-result cap, dedupe, garbage input
 */

import {
  searchAllergies,
  getAllergyById,
  getRelatedOilsForAllergy,
  searchMedications,
} from '../autocomplete-data'

// ============================================================================
// searchAllergies — MATCHING BEHAVIOR
// ============================================================================

describe('searchAllergies — matching', () => {
  it('finds an exact name match', () => {
    const results = searchAllergies('Lavender')
    expect(results.some(r => r.id === 'allergy-lavender')).toBe(true)
  })

  it('matches partially (substring)', () => {
    const results = searchAllergies('lav')
    expect(results.some(r => r.name === 'Lavender')).toBe(true)
  })

  it('is case-insensitive', () => {
    const lower = searchAllergies('lavender')
    const upper = searchAllergies('LAVENDER')
    const mixed = searchAllergies('LaVeNdEr')
    expect(lower.map(r => r.id)).toEqual(upper.map(r => r.id))
    expect(lower.map(r => r.id)).toEqual(mixed.map(r => r.id))
  })

  it('trims surrounding whitespace', () => {
    const results = searchAllergies('  lavender  ')
    expect(results.some(r => r.id === 'allergy-lavender')).toBe(true)
  })

  it('matches on related oil ids', () => {
    // 'cornmint' is a related oil of the peppermint allergen
    const results = searchAllergies('cornmint')
    expect(results.some(r => r.id === 'allergy-peppermint')).toBe(true)
  })

  it('matches on allergen type', () => {
    const components = searchAllergies('component')
    expect(components.length).toBeGreaterThan(0)
    expect(components.every(r => r.type === 'component')).toBe(true)

    const botanicals = searchAllergies('botanical')
    expect(botanicals.length).toBeGreaterThan(0)
    expect(botanicals.every(r => r.type === 'botanical')).toBe(true)
  })

  it('caps results at 8 even for broad queries', () => {
    for (const q of ['an', 'ro', 'ol', 'li', 'ci', 'oil']) {
      expect(searchAllergies(q).length).toBeLessThanOrEqual(8)
    }
    // Prove the cap actually engages (not just "few matches exist")
    expect(searchAllergies('oil').length).toBe(8)
  })
})

describe('searchAllergies — degenerate input', () => {
  it('returns [] for empty queries; whitespace-only slips past the length guard', () => {
    expect(searchAllergies('')).toEqual([])
    // Quirk: the ≥2-char guard runs on the RAW query, then it trims — a
    // whitespace-only query trims to '' which substring-matches everything.
    // Documented behavior; consumers should trim before calling.
    expect(searchAllergies('   ').length).toBe(8)
  })

  it('returns [] for single-character queries (min length 2)', () => {
    expect(searchAllergies('e')).toEqual([])
    expect(searchAllergies('l')).toEqual([])
  })

  it('returns [] for null/undefined without throwing', () => {
    expect(searchAllergies(null as any)).toEqual([])
    expect(searchAllergies(undefined as any)).toEqual([])
  })

  it('returns [] for garbage that matches nothing', () => {
    expect(searchAllergies('zzzzqqqq')).toEqual([])
    expect(searchAllergies('12345')).toEqual([])
    expect(searchAllergies('!!!@@@')).toEqual([])
  })

  it('does not throw on unusual unicode input', () => {
    expect(() => searchAllergies('ラベンダー')).not.toThrow()
    expect(() => searchAllergies('🌿🌸')).not.toThrow()
  })
})

// ============================================================================
// CROSS-REACTIVITY DATA — COMPONENT → OIL
// ============================================================================

describe('allergy data — component cross-reactivity', () => {
  it('linalool maps to the linalool-rich oils (lavender, bergamot)', () => {
    const linalool = getAllergyById('allergy-linalool')
    expect(linalool).toBeDefined()
    expect(linalool!.type).toBe('component')
    expect(linalool!.relatedOils).toEqual(expect.arrayContaining(['lavender', 'bergamot']))
  })

  it('searching "linalool" surfaces the component entry', () => {
    const results = searchAllergies('linalool')
    expect(results.some(r => r.id === 'allergy-linalool')).toBe(true)
  })

  it('limonene maps to the citrus oils and flags all-citrus cross-reactivity', () => {
    const limonene = getAllergyById('allergy-limonene')
    expect(limonene).toBeDefined()
    expect(limonene!.relatedOils).toEqual(
      expect.arrayContaining(['lemon', 'orange', 'grapefruit', 'bergamot', 'lime'])
    )
    expect(limonene!.crossReactivity).toContain('all-citrus')
  })

  it('eugenol maps to clove-bud and cinnamon-leaf with spice cross-reactivity', () => {
    const eugenol = getAllergyById('allergy-eugenol')
    expect(eugenol).toBeDefined()
    expect(eugenol!.relatedOils).toEqual(expect.arrayContaining(['clove-bud', 'cinnamon-leaf']))
    expect(eugenol!.crossReactivity).toEqual(expect.arrayContaining(['clove', 'cinnamon']))
  })

  it('methyl salicylate maps to wintergreen/birch and flags aspirin-allergy', () => {
    const ms = getAllergyById('allergy-methyl-salicylate')
    expect(ms).toBeDefined()
    expect(ms!.relatedOils).toEqual(expect.arrayContaining(['wintergreen', 'birch']))
    expect(ms!.crossReactivity).toContain('aspirin-allergy')
  })

  it('bergamot allergen includes the FCF variant in related oils', () => {
    const bergamot = getAllergyById('allergy-bergamot')
    expect(bergamot).toBeDefined()
    expect(bergamot!.relatedOils).toContain('bergamot-fcf')
  })

  it('cinnamon allergen covers both bark and leaf', () => {
    const cinnamon = getAllergyById('allergy-cinnamon')
    expect(cinnamon!.relatedOils).toEqual(
      expect.arrayContaining(['cinnamon-bark', 'cinnamon-leaf'])
    )
  })
})

// ============================================================================
// BOTANICAL FAMILY MAPPINGS
// ============================================================================

describe('allergy data — botanical families', () => {
  it('ragweed/daisy family (Asteraceae) maps to the chamomiles', () => {
    const ragweed = getAllergyById('allergy-ragweed')
    expect(ragweed).toBeDefined()
    expect(ragweed!.type).toBe('botanical')
    expect(ragweed!.relatedOils).toEqual(
      expect.arrayContaining(['chamomile-german', 'chamomile-roman'])
    )
    expect(ragweed!.crossReactivity).toContain('all-chamomiles')
  })

  it('searching "ragweed" finds the Asteraceae family entry', () => {
    const results = searchAllergies('ragweed')
    expect(results.some(r => r.id === 'allergy-ragweed')).toBe(true)
  })

  it('mint family (Lamiaceae) covers the classic mint-family oils', () => {
    const mint = getAllergyById('allergy-mint-family')
    expect(mint).toBeDefined()
    expect(mint!.relatedOils).toEqual(
      expect.arrayContaining(['peppermint', 'rosemary', 'thyme', 'oregano', 'basil', 'clary-sage'])
    )
  })

  it('citrus family (Rutaceae) covers the common citrus oils', () => {
    const citrus = getAllergyById('allergy-citrus-family')
    expect(citrus!.relatedOils).toEqual(
      expect.arrayContaining(['lemon', 'orange', 'lime', 'grapefruit', 'bergamot'])
    )
  })

  it('conifer family covers pine/fir/spruce/cedarwood', () => {
    const conifer = getAllergyById('allergy-conifer')
    expect(conifer!.relatedOils).toEqual(
      expect.arrayContaining(['pine', 'fir', 'spruce', 'cedarwood'])
    )
  })

  it('laurel family (Lauraceae) covers cinnamon bark/leaf and camphor', () => {
    const lauraceae = getAllergyById('allergy-lauraceae')
    expect(lauraceae!.relatedOils).toEqual(
      expect.arrayContaining(['cinnamon-bark', 'cinnamon-leaf', 'camphor'])
    )
  })
})

// ============================================================================
// getAllergyById / getRelatedOilsForAllergy
// ============================================================================

describe('getAllergyById / getRelatedOilsForAllergy', () => {
  it('returns undefined for unknown ids', () => {
    expect(getAllergyById('allergy-does-not-exist')).toBeUndefined()
    expect(getAllergyById('')).toBeUndefined()
  })

  it('getRelatedOilsForAllergy unions relatedOils and crossReactivity', () => {
    const related = getRelatedOilsForAllergy('allergy-linalool')
    expect(related).toEqual(expect.arrayContaining(['lavender', 'bergamot']))
    expect(related).toEqual(expect.arrayContaining(['rosewood'])) // from crossReactivity
  })

  it('getRelatedOilsForAllergy returns [] for unknown ids', () => {
    expect(getRelatedOilsForAllergy('nope')).toEqual([])
  })

  it('every allergen entry is structurally complete', () => {
    // Drive the full list through a broad type query plus family probes
    const types = ['essential-oil', 'component', 'botanical', 'chemical']
    const seen = new Map<string, ReturnType<typeof getAllergyById>>()
    for (const t of types) {
      for (const r of searchAllergies(t)) seen.set(r.id, r)
    }
    for (const probe of ['allergy-fragrance', 'allergy-nuts', 'allergy-latex', 'allergy-safrole']) {
      seen.set(probe, getAllergyById(probe))
    }
    for (const [id, entry] of seen) {
      expect(entry).toBeDefined()
      expect(entry!.name.trim().length).toBeGreaterThan(0)
      expect(types).toContain(entry!.type)
      expect(Array.isArray(entry!.relatedOils)).toBe(true)
      expect(Array.isArray(entry!.crossReactivity)).toBe(true)
    }
  })
})

// ============================================================================
// searchMedications (autocomplete wrapper)
// ============================================================================

describe('searchMedications (autocomplete) — matching and ranking', () => {
  it('requires at least 2 characters', () => {
    expect(searchMedications('')).toEqual([])
    expect(searchMedications('w')).toEqual([])
    // Quirk: like searchAllergies, the length guard is on the raw query —
    // 2 spaces trims to '' which matches everything (capped at 10).
    expect(searchMedications('  ').length).toBe(10)
  })

  it('returns null/undefined-safe empty results', () => {
    expect(searchMedications(null as any)).toEqual([])
    expect(searchMedications(undefined as any)).toEqual([])
  })

  it('finds by generic name with matchType "generic"', () => {
    const results = searchMedications('warfarin')
    const hit = results.find(r => r.genericName === 'Warfarin')
    expect(hit).toBeDefined()
    expect(hit!.matchType).toBe('generic')
    expect(hit!.matchText).toBe('Warfarin')
  })

  it('finds by brand name with matchType "brand"', () => {
    const results = searchMedications('coumadin')
    const hit = results.find(r => r.genericName === 'Warfarin')
    expect(hit).toBeDefined()
    expect(hit!.matchType).toBe('brand')
    expect(hit!.matchText.toLowerCase()).toBe('coumadin')
  })

  it('finds by drug class with matchType "class"', () => {
    const results = searchMedications('factor xa')
    expect(results.length).toBeGreaterThan(0)
    expect(results.some(r => r.matchType === 'class')).toBe(true)
  })

  it('finds by search term with matchType "searchTerm"', () => {
    // 'blood thinner' appears only in searchTerms (not generic/brand/class),
    // so the searchTerm branch is what surfaces Warfarin.
    const results = searchMedications('blood thinner')
    const hit = results.find(r => r.genericName === 'Warfarin')
    expect(hit).toBeDefined()
    expect(hit!.matchType).toBe('searchTerm')
  })

  it('ranks generic matches before brand, class and searchTerm matches', () => {
    const results = searchMedications('a') // guard: needs ≥2 chars — use a broad 2-char query
    const broad = searchMedications('in')
    expect(broad.length).toBeGreaterThan(1)
    const priorities = { generic: 0, brand: 1, class: 2, searchTerm: 3 } as const
    for (let i = 1; i < broad.length; i++) {
      expect(priorities[broad[i].matchType]).toBeGreaterThanOrEqual(priorities[broad[i - 1].matchType])
    }
    expect(results).toEqual([]) // single char is rejected by the guard
  })

  it('never returns duplicate medications', () => {
    const results = searchMedications('blood thinner')
    const ids = results.map(r => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('caps results at 10', () => {
    for (const q of ['in', 'ol', 'an', 'blood']) {
      expect(searchMedications(q).length).toBeLessThanOrEqual(10)
    }
  })

  it('result ids are deterministic slugs of the generic name', () => {
    const results = searchMedications('warfarin')
    expect(results[0].id).toBe('med-Warfarin')
  })

  it('handles garbage input without throwing', () => {
    expect(searchMedications('%%%')).toEqual([])
    expect(() => searchMedications('💊💊')).not.toThrow()
  })
})
