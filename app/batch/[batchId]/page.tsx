/**
 * Batch Detail Page
 *
 * Public-facing page displayed when a customer scans a bottle's QR code.
 * Shows complete blend recipe, safety info, ingredients, and reorder option.
 *
 * Route: /batch/{batchId}
 */

import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getBatchRecord } from '@/lib/batch/records';
import { buildAtelierReorderUrlFromRecord } from '@/lib/atelier/reorder';
import { ATELIER_OILS, ATELIER_CRYSTALS } from '@/lib/atelier/atelier-engine';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ batchId: string }>;
}

const GOLD = '#c9a227';

function getOilColor(oilId: string): string | undefined {
  return ATELIER_OILS.find(o => o.id === oilId)?.color;
}

function getCrystalBlurb(crystalName?: string): string | undefined {
  if (!crystalName) return undefined;
  const c = ATELIER_CRYSTALS.find(
    c => c.name.toLowerCase() === crystalName.toLowerCase()
  );
  return c?.properties?.join(' • ') || undefined;
}

export async function generateMetadata({ params }: Props) {
  const { batchId } = await params;
  const record = await getBatchRecord(batchId);
  if (!record) return { title: 'Batch Not Found — Oil Amor' };
  return {
    title: `${record.blendName} — Oil Amor Batch ${record.id}`,
    description: `View the complete recipe and safety information for ${record.blendName}. Handcrafted essential oil blend from Oil Amor.`,
  };
}

