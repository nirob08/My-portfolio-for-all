import { NextResponse } from 'next/server';
import { normalizeUsername } from '../../lib/portfolio-data';
import { createSupabaseAdminClient } from '../../lib/supabase/server';

export async function GET(request: Request) {
  const username = normalizeUsername(new URL(request.url).searchParams.get('username') || '');
  if (!/^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$/.test(username)) {
    return NextResponse.json({ error: 'Use 1–30 lowercase letters, numbers, or hyphens.' }, { status: 400 });
  }

  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from('profiles')
      .select('username')
      .eq('username', username)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ available: !data });
  } catch (error) {
    console.error('Username availability check failed:', error);
    const isConfigurationError =
      error instanceof Error && error.message.includes('not configured');
    return NextResponse.json(
      {
        error: isConfigurationError
          ? 'Account registration is unavailable because Supabase is not configured on this server. The site owner must add the Supabase URL, anon key, and service-role key, then restart the server.'
          : 'Could not check username availability. Please try again later.',
      },
      { status: 503 },
    );
  }
}
