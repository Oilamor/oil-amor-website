/**
 * Batch Detail Page
 *
 * Public-facing page displayed when a customer scans a bottle's QR code.
 * Shows complete blend recipe, safety info, ingredients, and reorder option.
 *
 * Route: /batch/{batchId}
 */

import { notFound } from 'next/navigation';
import { getBatchRecord } from '@/lib/batch/records';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ batchId: string }>;
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

  return (
    <div className="min-h-screen bg-[#0a080c] text-[#f5f3ef]">
      {/* Header */}
      <header className="border-b border-[#f5f3ef]/10">
        <div className="mx-auto max-w-2xl px-6 py-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#c9a227] flex items-center justify-center">
              <span className="text-[#0a080c] font-bold text-sm">OA</span>
            </div>
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
          {record.isRefill && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#c9a227]/10 border border-[#c9a227]/30 rounded-full text-[#c9a227] text-sm mb-4">
              <span>🔁</span>
              <span>Forever Bottle Refill</span>
            </div>
          )}

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
                <span className="text-[#c9a227]">{record.intendedUse}</span>
              </>
            )}
            {record.crystal && (
              <>
                <span>•</span>
                <span>💎 {record.crystal}</span>
              </>
            )}
          </div>

          {record.isRefill && record.sourceVolume && (
            <p className="mt-2 text-sm text-[#a69b8a]">
              Original {record.sourceVolume}ml blend • Same ratio • Scaled to {record.size}ml
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
        </div>

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
                {record.oils.map((oil, i) => (
                  <tr key={i} className="hover:bg-[#f5f3ef]/5">
                    <td className="px-4 py-3 text-[#f5f3ef]">{oil.oilName}</td>
                    <td className="px-4 py-3 text-right text-[#a69b8a] tabular-nums">{oil.ml.toFixed(1)}ml</td>
                    <td className="px-4 py-3 text-right text-[#c9a227] font-medium tabular-nums">{oil.percentage.toFixed(1)}%</td>
                  </tr>
                ))}
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
                  <td className="px-4 py-3 text-right text-[#c9a227] font-medium">{record.size}ml bottle</td>
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
            href="/mixing-atelier"
            className="flex-1 px-6 py-3 bg-[#c9a227] text-[#0a080c] rounded-lg text-center font-medium hover:bg-[#c9a227]/90 transition-colors"
          >
            Create Your Own Blend
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
