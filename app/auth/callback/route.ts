import { NextResponse } from 'next/server';
import { createPendingPortfolio } from '../../lib/server/profiles';
import { createSupabaseServerClient } from '../../lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=verification', url.origin));
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) throw exchangeError;

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw userError || new Error('Could not verify the account.');

    const draft = user.user_metadata?.portfolio_draft;
    if (!draft) {
      return NextResponse.redirect(new URL('/login?verified=1', url.origin));
    }

    const username = await createPendingPortfolio(user, draft);
    return NextResponse.redirect(new URL(`/${encodeURIComponent(username)}?submitted=1`, url.origin));
  } catch (error) {
    console.error('Email confirmation failed:', error);
    return NextResponse.redirect(new URL('/login?error=setup', url.origin));
  }
}
