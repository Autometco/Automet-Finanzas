import type React from "react"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: "Automet Finanzas - Tu asistente inteligente para el control financiero personal",
  description:
    "Gestiona tus finanzas personales de forma inteligente con Automet Finanzas. Controla gastos, establece metas de ahorro y alcanza tus objetivos financieros con nuestra plataforma moderna y fácil de usar.",
  keywords: "finanzas personales, control de gastos, ahorro, presupuesto, metas financieras, Automet Finanzas",
  authors: [{ name: "Automet Finanzas" }],
  creator: "Automet Finanzas",
  publisher: "Automet Finanzas",
  generator: "v0.app",
  applicationName: "Automet Finanzas",
  referrer: "origin-when-cross-origin",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#22c55e" },
    { media: "(prefers-color-scheme: dark)", color: "#22c55e" },
  ],
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "https://automet-finanzas.vercel.app",
    siteName: "Automet Finanzas",
    title: "Automet Finanzas - Tu asistente inteligente para el control financiero personal",
    description:
      "Gestiona tus finanzas personales de forma inteligente con Automet Finanzas. Controla gastos, establece metas de ahorro y alcanza tus objetivos financieros.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Automet Finanzas - Control financiero inteligente",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Automet Finanzas - Tu asistente inteligente para el control financiero personal",
    description:
      "Gestiona tus finanzas personales de forma inteligente con Automet Finanzas. Controla gastos, establece metas de ahorro y alcanza tus objetivos financieros.",
    images: ["/og-image.png"],
    creator: "@AutometFinanzas",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    other: [
      {
        rel: "mask-icon",
        url: "/safari-pinned-tab.svg",
        color: "#22c55e",
      },
    ],
  },
  manifest: "/site.webmanifest",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className="font-sans antialiased">
        <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
        <Analytics />
      </body>
    </html>
  )
}
