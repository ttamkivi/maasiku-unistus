'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import posthog from 'posthog-js';
import { PROTOTYPE_MODE } from '@/lib/prototype-mode';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  onboardingCompleted?: boolean;
  features?: Record<string, boolean>;
}

const ROLE_LABELS: Record<string, string> = {
  TEACHER:        'Õpetaja',
  STUDENT:        'Õpilane',
  PARENT:         'Lapsevanem',
  ADMIN:          'Admin',
  SUPERADMIN:     'Superadmin',
  KLASSIJUHATAJA: 'Klassijuhataja',
  SCHOOL_ADMIN:   'Kooli admin',
};

const ALL_ROLES = [
  { value: 'SUPERADMIN',    label: 'Superadmin' },
  { value: 'SCHOOL_ADMIN',  label: 'Kooli admin' },
  { value: 'ADMIN',         label: 'Admin' },
  { value: 'TEACHER',       label: 'Õpetaja' },
  { value: 'KLASSIJUHATAJA',label: 'Klassijuhataja' },
  { value: 'STUDENT',       label: 'Õpilane' },
  { value: 'PARENT',        label: 'Lapsevanem' },
];

const TEACHER_TABS = [
  { href: '/dashboard/teacher',  icon: '📊', label: 'Ülevaade' },
  { href: '/dashboard/library',  icon: '📚', label: 'Raamatukogu' },
  { href: '/dashboard/classes',  icon: '🏫', label: 'Klassid' },
  { href: '/dashboard/students', icon: '👥', label: 'Minu klass' },
  { href: '/dashboard/consents', icon: '✅', label: 'Nõusolekud' },
  { href: '/dashboard/invites',  icon: '✉️', label: 'Kutsu' },
  { href: '/dashboard',          icon: '👤', label: 'Profiil' },
];

const STUDENT_TABS = [
  { href: '/dashboard/student',     icon: '📊', label: 'Tulemused' },
  { href: '/dashboard/exercises',   icon: '📓', label: 'Harjutused' },
  { href: '/dashboard/assignments', icon: '📚', label: 'Kodutööd' },
  { href: '/dashboard',             icon: '👤', label: 'Profiil' },
];

const PARENT_TABS = [
  { href: '/dashboard/parent', icon: '👶', label: 'Laps' },
  { href: '/dashboard',        icon: '👤', label: 'Profiil' },
];

const ADMIN_TABS = [
  { href: '/admin',    icon: '⚙️', label: 'Admin' },
  { href: '/dashboard', icon: '👤', label: 'Profiil' },
];

const KLASSIJUHATAJA_TABS = [
  { href: '/dashboard/klassijuhataja', icon: '🏫', label: 'Klass' },
  { href: '/dashboard',                icon: '👤', label: 'Profiil' },
];

function getTabsForRole(role: string, features?: Record<string, boolean>) {
  const exercisesEnabled = features?.STUDENT_EXERCISES ?? false;
  const assignmentsEnabled = features?.ASSIGNMENTS_ENABLED ?? false;

  switch (role) {
    case 'TEACHER': {
      const baseTabs = PROTOTYPE_MODE
        ? [
            { href: '/dashboard/teacher',  icon: '📊', label: 'Ülevaade' },
            { href: '/dashboard/library',  icon: '📚', label: 'Raamatukogu' },
            { href: '/dashboard/consents', icon: '✅', label: 'Nõusolekud' },
          ]
        : TEACHER_TABS;
      const tabs = [
        ...baseTabs,
        ...(exercisesEnabled && !PROTOTYPE_MODE ? [{ href: '/dashboard/exercises', icon: '📓', label: 'Harjutused' }] : []),
        ...(assignmentsEnabled && !PROTOTYPE_MODE ? [{ href: '/dashboard/assignments', icon: '📚', label: 'Kodutööd' }] : []),
      ];
      return tabs;
    }
    case 'STUDENT': {
      const tabs = [
        ...(features?.DASHBOARD_STUDENT !== false ? [{ href: '/dashboard/student', icon: '📊', label: 'Tulemused' }] : []),
        ...(exercisesEnabled ? [{ href: '/dashboard/exercises', icon: '📓', label: 'Harjutused' }] : []),
        ...(assignmentsEnabled ? [{ href: '/dashboard/assignments', icon: '📚', label: 'Kodutööd' }] : []),
        { href: '/dashboard', icon: '👤', label: 'Profiil' },
      ];
      return tabs;
    }
    case 'PARENT':
      return features?.DASHBOARD_PARENT !== false ? PARENT_TABS : [{ href: '/dashboard', icon: '👤', label: 'Profiil' }];
    case 'KLASSIJUHATAJA':
      return features?.DASHBOARD_KLASSIJUHATAJA !== false ? KLASSIJUHATAJA_TABS : [{ href: '/dashboard', icon: '👤', label: 'Profiil' }];
    case 'ADMIN':
    case 'SUPERADMIN':
    case 'SCHOOL_ADMIN':   return ADMIN_TABS;
    default: return [];
  }
}

function readPreviewRoleCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)ot_preview_role=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export default function NavBar() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [previewRole, setPreviewRole] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => { if (!res.ok) return null; return res.json(); })
      .then((data) => {
        if (data && data.id) {
          setUser(data);
          posthog.identify(data.id, { email: data.email, role: data.role });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Read preview role from cookie (client-readable, not httpOnly)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreviewRole(readPreviewRoleCookie());
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false);
  }, [pathname]);

  async function handleLogout() {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    posthog.reset();
    window.location.href = '/';
  }

  async function handleSetPreviewRole(role: string) {
    if (role === '') {
      await fetch('/api/admin/preview-role', { method: 'DELETE' });
      setPreviewRole(null);
    } else {
      await fetch('/api/admin/preview-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      setPreviewRole(role);
    }
  }

  // Effective role: preview role (if SUPERADMIN is previewing) or real role
  const isSuperAdmin = user?.role === 'SUPERADMIN';
  const effectiveRole = (isSuperAdmin && previewRole) ? previewRole : (user?.role ?? '');
  const tabs = user ? getTabsForRole(effectiveRole, user.features) : [];
  const isActive = (href: string) => pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
  const isPreviewMode = isSuperAdmin && !!previewRole && previewRole !== 'SUPERADMIN';

  return (
    <>
      {/* Preview mode banner */}
      {isPreviewMode && (
        <div style={{
          background: '#7c3aed',
          color: '#fff',
          fontSize: 13,
          fontWeight: 600,
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          zIndex: 200,
          position: 'relative',
        }}>
          <span>👁 Vaatad UI-d rollina: <strong>{ROLE_LABELS[previewRole] ?? previewRole}</strong></span>
          <button
            onClick={() => handleSetPreviewRole('')}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.4)',
              borderRadius: 4,
              padding: '3px 10px',
              fontSize: 12,
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            Lõpeta eelvaade
          </button>
        </div>
      )}

      {/* Top nav */}
      <nav style={{ background: '#F8F3DA', borderBottom: '2px solid #DAD0A1', position: 'sticky', top: isPreviewMode ? 0 : 0, zIndex: 100 }}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#1C2832', letterSpacing: '-0.5px' }}>
              Õpetaja Tagasiside
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-5">
            {loading ? null : user ? (
              <>
                {tabs.map(tab => (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    style={{
                      color: isActive(tab.href) ? '#1C2832' : '#6b7280',
                      fontSize: 14,
                      fontWeight: isActive(tab.href) ? 700 : 500,
                      textDecoration: 'none',
                      borderBottom: isActive(tab.href) ? '2px solid #1C2832' : 'none',
                      paddingBottom: 2,
                    }}
                  >
                    {tab.label}
                  </Link>
                ))}

                {/* Onboarding link for teachers/admins who haven't completed setup */}
                {!user.onboardingCompleted && (user.role === 'TEACHER' || user.role === 'SCHOOL_ADMIN') && (
                  <Link
                    href="/dashboard/onboarding"
                    style={{
                      background: '#f97316',
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: 700,
                      padding: '5px 12px',
                      textDecoration: 'none',
                      borderRadius: 4,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    ✦ Lõpeta seadistus
                  </Link>
                )}

                {/* SUPERADMIN role preview selector */}
                {isSuperAdmin && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700, textTransform: 'uppercase' }}>Eelvaade:</span>
                    <select
                      value={previewRole ?? ''}
                      onChange={(e) => handleSetPreviewRole(e.target.value)}
                      style={{
                        fontSize: 12,
                        padding: '4px 8px',
                        border: '1.5px solid #7c3aed',
                        borderRadius: 4,
                        background: previewRole ? '#f5f3ff' : '#fff',
                        color: '#1C2832',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="">— Minu roll —</option>
                      {ALL_ROLES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, color: '#1C2832', fontWeight: 600, opacity: 0.75 }}>
                    {user.name}
                  </span>
                  <span style={{
                    fontSize: 11,
                    background: isPreviewMode ? '#7c3aed' : '#DAD0A1',
                    color: isPreviewMode ? '#fff' : '#1C2832',
                    borderRadius: 4,
                    padding: '2px 6px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}>
                    {isPreviewMode ? ROLE_LABELS[previewRole!] : (ROLE_LABELS[user.role] ?? user.role)}
                  </span>
                </div>
                <Link
                  href="/dashboard/feedback"
                  style={{
                    fontSize: 12,
                    color: '#6b7280',
                    textDecoration: 'none',
                    padding: '5px 10px',
                    border: '1px solid #d1d5db',
                    borderRadius: 4,
                  }}
                >
                  💬 Tagasiside
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    background: '#1C2832', color: '#F8F3DA',
                    fontSize: 13, fontWeight: 700, padding: '7px 14px',
                    border: 'none', cursor: 'pointer', borderRadius: 4,
                  }}
                >
                  Välja
                </button>
              </>
            ) : (
              <>
                <Link href="/demo" style={{ color: '#1C2832', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                  Näidised
                </Link>
                <Link href="/legal" style={{ color: '#1C2832', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                  Õiguslik
                </Link>
                <Link
                  href="/auth/login"
                  style={{ color: '#1C2832', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
                >
                  Logi sisse
                </Link>
                <Link
                  href="/auth/register"
                  style={{ background: '#1C2832', color: '#fff', fontSize: 14, fontWeight: 700, padding: '8px 18px', textDecoration: 'none', borderRadius: 4 }}
                >
                  Registreeru
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="flex md:hidden items-center justify-center"
            onClick={() => setMenuOpen(m => !m)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#1C2832', padding: 4 }}
            aria-label="Menüü"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div style={{ background: '#F8F3DA', borderTop: '1px solid #DAD0A1', padding: '12px 16px 16px' }}>
            {loading ? null : user ? (
              <>
                <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #DAD0A1' }}>
                  <div style={{ fontWeight: 700, color: '#1C2832', fontSize: 15 }}>{user.name}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    {isPreviewMode ? `Eelvaade: ${ROLE_LABELS[previewRole!]}` : (ROLE_LABELS[user.role] ?? user.role)}
                  </div>
                </div>

                {/* Mobile role preview selector for SUPERADMIN */}
                {isSuperAdmin && (
                  <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #DAD0A1' }}>
                    <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>
                      Vaata UI-d rollina:
                    </div>
                    <select
                      value={previewRole ?? ''}
                      onChange={(e) => handleSetPreviewRole(e.target.value)}
                      style={{
                        width: '100%',
                        fontSize: 14,
                        padding: '8px 10px',
                        border: '1.5px solid #7c3aed',
                        borderRadius: 4,
                        background: previewRole ? '#f5f3ff' : '#fff',
                        color: '#1C2832',
                      }}
                    >
                      <option value="">— Minu roll (Superadmin) —</option>
                      {ALL_ROLES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {tabs.map(tab => (
                    <Link
                      key={tab.href}
                      href={tab.href}
                      style={{
                        padding: '10px 8px',
                        color: isActive(tab.href) ? '#1C2832' : '#374151',
                        fontWeight: isActive(tab.href) ? 700 : 500,
                        textDecoration: 'none',
                        fontSize: 15,
                        background: isActive(tab.href) ? 'rgba(218,208,161,0.4)' : 'transparent',
                        borderRadius: 6,
                      }}
                    >
                      {tab.icon} {tab.label}
                    </Link>
                  ))}

                  {/* Onboarding link for teachers/admins who haven't completed setup */}
                  {!user.onboardingCompleted && (user.role === 'TEACHER' || user.role === 'SCHOOL_ADMIN') && (
                    <Link
                      href="/dashboard/onboarding"
                      style={{
                        padding: '10px 8px',
                        color: '#fff',
                        fontWeight: 700,
                        textDecoration: 'none',
                        fontSize: 15,
                        background: '#f97316',
                        borderRadius: 6,
                      }}
                    >
                      ✦ Lõpeta seadistus
                    </Link>
                  )}

                  <Link
                    href="/dashboard/feedback"
                    style={{
                      padding: '10px 8px',
                      color: '#374151',
                      fontWeight: 500,
                      textDecoration: 'none',
                      fontSize: 15,
                      borderRadius: 6,
                    }}
                  >
                    💬 Tagasiside
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    style={{
                      marginTop: 8,
                      background: '#1C2832', color: '#F8F3DA',
                      fontSize: 14, fontWeight: 700, padding: '12px',
                      border: 'none', cursor: 'pointer', borderRadius: 6,
                      textAlign: 'left',
                    }}
                  >
                    🚪 Logi välja
                  </button>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Link href="/demo" style={{ color: '#374151', fontSize: 15, fontWeight: 500, textDecoration: 'none', padding: '8px 0' }}>
                  Näidised
                </Link>
                <Link href="/auth/login" style={{ color: '#374151', fontSize: 15, fontWeight: 500, textDecoration: 'none', padding: '8px 0' }}>
                  Logi sisse
                </Link>
                <Link href="/auth/register" style={{
                  background: '#1C2832', color: '#fff', fontSize: 15,
                  fontWeight: 700, padding: '12px', textDecoration: 'none',
                  borderRadius: 6, textAlign: 'center', display: 'block',
                }}>
                  Registreeru
                </Link>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Mobile bottom tab bar */}
      {user && tabs.length > 0 && pathname.startsWith('/dashboard') && (
        <nav
          className="flex md:hidden fixed bottom-0 left-0 right-0 z-50"
          style={{ background: '#fff', borderTop: '1px solid #e5e7eb', paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {tabs.map(tab => {
            const active = isActive(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '8px 4px',
                  textDecoration: 'none',
                  color: active ? '#1C2832' : '#9ca3af',
                  background: active ? '#F8F3DA' : 'transparent',
                  borderTop: active ? '2px solid #1C2832' : '2px solid transparent',
                }}
              >
                <span style={{ fontSize: 20 }}>{tab.icon}</span>
                <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, marginTop: 2 }}>{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </>
  );
}
