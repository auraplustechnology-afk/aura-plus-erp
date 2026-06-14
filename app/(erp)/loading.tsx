export default function ERPLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-slate-200 dark:bg-[#1E2A3B] rounded-lg" />
          <div className="h-4 w-32 bg-slate-100 dark:bg-[#1E2A3B]/60 rounded-md" />
        </div>
        <div className="h-9 w-28 bg-slate-200 dark:bg-[#1E2A3B] rounded-lg" />
      </div>

      {/* Stats row skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-5 space-y-3">
            <div className="h-8 w-8 bg-slate-100 dark:bg-[#1E2A3B] rounded-lg" />
            <div className="h-7 w-20 bg-slate-200 dark:bg-[#1E2A3B] rounded-md" />
            <div className="h-3 w-16 bg-slate-100 dark:bg-[#1E2A3B]/60 rounded-md" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="card overflow-hidden">
        {/* Table header */}
        <div className="flex gap-4 px-4 py-3 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-3 bg-slate-100 dark:bg-[#1E2A3B] rounded flex-1" />
          ))}
        </div>
        {/* Table rows */}
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-4 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
            <div className="h-4 bg-slate-100 dark:bg-[#1E2A3B] rounded flex-1" />
            <div className="h-4 bg-slate-100 dark:bg-[#1E2A3B]/60 rounded flex-1" />
            <div className="h-4 bg-slate-100 dark:bg-[#1E2A3B]/40 rounded w-16" />
            <div className="h-5 w-16 bg-slate-200 dark:bg-[#1E2A3B] rounded-full" />
            <div className="h-4 w-12 bg-slate-100 dark:bg-[#1E2A3B]/40 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
