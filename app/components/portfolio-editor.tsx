'use client';

import { useState } from 'react';
import {
  COLOR_PRESETS,
  type PortfolioEducation,
  type PortfolioExperience,
  type PortfolioProfile,
  type PortfolioProject,
} from '../lib/portfolio-data';
import { createSupabaseBrowserClient } from '../lib/supabase/client';

type Props = {
  profile: PortfolioProfile;
  onSaved: (profile: PortfolioProfile) => void;
};

type EditorData = Pick<
  PortfolioProfile,
  'title' | 'bio' | 'image' | 'bgImage' | 'accentColor' | 'skills' | 'projects' | 'education' | 'experience'
>;

const fieldClass =
  'w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-blue-500 focus:outline-none';

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function readCompressedImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Choose an image file.');
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('Choose an image smaller than 8 MB.');
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1440 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('This browser could not process the image.');
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error('Could not process this image. Try another file.'));
    }, 'image/jpeg', 0.78);
  });

  return blob;
}

function emptyProject(): PortfolioProject {
  return { id: createId(), title: '', description: '', image: '', link: '' };
}

function emptyEducation(): PortfolioEducation {
  return { id: createId(), degree: '', institution: '', location: '', period: '', result: '' };
}

function emptyExperience(): PortfolioExperience {
  return { id: createId(), role: '', organization: '', period: '', description: '' };
}

