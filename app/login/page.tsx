'use client';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useState } from 'react';
import AdminBrand from '../components/admin-brand';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const signInResult = await response.json();
      if (!response.ok) throw new Error(signInResult.error || 'Could not sign in.');

      router.push(`/${encodeURIComponent(signInResult.username)}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  };

  const notice = params.get('verified')
    ? 'Email verified. Sign in to open your portfolio.'
    : params.get('error')
      ? 'Email confirmation could not be completed. Try signing in or request another confirmation email.'
      : '';

  return (
    <main className="min-h-screen bg-gray-950 px-4 py-12 text-white">
      <div className="mx-auto max-w-md rounded-3xl border border-gray-700 bg-gray-800 p-8 shadow-2xl">
        <nav className="mb-8 flex items-center justify-between border-b border-gray-700 pb-5">
          <h2 className="text-xl font-bold text-blue-300"><AdminBrand /></h2>
          <Link href="/" className="text-sm text-gray-400 hover:text-white">Home</Link>
        </nav>
        <h1 className="text-center text-3xl font-bold">Sign in</h1>
        <p className="mb-6 mt-2 text-center text-sm text-gray-400">Manage your portfolio and profile details.</p>
        {notice && <p role="status" className="mb-4 rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-200">{notice}</p>}
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm text-gray-300">
            Email or username
            <input required autoComplete="username" value={identifier} onChange={(event) => setIdentifier(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-white" />
          </label>
          <label className="block text-sm text-gray-300">
            Password
            <input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-white" />
          </label>
          {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
          <button type="submit" disabled={busy} className="w-full rounded-xl bg-blue-600 py-3 font-semibold hover:bg-blue-700 disabled:opacity-60">
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-400">
          New here? <Link href="/register" className="text-blue-400 hover:underline">Create a portfolio</Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950" />}>
      <LoginForm />
    </Suspense>
  );
}
