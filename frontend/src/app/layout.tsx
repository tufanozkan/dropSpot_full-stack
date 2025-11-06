// src/app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import Navbar from '@/components/navbar' // <-- 1. YENİ İMPORT

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DropSpot',
  description: 'Özel drop ve claim platformu',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <Navbar /> {/* <-- 2. NAVBAR'I BURAYA EKLE */}
          {children} {/* <-- Sayfaların geri kalanı */}
        </Providers>
      </body>
    </html>
  )
}