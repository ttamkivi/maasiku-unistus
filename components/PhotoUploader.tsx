'use client';
import { useState, useRef, useCallback } from 'react';
import { resizeAndConvert } from '@/lib/imageUtils';

interface Props {
  onImagesReady: (base64Images: string[]) => void;
}

export default function PhotoUploader({ onImagesReady }: Props) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [base64Images, setBase64Images] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const processFiles = useCallback(async (files: File[]) => {
    if (!files.length) return;
    if (previews.length + files.length > 8) { alert('Maksimaalselt 8 fotot lubatud.'); return; }
    setProcessing(true);
    try {
      const newB64: string[] = [];
      const newPrev: string[] = [];
      for (const file of files) {
        const b64 = await resizeAndConvert(file);
        newB64.push(b64);
        newPrev.push(`data:image/jpeg;base64,${b64}`);
      }
      const updB64 = [...base64Images, ...newB64];
      const updPrev = [...previews, ...newPrev];
      setBase64Images(updB64);
      setPreviews(updPrev);
      onImagesReady(updB64);
    } catch (err) {
      console.error(err);
      alert('Foto töötlemine ebaõnnestus.');
    } finally {
      setProcessing(false);
    }
  }, [previews, base64Images, onImagesReady]);

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); processFiles(Array.from(e.dataTransfer.files)); }}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="text-4xl mb-2">📷</div>
        <p className="font-medium text-gray-700">Lisa kontrolltöö fotod</p>
        <p className="text-sm text-gray-500 mt-1">1–8 lehekülge · HEIC, JPG, PNG</p>
        <p className="text-xs text-gray-400 mt-1">Vajuta kaamera avamiseks või lohista fotod siia</p>
        {processing && <p className="text-blue-600 mt-2 text-sm">Töötlen fotosid...</p>}
      </div>
      <input ref={fileInputRef} type="file" accept="image/*,.heic,.heif" capture="environment" multiple className="hidden" onChange={(e) => { if (e.target.files) { processFiles(Array.from(e.target.files)); e.target.value = ''; } }} />
      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {previews.map((src, i) => (
            <div key={i} className="relative aspect-[3/4] rounded-lg overflow-hidden bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
              <button onClick={(e) => { e.stopPropagation(); const nb = base64Images.filter((_, j) => j !== i); const np = previews.filter((_, j) => j !== i); setBase64Images(nb); setPreviews(np); onImagesReady(nb); }} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">×</button>
              <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1 rounded">{i + 1}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
