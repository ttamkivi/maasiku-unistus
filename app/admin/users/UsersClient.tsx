'use client';

import { useState } from 'react';
import Link from 'next/link';

interface AiConsent {
  hasConsent: boolean;
  consentBy: string | null;
  consentAt: string | null;
  isEligible: boolean;
  eligibleAt: string | null;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
  createdAtStr: string;
  aiConsent: AiConsent | null;
  studentProfileId: string | null;
}

interface Props {
  users: UserRow[];
  callerRole: string;
  callerId: string;
  roleFilter?: string;
}

const ALL_ROLES = [
  { value: 'SUPERADMIN',     label: 'Superadmin',     color: '#dc2626' },
  { value: 'SCHOOL_ADMIN',   label: 'Kooli admin',    color: '#ea580c' },
  { value: 'ADMIN',          label: 'Admin',          color: '#9333ea' },
  { value: 'TEACHER',        label: 'Õpetaja',        color: '#1C2832' },
  { value: 'KLASSIJUHATAJA', label: 'Klassijuhataja', color: '#0369a1' },
  { value: 'STUDENT',        label: 'Õpilane',        color: '#2563eb' },
  { value: 'PARENT',         label: 'Lapsevanem',     color: '#16a34a' },
];

const ROLE_COLORS: Record<string, string> = Object.fromEntries(ALL_ROLES.map((r) => [r.value, r.color]));
const ROLE_LABELS: Record<string, string> = Object.fromEntries(ALL_ROLES.map((r) => [r.value, r.label]));
const SUPERADMIN_ONLY = ['SUPERADMIN', 'SCHOOL_ADMIN'];
const FILTER_ROLES = ['SUPERADMIN', 'SCHOOL_ADMIN', 'ADMIN', 'TEACHER', 'KLASSIJUHATAJA', 'STUDENT', 'PARENT'];

function canChangeRole(callerRole: string, targetRole: string): boolean {
  if (callerRole === 'SUPERADMIN') return true;
  if (targetRole === 'SUPERADMIN') return false; // can't touch SUPERADMIN
  return ['ADMIN', 'SCHOOL_ADMIN'].includes(callerRole);
}

function availableRolesFor(callerRole: string): typeof ALL_ROLES {
  if (callerRole === 'SUPERADMIN') return ALL_ROLES;
  return ALL_ROLES.filter((r) => !SUPERADMIN_ONLY.includes(r.value));
}

function AiConsentCell({ consent, studentProfileId }: { consent: AiConsent; studentProfileId: string | null }) {
  const { hasConsent, consentBy, consentAt, isEligible, eligibleAt } = consent;

  if (!hasConsent && !isEligible) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 11, fontWeight: 700, color: '#b91c1c',
          background: '#fee2e2', border: '1px solid #fca5a5',
          padding: '2px 8px', borderRadius: 10, width: 'fit-content',
        }}>
          ✕ Puudub
        </span>
        {studentProfileId && (
          <a href={`/admin/permissions/${studentProfileId}`} style={{ fontSize: 11, color: '#6b7280', textDecoration: 'underline' }}>
            Halda →
          </a>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Parental consent */}
      <div>
        {hasConsent ? (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontWeight: 700, color: '#15803d',
            background: '#dcfce7', border: '1px solid #86efac',
            padding: '2px 8px', borderRadius: 10,
          }}>
            ✓ Vanem nõus
          </span>
        ) : (
          <span style={{
            fontSize: 11, fontWeight: 700, color: '#b45309',
            background: '#fef3c7', border: '1px solid #fde68a',
            padding: '2px 8px', borderRadius: 10,
          }}>
            ○ Vanem puudub
          </span>
        )}
        {consentBy && (
          <div style={{ fontSize: 11, color: '#4b5563', marginTop: 2 }}>
            {consentBy}{consentAt ? ` · ${consentAt}` : ''}
          </div>
        )}
      </div>

      {/* KJ eligibility */}
      <div>
        {isEligible ? (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontWeight: 700, color: '#1d4ed8',
            background: '#dbeafe', border: '1px solid #bfdbfe',
            padding: '2px 8px', borderRadius: 10,
          }}>
            ✓ KJ kinnitanud
          </span>
        ) : (
          <span style={{
            fontSize: 11, fontWeight: 600, color: '#6b7280',
          }}>
            ○ KJ ei kinnitanud
          </span>
        )}
        {isEligible && eligibleAt && (
          <div style={{ fontSize: 11, color: '#4b5563', marginTop: 2 }}>{eligibleAt}</div>
        )}
      </div>

      {studentProfileId && (
        <a href={`/admin/permissions/${studentProfileId}`} style={{ fontSize: 11, color: '#6b7280', textDecoration: 'underline' }}>
          Halda →
        </a>
      )}
    </div>
  );
}

