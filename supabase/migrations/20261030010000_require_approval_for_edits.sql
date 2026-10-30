drop policy if exists "Users can edit their own profile" on public.profiles;
create policy "Approved users can edit their own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = user_id and status = 'approved')
  with check (auth.uid() = user_id and status = 'approved');

drop policy if exists "Users can upload their own portfolio images" on storage.objects;
create policy "Approved users can upload their own portfolio images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'portfolio-media'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.profiles
      where user_id = auth.uid() and status = 'approved'
    )
  );

drop policy if exists "Users can update their own portfolio images" on storage.objects;
create policy "Approved users can update their own portfolio images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'portfolio-media'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.profiles
      where user_id = auth.uid() and status = 'approved'
    )
  )
  with check (
    bucket_id = 'portfolio-media'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.profiles
      where user_id = auth.uid() and status = 'approved'
    )
  );

drop policy if exists "Users can delete their own portfolio images" on storage.objects;
create policy "Approved users can delete their own portfolio images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'portfolio-media'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.profiles
      where user_id = auth.uid() and status = 'approved'
    )
  );
