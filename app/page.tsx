'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AdminBrand from './components/admin-brand';
import {
  type PortfolioProfile,
} from './lib/portfolio-data';

export default function Home() {
  const [portfolios, setPortfolios] = useState<PortfolioProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [profilesError, setProfilesError] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/profiles', { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not load profiles.');
        if (active) setPortfolios(result.profiles);
      })
      .catch((error: unknown) => {
        console.error('Could not load public portfolios:', error);
        if (active) {
          setProfilesError(error instanceof Error ? error.message : 'Could not load portfolios.');
        }
      })
      .finally(() => {
        if (active) setLoadingProfiles(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="flex justify-between items-center px-6 py-4 border-b border-gray-800">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          <AdminBrand />
        </h1>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-gray-300 hover:text-white">Sign in</Link>
          <Link
            href="/register"
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-full font-medium transition shadow-lg shadow-blue-500/30"
          >
            Create Portfolio
          </Link>
        </div>
      </nav>

      <section className="text-center py-16 px-4">
        <h2 className="text-4xl md:text-5xl font-extrabold mb-4">
          Showcase Your Identity with One Link
        </h2>
        <p className="text-gray-400 max-w-2xl mx-auto mb-8">
          Start with a secure payment, verify your coupon, submit your details, and customize the look of your profile with your preferred background image and colors.
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <Link
            href="/register"
            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-8 py-3 rounded-xl font-semibold text-lg shadow-xl hover:opacity-90 transition"
          >
            Get Your Portfolio Now 🚀
          </Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-20">
        <h3 className="text-2xl font-bold mb-8 border-l-4 border-blue-500 pl-3">
          Explore Profiles
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {loadingProfiles ? (
            <p className="col-span-full py-10 text-center text-gray-400">Loading portfolios…</p>
          ) : profilesError ? (
            <p role="alert" className="col-span-full rounded-2xl border border-red-500/30 bg-red-500/10 py-10 text-center text-red-200">
              {profilesError}
            </p>
          ) : portfolios.length === 0 ? (
            <p className="col-span-full rounded-2xl border border-dashed border-gray-700 py-10 text-center text-gray-400">
              No approved portfolios yet. Create the first one.
            </p>
          ) : portfolios.map((item) => (
            <div
              key={item.username}
              className="bg-gray-800/60 border border-gray-700 rounded-2xl p-6 flex flex-col items-center text-center hover:border-blue-500 transition shadow-xl"
            >
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.name}
                  className="mb-4 h-24 w-24 rounded-full border-2 border-blue-400 object-cover"
                />
              ) : (
                <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full border-2 border-blue-400 bg-gray-700 text-3xl font-bold">
                  {item.name.slice(0, 1)}
                </div>
              )}
              <div className="mb-2">
                <span
                  className="inline-flex rounded-full bg-green-500/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-green-300"
                >
                  Approved
                </span>
              </div>
              <h4 className="text-xl font-bold">{item.name}</h4>
              <p className="text-blue-400 text-sm mb-2">{item.title}</p>
              <p className="text-gray-400 text-sm mb-6 line-clamp-2">{item.bio}</p>
              <Link
                href={`/${item.username}`}
                className="mt-auto bg-gray-700 hover:bg-blue-600 text-white w-full py-2 rounded-xl text-sm font-medium transition"
              >
                Visit Profile ↗
              </Link>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
