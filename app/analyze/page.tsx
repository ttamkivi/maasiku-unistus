'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TestInfoForm from '@/components/TestInfoForm';
import PhotoUploader from '@/components/PhotoUploader';
import ProcessingState from '@/components/ProcessingState';
import FeedbackDisplay from '@/components/FeedbackDisplay';
import { FeedbackData, PhotoStorageChoice } from '@/lib/types';

type Step = 'form' | 'upload' | 'processing' | 'results';

export default function AnalyzePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('form');
  const [klass, setKlass] = useState('');
  const [teema, setTeema] = useState('');
  const [opilane, setOpilane] = useState('');
  const [consent, setConsent] = useState(false);
  const [photoStorage, setPhotoStorage] = useState<PhotoStorageChoice>('local_only');
  const [storageConsent, setStorageConsent] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handleFormChange = (field: string, value: string | boolean) => {
    if (field === 'klass') setKlass(value as string);
    if (field === 'teema') setTeema(value as string);
    if (field === 'opilane') setOpilane(value as string);
    if (field === 'consent') setConsent(value as boolean);
    if (field === 'photoStorage') {
      setPhotoStorage(value as PhotoStorageChoice);
      if (value === 'local_only') setStorageConsent(false);
    }
    if (field === 'storageConsent') setStorageConsent(value as boolean);
  };

  // consent can be auto-set to true by TestInfoForm when backend confirms parental consent
  const canProceedFromForm =
    !!klass &&
    !!teema &&
    !!opilane &&
    consent &&
    (photoStorage === 'local_only' || (photoStorage === 'store_centrally' && storageConsent));

  const handleAnalyze = async (testResultId?: string) => {
    setStep('processing');
    setError(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ klass, teema, opilane, images, ...(testResultId ? { testResultId } : {}), ...(selectedStudentId ? { studentId: selectedStudentId } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analüüs ebaõnnestus.');

      // If the response contains testResultId + testId, redirect to the result page
      if (data.testResultId && data.testId) {
        router.push(`/dashboard/tests/${data.testId}/results/${data.testResultId}`);
        return;
      }

      setFeedback(data);
      setStep('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analüüs ebaõnnestus.');
      setStep('upload');
    }
  };

  const handleDownloadDocx = async () => {
    if (!feedback) return;
    setIsDownloading(true);
    try {
      const res = await fetch('/api/generate-docx', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(feedback) });
      if (!res.ok) throw new Error('Failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tagasiside_${feedback.test_info.student}.docx`.replace(/[^a-zA-Z0-9._-]/g, '_');
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Allalaadimine ebaõnnestus.'); }
    finally { setIsDownloading(false); }
  };

  const handleSendEmail = async (email: string, note: string) => {
    if (!feedback) return;
    setIsSending(true);
    try {
      const res = await fetch('/api/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ feedback, email, note }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert('E-kiri saadetud!');
    } catch (err) { alert(err instanceof Error ? err.message : 'Saatmine ebaõnnestus.'); }
    finally { setIsSending(false); }
  };

  const handleNextStudent = () => {
    setOpilane('');
    setImages([]);
    setFeedback(null);
    setError(null);
    setStep('form');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/" style={{ color: '#0072CE', fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>← Tagasi</Link>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1C2832' }}>Analüüsi kontrolltööd</h1>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #DAD0A1' }}>
        {(['form', 'upload', 'processing', 'results'] as Step[]).map((s, i) => {
          const labels = ['1. Andmed', '2. Fotod', '3. Analüüs', '4. Tulemus'];
          const isActive = step === s;
          const isDone = ['form', 'upload', 'processing', 'results'].indexOf(step) > i;
          return (
            <div key={s} style={{ padding: '8px 16px', fontSize: 12, fontWeight: 700, color: isActive ? '#fff' : isDone ? '#0072CE' : '#1C2832', background: isActive ? '#0072CE' : 'transparent', opacity: isDone || isActive ? 1 : 0.4 }}>
              {labels[i]}
            </div>
          );
        })}
      </div>

      {error && (
        <div style={{ background: '#fff1f0', border: '1px solid #fca5a5', color: '#991b1b', padding: '12px 16px', fontSize: 13 }}>
          {error}
        </div>
      )}

      {step === 'form' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: '#F8F3DA', padding: 20 }}>
            <h2 style={{ fontWeight: 700, color: '#1C2832', marginBottom: 16, fontSize: 15 }}>1. samm: Kontrolltöö andmed</h2>
            <TestInfoForm
              klass={klass}
              teema={teema}
              opilane={opilane}
              consent={consent}
              photoStorage={photoStorage}
              storageConsent={storageConsent}
              onChange={handleFormChange}
              onStudentSelect={setSelectedStudentId}
            />
          </div>
          <button
            onClick={() => setStep('upload')}
            disabled={!canProceedFromForm}
            style={{ background: canProceedFromForm ? '#1C2832' : '#9ca3af', color: '#fff', fontWeight: 700, fontSize: 14, padding: '14px', border: 'none', cursor: canProceedFromForm ? 'pointer' : 'not-allowed' }}
          >
            Edasi: lisa fotod →
          </button>
        </div>
      )}

      {step === 'upload' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: '#F8F3DA', padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <h2 style={{ fontWeight: 700, color: '#1C2832', fontSize: 15 }}>2. samm: Lisa fotod</h2>
              <button onClick={() => setStep('form')} style={{ color: '#0072CE', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Muuda andmeid</button>
            </div>
            <p style={{ fontSize: 13, color: '#1C2832', opacity: 0.7, marginBottom: 16 }}>{klass} · {teema} · {opilane}</p>
            <PhotoUploader onImagesReady={setImages} />
          </div>
          <button
            onClick={() => handleAnalyze()}
            disabled={images.length === 0}
            style={{ background: images.length > 0 ? '#1C2832' : '#9ca3af', color: '#fff', fontWeight: 700, fontSize: 14, padding: '14px', border: 'none', cursor: images.length > 0 ? 'pointer' : 'not-allowed' }}
          >
            Analüüsi ({images.length} foto{images.length !== 1 ? 't' : ''}) →
          </button>
        </div>
      )}

      {step === 'processing' && <ProcessingState />}

      {step === 'results' && feedback && (
        <FeedbackDisplay
          feedback={feedback}
          onDownloadDocx={handleDownloadDocx}
          onSendEmail={handleSendEmail}
          onNextStudent={handleNextStudent}
          isDownloading={isDownloading}
          isSending={isSending}
        />
      )}
    </div>
  );
}
