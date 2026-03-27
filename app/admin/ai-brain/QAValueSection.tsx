'use client';

import { useState, useEffect } from 'react';

const DIMENSION_LABELS: Record<string, string> = {
  accuracy: 'Füüsika täpsus',
  classification: 'Vea klassifikatsioon',
  scoring: 'Hindamise järjepidevus',
  curriculum: 'Õppekava vastavus',
  tone: 'Toon ja tagasiside teadus',
  completeness: 'Täielikkus',
};

interface QAStats {
  totalAnalyzed: number;
  qaCount: number;
  resultsWithCorrections: number;
  totalCorrections: number;
  correctionRate: number;
  actualChangeRate: number;
  avgQaScore: number | null;
  totalQaCost: number;
  costPerCorrection: number | null;
  topDimensions: { dimension: string; count: number }[];
  correctionsBySeverity: Record<string, number>;
  trend: {
    isImproving: boolean;
    recentCorrectionRate: number;
    olderCorrectionRate: number;
  };
}

interface QAConfig {
  qaEnabled: boolean;
  configId: string | null;
}

export default function QAValueSection() {
  const [stats, setStats] = useState<QAStats | null>(null);
  const [config, setConfig] = useState<QAConfig>({ qaEnabled: true, configId: null });
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/qa-stats').then(r => r.json()),
      fetch('/api/admin/ai-providers').then(r => r.json()),
    ]).then(([statsData, providerData]) => {
      setStats(statsData);
      // Find the default/active provider and read qaEnabled
      const defaultProvider = providerData.providers?.find(
        (p: { isDefault: boolean; isActive: boolean }) => p.isDefault && p.isActive
      ) || providerData.providers?.[0];
      if (defaultProvider) {
        setConfig({
          qaEnabled: defaultProvider.qaEnabled !== false,
          configId: defaultProvider.id,
        });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const toggleQA = async () => {
    if (!config.configId || toggling) return;
    setToggling(true);
    try {
      const res = await fetch('/api/admin/qa-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configId: config.configId, qaEnabled: !config.qaEnabled }),
      });
      if (res.ok) {
        setConfig(prev => ({ ...prev, qaEnabled: !prev.qaEnabled }));
      }
    } catch { /* ignore */ }
    setToggling(false);
  };

  const card = {
    background: '#fff',
    border: '1.5px solid #DAD0A1',
    padding: '20px 18px',
    marginBottom: 16,
  };

  if (loading) {
    return (
      <div style={{ ...card, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
        Laadin QA statistikat...
      </div>
    );
  }

  const hasData = stats && stats.qaCount > 0;

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1C2832', margin: 0 }}>
          QA passi väärtus
        </h2>
        {/* Toggle */}
        <button
          onClick={toggleQA}
          disabled={toggling || !config.configId}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            border: `1.5px solid ${config.qaEnabled ? '#22c55e' : '#d1d5db'}`,
            borderRadius: 6,
            background: config.qaEnabled ? '#f0fdf4' : '#f9fafb',
            cursor: toggling ? 'wait' : 'pointer',
            fontSize: 13,
            fontWeight: 600,
            color: config.qaEnabled ? '#16a34a' : '#6b7280',
          }}
        >
          <span style={{
            width: 36,
            height: 20,
            borderRadius: 10,
            background: config.qaEnabled ? '#22c55e' : '#d1d5db',
            position: 'relative',
            display: 'inline-block',
            transition: 'background 0.2s',
          }}>
            <span style={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: '#fff',
              position: 'absolute',
              top: 2,
              left: config.qaEnabled ? 18 : 2,
              transition: 'left 0.2s',
              boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
            }} />
          </span>
          QA pass {config.qaEnabled ? 'sees' : 'väljas'}
        </button>
      </div>

      {!config.qaEnabled && (
        <div style={{
          background: '#fef3c7',
          border: '1px solid #fde68a',
          borderRadius: 8,
          padding: '10px 14px',
          marginBottom: 12,
          fontSize: 13,
          color: '#92400e',
        }}>
          QA pass on välja lülitatud. Õpetajad näevad ainult pass 1 tulemust. Kokkuhoid: ~$0.09/leht, aga AI võib anda vigaseid valemeid või vale tooni.
        </div>
      )}

      {!hasData ? (
        <div style={{ ...card, textAlign: 'center', padding: '30px 24px' }}>
          <div style={{ fontSize: 30, marginBottom: 8 }}>📊</div>
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
            QA statistika ilmub pärast esimesi analüüse. Praegu pole veel andmeid.
          </p>
        </div>
      ) : (
        <>
          {/* Key metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
            <div style={card}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#1C2832' }}>
                {stats!.correctionRate}%
              </div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Parandusmäär</div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                {stats!.resultsWithCorrections}/{stats!.qaCount} tulemustest
              </div>
            </div>
            <div style={card}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#1C2832' }}>
                {stats!.actualChangeRate}%
              </div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Tegelik muutus</div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                QA muutis tagasisidet
              </div>
            </div>
            <div style={card}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#1C2832' }}>
                ${stats!.totalQaCost.toFixed(2)}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>QA kogukulu</div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                {stats!.costPerCorrection !== null
                  ? `$${stats!.costPerCorrection.toFixed(2)}/parandus`
                  : '—'}
              </div>
            </div>
            <div style={card}>
              <div style={{ fontSize: 28, fontWeight: 700, color: stats!.trend.isImproving ? '#16a34a' : '#f97316' }}>
                {stats!.trend.isImproving ? '↓' : '↑'}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Trend</div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                {stats!.trend.recentCorrectionRate}% vs {stats!.trend.olderCorrectionRate}% varem
              </div>
            </div>
          </div>

          {/* Verdict */}
          {stats!.correctionRate > 0 && (
            <div style={{
              ...card,
              borderLeft: `4px solid ${stats!.correctionRate >= 30 ? '#22c55e' : stats!.correctionRate >= 10 ? '#f97316' : '#dc2626'}`,
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1C2832', marginBottom: 6 }}>
                {stats!.correctionRate >= 30
                  ? '✅ QA pass on väärtuslik — parandab tagasisidet piisavalt tihti'
                  : stats!.correctionRate >= 10
                    ? '⚠️ QA pass on kasulik, aga mõõdukalt — jälgi trendi'
                    : '🔴 QA pass parandab harva — kaalutle välja lülitamist kulude kokkuhoiuks'}
              </div>
              <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                {stats!.trend.isImproving
                  ? `Pass 1 paraneb aja jooksul (${stats!.trend.olderCorrectionRate}% → ${stats!.trend.recentCorrectionRate}%). AI õpib varasematest parandustest.`
                  : `Parandusmäär pole langenud (${stats!.trend.olderCorrectionRate}% → ${stats!.trend.recentCorrectionRate}%). QA leiab jätkuvalt vigu.`}
              </p>
            </div>
          )}

          {/* Top correction dimensions */}
          {stats!.topDimensions.length > 0 && (
            <div style={card}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1C2832', marginBottom: 10 }}>
                Levinumad parandused
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {stats!.topDimensions.map(d => {
                  const maxCount = stats!.topDimensions[0].count;
                  const pct = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
                  return (
                    <div key={d.dimension} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 140, fontSize: 12, color: '#374151', flexShrink: 0 }}>
                        {DIMENSION_LABELS[d.dimension] || d.dimension}
                      </div>
                      <div style={{ flex: 1, height: 16, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: '#1C2832', borderRadius: 4, minWidth: 2 }} />
                      </div>
                      <div style={{ width: 30, fontSize: 12, color: '#6b7280', textAlign: 'right' }}>{d.count}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