export default async function BatchPage({ params }: Props) {
  const { batchId } = await params;
  const record = await getBatchRecord(batchId);

  if (!record) {
    notFound();
  }

  const isExpired = new Date() > new Date(record.expiresAt);
  const totalOilMl = record.oils.reduce((sum, o) => sum + o.ml, 0);
  const themeColor = record.themeColor || GOLD;
  const crystalBlurb = getCrystalBlurb(record.crystal);
  const reorderUrl = buildAtelierReorderUrlFromRecord(record);

  return (
    <div className="min-h-screen bg-[#0a080c] text-[#f5f3ef]">
      {/* Header */}
      <header className="border-b border-[#f5f3ef]/10">
        <div className="mx-auto max-w-2xl px-6 py-8">
          <div className="flex items-center gap-3">
            <Image
              src="/images/logo/oil-amor-gold-emblem.webp"
              alt="Oil Amor"
              width={1000}
              height={1000}
              className="w-12 h-12 object-contain"
            />
            <div>
              <h1 className="text-lg font-serif text-[#f5f3ef]">Oil Amor</h1>
              <p className="text-xs text-[#a69b8a]">Handcrafted Essential Oils</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10">
        {/* Batch Info */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2 mb-4">
            {record.isRefill && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#c9a227]/10 border border-[#c9a227]/30 rounded-full text-[#c9a227] text-sm">
                <span>🔁</span>
                <span>Forever Bottle Refill</span>
              </div>
            )}
            {record.isAtelier && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#b87333]/10 border border-[#b87333]/30 rounded-full text-[#d08a4e] text-sm">
                <span>⚗️</span>
                <span>Atelier Crafted</span>
              </div>
            )}
            {record.dominantRarity && record.dominantRarity !== 'common' && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#c9a227]/10 border border-[#c9a227]/30 rounded-full text-[#c9a227] text-sm">
                <span>{record.dominantRarity === 'luxury' ? '♛' : '★'}</span>
                <span>{record.dominantRarity === 'luxury' ? 'Luxury Blend' : 'Premium Blend'}</span>
              </div>
            )}
          </div>

          <h2 className="text-3xl font-serif text-[#f5f3ef] mb-2">
            {record.blendName}
          </h2>

          <div className="flex flex-wrap items-center gap-3 text-sm text-[#a69b8a]">
            <span>{record.size}ml</span>
            <span>•</span>
            <span className="capitalize">{record.mode} Blend</span>
            {record.intendedUse && (
              <>
                <span>•</span>
                <span style={{ color: themeColor }} className="capitalize">{record.intendedUse}</span>
              </>
            )}
          </div>

          {record.isRefill && record.sourceVolume && (
            <p className="mt-2 text-sm text-[#a69b8a]">
              Original {record.sourceVolume}ml blend • Same ratio • Scaled to {record.size}ml
            </p>
          )}
          {record.isRefill && record.originalBatchId && (
            <p className="mt-1 text-sm">
              <a href={`/batch/${record.originalBatchId}`} className="text-[#c9a227] hover:underline">
                View original batch →
              </a>
            </p>
          )}
        </div>

        {/* Safety Score */}
        <div className="mb-8 p-4 bg-[#111] border border-[#f5f3ef]/10 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#a69b8a] uppercase tracking-wide mb-1">Safety Score</p>
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-bold ${
                  record.safetyScore >= 80 ? 'text-green-400' :
                  record.safetyScore >= 60 ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {record.safetyScore}/100
                </span>
                <span className="text-sm text-[#a69b8a] capitalize">{record.safetyRating}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#a69b8a] uppercase tracking-wide mb-1">Batch</p>
              <p className="text-sm font-mono text-[#f5f3ef]">{record.id}</p>
            </div>
          </div>
          {record.needsSafetyReview && (
            <p className="mt-3 text-xs text-yellow-200/80 border-t border-[#f5f3ef]/10 pt-3">
              This blend is awaiting final safety validation. Please review the warnings below before use.
            </p>
          )}
        </div>

        {/* Talisman */}
        {(record.crystal || record.cord) && (
          <section className="mb-8 p-4 bg-[#111] border border-[#f5f3ef]/10 rounded-xl">
            <h3 className="text-xs text-[#a69b8a] uppercase tracking-wide mb-3">Your Talisman</h3>
            <div className="flex flex-wrap gap-6 text-sm">
              {record.crystal && (
                <div>
                  <p className="text-[#f5f3ef]">💎 {record.crystal}</p>
                  {crystalBlurb && (
                    <p className="text-xs text-[#a69b8a] mt-1 max-w-xs">{crystalBlurb}</p>
                  )}
                </div>
              )}
              {record.cord && (
                <div>
                  <p className="text-[#f5f3ef]">🪢 {record.cord}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Ingredients */}
        <section className="mb-8">
          <h3 className="text-lg font-medium text-[#f5f3ef] mb-4 flex items-center gap-2">
            <span>🧪</span> Complete Recipe
          </h3>

          <div className="bg-[#111] border border-[#f5f3ef]/10 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#0a080c]">
                <tr>
                  <th className="text-left px-4 py-3 text-xs text-[#a69b8a] uppercase tracking-wide font-medium">Ingredient</th>
                  <th className="text-right px-4 py-3 text-xs text-[#a69b8a] uppercase tracking-wide font-medium">Amount</th>
                  <th className="text-right px-4 py-3 text-xs text-[#a69b8a] uppercase tracking-wide font-medium">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5f3ef]/5">
                {record.oils.map((oil, i) => {
                  const color = getOilColor(oil.oilId);
                  return (
                    <tr key={i} className="hover:bg-[#f5f3ef]/5">
                      <td className="px-4 py-3 text-[#f5f3ef]">
                        <span className="inline-flex items-center gap-2">
                          {color && (
                            <span
                              className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: color }}
                            />
                          )}
                          {oil.oilName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-[#a69b8a] tabular-nums">{oil.ml.toFixed(1)}ml</td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums" style={{ color: themeColor }}>{oil.percentage.toFixed(1)}%</td>
                    </tr>
                  );
                })}
                {record.carrierOil && (
                  <tr className="italic">
                    <td className="px-4 py-3 text-[#a69b8a]">{record.carrierOil} (carrier)</td>
                    <td className="px-4 py-3 text-right text-[#a69b8a]">—</td>
                    <td className="px-4 py-3 text-right text-[#888]">{record.carrierPercentage?.toFixed(0) || 0}%</td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-[#0a080c]">
                <tr>
                  <td className="px-4 py-3 text-[#f5f3ef] font-medium">Total</td>
                  <td className="px-4 py-3 text-right text-[#f5f3ef] font-medium tabular-nums">
                    {totalOilMl.toFixed(1)}ml oil{record.carrierOil ? ` + carrier` : ''}
                  </td>
                  <td className="px-4 py-3 text-right font-medium" style={{ color: themeColor }}>{record.size}ml bottle</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* Safety Warnings */}
        {record.safetyWarnings.length > 0 && (
          <section className="mb-8">
            <h3 className="text-lg font-medium text-[#f5f3ef] mb-4 flex items-center gap-2">
              <span>⚠️</span> Safety Information
            </h3>
            <div className="space-y-2">
              {record.safetyWarnings.map((warning, i) => (
                <div key={i} className="p-3 bg-[#fffbeb] border border-[#fde047]/30 rounded-lg text-[#854d0e] text-sm">
                  {warning}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Dates */}
        <section className="mb-8 p-4 bg-[#111] border border-[#f5f3ef]/10 rounded-xl">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-[#a69b8a] uppercase tracking-wide mb-1">Created</p>
              <p className="text-[#f5f3ef]">{new Date(record.createdAt).toLocaleDateString('en-AU')}</p>
            </div>
            <div>
              <p className="text-xs text-[#a69b8a] uppercase tracking-wide mb-1">Best Before</p>
              <p className={`${isExpired ? 'text-red-400' : 'text-[#f5f3ef]'}`}>
                {new Date(record.expiresAt).toLocaleDateString('en-AU')}
                {isExpired && ' (Expired)'}
              </p>
            </div>
          </div>
        </section>

        {/* Actions */}
        <section className="flex flex-col sm:flex-row gap-3">
          <a
            href={reorderUrl}
            className="flex-1 px-6 py-3 bg-[#c9a227] text-[#0a080c] rounded-lg text-center font-medium hover:bg-[#c9a227]/90 transition-colors"
          >
            Reorder This Blend
          </a>
          <a
            href="/mixing-atelier"
            className="flex-1 px-6 py-3 bg-[#111] border border-[#c9a227]/40 text-[#c9a227] rounded-lg text-center font-medium hover:bg-[#c9a227]/10 transition-colors"
          >
            Remix in the Atelier
          </a>
          <a
            href="/collections"
            className="flex-1 px-6 py-3 bg-[#111] border border-[#f5f3ef]/10 text-[#f5f3ef] rounded-lg text-center font-medium hover:bg-[#f5f3ef]/5 transition-colors"
          >
            Shop Collection
          </a>
        </section>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-[#f5f3ef]/10 text-center">
          <p className="text-sm text-[#a69b8a]">
            Hand-blended with intention in Melbourne, Australia
          </p>
          <p className="text-xs text-[#666] mt-1">
            oilamor.com • Batch {record.id}
          </p>
        </footer>
      </main>
    </div>
  );
}
