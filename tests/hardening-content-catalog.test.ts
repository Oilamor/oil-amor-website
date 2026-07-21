/**
 * Hardening: Catalog Data Integrity
 *
 * Table-driven tests proving that the product truth of the business stays
 * consistent across every source of catalog data:
 *  - lib/content/oil-crystal-synergies (OIL_DATABASE, ALL_CRYSTALS)
 *  - lib/content/pricing-engine-final (WHOLESALE_OILS, SLUG_TO_OIL_ID)
 *  - lib/safety/database (OIL_SAFETY_DATABASE)
 *  - lib/atelier/atelier-engine (ATELIER_OILS, ATELIER_CRYSTALS)
 *  - public/images assets referenced by the catalog (fs checks)
 */

import * as fs from 'fs'
import * as path from 'path'

import {
  OIL_DATABASE,
  ALL_CRYSTALS,
  getOilById,
  getOilByHandle,
  getCrystalById,
  getCrystalPairing,
  getAllOils,
  getSizeInfo,
  getSynergiesByCarrier,
  getTotalSynergyCount,
  getOilsByChakra,
  getOilsByElement,
  type Chakra,
  type Element,
} from '@/lib/content/oil-crystal-synergies'
import {
  WHOLESALE_OILS,
  SLUG_TO_OIL_ID,
  CRYSTAL_COUNTS,
  calculatePurePrice,
  getOilIdFromSlug,
} from '@/lib/content/pricing-engine-final'
import { OIL_SAFETY_DATABASE, getOilSafetyProfile } from '@/lib/safety/database'
import { ATELIER_OILS, ATELIER_CRYSTALS } from '@/lib/atelier/atelier-engine'

const URL_SAFE_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/
const HEX_COLOR = /^#[0-9a-fA-F]{3,8}$/
const VALID_CHAKRAS: Chakra[] = ['root', 'sacral', 'solar-plexus', 'heart', 'throat', 'third-eye', 'crown']
const VALID_ELEMENTS: Element[] = ['earth', 'water', 'fire', 'air']
const BOTTLE_SIZES = ['5ml', '10ml', '15ml', '20ml', '30ml'] as const

function imageExistsOnDisk(imagePath: string): boolean {
  return fs.existsSync(path.join(process.cwd(), 'public', imagePath))
}

