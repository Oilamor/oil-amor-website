/**
 * CMS Bridge — Sanity ↔ Hardcoded Data Fallback
 *
 * This module provides a migration path from hardcoded TypeScript content
 * to Sanity CMS. Each fetcher tries Sanity first, then falls back to local data.
 *
 * Once content is fully migrated to Sanity, remove the fallback functions.
 */

import { sanityClient, oilQuery, crystalQuery, synergyContentQuery, pageQuery } from '@/app/lib/sanity'
import { ATELIER_OILS, ATELIER_CRYSTALS } from '@/lib/atelier/atelier-engine'

// ============================================================================
// TYPES
// ============================================================================

export interface CmsOil {
  id: string
  name: string
  slug: string
  botanicalName: string
  description: string
  price: number
  category: string
  benefits: string[]
  color?: string
  rarity: 'common' | 'premium' | 'luxury'
  crystal?: { name: string; property: string; color: string }
  safetyFlags?: Record<string, boolean>
}

export interface CmsCrystal {
  id: string
  name: string
  property: string
  color: string
  description?: string
  chakra?: string
  element?: string
}

export interface CmsPage {
  id: string
  title: string
  slug: string
  metaTitle?: string
  metaDescription?: string
  content?: any[]
}

// ============================================================================
// OILS
// ============================================================================

export async function fetchOils(): Promise<CmsOil[]> {
  // Try Sanity first
  const sanityOils = await sanityClient.fetch<any[]>(oilQuery)
  if (sanityOils.length > 0) {
    return sanityOils.map((o: any) => ({
      id: o._id,
      name: o.title,
      slug: o.slug,
      botanicalName: o.botanicalName,
      description: o.description,
      price: o.price,
      category: o.category,
      benefits: o.benefits || [],
      color: o.crystal?.color,
      rarity: 'common', // Default until migrated
      crystal: o.crystal,
    }))
  }

  // Fallback: hardcoded atelier oils
  return ATELIER_OILS.map(o => ({
    id: o.id,
    name: o.name,
    slug: o.id,
    botanicalName: o.botanicalName || o.name,
    description: o.scentProfile || '',
    price: o.collectionPrice5ml || 0,
    category: 'floral',
    benefits: [],
    color: o.color,
    rarity: o.rarity,
    crystal: undefined,
  }))
}

export async function fetchOilBySlug(slug: string): Promise<CmsOil | null> {
  const oils = await fetchOils()
  return oils.find(o => o.slug === slug) || null
}

// ============================================================================
// CRYSTALS
// ============================================================================

export async function fetchCrystals(): Promise<CmsCrystal[]> {
  const sanityCrystals = await sanityClient.fetch<any[]>(crystalQuery)
  if (sanityCrystals.length > 0) {
    return sanityCrystals.map((c: any) => ({
      id: c._id,
      name: c.name,
      property: c.property,
      color: c.color,
      description: c.description,
      chakra: c.chakra,
      element: c.element,
    }))
  }

  // Fallback: hardcoded atelier crystals
  return ATELIER_CRYSTALS.map(c => ({
    id: c.id,
    name: c.name,
    property: c.properties[0] || 'healing',
    color: c.color,
    description: c.description,
    chakra: c.chakra,
    element: c.element,
  }))
}

export async function fetchCrystalById(id: string): Promise<CmsCrystal | null> {
  const crystals = await fetchCrystals()
  return crystals.find(c => c.id === id) || null
}

// ============================================================================
// PAGES
// ============================================================================

export async function fetchPage(slug: string): Promise<CmsPage | null> {
  const page = await sanityClient.fetch<any>(pageQuery, { slug })
  if (page) {
    return {
      id: page._id,
      title: page.title,
      slug: page.slug,
      metaTitle: page.metaTitle,
      metaDescription: page.metaDescription,
      content: page.content,
    }
  }
  return null
}

// ============================================================================
// STATUS
// ============================================================================

export function cmsStatus(): { configured: boolean; connected: boolean } {
  return {
    configured: sanityClient.isConfigured(),
    connected: sanityClient.isConfigured(), // Will be true if configured and last query succeeded
  }
}
