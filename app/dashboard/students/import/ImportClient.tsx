'use client';

import { useState, useRef, ChangeEvent } from 'react';
import Link from 'next/link';

// ── Types ────────────────────────────────────────────────────────────────────

interface ParsedRow {
  name: string;
  email: string;
  class: string;
}

interface ParseWarning {
  line: number;
  message: string;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

type Step = 'upload' | 'preview' | 'result';

// ── CSV parser ───────────────────────────────────────────────────────────────

function parseCsv(raw: string): { rows: ParsedRow[]; warnings: ParseWarning[] } {
  const rows: ParsedRow[] = [];
  const warnings: ParseWarning[] = [];

  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let startIndex = 0;
  if (lines.length > 0) {
    const firstLower = lines[0].toLowerCase();
    if (firstLower.includes('nimi') || firstLower.includes('name')) {
      startIndex = 1; // skip header row
    }
  }

  for (let i = startIndex; i < lines.length; i++) {
    const lineNumber = i + 1;
    const line = lines[i];

    // Split by comma or semicolon
    const parts = line.split(/[,;]/).map((p) => p.trim());

    const name = parts[0] ?? '';
    const email = parts[1] ?? '';
    const cls = parts[2] ?? '';

    if (!name && !email) continue; // completely empty row

    if (!email) {
      warnings.push({ line: lineNumber, message: `Rida ${lineNumber}: e-posti aadress puudub ("${name}")` });
      continue;
    }

    if (!name) {
      warnings.push({ line: lineNumber, message: `Rida ${lineNumber}: nimi puudub ("${email}")` });
      continue;
    }

    // Basic email format check
    if (!email.includes('@') || !email.includes('.')) {
      warnings.push({ line: lineNumber, message: `Rida ${lineNumber}: vigane e-posti aadress ("${email}")` });
      continue;
    }

    rows.push({ name, email, class: cls });
  }

  return { rows, warnings };
}

// ── Styles ───────────────────────────────────────────────────────────────────

const COLORS = {
  bg: '#F8F3DA',
  border: '#DAD0A1',
  dark: '#1C2832',
  muted: '#6b7280',
  white: '#ffffff',
};

const card: React.CSSProperties = {
  background: COLORS.white,
  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  borderRadius: 8,
  padding: '24px 28px',
  marginBottom: 20,
};

const textarea: React.CSSProperties = {
  width: '100%',
  minHeight: 180,
  padding: '10px 12px',
  border: `1px solid ${COLORS.border}`,
  borderRadius: 6,
  fontFamily: 'monospace',
  fontSize: 13,
  color: COLORS.dark,
  background: COLORS.bg,
  resize: 'vertical',
  boxSizing: 'border-box',
};

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '9px 20px',
  background: COLORS.dark,
  color: COLORS.white,
  border: 'none',
  borderRadius: 6,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
};

const btnSecondary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '9px 20px',
  background: 'transparent',
  color: COLORS.dark,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 6,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
};

const warningBox: React.CSSProperties = {
  background: '#fffbeb',
  border: '1px solid #fcd34d',
  borderRadius: 6,
  padding: '10px 14px',
  marginTop: 14,
};

const errorBox: React.CSSProperties = {
  background: '#fef2f2',
  border: '1px solid #fca5a5',
  borderRadius: 6,
  padding: '10px 14px',
  marginTop: 14,
};

const table: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 13,
};

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 12px',
  background: COLORS.bg,
  color: COLORS.dark,
  fontWeight: 700,
  borderBottom: `2px solid ${COLORS.border}`,
};

const td: React.CSSProperties = {
  padding: '8px 12px',
  borderBottom: `1px solid ${COLORS.border}`,
  color: COLORS.dark,
  verticalAlign: 'top',
};

// ── Component ────────────────────────────────────────────────────────────────

