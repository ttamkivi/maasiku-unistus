'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface OverviewStats {
  totalTests: number;
  totalResults: number;
  avgScore: number | null;
  totalPatterns: number;
  recentCorrections: number;
}

export default function StatisticsPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/statistics/overview')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setStats(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Sub-navigation */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
        <Link
          href="/dashboard/statistics"
          style={{
            fontSize: 13, fontWeight: 700, color: '#fff', background: '#1C2832',
            padding: '7px 14px', borderRadius: 5, textDecoration: 'none',
          }}
        >
          Ülevaade
        </Link>
        <Link
          href="/dashboard/statistics/ai-improvement"
          style={{
            fontSize: 13, fontWeight: 600, color: '#1C2832', background: '#F8F3DA',
            border: '1.5px solid #DAD0A1', padding: '7px 14px', borderRadius: 5, textDecoration: 'none',
          }}
        >
          AI mudeli parandamine
        </Link>
        <Link
          href="/dashboard/statistics/insights"
          style={{
            fontSize: 13, fontWeight: 600, color: '#1C2832', background: '#F8F3DA',
            border: '1.5px solid #DAD0A1', padding: '7px 14px', borderRadius: 5, textDecoration: 'none',
          }}
        >
          Analüüs ja nõrkused
        </Link>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C2832', margin: '0 0 8px 0' }}>
        Statistika
      </h1>
      <p style={{ fontSize: 14, color: '#1C2832', opacity: 0.65, marginBottom: 28, lineHeight: 1.6 }}>
        Ülevaade teie hindamistest, AI tagasiside kvaliteedist ja õpilaste tulemustest.
      </p>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Laadin...</div>
      ) : !stats ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Andmete laadimine ebaõnnestus.</div>
      ) : (
        <>
          {/* Overview cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
            <StatCard label="Kontrolltööd" value={stats.totalTests} />
            <StatCard label="Tulemused kokku" value={stats.totalResults} />
            <StatCard
              label="Keskmine hinne"
              value={stats.avgScore !== null ? `${stats.avgScore.toFixed(1)}%` : '—'}
            />
            <StatCard label="AI õpimustrid" value={stats.totalPatterns} />
            <StatCard label="Parandused (30p)" value={stats.recentCorrections} />
          </div>

          {/* Quick links */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Link
              href="/dashboard/statistics/ai-improvement"
              style={{
                background: '#fff', border: '1.5px solid #DAD0A1', borderRadius: 6,
                padding: '20px 24px', textDecoration: 'none', color: '#1C2832',
              }}
            >
              <div style={{ fontSize: 18, marginBottom: 8 }}>🧠</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>AI mudeli parandamine</div>
              <div style={{ fontSize: 13, opacity: 0.65, lineHeight: 1.5 }}>
                Vaadake ja parandage AI tehtud vigu. Iga parandus muudab süsteemi tulevikus täpsemaks.
              </div>
            </Link>
            <Link
              href="/dashboard/statistics/insights"
              style={{
                background: '#fff', border: '1.5px solid #DAD0A1', borderRadius: 6,
                padding: '20px 24px', textDecoration: 'none', color: '#1C2832',
              }}
            >
              <div style={{ fontSize: 18, marginBottom: 8 }}>📊</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Analüüs ja nõrkused</div>
              <div style={{ fontSize: 13, opacity: 0.65, lineHeight: 1.5 }}>
                Millised teemad on keerulised? Kus on klassi nõrgad kohad? Aidake fookust seada.
              </div>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{
      background: '#fff', border: '1.5px solid #DAD0A1', borderRadius: 6,
      padding: '16px 20px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 26, fontWeight: 700, color: '#1C2832', marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: '#1C2832', opacity: 0.6, fontWeight: 600 }}>
        {label}
      </div>
    </div>
  );
}
