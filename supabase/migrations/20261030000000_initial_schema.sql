create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9]([a-z0-9-]{0,28}[a-z0-9])?$'),
  name text not null,
  email text not null,
  phone text not null default '',
  title text not null default '',
  bio text not null default '',
  image text not null default '',
  bg_image text not null default '',
  accent_color text not null default '#3b82f6',
  skills jsonb not null default '[]'::jsonb,
  projects jsonb not null default '[]'::jsonb,
  education jsonb not null default '[]'::jsonb,
  experience jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_submissions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  trx_id text not null,
  coupon_code text not null default '',
  amount integer not null check (amount >= 0),
  coupon_valid boolean not null default false,
  payment_verified boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.payment_submissions enable row level security;

drop policy if exists "Approved profiles are public" on public.profiles;
create policy "Approved profiles are public"
  on public.profiles for select
  using (status = 'approved');

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own pending profile" on public.profiles;
create policy "Users can create their own pending profile"
  on public.profiles for insert to authenticated
  with check (auth.uid() = user_id and status = 'pending');

drop policy if exists "Users can edit their own profile" on public.profiles;
create policy "Users can edit their own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can add their own payment submission" on public.payment_submissions;
create policy "Users can add their own payment submission"
  on public.payment_submissions for insert to authenticated
  with check (auth.uid() = user_id and payment_verified = false and coupon_valid = false);

drop policy if exists "Users can view their own payment submission" on public.payment_submissions;
create policy "Users can view their own payment submission"
  on public.payment_submissions for select to authenticated
  using (auth.uid() = user_id);

grant select on public.profiles to anon, authenticated;
revoke insert, delete on public.profiles from anon, authenticated;
grant update (name, email, phone, title, bio, image, bg_image, accent_color, skills, projects, education, experience)
  on public.profiles to authenticated;
grant select on public.payment_submissions to authenticated;
revoke insert, update, delete on public.payment_submissions from anon, authenticated;
grant all on public.profiles, public.payment_submissions to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portfolio-media',
  'portfolio-media',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Portfolio images are public" on storage.objects;
create policy "Portfolio images are public"
  on storage.objects for select
  using (bucket_id = 'portfolio-media');

drop policy if exists "Users can upload their own portfolio images" on storage.objects;
create policy "Users can upload their own portfolio images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'portfolio-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update their own portfolio images" on storage.objects;
create policy "Users can update their own portfolio images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'portfolio-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'portfolio-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete their own portfolio images" on storage.objects;
create policy "Users can delete their own portfolio images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'portfolio-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