export default function ImportClient() {
  const [step, setStep] = useState<Step>('upload');
  const [csvText, setCsvText] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [warnings, setWarnings] = useState<ParseWarning[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Step 1 handlers ────────────────────────────────────────────────────────

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text === 'string') setCsvText(text);
    };
    reader.readAsText(file, 'UTF-8');
  }

  function handleParse() {
    const { rows, warnings: w } = parseCsv(csvText);
    setParsedRows(rows);
    setWarnings(w);
    if (rows.length > 0) setStep('preview');
  }

  // ── Step 2 handlers ────────────────────────────────────────────────────────

  async function handleImport() {
    setImporting(true);
    setImportError(null);
    try {
      const res = await fetch('/api/students/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: parsedRows.map((r) => ({
            name: r.name,
            email: r.email,
            ...(r.class ? { class: r.class } : {}),
          })),
        }),
      });

      const data = await res.json() as { imported?: number; skipped?: number; errors?: string[]; error?: string };

      if (!res.ok) {
        setImportError(data.error ?? 'Serveriviga. Proovi uuesti.');
        return;
      }

      setResult({
        imported: data.imported ?? 0,
        skipped: data.skipped ?? 0,
        errors: data.errors ?? [],
      });
      setStep('result');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Serveriviga. Proovi uuesti.');
    } finally {
      setImporting(false);
    }
  }

  function handleBack() {
    setStep('upload');
    setWarnings([]);
    setParsedRows([]);
    setImportError(null);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (step === 'upload') {
    return (
      <div>
        <div style={card}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: COLORS.dark, marginBottom: 16 }}>
            1. samm — CSV-faili üleslaadimine
          </h2>

          {/* Format hint */}
          <div style={{
            background: COLORS.bg,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 6,
            padding: '12px 16px',
            marginBottom: 20,
            fontSize: 13,
          }}>
            <div style={{ fontWeight: 700, color: COLORS.dark, marginBottom: 6 }}>Oodatav formaat:</div>
            <code style={{ fontFamily: 'monospace', color: '#374151', display: 'block', marginBottom: 4 }}>
              Nimi,Email,Klass
            </code>
            <code style={{ fontFamily: 'monospace', color: '#374151', display: 'block' }}>
              Mari Maasikas,mari.maasikas@kool.ee,9.B
            </code>
            <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 8 }}>
              Eraldaja võib olla koma (,) või semikoolon (;). Päiserida on valikuline. Klass on valikuline väli.
            </div>
          </div>

          {/* File input */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: COLORS.dark, marginBottom: 6 }}>
              Lae üles .csv fail
            </label>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              style={{
                display: 'block',
                fontSize: 13,
                color: COLORS.dark,
                padding: '6px 0',
              }}
            />
          </div>

          <div style={{ textAlign: 'center', color: COLORS.muted, fontSize: 13, marginBottom: 16 }}>
            — või —
          </div>

          {/* Textarea */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: COLORS.dark, marginBottom: 6 }}>
              Kleebi CSV sisu
            </label>
            <textarea
              style={textarea}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={'Nimi,Email,Klass\nMari Maasikas,mari@kool.ee,9.B\nJaan Tamm,jaan@kool.ee,9.A'}
              spellCheck={false}
            />
          </div>

          <button
            style={{ ...btnPrimary, opacity: csvText.trim() ? 1 : 0.5 }}
            onClick={handleParse}
            disabled={!csvText.trim()}
          >
            Parsi CSV
          </button>
        </div>
      </div>
    );
  }

  if (step === 'preview') {
    return (
      <div>
        <div style={card}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: COLORS.dark, marginBottom: 4 }}>
            2. samm — Eelvaade
          </h2>
          <p style={{ fontSize: 13, color: COLORS.muted, marginBottom: 16 }}>
            {parsedRows.length} õpilast on impordimiseks valmis.
          </p>

          {warnings.length > 0 && (
            <div style={warningBox}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#92400e', marginBottom: 6 }}>
                Hoiatused ({warnings.length})
              </div>
              {warnings.map((w, i) => (
                <div key={i} style={{ fontSize: 12, color: '#78350f', marginBottom: 2 }}>
                  {w.message}
                </div>
              ))}
            </div>
          )}

          {importError && (
            <div style={errorBox}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#991b1b', marginBottom: 4 }}>
                Viga importimisel
              </div>
              <div style={{ fontSize: 13, color: '#7f1d1d' }}>{importError}</div>
            </div>
          )}

          {/* Preview table */}
          <div style={{ overflowX: 'auto', marginTop: 16, marginBottom: 20 }}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>#</th>
                  <th style={th}>Nimi</th>
                  <th style={th}>E-post</th>
                  <th style={th}>Klass</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.slice(0, 200).map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? COLORS.white : '#fafafa' }}>
                    <td style={{ ...td, color: COLORS.muted, width: 36 }}>{i + 1}</td>
                    <td style={td}>{row.name}</td>
                    <td style={td}>{row.email}</td>
                    <td style={{ ...td, color: row.class ? COLORS.dark : COLORS.muted }}>
                      {row.class || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              style={{ ...btnPrimary, opacity: importing ? 0.6 : 1 }}
              onClick={handleImport}
              disabled={importing}
            >
              {importing ? 'Impordimine…' : `Impordi ${parsedRows.length} õpilast`}
            </button>
            <button style={btnSecondary} onClick={handleBack} disabled={importing}>
              Tagasi
            </button>
          </div>
        </div>
      </div>
    );
  }

  // step === 'result'
  if (!result) return null;

  return (
    <div>
      <div style={card}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: COLORS.dark, marginBottom: 16 }}>
          3. samm — Tulemus
        </h2>

        {/* Summary badges */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
          <div style={{
            background: '#dcfce7',
            border: '1px solid #86efac',
            borderRadius: 8,
            padding: '12px 20px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#15803d' }}>{result.imported}</div>
            <div style={{ fontSize: 12, color: '#166534', fontWeight: 600 }}>Imporditud</div>
          </div>
          <div style={{
            background: '#f3f4f6',
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8,
            padding: '12px 20px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: COLORS.muted }}>{result.skipped}</div>
            <div style={{ fontSize: 12, color: COLORS.muted, fontWeight: 600 }}>Vahele jäetud (juba olemas)</div>
          </div>
          {result.errors.length > 0 && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              borderRadius: 8,
              padding: '12px 20px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#dc2626' }}>{result.errors.length}</div>
              <div style={{ fontSize: 12, color: '#991b1b', fontWeight: 600 }}>Viga</div>
            </div>
          )}
        </div>

        {/* Errors */}
        {result.errors.length > 0 && (
          <div style={errorBox}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#991b1b', marginBottom: 8 }}>
              Vead importimisel:
            </div>
            {result.errors.map((err, i) => (
              <div key={i} style={{ fontSize: 12, color: '#7f1d1d', marginBottom: 3 }}>
                {err}
              </div>
            ))}
          </div>
        )}

        {/* Info about password reset */}
        {result.imported > 0 && (
          <div style={{
            background: COLORS.bg,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 6,
            padding: '12px 16px',
            fontSize: 13,
            color: '#374151',
            marginTop: 16,
            marginBottom: 20,
          }}>
            <strong>NB!</strong> Imporditud õpilastel pole parooli. Nad peavad kasutama{' '}
            &quot;Unustasin parooli&quot; funktsiooni, et oma konto aktiveerida.
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link
            href="/dashboard/students"
            style={{ ...btnPrimary, textDecoration: 'none' }}
          >
            Vaata õpilaste nimekirja
          </Link>
          <button
            style={btnSecondary}
            onClick={() => {
              setStep('upload');
              setCsvText('');
              setParsedRows([]);
              setWarnings([]);
              setResult(null);
              setImportError(null);
            }}
          >
            Impordi veel
          </button>
        </div>
      </div>
    </div>
  );
}
