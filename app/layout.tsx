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
  title: 'Maasiku Unistus',
  description: 'Isiklik tagasiside igale õpilasele, toetades õpetajat',
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
        {/* Footer */}
        <footer style={{ background: '#1C2832', color: '#F8F3DA', marginTop: 48 }}>
          <div className="max-w-6xl mx-auto px-4 py-8">
            <p style={{ fontSize: 14, fontWeight: 600 }}>Maasiku Unistus</p>
            <p style={{ fontSize: 12, marginTop: 4, opacity: 0.7 }}>Isiklik tagasiside igale õpilasele, toetades õpetajat</p>
            <div className="flex gap-4 mt-4">
              <Link href="/privacy" style={{ color: '#F8F3DA', fontSize: 12, opacity: 0.7 }}>Privaatsus</Link>
              <Link href="/legal" style={{ color: '#F8F3DA', fontSize: 12, opacity: 0.7 }}>Õiguslik teave</Link>
            </div>
          </div>
        </footer>
        <CookieConsent />
        <FeedbackWidget />
        </PostHogProvider>
      </body>
    </html>
  );
}
