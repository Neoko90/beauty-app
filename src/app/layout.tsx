import type { Metadata } from 'next'
import '@fontsource/dm-sans/300.css'
import '@fontsource/dm-sans/400.css'
import '@fontsource/dm-sans/500.css'
import '@fontsource/dm-sans/600.css'
import '@fontsource/dm-sans/700.css'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Referly — System rezerwacji dla salonów',
    template: '%s | Referly',
  },
  description: 'Profesjonalne oprogramowanie dla salonów urody. Kalendarz, klienci, program poleceń, magazyn i statystyki w jednym miejscu.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
