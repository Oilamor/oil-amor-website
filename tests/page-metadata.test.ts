/**
 * Metadata presence on key public pages and noindex on private/POC segments.
 * Uses dynamic import so env-dependent modules can be neutralised first.
 */

// Keep iron-session/env out of the import graph (ESM transform issues in jest)
jest.mock('@/lib/auth/admin-session', () => ({
  getAdminSession: jest.fn().mockResolvedValue({ isAdmin: true }),
}))

describe('page metadata exports', () => {
  beforeAll(() => {
    // Some layouts transitively import the t3-env schema — skip its validation here
    process.env.SKIP_ENV_VALIDATION = 'true'
  })

  afterAll(() => {
    delete process.env.SKIP_ENV_VALIDATION
  })

  it('homepage exports title and description', async () => {
    const { metadata } = await import('@/app/(shop)/page')
    expect(metadata?.title).toBeTruthy()
    expect(metadata?.description).toBeTruthy()
  })

  it('oils listing exports metadata via its layout', async () => {
    const { metadata } = await import('@/app/(shop)/oils/layout')
    expect(metadata?.title).toBeTruthy()
    expect(metadata?.description).toBeTruthy()
  })

  it('bottles listing exports metadata via its layout', async () => {
    const { metadata } = await import('@/app/(shop)/bottles/layout')
    expect(metadata?.title).toBeTruthy()
    expect(metadata?.description).toBeTruthy()
  })

  it('admin segment is noindex', async () => {
    const { metadata } = await import('@/app/admin/layout')
    expect(metadata?.robots).toMatchObject({ index: false, follow: false })
  })

  it('account segment is noindex', async () => {
    const { metadata } = await import('@/app/(shop)/account/layout')
    expect(metadata?.robots).toMatchObject({ index: false, follow: false })
  })

  it('preview POC segment is noindex', async () => {
    const { metadata } = await import('@/app/preview/lavender/layout')
    expect(metadata?.robots).toMatchObject({ index: false, follow: false })
  })

  it('components POC segment is noindex', async () => {
    const { metadata } = await import('@/app/components/layout')
    expect(metadata?.robots).toMatchObject({ index: false, follow: false })
  })
})
