'use client';

/**
 * EnvironmentalImpactStats - Displays customer's environmental impact
 * Visual stats and shareable graphics for social media
 */

import React, { useState, useRef } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface EnvironmentalImpactStatsProps {
  bottlesSaved: number;
  glassRecycledKg: number;
  oilKeptLiters: number;
  treesEquivalent: number;
}

interface ImpactCard {
  icon: string;
  value: number;
  unit: string;
  label: string;
  description: string;
  color: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function EnvironmentalImpactStats({
  bottlesSaved,
  glassRecycledKg,
  oilKeptLiters,
  treesEquivalent,
}: EnvironmentalImpactStatsProps) {
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

  const impactCards: ImpactCard[] = [
    {
      icon: '🏺',
      value: bottlesSaved,
      unit: 'bottles',
      label: 'Bottles Saved',
      description: 'Kept from landfill through refills',
      color: 'from-emerald-500 to-teal-500',
    },
    {
      icon: '♻️',
      value: glassRecycledKg,
      unit: 'kg',
      label: 'Glass Recycled',
      description: 'Total weight of bottles reused',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: '💧',
      value: oilKeptLiters,
      unit: 'L',
      label: 'Oil in Circulation',
      description: 'Essential oils kept flowing',
      color: 'from-amber-500 to-orange-500',
    },
    {
      icon: '🌳',
      value: treesEquivalent,
      unit: 'trees',
      label: 'Trees Worth',
      description: 'CO₂ impact equivalent',
      color: 'from-green-500 to-emerald-500',
    },
  ];

  const totalImpact = bottlesSaved + glassRecycledKg + oilKeptLiters;
  const hasImpact = totalImpact > 0;

  const handleShare = async () => {
    const shareText = generateShareText();
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Oil Amor Environmental Impact',
          text: shareText,
          url: window.location.origin,
        });
      } catch (err) {
      }
    } else {
      setShowShareModal(true);
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(generateShareText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateShareText = () => {
    return `🌿 My Impact with Oil Amor Forever Bottles:
🏺 ${bottlesSaved} bottles saved from landfill
♻️ ${glassRecycledKg}kg of glass recycled
💧 ${oilKeptLiters}L of oil kept in circulation
🌳 Equivalent to planting ${treesEquivalent} trees

Join the refill revolution! ♻️✨`;
  };

  if (!hasImpact) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 p-8 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm">
          <span className="text-4xl">🌱</span>
        </div>
        <h3 className="mb-2 text-xl font-bold text-gray-900">Start Your Impact Journey</h3>
        <p className="mb-6 text-gray-600">
          Complete your first refill to see your environmental impact stats here.
          Every bottle counts!
        </p>
        <div className="flex justify-center gap-4">
          <div className="rounded-lg bg-white px-4 py-3 shadow-sm">
            <span className="text-2xl font-bold text-emerald-600">0</span>
            <p className="text-sm text-gray-500">Bottles saved</p>
          </div>
          <div className="rounded-lg bg-white px-4 py-3 shadow-sm">
            <span className="text-2xl font-bold text-emerald-600">0</span>
            <p className="text-sm text-gray-500">kg recycled</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">Your Impact</h2>
            <p className="mt-1 text-emerald-100">
              Thank you for being part of the refill revolution!
            </p>
          </div>
          <div className="rounded-full bg-white/20 p-3 backdrop-blur-sm">
            <span className="text-3xl">🌍</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {impactCards.slice(0, 2).map((card) => (
            <div key={card.label} className="rounded-xl bg-white/10 p-3 backdrop-blur-sm">
              <span className="text-2xl">{card.icon}</span>
              <p className="mt-1 text-2xl font-bold">{formatNumber(card.value)}</p>
              <p className="text-sm text-emerald-100">{card.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Impact Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {impactCards.map((card) => (
          <ImpactStatCard key={card.label} card={card} />
        ))}
      </div>

      {/* Comparison Section */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-emerald-900">
          <span>🎯</span>
          What Your Impact Means
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <ComparisonCard
            icon="🚗"
            value={`${(bottlesSaved * 0.5).toFixed(1)} km`}
            label="Driving avoided"
            description="Equivalent CO₂ emissions"
          />
          <ComparisonCard
            icon="💡"
            value={`${(bottlesSaved * 10).toFixed(0)} hrs`}
            label="Energy saved"
            description="In LED bulb hours"
          />
          <ComparisonCard
            icon="🥤"
            value={`${(bottlesSaved * 2).toFixed(0)}`}
            label="Plastic bottles"
            description="Equivalent waste prevented"
          />
        </div>
      </div>

      {/* Milestones */}
      {bottlesSaved >= 5 && (
        <Milestones bottlesSaved={bottlesSaved} />
      )}

      {/* Share Section */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Share Your Impact</h3>
            <p className="text-gray-600">
              Inspire others to join the refill revolution!
            </p>
          </div>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white transition-colors hover:bg-emerald-700"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share Impact
          </button>
        </div>

        {/* Shareable Card Preview */}
        <div className="mt-6">
          <p className="mb-3 text-sm font-medium text-gray-700">Preview:</p>
          <ShareableCard
            ref={shareCardRef}
            bottlesSaved={bottlesSaved}
            glassRecycledKg={glassRecycledKg}
            oilKeptLiters={oilKeptLiters}
            treesEquivalent={treesEquivalent}
          />
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          onClose={() => setShowShareModal(false)}
          onCopy={handleCopyText}
          copied={copied}
          shareText={generateShareText()}
        />
      )}
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function ImpactStatCard({ card }: { card: ImpactCard }) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${card.color}`} />
      
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{card.label}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">
            {formatNumber(card.value)}
            <span className="ml-1 text-lg font-normal text-gray-500">{card.unit}</span>
          </p>
          <p className="mt-2 text-sm text-gray-600">{card.description}</p>
        </div>
        <span className="text-4xl opacity-80 group-hover:scale-110 transition-transform">
          {card.icon}
        </span>
      </div>
    </div>
  );
}

function ComparisonCard({
  icon,
  value,
  label,
  description,
}: {
  icon: string;
  value: string;
  label: string;
  description: string;
}) {
  return (
    <div className="rounded-lg bg-white p-4 text-center shadow-sm">
      <span className="text-3xl">{icon}</span>
      <p className="mt-2 text-xl font-bold text-gray-900">{value}</p>
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  );
}

function Milestones({ bottlesSaved }: { bottlesSaved: number }) {
  const milestones = [
    { count: 5, icon: '🌱', title: 'Seedling', description: 'Started your journey' },
    { count: 10, icon: '🌿', title: 'Sprout', description: 'Growing impact' },
    { count: 25, icon: '🌳', title: 'Tree', description: 'Making a difference' },
    { count: 50, icon: '🌲', title: 'Forest', description: 'Refill champion' },
    { count: 100, icon: '🏆', title: 'Legend', description: 'Environmental hero' },
  ];

  const achievedMilestones = milestones.filter((m) => bottlesSaved >= m.count);
  const nextMilestone = milestones.find((m) => bottlesSaved < m.count);

  return (
    <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-6">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-emerald-900">
        <span>🏆</span>
        Your Milestones
      </h3>

      <div className="flex flex-wrap gap-3">
        {achievedMilestones.map((milestone) => (
          <div
            key={milestone.count}
            className="flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-white"
          >
            <span>{milestone.icon}</span>
            <span className="font-medium">{milestone.title}</span>
            <span className="text-emerald-200">·</span>
            <span className="text-sm text-emerald-100">{milestone.count}+ refills</span>
          </div>
        ))}
      </div>

      {nextMilestone && (
        <div className="mt-4 rounded-lg bg-white/60 p-3">
          <p className="text-sm text-emerald-800">
            <span className="font-medium">Next milestone:</span>{' '}
            {nextMilestone.title} ({nextMilestone.count} refills)
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-emerald-200">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all"
              style={{
                width: `${Math.min(100, (bottlesSaved / nextMilestone.count) * 100)}%`,
              }}
            />
          </div>
          <p className="mt-1 text-xs text-emerald-600">
            {nextMilestone.count - bottlesSaved} more to go!
          </p>
        </div>
      )}
    </div>
  );
}

const ShareableCard = React.forwardRef<HTMLDivElement, EnvironmentalImpactStatsProps>(
  function ShareableCard({ bottlesSaved, glassRecycledKg, oilKeptLiters, treesEquivalent }, ref) {
    return (
      <div
        ref={ref}
        className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-6 text-white"
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white" />
          <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white" />
        </div>

        <div className="relative">
          {/* Logo Area */}
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              <span className="text-xl">💧</span>
            </div>
            <span className="text-xl font-bold">Oil Amor</span>
          </div>

          {/* Main Stats */}
          <div className="mt-6">
            <p className="text-emerald-100">I&apos;ve saved</p>
            <p className="text-5xl font-bold">{bottlesSaved}</p>
            <p className="text-xl text-emerald-100">bottles from landfill</p>
          </div>

          {/* Secondary Stats */}
          <div className="mt-6 grid grid-cols-3 gap-4 border-t border-white/20 pt-4">
            <div>
              <p className="text-2xl font-bold">{glassRecycledKg}</p>
              <p className="text-xs text-emerald-200">kg recycled</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{oilKeptLiters}</p>
              <p className="text-xs text-emerald-200">L in circulation</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{treesEquivalent}</p>
              <p className="text-xs text-emerald-200">trees worth</p>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-6 rounded-lg bg-white/20 p-3 text-center backdrop-blur-sm">
            <p className="text-sm font-medium">Join the refill revolution ♻️✨</p>
            <p className="text-xs text-emerald-200">oilamor.com.au/refill</p>
          </div>
        </div>
      </div>
    );
  }
);

function ShareModal({
  onClose,
  onCopy,
  copied,
  shareText,
}: {
  onClose: () => void;
  onCopy: () => void;
  copied: boolean;
  shareText: string;
}) {
  return (
    <div className="fixed inset-0 z-[1100] flex items-start justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-sm
                    pt-[80px] sm:pt-[100px] pb-4 sm:pb-8 overflow-hidden">
      <div className="w-full max-w-md max-h-[calc(100vh-100px)] sm:max-h-[calc(100vh-120px)] 
                      overflow-y-auto rounded-xl bg-white p-4 sm:p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Share Your Impact</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="rounded-lg bg-gray-100 p-4">
          <pre className="whitespace-pre-wrap text-sm text-gray-700">{shareText}</pre>
        </div>

        <div className="mt-4 flex gap-3">
          <button
            onClick={onCopy}
            className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700"
          >
            {copied ? 'Copied!' : 'Copy Text'}
          </button>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-blue-500 px-4 py-2 font-medium text-white hover:bg-blue-600"
          >
            Tweet
          </a>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800"
          >
            Share
          </a>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatNumber(num: number): string {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toFixed(num % 1 === 0 ? 0 : 1);
}
