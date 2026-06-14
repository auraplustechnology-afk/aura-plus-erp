import type { Metadata, Viewport } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: "Aura Plus ERP",
    template: "%s — Aura Plus ERP",
  },
  description: "Enterprise Resource Planning for Aura Plus Technologies — Managing quotes, invoices, projects, inventory and support.",
  keywords: ["ERP", "Aura Plus", "Technologies", "Zambia", "Lusaka"],
  authors: [{ name: "Aura Plus Technologies" }],
  robots: "noindex, nofollow", // Private business tool
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  )
}
