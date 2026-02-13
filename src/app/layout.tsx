import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import { Providers } from '@/components/providers';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const SITE_URL = 'https://hyperbolictimechamber.app';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#c8a84e',
};

export const metadata: Metadata = {
  title: 'The Real Hyperbolic Time Chamber',
  description:
    'Train smarter, progress faster. Science-backed training programs with automatic progression.',
  metadataBase: new URL(SITE_URL),
  manifest: '/manifest.webmanifest',
  icons: {
    apple: '/logo.webp',
  },
  alternates: { canonical: '/' },
  openGraph: {
    title: 'The Real Hyperbolic Time Chamber',
    description:
      'Stop guessing in the gym. Follow proven programs that auto-adjust weight, sets, and reps.',
    url: SITE_URL,
    siteName: 'The Real Hyperbolic Time Chamber',
    type: 'website',
    // TODO: replace with a proper 1200×630 OG image
    images: [{ url: '/logo.webp', width: 512, height: 512, alt: 'Hyperbolic Time Chamber logo' }],
  },
  twitter: {
    card: 'summary',
    title: 'The Real Hyperbolic Time Chamber',
    description:
      'Stop guessing in the gym. Follow proven programs that auto-adjust weight, sets, and reps.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co; font-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; worker-src 'self'"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'The Real Hyperbolic Time Chamber',
              applicationCategory: 'HealthApplication',
              operatingSystem: 'Web',
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
              description:
                'Science-backed training programs with automatic progression for the GZCLP weightlifting program.',
            }),
          }}
        />
      </head>
      <body className={`${geistSans.variable} antialiased`}>
        <Providers>{children}</Providers>
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/service-worker.js')})}`,
          }}
        />
      </body>
    </html>
  );
}
