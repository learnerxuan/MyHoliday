import type { Metadata } from 'next'
import { Funnel_Display, Noto_Serif } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

const funnelDisplay = Funnel_Display({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['800'],
})

const notoSerif = Noto_Serif({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['400', '600'],
})

export const metadata: Metadata = {
  title: 'MyHoliday',
  description: 'Your personalised travel planning platform',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${funnelDisplay.variable} ${notoSerif.variable} antialiased min-h-screen flex flex-col bg-warmwhite`}>
        <Navbar />
        <main className="flex-1 flex flex-col pt-24 pt-safe">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