export default function UsersClient({ users: initialUsers, callerRole, callerId, roleFilter }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [changingId, setChangingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const filtered = users.filter((u) => {
    if (roleFilter && u.role !== roleFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    }
    return true;
  });

  async function handleRoleChange(userId: string, newRole: string) {
    setError('');
    setChangingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Roll ei muutunud');
        return;
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, role: newRole, roleLabel: ROLE_LABELS[newRole] ?? newRole }
            : u
        )
      );
    } catch {
      setError('Võrguühenduse viga');
    } finally {
      setChangingId(null);
    }
  }

  async function handleDelete(userId: string, userName: string) {
    if (!confirm(`Kas kustutad kasutaja "${userName}"? Seda ei saa tagasi võtta.`)) return;
    setError('');
    setChangingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Kustutamine ebaõnnestus');
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch {
      setError('Võrguühenduse viga');
    } finally {
      setChangingId(null);
    }
  }

  const isSuperAdmin = callerRole === 'SUPERADMIN';
  // Show AI consent column when viewing all users or filtering by STUDENT
  const showingStudents = !roleFilter || roleFilter === 'STUDENT';

  return (
    <div>
      <div
        style={{
          background: '#fff',
          boxShadow: '0 2px 16px rgba(28,40,50,0.08)',
          borderRadius: 8,
          padding: '36px 32px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
          <div>
            <Link href="/admin" style={{ fontSize: 13, color: '#1C2832', opacity: 0.6, textDecoration: 'none' }}>
              ← Admin paneel
            </Link>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1C2832', marginTop: 4 }}>
              Kasutajad
            </h1>
            <p style={{ fontSize: 13, color: '#1C2832', opacity: 0.6, marginTop: 2 }}>
              Kokku {users.length} kasutajat
              {isSuperAdmin && (
                <> · <Link href="/admin/roles" style={{ color: '#9333ea', fontWeight: 600, textDecoration: 'none' }}>Rollide maatriks</Link></>
              )}
            </p>
          </div>
          <Link
            href="/admin/users/new"
            style={{
              background: '#1C2832',
              color: '#fff',
              fontWeight: 700,
              fontSize: 14,
              padding: '10px 20px',
              textDecoration: 'none',
              borderRadius: 6,
              whiteSpace: 'nowrap',
            }}
          >
            + Lisa kasutaja
          </Link>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Otsi nime või e-posti järgi…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '9px 12px',
            border: '1.5px solid #DAD0A1',
            borderRadius: 6,
            fontSize: 14,
            marginBottom: 16,
            boxSizing: 'border-box',
          }}
        />

        {/* Role filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <Link
            href="/admin/users"
            style={{
              fontSize: 13, fontWeight: 600, padding: '6px 14px', borderRadius: 20,
              textDecoration: 'none',
              background: !roleFilter ? '#1C2832' : '#F8F3DA',
              color: !roleFilter ? '#fff' : '#1C2832',
              border: '1.5px solid #DAD0A1',
            }}
          >
            Kõik
          </Link>
          {FILTER_ROLES.map((r) => (
            <Link
              key={r}
              href={`/admin/users?role=${r}`}
              style={{
                fontSize: 13, fontWeight: 600, padding: '6px 14px', borderRadius: 20,
                textDecoration: 'none',
                background: roleFilter === r ? '#1C2832' : '#F8F3DA',
                color: roleFilter === r ? '#fff' : '#1C2832',
                border: '1.5px solid #DAD0A1',
              }}
            >
              {ROLE_LABELS[r]}
            </Link>
          ))}
        </div>

        {error && (
          <div
            style={{
              background: '#fff0f0', border: '1px solid #fca5a5', color: '#dc2626',
              borderRadius: 4, padding: '10px 14px', fontSize: 13, marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        {/* Table */}
        {filtered.length === 0 ? (
          <p style={{ color: '#1C2832', opacity: 0.5, fontSize: 14, padding: '24px 0' }}>
            Kasutajaid ei leitud.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #DAD0A1' }}>
                  {[
                    'Nimi', 'E-post', 'Roll', 'Liitunud',
                    ...(showingStudents ? ['AI analüüs'] : []),
                    ...(isSuperAdmin ? ['Tegevused'] : []),
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left', padding: '10px 12px', fontWeight: 700,
                        color: '#1C2832', whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((user, i) => {
                  const color = ROLE_COLORS[user.role] ?? '#888';
                  const isMe = user.id === callerId;
                  const canChange = !isMe && canChangeRole(callerRole, user.role);
                  const availRoles = availableRolesFor(callerRole);
                  const isChanging = changingId === user.id;

                  return (
                    <tr
                      key={user.id}
                      style={{
                        borderBottom: '1px solid #F0EDD6',
                        background: i % 2 === 0 ? '#fff' : '#FDFAF0',
                        opacity: isChanging ? 0.6 : 1,
                      }}
                    >
                      <td style={{ padding: '12px 12px', color: '#1C2832', fontWeight: 600 }}>
                        {user.name}
                        {isMe && (
                          <span style={{ marginLeft: 6, fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>
                            (mina)
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 12px', color: '#1C2832', opacity: 0.8 }}>
                        {user.email}
                      </td>
                      <td style={{ padding: '12px 12px' }}>
                        {canChange ? (
                          <select
                            value={user.role}
                            disabled={isChanging}
                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                            style={{
                              padding: '4px 8px',
                              border: `1.5px solid ${color}50`,
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 700,
                              color: color,
                              background: color + '12',
                              cursor: 'pointer',
                              outline: 'none',
                            }}
                          >
                            {availRoles.map((r) => (
                              <option key={r.value} value={r.value}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            style={{
                              background: color + '18',
                              color: color,
                              fontWeight: 700,
                              fontSize: 12,
                              padding: '3px 10px',
                              borderRadius: 12,
                              border: `1px solid ${color}40`,
                            }}
                          >
                            {user.roleLabel}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 12px', color: '#1C2832', opacity: 0.6, fontSize: 13 }}>
                        {user.createdAtStr}
                      </td>

                      {/* AI consent column — only for student rows */}
                      {showingStudents && (
                        <td style={{ padding: '12px 12px' }}>
                          {user.aiConsent ? (
                            <AiConsentCell consent={user.aiConsent} studentProfileId={user.studentProfileId} />
                          ) : (
                            <span style={{ fontSize: 12, color: '#9ca3af' }}>—</span>
                          )}
                        </td>
                      )}

                      {isSuperAdmin && (
                        <td style={{ padding: '12px 12px' }}>
                          {!isMe ? (
                            <button
                              onClick={() => handleDelete(user.id, user.name)}
                              disabled={isChanging}
                              style={{
                                background: 'transparent',
                                color: '#dc2626',
                                border: '1px solid #fca5a5',
                                borderRadius: 4,
                                padding: '4px 10px',
                                fontSize: 12,
                                cursor: isChanging ? 'not-allowed' : 'pointer',
                                fontWeight: 600,
                              }}
                            >
                              Kustuta
                            </button>
                          ) : (
                            <span style={{ fontSize: 12, color: '#9ca3af' }}>—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
