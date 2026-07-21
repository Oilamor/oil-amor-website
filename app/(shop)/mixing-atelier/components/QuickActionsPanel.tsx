'use client'

// ============================================================================
// SECTION: Quick Links
// ============================================================================
import { BookOpen, ChevronRight, History } from 'lucide-react'

export function QuickActionsPanel({
  recipeCount,
  onNavigateToMyRecipes,
  onNavigateToCommunity,
}: {
  recipeCount: number
  onNavigateToMyRecipes: () => void
  onNavigateToCommunity: () => void
}) {
  return (
    <div className="p-4 rounded-2xl bg-[#111] border border-[#f5f3ef]/10">
      <h3 className="text-sm font-medium text-[#f5f3ef] mb-3">Quick Actions</h3>
      <div className="space-y-2">
        <button 
          onClick={onNavigateToMyRecipes}
          className="w-full flex items-center justify-between p-3 rounded-lg bg-[#0a080c] text-[#a69b8a] hover:text-[#f5f3ef] hover:bg-[#0a080c]/80 transition-all group"
        >
          <span className="flex items-center gap-2">
            <History className="w-4 h-4" />
            My Recipes
            {recipeCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#c9a227]/20 text-[#c9a227]">
                {recipeCount}
              </span>
            )}
          </span>
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
        <button 
          onClick={onNavigateToCommunity}
          className="w-full flex items-center justify-between p-3 rounded-lg bg-[#0a080c] text-[#a69b8a] hover:text-[#f5f3ef] hover:bg-[#0a080c]/80 transition-all group"
        >
          <span className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Community Recipes
          </span>
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  )
}
