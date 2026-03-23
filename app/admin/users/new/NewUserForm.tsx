'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface School {
  id: string;
  name: string;
  type: string;
  city: string;
}

interface Props {
  schools: School[];
  callerRole: string;
}

const ALL_ROLES = [
  { value: 'SUPERADMIN',   label: 'Superadmin',  tier: 1, desc: 'Täielik juurdepääs, haldab kõiki' },
  { value: 'SCHOOL_ADMIN', label: 'Kooli admin', tier: 2, desc: 'Haldab konkreetset kooli' },
  { value: 'TEACHER',      label: 'Õpetaja',     tier: 3, desc: 'Laeb üles ja analüüsib töid' },
  { value: 'STUDENT',      label: 'Õpilane',     tier: 3, desc: 'Teeb koduseid töid, näeb tulemusi' },
  { value: 'PARENT',       label: 'Lapsevanem',  tier: 3, desc: 'Annab nõusoleku, valib ained' },
];

const NEEDS_SCHOOL = ['SCHOOL_ADMIN', 'TEACHER', 'STUDENT'];

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1.5px solid #DAD0A1',
  borderRadius: 4,
  fontSize: 14,
  color: '#1C2832',
  background: '#fff',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#1C2832',
  marginBottom: 6,
};

export default function NewUserForm({ schools, callerRole }: Props) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('TEACHER');
  const [schoolId, setSchoolId] = useState('');
  const [className, setClassName] = useState('');
  const [grade, setGrade] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Only SUPERADMIN can create other SUPERADMINs or SCHOOL_ADMINs
  const availableRoles = ALL_ROLES.filter((r) => {
    if (r.value === 'SUPERADMIN' || r.value === 'SCHOOL_ADMIN') {
      return callerRole === 'SUPERADMIN';
    }
    return true;
  });

  const needsSchool = NEEDS_SCHOOL.includes(role);
  const selectedRole = ALL_ROLES.find((r) => r.value === role);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Kõik tärniga märgitud väljad on kohustuslikud.');
      return;
    }
    if (password.length < 8) {
      setError('Parool peab olema vähemalt 8 tähemärki.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          role,
          schoolId: needsSchool && schoolId ? schoolId : undefined,
          className: role === 'STUDENT' && className ? className.trim() : undefined,
          grade: role === 'STUDENT' && grade ? grade : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Kasutaja lisamine ebaõnnestus.');
        return;
      }
      router.push('/admin/users');
    } catch {
      setError('Võrguühenduse viga. Proovi uuesti.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div
        style={{
          background: '#fff',
          boxShadow: '0 2px 16px rgba(28,40,50,0.08)',
          borderRadius: 8,
          padding: '36px 32px',
          maxWidth: 560,
        }}
      >
        <Link
          href="/admin/users"
          style={{ fontSize: 13, color: '#1C2832', opacity: 0.6, textDecoration: 'none' }}
        >
          ← Kasutajad
        </Link>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1C2832', marginTop: 8, marginBottom: 28 }}>
          Lisa kasutaja
        </h1>

        {/* Role hierarchy info */}
        <div
          style={{
            background: '#F8F3DA',
            border: '1.5px solid #DAD0A1',
            borderRadius: 6,
            padding: '14px 16px',
            marginBottom: 28,
            fontSize: 13,
            color: '#1C2832',
            lineHeight: 1.6,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Rollide hierarhia</div>
          <div>🔴 <strong>Superadmin</strong> — kõik õigused, loob teisi administraatoreid</div>
          <div>🟠 <strong>Kooli admin / Admin</strong> — kasutajate ja koolide haldamine</div>
          <div>🟢 <strong>Õpetaja / Klassijuhataja / Õpilane / Lapsevanem</strong> — tavaroll</div>
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
            Täpset juurdepääsumaatrixit vaata <Link href="/admin/roles" style={{ color: '#1C2832', fontWeight: 700 }}>rollide lehel</Link>.
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={labelStyle}>Täisnimi *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="nt. Mari Mägi"
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>E-post *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nt. mari@kool.ee"
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Ajutine parool * (vähemalt 8 märki)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Kasutaja muudab seda ise"
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Roll *</label>
            <select
              value={role}
              onChange={(e) => { setRole(e.target.value); setSchoolId(''); setClassName(''); setGrade(''); }}
              style={inputStyle}
            >
              {callerRole === 'SUPERADMIN' && (
                <optgroup label="Administraatorid">
                  {availableRoles.filter((r) => r.tier <= 2).map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label} — {r.desc}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Kasutajad">
                {availableRoles.filter((r) => r.tier === 3).map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label} — {r.desc}
                  </option>
                ))}
              </optgroup>
            </select>
            {selectedRole && (
              <div style={{ marginTop: 6, fontSize: 12, color: '#1C2832', opacity: 0.7, padding: '6px 10px', background: '#F8F3DA', borderRadius: 4 }}>
                {selectedRole.tier === 1 && '🔴 '}
                {selectedRole.tier === 2 && '🟠 '}
                {selectedRole.tier === 3 && '🟢 '}
                {selectedRole.desc}
              </div>
            )}
          </div>

          {needsSchool && (
            <div>
              <label style={labelStyle}>
                Kool {role === 'STUDENT' || role === 'SCHOOL_ADMIN' ? '*' : '(valikuline)'}
              </label>
              {schools.length === 0 ? (
                <div style={{ fontSize: 13, color: '#dc2626' }}>
                  Koole ei leitud.{' '}
                  <Link href="/admin/schools/new" style={{ color: '#dc2626', fontWeight: 700 }}>
                    Lisa kool esmalt
                  </Link>
                </div>
              ) : (
                <select
                  value={schoolId}
                  onChange={(e) => setSchoolId(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Vali kool…</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.city})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {role === 'STUDENT' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Klass</label>
                <input
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="nt. 9.B"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Kooliaste</label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  style={inputStyle}
                >
                  <option value=""></option>
                  {['1','2','3','4','5','6','7','8','9','10','11','12'].map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {error && (
            <div
              style={{
                background: '#fff0f0',
                border: '1px solid #fca5a5',
                color: '#dc2626',
                borderRadius: 4,
                padding: '10px 14px',
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                background: submitting ? '#6b7f8b' : '#1C2832',
                color: '#F8F3DA',
                fontWeight: 700,
                fontSize: 14,
                padding: '12px 24px',
                border: 'none',
                borderRadius: 4,
                cursor: submitting ? 'not-allowed' : 'pointer',
                flex: 1,
              }}
            >
              {submitting ? 'Lisan…' : 'Lisa kasutaja'}
            </button>
            <Link
              href="/admin/users"
              style={{
                background: '#F8F3DA',
                color: '#1C2832',
                fontWeight: 600,
                fontSize: 14,
                padding: '12px 20px',
                border: '1.5px solid #DAD0A1',
                borderRadius: 4,
                textDecoration: 'none',
                textAlign: 'center',
              }}
            >
              Tühista
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
