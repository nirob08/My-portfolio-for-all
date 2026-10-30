'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { normalizeUsername } from '../lib/portfolio-data';
import { createSupabaseBrowserClient } from '../lib/supabase/client';
import AdminBrand from '../components/admin-brand';

const initialForm = {
  name: '',
  email: '',
  password: '',
  username: '',
  phone: '',
  trxId: '',
  title: '',
  bio: '',
};

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [coupon, setCoupon] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [price, setPrice] = useState(500);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (key: keyof typeof initialForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const applyCoupon = async () => {
    setError('');
    setMessage('');
    setCouponApplied(false);
    setPrice(500);

    try {
      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: coupon }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not validate this coupon.');

      setPrice(result.price);
      setCouponApplied(true);
      setMessage('Coupon applied successfully.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not validate this coupon.');
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');

    const username = normalizeUsername(form.username);
    if (!/^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$/.test(username)) {
      setError('Use 1–30 lowercase letters, numbers, or hyphens for your username.');
      setBusy(false);
      return;
    }

    try {
      const availabilityResponse = await fetch(`/api/usernames?username=${encodeURIComponent(username)}`);
      const availability = await availabilityResponse.json();
      if (!availabilityResponse.ok) {
        throw new Error(availability.error || 'Could not check username availability.');
      }
      if (!availability.available) {
        throw new Error('That username is already taken. Choose another one.');
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not check username availability.');
      setBusy(false);
      return;
    }

    const draft = {
      username,
      name: form.name.trim(),
      phone: form.phone.trim(),
      title: form.title.trim(),
      bio: form.bio.trim(),
      trxId: form.trxId.trim(),
      couponCode: couponApplied ? coupon.trim() : '',
    };

    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: { portfolio_draft: draft },
        },
      });

      if (signUpError) throw signUpError;

      if (data.session) {
        const response = await fetch('/api/profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draft),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Account created, but portfolio submission failed.');

        router.push(`/${encodeURIComponent(result.username)}`);
        return;
      }

      setMessage('Account created. Check your email and confirm the address; your portfolio will be submitted automatically.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not create your account.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 px-4 py-12 text-white">
      <div className="mx-auto max-w-3xl rounded-3xl border border-gray-700 bg-gray-800 p-6 shadow-2xl md:p-9">
        <nav className="mb-8 flex items-center justify-between border-b border-gray-700 pb-5">
          <h1 className="text-xl font-bold text-blue-300"><AdminBrand /></h1>
          <Link href="/" className="text-sm text-gray-400 hover:text-white">Home</Link>
        </nav>
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Create Your Portfolio</h1>
          <p className="mt-2 text-sm text-gray-400">
            Create an account, submit your payment details, then build your profile.
          </p>
        </div>

        <div className="mb-6 rounded-2xl border border-gray-700 bg-gray-900 p-5 text-center">
          <p className="text-sm text-gray-400">Portfolio setup fee</p>
          <p className="my-1 text-3xl font-extrabold text-blue-400">
            BDT {price}
            {couponApplied && <span className="ml-2 text-sm text-gray-500 line-through">BDT 500</span>}
          </p>
          <p className="text-sm text-gray-400">bKash Send Money: 01830287623</p>
          <p className="mt-1 text-xs text-gray-500">Your portfolio stays pending until payment is reviewed.</p>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-gray-300">
              Full name
              <input required maxLength={100} value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Your full name" className="mt-1 w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-white" />
            </label>
            <label className="text-sm text-gray-300">
              Username
              <input required maxLength={30} value={form.username} onChange={(event) => update('username', event.target.value)} placeholder="your-name" className="mt-1 w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-white" />
            </label>
            <label className="text-sm text-gray-300">
              Email
              <input required type="email" autoComplete="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="you@example.com" className="mt-1 w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-white" />
            </label>
            <label className="text-sm text-gray-300">
              Password
              <input required type="password" minLength={8} autoComplete="new-password" value={form.password} onChange={(event) => update('password', event.target.value)} placeholder="At least 8 characters" className="mt-1 w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-white" />
            </label>
            <label className="text-sm text-gray-300">
              Phone number
              <input required type="tel" maxLength={40} value={form.phone} onChange={(event) => update('phone', event.target.value)} placeholder="+8801XXXXXXXXX" className="mt-1 w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-white" />
            </label>
            <label className="text-sm text-gray-300">
              Professional title
              <input maxLength={120} value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="Designer | Developer" className="mt-1 w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-white" />
            </label>
          </div>

          <label className="block text-sm text-gray-300">
            Short introduction
            <textarea rows={3} maxLength={2000} value={form.bio} onChange={(event) => update('bio', event.target.value)} placeholder="Tell people about yourself and your work." className="mt-1 w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-white" />
          </label>

          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="text-sm text-gray-300">
              Coupon code
              <input value={coupon} onChange={(event) => { setCoupon(event.target.value); setCouponApplied(false); setPrice(500); }} placeholder="Enter coupon code if you have one" className="mt-1 w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-white" />
            </label>
            <button type="button" onClick={() => void applyCoupon()} className="self-end rounded-xl bg-purple-600 px-5 py-3 font-medium hover:bg-purple-700">
              Apply coupon
            </button>
          </div>

          <label className="block text-sm text-gray-300">
            bKash transaction ID
            <input required maxLength={120} value={form.trxId} onChange={(event) => update('trxId', event.target.value)} placeholder="Enter your bKash transaction ID" className="mt-1 w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-white" />
          </label>

          {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
          {message && <p role="status" className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-200">{message}</p>}

          <button type="submit" disabled={busy} className="w-full rounded-xl bg-blue-600 py-3 font-semibold transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">
            {busy ? 'Creating account…' : 'Create Account & Submit'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          Already have an account? <Link className="text-blue-400 hover:underline" href="/login">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
