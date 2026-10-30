'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  className?: string;
};

export default function AdminBrand({ className = '' }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const openAdmin = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      const response = await fetch('/api/admin/gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not open admin panel.');

      setPassword('');
      setIsOpen(false);
      router.push('/admin');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not open admin panel.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onDoubleClick={() => {
          setError('');
          setIsOpen(true);
        }}
        className={`cursor-pointer select-none border-0 bg-transparent text-left ${className}`}
        aria-label="My portfolio. Double-click for admin access."
      >
        My portfolio
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
            <p className="mb-3 text-xs uppercase tracking-[0.3em] text-blue-400">Admin Access</p>
            <h2 className="mb-5 text-2xl font-bold">Enter password</h2>
            <form onSubmit={openAdmin} className="space-y-4">
              <input
                autoFocus
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError('');
                }}
                placeholder="Password"
                aria-label="Admin password"
                className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
              />
              {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setPassword('');
                    setError('');
                  }}
                  className="rounded-xl bg-gray-700 px-4 py-2 hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button type="submit" disabled={busy} className="rounded-xl bg-blue-600 px-4 py-2 hover:bg-blue-700 disabled:opacity-60">
                  {busy ? 'Checking…' : 'Open Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
