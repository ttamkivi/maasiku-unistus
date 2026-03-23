'use client';

import { useState, useEffect, useRef } from 'react';

interface Parent {
  id: string;
  userId: string;
  name: string;
  email: string;
}

interface Props {
  studentId: string;
  linkedParents: Parent[];
}

export function ParentLinkSection({ studentId, linkedParents: initialLinkedParents }: Props) {
  const [linkedParents, setLinkedParents] = useState<Parent[]>(initialLinkedParents);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Parent[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [linking, setLinking] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!search.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/admin/permissions/${studentId}/parents?search=${encodeURIComponent(search.trim())}`
        );
        const data = await res.json();
        if (res.ok) {
          setResults(data.parents ?? []);
          setShowDropdown(true);
        }
      } catch {
        // ignore
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, studentId]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLink = async (parent: Parent) => {
    setLinking(parent.id);
    // Optimistic UI
    setLinkedParents((prev) => [...prev, parent]);
    setSearch('');
    setResults([]);
    setShowDropdown(false);
    try {
      const res = await fetch(`/api/admin/permissions/${studentId}/parents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId: parent.id }),
      });
      if (!res.ok) {
        // Revert on error
        setLinkedParents((prev) => prev.filter((p) => p.id !== parent.id));
        const d = await res.json();
        alert(d.error || 'Sidumine ebaõnnestus');
      }
    } catch {
      setLinkedParents((prev) => prev.filter((p) => p.id !== parent.id));
      alert('Võrguühenduse viga');
    } finally {
      setLinking(null);
    }
  };

  const handleRemove = async (parentId: string) => {
    if (!confirm('Kas oled kindel, et soovid lapsevanema eemaldada?')) return;
    setRemoving(parentId);
    const previous = [...linkedParents];
    // Optimistic UI
    setLinkedParents((prev) => prev.filter((p) => p.id !== parentId));
    try {
      const res = await fetch(`/api/admin/permissions/${studentId}/parents`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId }),
      });
      if (!res.ok) {
        setLinkedParents(previous);
        const d = await res.json();
        alert(d.error || 'Eemaldamine ebaõnnestus');
      }
    } catch {
      setLinkedParents(previous);
      alert('Võrguühenduse viga');
    } finally {
      setRemoving(null);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    border: '1.5px solid #DAD0A1',
    fontSize: 14,
    color: '#1C2832',
    background: '#fff',
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div>
      {linkedParents.length === 0 ? (
        <p style={{ fontSize: 14, color: '#1C2832', opacity: 0.5, marginBottom: 16 }}>
          Ühtegi lapsevanemat pole seotud.
        </p>
      ) : (
        <div style={{ marginBottom: 16 }}>
          {linkedParents.map((p) => (
            <div
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderBottom: '1px solid #F0EDD6',
                background: '#fff',
              }}
            >
              <div>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#1C2832' }}>{p.name}</span>
                <span style={{ fontSize: 13, color: '#1C2832', opacity: 0.6, marginLeft: 10 }}>
                  {p.email}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(p.id)}
                disabled={removing === p.id}
                style={{
                  background: removing === p.id ? '#6b7280' : '#fee2e2',
                  color: removing === p.id ? '#fff' : '#991b1b',
                  border: '1px solid #fca5a5',
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '4px 12px',
                  cursor: removing === p.id ? 'not-allowed' : 'pointer',
                }}
              >
                {removing === p.id ? '...' : 'Eemalda'}
              </button>
            </div>
          ))}
        </div>
      )}

      <div ref={containerRef} style={{ position: 'relative', maxWidth: 400 }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          placeholder="Otsi lapsevanemat..."
          style={inputStyle}
        />
        {searching && (
          <div style={{ fontSize: 12, color: '#1C2832', opacity: 0.5, marginTop: 4 }}>
            Otsib...
          </div>
        )}
        {showDropdown && results.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: '#fff',
              border: '1.5px solid #DAD0A1',
              borderTop: 'none',
              zIndex: 100,
              maxHeight: 240,
              overflowY: 'auto',
            }}
          >
            {results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => handleLink(r)}
                disabled={linking === r.id}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 14px',
                  background: '#fff',
                  border: 'none',
                  borderBottom: '1px solid #F0EDD6',
                  cursor: 'pointer',
                  fontSize: 14,
                  color: '#1C2832',
                }}
              >
                <span style={{ fontWeight: 600 }}>{r.name}</span>
                <span style={{ fontSize: 12, opacity: 0.6, marginLeft: 8 }}>{r.email}</span>
              </button>
            ))}
          </div>
        )}
        {showDropdown && results.length === 0 && !searching && search.trim() && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: '#fff',
              border: '1.5px solid #DAD0A1',
              borderTop: 'none',
              padding: '10px 14px',
              fontSize: 13,
              color: '#1C2832',
              opacity: 0.6,
              zIndex: 100,
            }}
          >
            Tulemusi ei leitud
          </div>
        )}
      </div>
    </div>
  );
}
