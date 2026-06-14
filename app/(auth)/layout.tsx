export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#0d1f3c] to-[#0A1628] flex items-center justify-center p-4">
      {children}
    </div>
  )
}
