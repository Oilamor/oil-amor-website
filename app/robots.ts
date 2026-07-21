import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/cart/', '/admin', '/account', '/preview', '/components'],
    },
    sitemap: 'https://oilamor.com/sitemap.xml',
  }
}