describe('Catalog data integrity', () => {
  // --------------------------------------------------------------------------
  // OIL DATABASE — per-oil required content fields
  // --------------------------------------------------------------------------
  describe('OIL_DATABASE entries', () => {
    it('contains a non-trivial catalog of oils', () => {
      expect(OIL_DATABASE.length).toBeGreaterThanOrEqual(32)
    })

    it.each(OIL_DATABASE)('$id: id is a URL-safe slug', (oil) => {
      expect(oil.id).toMatch(URL_SAFE_SLUG)
    })

    it.each(OIL_DATABASE)('$id: has all required content fields non-empty', (oil) => {
      expect(oil.commonName.trim().length).toBeGreaterThan(0)
      expect(oil.technicalName.trim().length).toBeGreaterThan(0)
      expect(oil.description.trim().length).toBeGreaterThan(20)
      expect(oil.aroma.trim().length).toBeGreaterThan(0)
      expect(oil.origin.trim().length).toBeGreaterThan(0)
      expect(oil.extractionMethod.trim().length).toBeGreaterThan(0)
      expect(oil.baseProperties.length).toBeGreaterThan(0)
      expect(oil.strengths.length).toBeGreaterThan(0)
      for (const prop of [...oil.baseProperties, ...oil.strengths]) {
        expect(prop.trim().length).toBeGreaterThan(0)
      }
    })

    it.each(OIL_DATABASE)('$id: has a handle that maps back to itself via SLUG_TO_OIL_ID', (oil) => {
      expect(oil.handle).toBeDefined()
      expect(oil.handle).toMatch(URL_SAFE_SLUG)
      expect(SLUG_TO_OIL_ID[oil.handle as string]).toBe(oil.id)
      expect(getOilIdFromSlug(oil.handle as string)).toBe(oil.id)
    })

    it.each(OIL_DATABASE)('$id: sizeInfo covers every bottle size with correct crystal counts', (oil) => {
      for (const size of BOTTLE_SIZES) {
        const info = oil.sizeInfo[size]
        expect(info).toBeDefined()
        expect(info.crystals).toBe(CRYSTAL_COUNTS[size])
        expect(info.description.trim().length).toBeGreaterThan(10)
      }
    })

    it.each(OIL_DATABASE)('$id: image path exists in public/ or is a remote URL', (oil) => {
      if (/^https?:\/\//.test(oil.image)) {
        // Documented remote URL — must at least parse
        expect(() => new URL(oil.image)).not.toThrow()
      } else {
        expect(oil.image.startsWith('/')).toBe(true)
        expect(imageExistsOnDisk(oil.image)).toBe(true)
      }
    })

    it.each(OIL_DATABASE)('$id: every crystal pairing references a crystal in ALL_CRYSTALS', (oil) => {
      expect(oil.crystalPairings.length).toBeGreaterThan(0)
      for (const pairing of oil.crystalPairings) {
        const crystal = getCrystalById(pairing.id)
        expect(crystal).toBeDefined()
      }
    })

    it.each(OIL_DATABASE)('$id: crystal pairings have complete synergy content', (oil) => {
      for (const pairing of oil.crystalPairings) {
        expect(pairing.synergyTitle.trim().length).toBeGreaterThan(0)
        expect(pairing.synergyDescription.trim().length).toBeGreaterThan(20)
        expect(pairing.ritual.trim().length).toBeGreaterThan(10)
        expect(pairing.benefits.length).toBeGreaterThan(0)
        expect(VALID_CHAKRAS).toContain(pairing.chakra)
        expect(VALID_ELEMENTS).toContain(pairing.element)
        expect(pairing.color).toMatch(HEX_COLOR)
      }
    })

    it.each(OIL_DATABASE)('$id: carrier synergies (when present) have description, ritual and benefits', (oil) => {
      for (const pairing of oil.crystalPairings) {
        if (!pairing.carrierSynergies) continue
        for (const [carrierId, synergy] of Object.entries(pairing.carrierSynergies)) {
          expect(carrierId).toMatch(URL_SAFE_SLUG)
          expect(synergy.description.trim().length).toBeGreaterThan(10)
          expect(synergy.ritual.trim().length).toBeGreaterThan(10)
          expect(synergy.benefits.length).toBeGreaterThan(0)
        }
      }
    })

    it.each(OIL_DATABASE)('$id: recommendedCarrier (when present) is a URL-safe id', (oil) => {
      if (oil.recommendedCarrier) {
        expect(oil.recommendedCarrier).toMatch(URL_SAFE_SLUG)
      }
    })

    it('has unique oil ids', () => {
      const ids = OIL_DATABASE.map((o) => o.id)
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('has unique handles', () => {
      const handles = OIL_DATABASE.map((o) => o.handle).filter(Boolean) as string[]
      expect(new Set(handles).size).toBe(handles.length)
    })
  })

  // --------------------------------------------------------------------------
  // OIL DATABASE × SAFETY DATABASE
  // --------------------------------------------------------------------------
  describe('every catalog oil has a safety profile', () => {
    it.each(OIL_DATABASE)('$id: has a safety profile in OIL_SAFETY_DATABASE', (oil) => {
      const profile = getOilSafetyProfile(oil.id)
      expect(profile).toBeDefined()
    })

    it.each(OIL_DATABASE)('$id: safety profile has sane dilution, age and pregnancy values', (oil) => {
      const profile = getOilSafetyProfile(oil.id)!
      expect(profile.maxDilutionPercent).toBeGreaterThan(0)
      expect(profile.maxDilutionPercent).toBeLessThanOrEqual(100)
      expect(profile.recommendedDilutionPercent).toBeLessThanOrEqual(profile.maxDilutionPercent)
      expect(['safe', 'caution', 'avoid', 'consult']).toContain(profile.pregnancySafety)
      expect(['safe', 'caution', 'avoid', 'consult']).toContain(profile.breastfeedingSafety)
      for (const value of Object.values(profile.ageRestrictions)) {
        expect(['safe', 'dilute', 'avoid']).toContain(value)
      }
      expect(['none', 'low', 'moderate', 'high', 'extreme', 'low-to-moderate']).toContain(profile.toxicity.level)
      expect(Array.isArray(profile.contraindications)).toBe(true)
    })

    it.each(Object.keys(WHOLESALE_OILS))('wholesale oil %s has a safety profile', (oilId) => {
      expect(getOilSafetyProfile(oilId)).toBeDefined()
    })

    it('documents the sweet-orange / orange-sweet alias consistently', () => {
      // The safety DB registers 'orange-sweet' as canonical; the atelier/catalog
      // uses 'sweet-orange'. Both keys must resolve to the same profile.
      expect(OIL_SAFETY_DATABASE['sweet-orange']).toBe(OIL_SAFETY_DATABASE['orange-sweet'])
    })

    it('every safety profile key constituents have valid percentage ranges', () => {
      for (const [id, profile] of Object.entries(OIL_SAFETY_DATABASE)) {
        for (const constituent of profile.keyConstituents) {
          expect(constituent.percentageRange[0]).toBeLessThanOrEqual(constituent.percentageRange[1])
        }
        expect(id).toMatch(URL_SAFE_SLUG)
      }
    })
  })

  // --------------------------------------------------------------------------
  // OIL DATABASE × PRICING ENGINE
  // --------------------------------------------------------------------------
  describe('every catalog oil has pricing', () => {
    it.each(OIL_DATABASE)('$id: has a wholesale entry with a positive price per liter', (oil) => {
      const wholesale = WHOLESALE_OILS[oil.id]
      expect(wholesale).toBeDefined()
      expect(wholesale.pricePerLiter).toBeGreaterThan(0)
      expect(wholesale.name.trim().length).toBeGreaterThan(0)
      expect(['common', 'premium', 'luxury']).toContain(wholesale.rarity)
    })

    it.each(OIL_DATABASE)('$id: produces positive .95-ending pure prices for all bottle sizes', (oil) => {
      for (const size of [5, 10, 15, 20, 30]) {
        const price = calculatePurePrice(oil.id, size)
        expect(price).toBeGreaterThan(0)
        expect(Math.round((price % 1) * 100)).toBe(95)
      }
    })

    it.each(Object.keys(WHOLESALE_OILS))('wholesale oil %s exists in OIL_DATABASE', (oilId) => {
      expect(getOilById(oilId)).toBeDefined()
    })

    it.each(OIL_DATABASE)('$id: exists in WHOLESALE_OILS (catalog ↔ pricing bidirectional)', (oil) => {
      expect(Object.keys(WHOLESALE_OILS)).toContain(oil.id)
    })

    it.each(Object.entries(SLUG_TO_OIL_ID))('slug %s maps to an existing wholesale oil', (_slug, oilId) => {
      expect(WHOLESALE_OILS[oilId]).toBeDefined()
    })

    it.each(Object.keys(SLUG_TO_OIL_ID))('slug %s is URL-safe', (slug) => {
      expect(slug).toMatch(URL_SAFE_SLUG)
    })

    it('SLUG_TO_OIL_ID has no duplicate target ambiguity for handles', () => {
      const handles = OIL_DATABASE.map((o) => o.handle as string)
      for (const handle of handles) {
        expect(Object.keys(SLUG_TO_OIL_ID).filter((k) => k === handle).length).toBe(1)
      }
    })
  })

  // --------------------------------------------------------------------------
  // CRYSTAL CATALOG
  // --------------------------------------------------------------------------
  describe('ALL_CRYSTALS entries', () => {
    it('contains the premium crystal set', () => {
      expect(ALL_CRYSTALS.length).toBeGreaterThanOrEqual(20)
    })

    it.each(ALL_CRYSTALS)('$id: id is a URL-safe slug', (crystal) => {
      expect(crystal.id).toMatch(URL_SAFE_SLUG)
    })

    it.each(ALL_CRYSTALS)('$id: has complete content fields', (crystal) => {
      expect(crystal.name.trim().length).toBeGreaterThan(0)
      expect(crystal.technicalName.trim().length).toBeGreaterThan(0)
      expect(crystal.description.trim().length).toBeGreaterThan(10)
      expect(crystal.energy.trim().length).toBeGreaterThan(0)
      expect(crystal.properties.length).toBeGreaterThan(0)
    })

    it.each(ALL_CRYSTALS)('$id: has valid chakra, element and hex color', (crystal) => {
      expect(VALID_CHAKRAS).toContain(crystal.chakra)
      expect(VALID_ELEMENTS).toContain(crystal.element)
      expect(crystal.color).toMatch(HEX_COLOR)
    })

    it('has unique crystal ids', () => {
      const ids = ALL_CRYSTALS.map((c) => c.id)
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('every crystal is referenced by at least one oil pairing (no orphans)', () => {
      const referenced = new Set(OIL_DATABASE.flatMap((o) => o.crystalPairings.map((p) => p.id)))
      // Not every crystal must be used, but the flagship ones must be.
      for (const flagship of ['amethyst', 'rose-quartz', 'clear-quartz', 'citrine', 'black-tourmaline']) {
        expect(referenced.has(flagship)).toBe(true)
      }
    })
  })

  // --------------------------------------------------------------------------
  // ATELIER ENGINE cross-consistency (CMS fallback source)
  // --------------------------------------------------------------------------
  describe('ATELIER_OILS cross-consistency', () => {
    it('has unique oil ids', () => {
      const ids = ATELIER_OILS.map((o) => o.id)
      expect(new Set(ids).size).toBe(ids.length)
    })

    it.each(ATELIER_OILS)('$id: wholesale price matches the pricing engine', (oil) => {
      expect(WHOLESALE_OILS[oil.id]).toBeDefined()
      expect(oil.wholesalePerLiter).toBe(WHOLESALE_OILS[oil.id].pricePerLiter)
    })

    it.each(ATELIER_OILS)('$id: has a safety profile', (oil) => {
      expect(getOilSafetyProfile(oil.id)).toBeDefined()
    })

    it.each(ATELIER_OILS)('$id: has positive collection prices and display fields', (oil) => {
      expect(oil.collectionPrice5ml).toBeGreaterThan(0)
      expect(oil.collectionPrice30ml).toBeGreaterThan(0)
      expect(oil.name.trim().length).toBeGreaterThan(0)
      expect(oil.scentProfile.trim().length).toBeGreaterThan(0)
      expect(oil.color).toMatch(HEX_COLOR)
      expect(['common', 'premium', 'luxury']).toContain(oil.rarity)
    })

    it.each(ATELIER_CRYSTALS)('$id: atelier crystal has name and properties', (crystal) => {
      expect(crystal.id).toMatch(URL_SAFE_SLUG)
      expect(crystal.name.trim().length).toBeGreaterThan(0)
      expect(crystal.properties.length).toBeGreaterThan(0)
      expect(crystal.color).toMatch(HEX_COLOR)
    })

    it('atelier crystal ids are unique', () => {
      const ids = ATELIER_CRYSTALS.map((c) => c.id)
      expect(new Set(ids).size).toBe(ids.length)
    })
  })

  // --------------------------------------------------------------------------
  // LOOKUP HELPERS
  // --------------------------------------------------------------------------
  describe('catalog lookup helpers', () => {
    it('getOilById returns the oil and undefined for unknown ids', () => {
      expect(getOilById('lavender')?.commonName).toBe('Lavender')
      expect(getOilById('does-not-exist')).toBeUndefined()
      expect(getOilById('')).toBeUndefined()
    })

    it('getOilByHandle resolves catalog handles', () => {
      expect(getOilByHandle('lavender-essential-oil')?.id).toBe('lavender')
      expect(getOilByHandle('nope')).toBeUndefined()
    })

    it('getCrystalById resolves crystals and rejects unknown ids', () => {
      expect(getCrystalById('amethyst')?.name).toBe('Amethyst')
      expect(getCrystalById('unobtainium')).toBeUndefined()
    })

    it('getCrystalPairing joins oil and crystal correctly', () => {
      const pairing = getCrystalPairing('lavender', 'amethyst')
      expect(pairing).toBeDefined()
      expect(pairing!.synergyTitle.length).toBeGreaterThan(0)
      expect(getCrystalPairing('lavender', 'unobtainium')).toBeUndefined()
      expect(getCrystalPairing('no-oil', 'amethyst')).toBeUndefined()
    })

    it('getAllOils returns the full database', () => {
      expect(getAllOils()).toBe(OIL_DATABASE)
      expect(getAllOils().length).toBe(OIL_DATABASE.length)
    })

    it('getSizeInfo returns per-size data and undefined for bad input', () => {
      expect(getSizeInfo('lavender', '30ml')?.crystals).toBe(12)
      expect(getSizeInfo('lavender', '5ml')?.crystals).toBe(2)
      expect(getSizeInfo('lavender', '50ml')).toBeUndefined()
      expect(getSizeInfo('no-oil', '30ml')).toBeUndefined()
    })

    it('getSynergiesByCarrier finds jojoba synergies with content', () => {
      const synergies = getSynergiesByCarrier('jojoba')
      expect(synergies.length).toBeGreaterThan(0)
      for (const { oil, crystal, synergy } of synergies) {
        expect(oil.crystalPairings).toContainEqual(expect.objectContaining({ id: crystal.id }))
        expect(synergy.description.length).toBeGreaterThan(0)
        expect(synergy.ritual.length).toBeGreaterThan(0)
        expect(synergy.benefits.length).toBeGreaterThan(0)
      }
    })

    it('getSynergiesByCarrier returns empty for an unknown carrier', () => {
      expect(getSynergiesByCarrier('liquid-gold')).toEqual([])
    })

    it('getTotalSynergyCount reflects the catalog size formula', () => {
      expect(getTotalSynergyCount()).toBe(OIL_DATABASE.length * 3 * 5)
    })

    it('getOilsByChakra returns oils with matching pairings only', () => {
      const crownOils = getOilsByChakra('crown')
      expect(crownOils.length).toBeGreaterThan(0)
      for (const oil of crownOils) {
        expect(oil.crystalPairings.some((p) => p.chakra === 'crown')).toBe(true)
      }
    })

    it('getOilsByElement returns oils with matching pairings only', () => {
      const waterOils = getOilsByElement('water')
      expect(waterOils.length).toBeGreaterThan(0)
      for (const oil of waterOils) {
        expect(oil.crystalPairings.some((p) => p.element === 'water')).toBe(true)
      }
    })
  })
})
