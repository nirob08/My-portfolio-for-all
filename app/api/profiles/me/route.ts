import { NextResponse } from 'next/server';
import { toPortfolioProfile } from '../../../lib/server/profiles';
import { createSupabaseAdminClient, createSupabaseServerClient } from '../../../lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Sign in to manage your portfolio.' }, { status: 401 });
    }

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      const draft = user.user_metadata?.portfolio_draft;
      if (draft) {
        const { createPendingPortfolio } = await import('../../../lib/server/profiles');
        const username = await createPendingPortfolio(user, draft);
        const { data: created, error: createdError } = await admin
          .from('profiles')
          .select('*')
          .eq('username', username)
          .single();
        if (createdError) throw createdError;
        return NextResponse.json({ profile: toPortfolioProfile(created) });
      }

      return NextResponse.json({ error: 'No portfolio is linked to this account.' }, { status: 404 });
    }

    return NextResponse.json({ profile: toPortfolioProfile(data) });
  } catch (error) {
    console.error('Account portfolio lookup failed:', error);
    return NextResponse.json({ error: 'Could not load your account.' }, { status: 500 });
  }
}
