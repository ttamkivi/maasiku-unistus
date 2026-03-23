'use client';

import { useState, useEffect, useCallback } from 'react';
import { PhotoStorageChoice } from '@/lib/types';

interface School { id: string; name: string; city: string; }
interface Student { id: string; userId: string; name: string; email: string; class: string | null; grade: number | null; }

interface Props {
  klass: string;
  teema: string;
  opilane: string;
  consent: boolean;
  photoStorage: PhotoStorageChoice;
  storageConsent: boolean;
  onChange: (field: string, value: string | boolean) => void;
  // Expose selected student ID so parent can pass to analyze API
  onStudentSelect?: (studentId: string | null) => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid #DAD0A1',
  padding: '10px',
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

export default function TestInfoForm({
  klass, teema, opilane, consent, photoStorage, storageConsent, onChange, onStudentSelect,
}: Props) {
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [manualStudent, setManualStudent] = useState(false);
  const [consentStatus, setConsentStatus] = useState<'checking' | 'granted' | 'missing' | 'manual'>('manual');
  const [loading, setLoading] = useState(false);

  // Load teacher's schools on mount
  useEffect(() => {
    fetch('/api/analyze/context')
      .then((r) => r.json())
      .then((d) => setSchools(d.schools ?? []))
      .catch(() => setSchools([]));
  }, []);

  // Load classes + students when school is selected
  useEffect(() => {
    if (!selectedSchoolId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setClasses([]);
      setStudents([]);
      setSelectedClass('');
      setSelectedStudentId('');
      onChange('klass', '');
      return;
    }
    setLoading(true);
    fetch(`/api/analyze/context?schoolId=${selectedSchoolId}`)
      .then((r) => r.json())
      .then((d) => {
        setClasses(d.classes ?? []);
        setStudents(d.students ?? []);
      })
      .catch(() => { setClasses([]); setStudents([]); })
      .finally(() => setLoading(false));
  }, [selectedSchoolId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load students when class is selected within school
  useEffect(() => {
    if (!selectedSchoolId || !selectedClass) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(`/api/analyze/context?schoolId=${selectedSchoolId}&class=${encodeURIComponent(selectedClass)}`)
      .then((r) => r.json())
      .then((d) => setStudents(d.students ?? []))
      .catch(() => setStudents([]))
      .finally(() => setLoading(false));
    onChange('klass', selectedClass);
  }, [selectedClass]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check consent when a registered student is selected
  const checkConsent = useCallback(async (studentId: string) => {
    setConsentStatus('checking');
    try {
      const res = await fetch(`/api/analyze/consent?studentId=${studentId}`);
      const data = await res.json();
      if (data.hasConsent) {
        setConsentStatus('granted');
        onChange('consent', true);
      } else {
        setConsentStatus('missing');
        onChange('consent', false);
      }
    } catch {
      setConsentStatus('manual');
    }
  }, [onChange]);

  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId);
    if (studentId === '__manual__') {
      setManualStudent(true);
      setConsentStatus('manual');
      onChange('consent', false);
      onChange('opilane', '');
      onStudentSelect?.(null);
    } else if (studentId === '') {
      setManualStudent(false);
      setConsentStatus('manual');
      onChange('opilane', '');
      onStudentSelect?.(null);
    } else {
      setManualStudent(false);
      const student = students.find((s) => s.id === studentId);
      if (student) {
        onChange('opilane', student.name);
        onStudentSelect?.(student.id);
        checkConsent(student.id);
      }
    }
  };

  const studentsInClass = selectedClass
    ? students.filter((s) => s.class === selectedClass)
    : students;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* School selector */}
      {schools.length > 0 && (
        <div>
          <label style={labelStyle}>Kool</label>
          <select
            value={selectedSchoolId}
            onChange={(e) => { setSelectedSchoolId(e.target.value); setSelectedClass(''); setSelectedStudentId(''); }}
            style={inputStyle}
          >
            <option value="">Vali kool…</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.city})</option>
            ))}
          </select>
        </div>
      )}

      {/* Class selector */}
      {selectedSchoolId && (
        <div>
          <label style={labelStyle}>Klass</label>
          {loading ? (
            <div style={{ fontSize: 13, color: '#1C2832', opacity: 0.6 }}>Laen klasse…</div>
          ) : classes.length > 0 ? (
            <select
              value={selectedClass}
              onChange={(e) => { setSelectedClass(e.target.value); setSelectedStudentId(''); }}
              style={inputStyle}
            >
              <option value="">Vali klass…</option>
              {classes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          ) : (
            <input
              type="text"
              value={klass}
              onChange={(e) => { setSelectedClass(e.target.value); onChange('klass', e.target.value); }}
              placeholder="nt. 9B"
              style={inputStyle}
            />
          )}
        </div>
      )}

      {/* Fallback class input when no school is linked */}
      {schools.length === 0 && (
        <div>
          <label style={labelStyle}>Klass</label>
          <input
            type="text"
            value={klass}
            onChange={(e) => onChange('klass', e.target.value)}
            placeholder="nt. 9B"
            style={inputStyle}
          />
        </div>
      )}

      {/* Student selector */}
      {(selectedSchoolId || schools.length === 0) && (
        <div>
          <label style={labelStyle}>Õpilane</label>
          {studentsInClass.length > 0 ? (
            <>
              <select
                value={selectedStudentId}
                onChange={(e) => handleStudentSelect(e.target.value)}
                style={inputStyle}
              >
                <option value="">Vali õpilane…</option>
                {studentsInClass.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
                <option value="__manual__">— Kirjutan käsitsi —</option>
              </select>

              {/* Manual input when student not in list */}
              {manualStudent && (
                <input
                  type="text"
                  value={opilane}
                  onChange={(e) => onChange('opilane', e.target.value)}
                  placeholder="nt. Jaan või M.K."
                  style={{ ...inputStyle, marginTop: 8 }}
                />
              )}
            </>
          ) : (
            <input
              type="text"
              value={opilane}
              onChange={(e) => onChange('opilane', e.target.value)}
              placeholder="nt. Jaan või M.K."
              style={inputStyle}
            />
          )}
        </div>
      )}

      {/* Teema */}
      <div>
        <label style={labelStyle}>Teema / kontrolltöö nimetus</label>
        <input
          type="text"
          value={teema}
          onChange={(e) => onChange('teema', e.target.value)}
          placeholder="nt. Soojusõpetus KT nr 1"
          style={inputStyle}
        />
      </div>

      {/* Consent section — smart */}
      {consentStatus === 'granted' ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: 4,
            padding: '10px 14px',
            fontSize: 13,
            color: '#166534',
          }}
        >
          <span style={{ fontSize: 18 }}>✅</span>
          <div>
            <div style={{ fontWeight: 700 }}>Lapsevanema nõusolek on antud</div>
            <div style={{ opacity: 0.8, fontSize: 12, marginTop: 2 }}>
              Süsteem kontrollis automaatselt — ei vaja käsitsi kinnitust.
            </div>
          </div>
        </div>
      ) : consentStatus === 'missing' ? (
        <div
          style={{
            background: '#fefce8',
            border: '1px solid #fde047',
            borderRadius: 4,
            padding: '10px 14px',
            fontSize: 13,
            color: '#713f12',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>⚠️ Lapsevanema nõusolek puudub</div>
          <div>Selle õpilase jaoks ei ole süsteemis aktiivset nõusolekut. Palun hangi see enne töötlemist.</div>
        </div>
      ) : consentStatus === 'checking' ? (
        <div style={{ fontSize: 13, color: '#1C2832', opacity: 0.6 }}>
          Kontrollin nõusolekut…
        </div>
      ) : (
        /* Manual consent checkbox — fallback for unregistered students */
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => onChange('consent', e.target.checked)}
            style={{ marginTop: 2, width: 16, height: 16 }}
          />
          <span style={{ fontSize: 13, color: '#1C2832', lineHeight: 1.5 }}>
            Kinnitan, et mul on õpilase andmete töötlemiseks lapsevanema nõusolek
          </span>
        </label>
      )}

      {/* Photo storage */}
      <div style={{ background: '#F8F3DA', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#1C2832', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Foto säilitamine
        </p>
        <p style={{ fontSize: 13, color: '#1C2832' }}>
          Vaikimisi töödeldakse fotod ainult lokaalselt ja kustutatakse kohe. Soovi korral saad fotod ka keskselt salvestada (nt hilisemaks analüüsiks).
        </p>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
          <input type="radio" name="photoStorage" value="local_only" checked={photoStorage === 'local_only'} onChange={() => onChange('photoStorage', 'local_only')} style={{ marginTop: 2 }} />
          <span style={{ fontSize: 13, color: '#1C2832' }}>
            <strong>Ainult lokaalne töötlus</strong> — fotod ei lahku Su seadmest pärast analüüsi
          </span>
        </label>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
          <input type="radio" name="photoStorage" value="store_centrally" checked={photoStorage === 'store_centrally'} onChange={() => onChange('photoStorage', 'store_centrally')} style={{ marginTop: 2 }} />
          <span style={{ fontSize: 13, color: '#1C2832' }}>
            <strong>Keskselt salvestamine</strong> — fotod salvestatakse krüpteeritult serveris
          </span>
        </label>

        {photoStorage === 'store_centrally' && (
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', background: '#fff', padding: 10, border: '1px solid #DAD0A1' }}>
            <input
              type="checkbox"
              checked={storageConsent}
              onChange={(e) => onChange('storageConsent', e.target.checked)}
              style={{ marginTop: 2, width: 14, height: 14 }}
            />
            <span style={{ fontSize: 12, color: '#1C2832', lineHeight: 1.5 }}>
              Kinnitan, et mul on lapsevanema eraldi nõusolek fotode KESKSEKS salvestamiseks
              (see on lisanõusolek tavalisele töötlusnõusolekule)
            </span>
          </label>
        )}
      </div>
    </div>
  );
}
