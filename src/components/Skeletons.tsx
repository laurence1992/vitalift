const S = "bg-[#1C1C2E] animate-pulse";
const SL = "bg-[#242438] animate-pulse";

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`${S} rounded-xl ${className ?? ""}`} />;
}

export function SkeletonShimmer({ className }: { className?: string }) {
  return <div className={`${SL} rounded-xl ${className ?? ""}`} />;
}

/** Dashboard: 2 program cards + 6 health tiles + photos block */
export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-background px-5 pb-6 pt-12">
        <div className="flex items-center gap-3 mb-1">
          <SkeletonBlock className="h-7 w-7 rounded-lg" />
          <SkeletonBlock className="h-5 w-28" />
        </div>
        <SkeletonShimmer className="h-3 w-40 mt-2" />
      </div>
      <div className="px-5 space-y-6">
        {/* Program day cards */}
        <div>
          <SkeletonShimmer className="h-3 w-24 mb-3" />
          <div className="grid grid-cols-2 gap-3">
            <SkeletonBlock className="h-28 rounded-2xl" />
            <SkeletonBlock className="h-28 rounded-2xl" />
          </div>
        </div>
        {/* Health tiles */}
        <div>
          <SkeletonShimmer className="h-3 w-20 mb-3" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        </div>
        {/* Photos block */}
        <SkeletonBlock className="h-32 rounded-2xl" />
      </div>
    </div>
  );
}

/** Exercise Library: 6 rows */
export function ExerciseLibrarySkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
          <SkeletonBlock className="h-11 w-11 shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonShimmer className="h-3 w-32" />
            <SkeletonBlock className="h-2 w-20" />
          </div>
          <SkeletonBlock className="h-6 w-6 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** Workout History: 4 rows */
export function HistorySkeleton() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-background px-5 pb-6 pt-12">
        <div className="flex items-center gap-3 mb-1">
          <SkeletonBlock className="h-7 w-7 rounded-lg" />
          <SkeletonBlock className="h-5 w-36" />
        </div>
      </div>
      <div className="px-5 space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
            <div className="space-y-2 flex-1">
              <SkeletonShimmer className="h-3.5 w-40" />
              <SkeletonBlock className="h-2.5 w-48" />
            </div>
            <SkeletonBlock className="h-4 w-4 rounded shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Client List: 4 rows */
export function ClientListSkeleton() {
  return (
    <div className="px-5 space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-4">
          <SkeletonShimmer className="h-3.5 w-32" />
          <div className="flex items-center gap-1.5">
            <SkeletonBlock className="h-8 w-8 rounded-xl" />
            <SkeletonBlock className="h-8 w-8 rounded-xl" />
            <SkeletonBlock className="h-4 w-4 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Workout Session: 3 exercise blocks */
export function WorkoutSessionSkeleton() {
  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="flex items-center gap-3 px-5 py-3">
          <SkeletonBlock className="h-5 w-5 rounded" />
          <div className="flex-1 space-y-1.5">
            <SkeletonShimmer className="h-3.5 w-24" />
            <SkeletonBlock className="h-2.5 w-16" />
          </div>
        </div>
      </div>
      <div className="space-y-4 px-5 pt-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <SkeletonShimmer className="h-4 w-36" />
            <SkeletonBlock className="h-2.5 w-48" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="grid grid-cols-[40px_1fr_1fr] gap-2">
                  <SkeletonBlock className="h-10 rounded-xl" />
                  <SkeletonBlock className="h-10 rounded-xl" />
                  <SkeletonBlock className="h-10 rounded-xl" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Workout Summary: volume + 3 exercise blocks */
export function WorkoutSummarySkeleton() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-background px-5 py-3">
        <SkeletonBlock className="h-5 w-5 rounded" />
        <div className="space-y-1.5">
          <SkeletonShimmer className="h-3.5 w-28" />
          <SkeletonBlock className="h-2.5 w-40" />
        </div>
      </div>
      <div className="space-y-3 px-5 pt-4">
        <SkeletonBlock className="h-24 rounded-2xl" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <SkeletonShimmer className="h-3.5 w-32" />
            <SkeletonBlock className="h-2.5 w-24" />
            <div className="space-y-1">
              {Array.from({ length: 3 }).map((_, j) => (
                <SkeletonBlock key={j} className="h-8 rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
