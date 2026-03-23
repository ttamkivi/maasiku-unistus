import Link from 'next/link';
import DemoCard from '@/components/DemoCard';
import { demoData } from '@/lib/demo-data';

export default function DemoPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/" style={{ color: '#0072CE', fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>← Tagasi</Link>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1C2832' }}>Näidistagasisided</h1>
      </div>
      <p style={{ fontSize: 13, color: '#1C2832', opacity: 0.8 }}>Need on 4 näidist, mis illustreerivad tagasiside kvaliteeti. Vajuta kaardile, et näha täielikku tagasisidet.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {demoData.map((item, i) => <DemoCard key={i} feedback={item} index={i} />)}
      </div>
      <Link href="/analyze" style={{ display: 'block', background: '#1C2832', color: '#fff', fontWeight: 700, fontSize: 14, padding: '14px', textAlign: 'center', textDecoration: 'none' }}>
        Alusta oma analüüsi →
      </Link>
    </div>
  );
}
