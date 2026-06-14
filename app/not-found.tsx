import Link from 'next/link'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F5F7FA] dark:bg-[#080E1A] flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {/* 404 graphic */}
        <div className="mb-8">
          <div className="text-[120px] font-black leading-none bg-gradient-to-br from-[#0066FF] to-[#0A1628] bg-clip-text text-transparent select-none">
            404
          </div>
          <div className="w-24 h-1 bg-[#0066FF] rounded-full mx-auto -mt-2 opacity-40" />
        </div>

        <h1 className="text-2xl font-bold text-[#0A1628] dark:text-white mb-3">
          Page not found
        </h1>
        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Link
            href="javascript:history.back()"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#0F1C2E] border border-[#E2E8F0] dark:border-[#1E2A3B] text-[#0A1628] dark:text-white text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-[#1E2A3B] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0066FF] hover:bg-[#0052CC] text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Home className="w-4 h-4" /> Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
