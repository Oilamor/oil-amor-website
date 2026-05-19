/**
 * Sanity CMS Client
 * 
 * Fetches content from Sanity with automatic fallback to hardcoded TypeScript data.
 * This allows gradual migration: content exists in Sanity → fetched from CMS,
 * content not yet in Sanity → falls back to local data.
 */

import { createClient, type SanityClient } from '@sanity/client'
// Image URL builder - constructs Sanity CDN URLs without extra dependency
import { env } from '@/env'

// ============================================================================
// CLIENT CONFIGURATION
// ============================================================================

const isPlaceholderCredentials =
  env.SANITY_PROJECT_ID === 'abcdef12' ||
  env.SANITY_API_TOKEN?.startsWith('sk_1234567890')

function createSanityClient(): SanityClient | null {
  if (isPlaceholderCredentials) {
    return null
  }

  try {
    return createClient({
      projectId: env.SANITY_PROJECT_ID,
      dataset: env.SANITY_DATASET || 'production',
      apiVersion: '2023-05-03',
      useCdn: process.env.NODE_ENV === 'production',
      token: env.SANITY_API_TOKEN,
    })
  } catch (err) {
    console.warn('[Sanity] Failed to initialize client:', err)
    return null
  }
}

const client = createSanityClient()

export const sanityClient = {
  /**
   * Fetch from Sanity with automatic fallback to empty array.
   * Callers should merge with local data as needed.
   */
  fetch: async <T = any>(query: string, params?: Record<string, any>): Promise<T> => {
    if (!client) {
      return [] as unknown as T
    }

    try {
      const result = await client.fetch<T>(query, params)
      return result
    } catch (err) {
      console.warn('[Sanity] Query failed:', query, err)
      return [] as unknown as T
    }
  },

  /**
   * Check if Sanity is actually configured with real credentials.
   */
  isConfigured: () => !isPlaceholderCredentials && client !== null,
}

// ============================================================================
// IMAGE URL BUILDER
// ============================================================================

export function urlFor(source: any) {
  if (!source?.asset?._ref) {
    return { url: () => source?.asset?.url || '' }
  }
  // Construct Sanity CDN URL manually
  const ref = source.asset._ref
  const [type, id, dimensions, format] = ref.split('-')
  const projectId = env.SANITY_PROJECT_ID
  const dataset = env.SANITY_DATASET || 'production'
  const baseUrl = `https://cdn.sanity.io/images/${projectId}/${dataset}/${id}-${dimensions}.${format}`
  return {
    url: () => baseUrl,
    width: (w: number) => ({ url: () => `${baseUrl}?w=${w}` }),
    height: (h: number) => ({ url: () => `${baseUrl}?h=${h}` }),
    format: (f: string) => ({ url: () => `${baseUrl}?fm=${f}` }),
  }
}

// ============================================================================
// COMMON GROQ QUERIES
// ============================================================================

export const oilQuery = `*[_type == "oil" && defined(slug.current)] | order(title asc) {
  _id,
  title,
  "slug": slug.current,
  botanicalName,
  commonName,
  origin,
  description,
  price,
  category,
  benefits,
  "mainImage": mainImage.asset->url,
  featured,
  badge,
  "crystal": crystal->{ name, property, color },
  therapeuticProperties,
  botanicalOrigin,
  extractionMethod,
  safetyNotes,
  olfactoryProfile
}`

export const crystalQuery = `*[_type == "crystal"] | order(name asc) {
  _id,
  name,
  property,
  color,
  "image": image.asset->url,
  description,
  chakra,
  element,
  zodiac
}`

export const synergyContentQuery = `*[_type == "synergyContent" && defined(slug.current)] {
  _id,
  title,
  "slug": slug.current,
  "oil": oil->{ "slug": slug.current, title },
  "crystal": crystal->{ name },
  story,
  ritual,
  pairingNotes,
  emotionalProfile,
  spiritualProfile,
  physicalProfile
}`

export const pageQuery = `*[_type == "page" && slug.current == $slug][0] {
  _id,
  title,
  "slug": slug.current,
  metaTitle,
  metaDescription,
  content
}`
