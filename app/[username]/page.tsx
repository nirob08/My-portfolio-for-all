'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import type { PortfolioProfile } from '../lib/portfolio-data';
import AdminBrand from '../components/admin-brand';
import PortfolioEditor from '../components/portfolio-editor';
import { createSupabaseBrowserClient } from '../lib/supabase/client';

function ProfileContent() {
  const params = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<PortfolioProfile | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const username = Array.isArray(params?.username) ? params.username[0] : params?.username;

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const [profileResponse, ownResponse] = await Promise.all([
          fetch(`/api/profiles?username=${encodeURIComponent(String(username || ''))}`, { cache: 'no-store' }),
          fetch('/api/profiles/me', { cache: 'no-store' }),
        ]);
        const profileResult = await profileResponse.json();
        const ownResult = ownResponse.ok ? await ownResponse.json() : null;

        if (!active) return;
        if (!profileResponse.ok) {
          if (profileResponse.status !== 404) {
            setLoadError(profileResult.error || 'Could not load this portfolio.');
          }
          setProfile(null);
          return;
        }

        setProfile(profileResult.profile);
        setIsOwner(ownResult?.profile?.username === profileResult.profile.username);
      } catch (reason) {
        if (!active) return;
        setLoadError(reason instanceof Error ? reason.message : 'Could not load this portfolio.');
      } finally {
        if (active) setLoading(false);
      }
    }

    // Reset the page state before fetching the next dynamic profile.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setLoadError('');
    void loadProfile();
    return () => {
      active = false;
    };
  }, [username]);

  if (loading) {
    return <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">Loading portfolio…</main>;
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-gray-900 text-white flex items-center justify-center px-4">
        <div className="max-w-lg w-full bg-gray-800 border border-gray-700 rounded-3xl p-10 text-center shadow-2xl">
          <p className="text-sm uppercase tracking-[0.3em] text-blue-400 mb-4">Profile Not Found</p>
          <h1 className="text-3xl font-bold mb-4">This portfolio link is unavailable.</h1>
          <p className="text-gray-400 mb-8">{loadError || 'The username may not be registered yet, or it may have been removed.'}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/" className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-xl font-medium transition">
              Go Home
            </Link>
            <Link href="/register" className="bg-gray-700 hover:bg-gray-600 px-5 py-3 rounded-xl font-medium transition">
              Create Portfolio
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const pageStyle = {
    backgroundImage: profile.bgImage ? `linear-gradient(rgba(15,23,42,0.72), rgba(15,23,42,0.82)), url(${profile.bgImage})` : 'linear-gradient(135deg, #0f172a, #111827)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };
  const canEdit = isOwner && profile.status === 'approved';

  return (
    <main className="min-h-screen text-white" style={pageStyle}>
      <nav className="flex justify-between items-center px-8 py-4 border-b border-gray-800/60 bg-slate-950/30 backdrop-blur-sm">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          <AdminBrand />
        </h1>
        <div className="flex items-center gap-3">
          {canEdit && (
            <>
              <button
                onClick={() => setIsEditing((prev) => !prev)}
                className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full text-sm font-medium border border-white/20 transition"
              >
                {isEditing ? 'Close Editor' : 'Edit Profile'}
              </button>
              <button
                onClick={async () => {
                  const supabase = createSupabaseBrowserClient();
                  await supabase.auth.signOut();
                  router.push('/');
                }}
                className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full text-sm font-medium border border-white/20 transition"
              >
                Sign out
              </button>
            </>
          )}
          <Link href="/register" className="bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-full font-medium transition">
            Create Your Own
          </Link>
        </div>
      </nav>

      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="bg-slate-900/70 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-md">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            {profile.image ? (
              <img
                src={profile.image}
                alt={profile.name}
                className="h-32 w-32 rounded-full border-4 object-cover shadow-lg"
                style={{ borderColor: profile.accentColor }}
              />
            ) : (
              <div
                className="flex h-32 w-32 items-center justify-center rounded-full border-4 text-4xl font-bold shadow-lg"
                style={{ borderColor: profile.accentColor, color: profile.accentColor }}
              >
                {profile.name.slice(0, 1)}
              </div>
            )}

            <div className="flex-1 text-center md:text-left">
              <span className="inline-flex rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-bold mb-3 border" style={{ borderColor: profile.accentColor, color: profile.accentColor }}>
                {profile.status}
              </span>
              <h1 className="text-3xl md:text-5xl font-extrabold mb-3">{profile.name}</h1>
              <p className="text-xl mb-4" style={{ color: profile.accentColor }}>{profile.title}</p>
              <p className="text-gray-200 max-w-2xl">{profile.bio}</p>
                  {isOwner && profile.status !== 'approved' && (
                    <p className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                      Your portfolio is {profile.status}. Editing will be available after an administrator approves it.
                    </p>
                  )}
                </div>
              </div>

              {canEdit && isEditing && (
            <PortfolioEditor
              profile={profile}
              onSaved={(updated) => setProfile(updated)}
            />
          )}

          {profile.projects?.length > 0 && (
            <section className="mt-12">
              <h2 className="mb-6 text-2xl font-bold">Selected Projects</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {profile.projects.map((project) => (
                  <article key={project.id} className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
                    {project.image && <img src={project.image} alt={project.title} className="h-52 w-full object-cover" />}
                    <div className="p-5">
                      <h3 className="text-lg font-semibold">{project.title}</h3>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-gray-300">{project.description}</p>
                      {project.link && (
                        <a href={project.link} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm font-medium hover:underline" style={{ color: profile.accentColor }}>
                          View project ↗
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {profile.experience?.length > 0 && (
            <section className="mt-12">
              <h2 className="mb-6 text-2xl font-bold">Work Experience</h2>
              <div className="space-y-4">
                {profile.experience.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="text-lg font-semibold">{item.role}</h3>
                      <span className="text-sm text-gray-400">{item.period}</span>
                    </div>
                    <p className="mt-1 text-sm" style={{ color: profile.accentColor }}>{item.organization}</p>
                    <p className="mt-3 whitespace-pre-wrap text-sm text-gray-300">{item.description}</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {profile.education?.length > 0 && (
            <section className="mt-12">
              <h2 className="mb-6 text-2xl font-bold">Education</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {profile.education.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
                    <h3 className="text-lg font-semibold">{item.degree}</h3>
                    <p className="mt-1" style={{ color: profile.accentColor }}>{item.institution}</p>
                    <p className="mt-2 text-sm text-gray-400">{[item.location, item.period].filter(Boolean).join(' · ')}</p>
                    {item.result && <p className="mt-2 text-sm text-gray-300">Result: {item.result}</p>}
                  </article>
                ))}
              </div>
            </section>
          )}

          <div className="mt-10 grid gap-8 md:grid-cols-2">
            <div className="bg-slate-950/40 border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4">Contact</h2>
              <ul className="space-y-3 text-gray-200">
                <li>
                  <span className="text-gray-400">Email:</span> {profile.email}
                </li>
                <li>
                  <span className="text-gray-400">Phone:</span> {profile.phone}
                </li>
                <li>
                  <span className="text-gray-400">Username:</span> /{profile.username}
                </li>
              </ul>
            </div>

            <div className="bg-slate-950/40 border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill) => (
                  <span key={skill} className="px-3 py-1 rounded-full text-sm border" style={{ borderColor: profile.accentColor, color: profile.accentColor }}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function UsernameProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading profile...</div>}>
      <ProfileContent />
    </Suspense>
  );
}
