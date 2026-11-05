import type { Metadata } from "next"
import localFont from "next/font/local"
import "./globals.css"
import { Toaster } from "sonner"

const geist = localFont({
  src: "./fonts/geist-latin.woff2",
  variable: "--font-geist-sans",
  display: "swap",
  weight: "100 900",
})

const geistMono = localFont({
  src: "./fonts/geist-mono-latin.woff2",
  variable: "--font-geist-mono",
  display: "swap",
  weight: "100 900",
})

export const metadata: Metadata = {
  title: "FECOT — Fédération congolaise de taekwondo",
  description: "Plateforme de gestion de la Fédération congolaise de taekwondo",
  icons: { icon: "/logo-fecot.png", apple: "/logo-fecot.png" },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body className={`${geist.variable} ${geistMono.variable} font-sans antialiased`}>{children}<Toaster richColors /></body></html>
}
