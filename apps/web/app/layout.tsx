import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';

export const metadata: Metadata = {
  title: {
    default: 'tide — save anything from anywhere',
    template: '%s · tide',
  },
  description:
    'Self-hostable read-later. Save from web, browser extension, iOS share sheet, email, or API. AI summaries on demand.',
  applicationName: 'tide',
  authors: [{ name: 'Mateo Kadiu' }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://tide.mateokadiu.com'),
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    siteName: 'tide',
    title: 'tide — save anything from anywhere',
    description: 'Self-hostable read-later with AI summaries.',
  },
  twitter: { card: 'summary_large_image' },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: 'oklch(0.18 0.012 250)' },
    { media: '(prefers-color-scheme: light)', color: 'oklch(0.985 0.003 250)' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
