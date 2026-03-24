import type { Metadata } from 'next';
import { Open_Sans } from 'next/font/google';
import Link from 'next/link';
import NavBar from '@/components/NavBar';
import CookieConsent from '@/components/CookieConsent';
import FeedbackWidget from '@/components/FeedbackWidget';
import { PostHogProvider } from '@/components/PostHogProvider';
import './globals.css';

const openSans = Open_Sans({ subsets: ['latin'], weight: ['300', '400', '600', '700'] });

export const metadata: Metadata = {
  title: 'Õpetaja Tagasiside',
  description: 'AI-põhine tagasiside platvorm õpetajatele — säästa igal nädalal tunde kontrolltööde tagasiside kirjutamiselt',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="et">
      <body className={openSans.className} style={{ background: '#fff', color: '#1C2832' }}>
        <PostHogProvider>
        <NavBar />
        {/* Gold wave divider */}
        <div style={{ height: 3, background: '#DAD0A1' }} />
        {/* Main content — wider on desktop for dashboard */}
        <div
          className="mx-auto px-4 py-6"
          style={{
            maxWidth: '100%',
            paddingBottom: 'calc(80px + env(safe-area-inset-bottom))', // space for mobile bottom nav
          }}
        >
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
        {/* Wave divider above footer */}
        <div style={{ width: '100%', overflow: 'hidden', lineHeight: 0, opacity: 0.3, marginTop: 48 }}>
          <svg viewBox="0 0 1200 40" preserveAspectRatio="none" style={{ width: '100%', height: 40 }}>
            <path d="M0,20 C150,40 350,0 600,20 C850,40 1050,0 1200,20 L1200,40 L0,40 Z" fill="#DAD0A1" />
          </svg>
        </div>
        {/* Footer */}
        <footer style={{ background: '#1C2832', color: '#F8F3DA' }}>
          <div className="max-w-6xl mx-auto px-4 py-8">
            <p style={{ fontSize: 14, fontWeight: 600 }}>Õpetaja Tagasiside</p>
            <p style={{ fontSize: 12, marginTop: 4, opacity: 0.7 }}>AI-põhine tagasiside platvorm õpetajatele</p>
            <div className="flex gap-4 mt-4">
              <Link href="/privacy" style={{ color: '#F8F3DA', fontSize: 12, opacity: 0.7 }}>Privaatsus</Link>
              <Link href="/legal" style={{ color: '#F8F3DA', fontSize: 12, opacity: 0.7 }}>Õiguslik teave</Link>
            </div>
            <p style={{ fontSize: 11, marginTop: 16, opacity: 0.45 }}>© 2026 Õpetaja Tagasiside</p>
          </div>
        </footer>
        <CookieConsent />
        <FeedbackWidget />
        </PostHogProvider>
      </body>
    </html>
  );
}
