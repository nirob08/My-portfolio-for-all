'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { AdminProfile, PortfolioStatus } from '../lib/portfolio-data';

export default function AdminPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyUsername, setBusyUsername] = useState('');

  const loadAccounts = async () => {
    setError('');
    try {
      const response = await fetch('/api/admin/profiles', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not load admin data.');
      setAccounts(result.accounts);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load admin data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load protected admin data after the component mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAccounts();
  }, []);

  const updateAccount = async (
    username: string,
    updates: { status?: PortfolioStatus; paymentVerified?: boolean; couponValid?: boolean },
  ) => {
    setBusyUsername(username);
    setError('');

    try {
      const response = await fetch('/api/admin/profiles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, ...updates }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not update this account.');
      await loadAccounts();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update this account.');
    } finally {
      setBusyUsername('');
    }
  };

  const deleteAccount = async (username: string) => {
    if (!window.confirm(`Permanently delete the portfolio account @${username}? This cannot be undone.`)) return;

    setBusyUsername(username);
    setError('');
    try {
      const response = await fetch('/api/admin/profiles', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not delete this account.');
      await loadAccounts();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not delete this account.');
    } finally {
      setBusyUsername('');
    }
  };

  const logout = async () => {
    await fetch('/api/admin/gate', { method: 'DELETE' });
    router.push('/');
  };

  return (
    <main className="min-h-screen bg-gray-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-blue-400">Admin Panel</p>
            <h1 className="mt-2 text-3xl font-bold">Portfolio Approvals</h1>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => void loadAccounts()} className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 hover:border-blue-500">
              Refresh
            </button>
            <button type="button" onClick={() => void logout()} className="rounded-lg bg-red-600 px-4 py-2 hover:bg-red-700">
              Logout
            </button>
          </div>
        </div>

        {error && (
          <div role="alert" className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
            {error.includes('Admin session') && (
              <span> Return to the homepage and double-click “My portfolio” to sign in again.</span>
            )}
          </div>
        )}

        {loading ? (
          <p className="text-gray-400">Loading submissions…</p>
        ) : accounts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-700 p-10 text-center text-gray-400">
            No portfolio submissions yet.
          </div>
        ) : (
          <div className="grid gap-6">
            {accounts.map((account) => {
              const busy = busyUsername === account.username;
              return (
                <article key={account.username} className="rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-xl">
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div className="flex items-center gap-4">
                      {account.image ? (
                        <img src={account.image} alt={account.name} className="h-16 w-16 rounded-full border-2 border-blue-400 object-cover" />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-700 text-2xl">{account.name.slice(0, 1)}</div>
                      )}
                      <div>
                        <h2 className="text-xl font-bold">{account.name}</h2>
                        <p className="text-sm text-gray-400">@{account.username}</p>
                        <p className="text-sm text-blue-300">{account.email}</p>
                        <p className="text-xs text-gray-500">Submitted {new Date(account.createdAt).toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button disabled={busy || account.paymentVerified} onClick={() => void updateAccount(account.username, { paymentVerified: true })} className="rounded-xl bg-green-700 px-3 py-2 text-sm font-medium hover:bg-green-600 disabled:opacity-50">
                        {account.paymentVerified ? 'Payment verified' : 'Verify payment'}
                      </button>
                      <button disabled={busy || !account.couponCode} onClick={() => void updateAccount(account.username, { couponValid: !account.couponValid })} className="rounded-xl bg-purple-700 px-3 py-2 text-sm font-medium hover:bg-purple-600 disabled:opacity-50">
                        {account.couponValid ? 'Mark coupon invalid' : 'Validate coupon'}
                      </button>
                      <button disabled={busy} onClick={() => void updateAccount(account.username, { status: 'approved' })} className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50">
                        Approve
                      </button>
                      <button disabled={busy} onClick={() => void updateAccount(account.username, { status: 'rejected' })} className="rounded-xl bg-red-600 px-3 py-2 text-sm font-medium hover:bg-red-500 disabled:opacity-50">
                        Reject
                      </button>
                      <button disabled={busy} onClick={() => void deleteAccount(account.username)} className="rounded-xl border border-red-500 px-3 py-2 text-sm font-medium text-red-200 hover:bg-red-950 disabled:opacity-50">
                        Delete profile
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 text-sm text-gray-300 md:grid-cols-4">
                    <div className="rounded-xl bg-gray-900 p-3"><p className="mb-1 text-gray-400">Profile status</p><strong className="capitalize text-white">{account.status}</strong></div>
                    <div className="rounded-xl bg-gray-900 p-3"><p className="mb-1 text-gray-400">bKash transaction</p><strong className="break-all text-white">{account.trxId || 'Not provided'}</strong></div>
                    <div className="rounded-xl bg-gray-900 p-3"><p className="mb-1 text-gray-400">Coupon</p><strong className="break-all text-white">{account.couponCode || 'None'} · {account.couponValid ? 'Valid' : 'Unverified'}</strong></div>
                    <div className="rounded-xl bg-gray-900 p-3"><p className="mb-1 text-gray-400">Amount due</p><strong className="text-white">BDT {account.amount}</strong></div>
                  </div>

                  <div className="mt-4 rounded-xl border border-gray-700 bg-gray-900 p-4">
                    <p className="mb-2 text-sm text-gray-400">Portfolio preview</p>
                    <p className="font-medium">{account.title}</p>
                    <p className="mt-2 whitespace-pre-wrap text-gray-300">{account.bio}</p>
                    {account.projects.length > 0 && <p className="mt-3 text-sm text-gray-400">Projects: {account.projects.length}</p>}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/" className="text-blue-400 hover:text-blue-300">← Back to Home</Link>
        </div>
      </div>
    </main>
  );
}
