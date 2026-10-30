import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseServerClient } from '../../../lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Enter your email or username and password.' }, { status: 400 });
    }

    const { identifier, password } = body as Record<string, unknown>;
    if (typeof identifier !== 'string' || typeof password !== 'string' || !identifier.trim() || !password) {
      return NextResponse.json({ error: 'Enter your email or username and password.' }, { status: 400 });
    }

    const loginIdentifier = identifier.trim().toLowerCase();
    let email = loginIdentifier;
    if (!loginIdentifier.includes('@')) {
      const admin = createSupabaseAdminClient();
      const { data: profile, error: lookupError } = await admin
        .from('profiles')
        .select('user_id')
        .eq('username', loginIdentifier)
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (!profile) {
        return NextResponse.json({ error: 'Invalid email/username or password.' }, { status: 401 });
      }

      const { data: userResult, error: userError } = await admin.auth.admin.getUserById(profile.user_id);
      if (userError) throw userError;
      if (!userResult.user.email) {
        return NextResponse.json({ error: 'Invalid email/username or password.' }, { status: 401 });
      }
      email = userResult.user.email;
    }

    const supabase = await createSupabaseServerClient();
    const { data: authResult, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError || !authResult.user) {
      return NextResponse.json({ error: 'Invalid email/username or password.' }, { status: 401 });
    }

    const admin = createSupabaseAdminClient();
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('username')
      .eq('user_id', authResult.user.id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: 'No portfolio is linked to this account.' }, { status: 404 });
    }

    return NextResponse.json({ username: profile.username });
  } catch (error) {
    console.error('Account sign-in failed:', error);
    return NextResponse.json({ error: 'Could not sign in. Please try again.' }, { status: 500 });
  }
}
