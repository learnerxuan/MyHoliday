import type { Metadata } from 'next'
import { Funnel_Display, Noto_Serif } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'

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
      <body className={`${funnelDisplay.variable} ${notoSerif.variable} antialiased h-screen overflow-hidden bg-warmwhite flex flex-col`}>
        <Navbar />
        <div className="flex-1 min-h-0 overflow-y-auto">
          {children}
        </div>
      </body>
    </html>
  )
}
