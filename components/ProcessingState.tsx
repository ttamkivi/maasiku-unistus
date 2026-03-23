'use client';
import { useEffect, useState } from 'react';

const MESSAGES = ['Loen õpilase vastuseid...', 'Võrdlen õppekavaga...', 'Kirjutan tagasisidet...', 'Otsin mustreid...', 'Koostan soovitusi...'];

export default function ProcessingState() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % MESSAGES.length), 3000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-6">
      <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      <div className="text-center space-y-2">
        <p className="text-lg font-medium text-gray-800">Analüüsin kontrolltööd...</p>
        <p className="text-gray-500 text-sm">{MESSAGES[idx]}</p>
      </div>
      <p className="text-xs text-gray-400 max-w-xs text-center">See võtab tavaliselt 20–40 sekundit. Palun oota.</p>
    </div>
  );
}