export default function PortfolioEditor({ profile, onSaved }: Props) {
  const [data, setData] = useState<EditorData>({
    title: profile.title,
    bio: profile.bio,
    image: profile.image,
    bgImage: profile.bgImage,
    accentColor: profile.accentColor,
    skills: profile.skills || [],
    projects: profile.projects || [],
    education: profile.education || [],
    experience: profile.experience || [],
  });
  const [skillInput, setSkillInput] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [saving, setSaving] = useState(false);

  const updateProject = (id: string, updates: Partial<PortfolioProject>) => {
    setData((current) => ({
      ...current,
      projects: current.projects.map((item) => item.id === id ? { ...item, ...updates } : item),
    }));
  };

  const updateEducation = (id: string, updates: Partial<PortfolioEducation>) => {
    setData((current) => ({
      ...current,
      education: current.education.map((item) => item.id === id ? { ...item, ...updates } : item),
    }));
  };

  const updateExperience = (id: string, updates: Partial<PortfolioExperience>) => {
    setData((current) => ({
      ...current,
      experience: current.experience.map((item) => item.id === id ? { ...item, ...updates } : item),
    }));
  };

  const uploadImage = async (
    event: React.ChangeEvent<HTMLInputElement>,
    field: 'image' | 'bgImage',
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');

    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Sign in again before uploading images.');

      const blob = await readCompressedImage(file);
      const path = `${user.id}/${createId()}.jpg`;
      const { data, error: uploadError } = await supabase.storage
        .from('portfolio-media')
        .upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' });
      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage.from('portfolio-media').getPublicUrl(data.path);
      setData((current) => ({ ...current, [field]: publicUrl.publicUrl }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load this image.');
    }
  };

  const uploadProjectImage = async (event: React.ChangeEvent<HTMLInputElement>, id: string) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');

    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Sign in again before uploading images.');

      const blob = await readCompressedImage(file);
      const path = `${user.id}/${createId()}.jpg`;
      const { data, error: uploadError } = await supabase.storage
        .from('portfolio-media')
        .upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' });
      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage.from('portfolio-media').getPublicUrl(data.path);
      updateProject(id, { image: publicUrl.publicUrl });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load this image.');
    }
  };

  const save = async () => {
    setError('');
    setSaved('');
    setSaving(true);

    try {
      const response = await fetch('/api/profiles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: profile.username,
          ...data,
          projects: data.projects.filter((item) => item.title.trim() || item.description.trim() || item.image),
          education: data.education.filter((item) => item.degree.trim() || item.institution.trim()),
          experience: data.experience.filter((item) => item.role.trim() || item.organization.trim()),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save your portfolio.');
      onSaved(result.profile);
      setSaved('Your portfolio changes have been saved.');
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Could not save your changes. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-8 space-y-8 rounded-2xl border border-white/10 bg-slate-950/50 p-5 md:p-7">
      <div>
        <h2 className="text-2xl font-bold">Build Your Portfolio</h2>
        <p className="mt-2 text-sm text-gray-400">
          Add as many projects, education entries, and work experiences as you need. Images are optimized before saving.
        </p>
      </div>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">About</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm text-gray-300">
            Professional title
            <input className={`${fieldClass} mt-1`} value={data.title} onChange={(event) => setData({ ...data, title: event.target.value })} />
          </label>
          <label className="text-sm text-gray-300">
            Add skills
            <div className="mt-1 flex gap-2">
              <input className={fieldClass} value={skillInput} onChange={(event) => setSkillInput(event.target.value)} placeholder="Design, Marketing, Leadership" />
              <button
                type="button"
                onClick={() => {
                  const skill = skillInput.trim();
                  if (skill && !data.skills.includes(skill)) {
                    setData({ ...data, skills: [...data.skills, skill] });
                  }
                  setSkillInput('');
                }}
                className="rounded-xl bg-blue-600 px-4 font-medium hover:bg-blue-700"
              >
                Add
              </button>
            </div>
            <span className="mt-2 flex flex-wrap gap-2">
              {data.skills.map((skill) => (
                <button
                  type="button"
                  key={skill}
                  title="Remove skill"
                  onClick={() => setData({ ...data, skills: data.skills.filter((item) => item !== skill) })}
                  className="rounded-full border px-3 py-1 text-xs"
                  style={{ borderColor: data.accentColor, color: data.accentColor }}
                >
                  {skill} ×
                </button>
              ))}
            </span>
          </label>
          <label className="text-sm text-gray-300 md:col-span-2">
            About me
            <textarea className={`${fieldClass} mt-1`} rows={4} value={data.bio} onChange={(event) => setData({ ...data, bio: event.target.value })} />
          </label>
          <label className="text-sm text-gray-300">
            Profile photo
            <input className="mt-2 block w-full text-sm" type="file" accept="image/*" onChange={(event) => void uploadImage(event, 'image')} />
          </label>
          <label className="text-sm text-gray-300">
            Page background image
            <input className="mt-2 block w-full text-sm" type="file" accept="image/*" onChange={(event) => void uploadImage(event, 'bgImage')} />
          </label>
        </div>
        <div>
          <p className="mb-2 text-sm text-gray-300">Theme color</p>
          <div className="flex flex-wrap gap-3">
            {COLOR_PRESETS.map((color) => (
              <button
                key={color.value}
                type="button"
                aria-label={`${color.label} theme`}
                aria-pressed={data.accentColor === color.value}
                onClick={() => setData({ ...data, accentColor: color.value })}
                className={`h-9 w-9 rounded-full border-2 ${data.accentColor === color.value ? 'scale-110 border-white' : 'border-transparent'}`}
                style={{ backgroundColor: color.value }}
              />
            ))}
            <input
              type="color"
              aria-label="Custom theme color"
              value={data.accentColor}
              onChange={(event) => setData({ ...data, accentColor: event.target.value })}
              className="h-9 w-12 cursor-pointer rounded border-0 bg-transparent"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4 border-t border-white/10 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Projects & Gallery</h3>
            <p className="text-sm text-gray-400">Give every project its own photo, description, and link.</p>
          </div>
          <button type="button" onClick={() => setData({ ...data, projects: [...data.projects, emptyProject()] })} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-700">
            + Add project
          </button>
        </div>
        {data.projects.length === 0 && <p className="rounded-xl border border-dashed border-gray-700 p-5 text-sm text-gray-400">No projects added yet. Select “Add project” to add your first work sample.</p>}
        <div className="grid gap-4 lg:grid-cols-2">
          {data.projects.map((project, index) => (
            <article key={project.id} className="space-y-3 rounded-2xl border border-gray-700 bg-gray-900/80 p-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Project {index + 1}</h4>
                <button type="button" onClick={() => setData({ ...data, projects: data.projects.filter((item) => item.id !== project.id) })} className="text-sm text-red-300 hover:text-red-200">Remove</button>
              </div>
              <input className={fieldClass} placeholder="Project title" value={project.title} onChange={(event) => updateProject(project.id, { title: event.target.value })} />
              <textarea className={fieldClass} rows={3} placeholder="What did you create? What was your role?" value={project.description} onChange={(event) => updateProject(project.id, { description: event.target.value })} />
              <input className={fieldClass} type="url" placeholder="Project link (optional)" value={project.link} onChange={(event) => updateProject(project.id, { link: event.target.value })} />
              <label className="block text-sm text-gray-300">
                Project image
                <input className="mt-2 block w-full text-sm" type="file" accept="image/*" onChange={(event) => void uploadProjectImage(event, project.id)} />
              </label>
              {project.image && <img src={project.image} alt={`${project.title || 'Project'} preview`} className="h-40 w-full rounded-xl object-cover" />}
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4 border-t border-white/10 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Work Experience</h3>
            <p className="text-sm text-gray-400">Add roles, organizations, dates, and details.</p>
          </div>
          <button type="button" onClick={() => setData({ ...data, experience: [...data.experience, emptyExperience()] })} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-700">
            + Add experience
          </button>
        </div>
        {data.experience.map((item, index) => (
          <article key={item.id} className="space-y-3 rounded-2xl border border-gray-700 bg-gray-900/80 p-4">
            <div className="flex items-center justify-between"><h4 className="font-medium">Experience {index + 1}</h4><button type="button" onClick={() => setData({ ...data, experience: data.experience.filter((entry) => entry.id !== item.id) })} className="text-sm text-red-300">Remove</button></div>
            <div className="grid gap-3 md:grid-cols-2">
              <input className={fieldClass} placeholder="Job title / role" value={item.role} onChange={(event) => updateExperience(item.id, { role: event.target.value })} />
              <input className={fieldClass} placeholder="Company / organization" value={item.organization} onChange={(event) => updateExperience(item.id, { organization: event.target.value })} />
              <input className={fieldClass} placeholder="Dates (e.g. Jan 2024 - Present)" value={item.period} onChange={(event) => updateExperience(item.id, { period: event.target.value })} />
              <textarea className={fieldClass} rows={2} placeholder="Responsibilities and achievements" value={item.description} onChange={(event) => updateExperience(item.id, { description: event.target.value })} />
            </div>
          </article>
        ))}
      </section>

      <section className="space-y-4 border-t border-white/10 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Education</h3>
            <p className="text-sm text-gray-400">Add schools, degrees, dates, and results.</p>
          </div>
          <button type="button" onClick={() => setData({ ...data, education: [...data.education, emptyEducation()] })} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-700">
            + Add education
          </button>
        </div>
        {data.education.map((item, index) => (
          <article key={item.id} className="space-y-3 rounded-2xl border border-gray-700 bg-gray-900/80 p-4">
            <div className="flex items-center justify-between"><h4 className="font-medium">Education {index + 1}</h4><button type="button" onClick={() => setData({ ...data, education: data.education.filter((entry) => entry.id !== item.id) })} className="text-sm text-red-300">Remove</button></div>
            <div className="grid gap-3 md:grid-cols-2">
              <input className={fieldClass} placeholder="Degree / qualification" value={item.degree} onChange={(event) => updateEducation(item.id, { degree: event.target.value })} />
              <input className={fieldClass} placeholder="School / institution" value={item.institution} onChange={(event) => updateEducation(item.id, { institution: event.target.value })} />
              <input className={fieldClass} placeholder="Location" value={item.location} onChange={(event) => updateEducation(item.id, { location: event.target.value })} />
              <input className={fieldClass} placeholder="Dates (e.g. 2022 - 2026)" value={item.period} onChange={(event) => updateEducation(item.id, { period: event.target.value })} />
              <input className={fieldClass} placeholder="Result / grade (optional)" value={item.result} onChange={(event) => updateEducation(item.id, { result: event.target.value })} />
            </div>
          </article>
        ))}
      </section>

      {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
      {saved && <p role="status" className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-200">{saved}</p>}
      <div className="flex justify-end border-t border-white/10 pt-5">
        <button type="button" onClick={save} disabled={saving} className="rounded-xl bg-blue-600 px-6 py-3 font-semibold transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">
          {saving ? 'Saving…' : 'Save Portfolio'}
        </button>
      </div>
    </div>
  );
}
