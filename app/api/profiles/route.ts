import { NextResponse } from 'next/server';
import { createPendingPortfolio, toPortfolioProfile } from '../../lib/server/profiles';
import { createSupabaseAdminClient, createSupabaseServerClient } from '../../lib/supabase/server';

function validateProfileUpdates(body: Record<string, unknown>) {
  const updates: Record<string, unknown> = {};
  const isPortfolioImage = (value: string) => {
    if (!value) return true;

    try {
      const imageUrl = new URL(value);
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) return false;
      const projectUrl = new URL(supabaseUrl);
      return (
        imageUrl.protocol === 'https:' &&
        imageUrl.origin === projectUrl.origin &&
        imageUrl.pathname.startsWith('/storage/v1/object/public/portfolio-media/')
      );
    } catch {
      return false;
    }
  };
  const cleanText = (value: unknown, limit: number, field: string) => {
    if (typeof value !== 'string' || value.length > limit) {
      throw new Error(`Invalid ${field} value.`);
    }
    return value.trim();
  };
  const textFields = [
    ['title', 'title', 120],
    ['bio', 'bio', 2000],
    ['image', 'image', 2048],
    ['bgImage', 'bg_image', 2048],
    ['accentColor', 'accent_color', 7],
  ] as const;

  for (const [input, column, maxLength] of textFields) {
    if (body[input] === undefined) continue;
    if (typeof body[input] !== 'string' || body[input].length > maxLength) {
      throw new Error(`Invalid ${input} value.`);
    }
    if (input === 'accentColor' && !/^#[0-9a-f]{6}$/i.test(body[input] as string)) {
      throw new Error('Choose a valid theme color.');
    }
    if (input === 'image' || input === 'bgImage') {
      const image = body[input] as string;
      if (!isPortfolioImage(image)) {
        throw new Error('Upload images using the profile image controls.');
      }
    }
    updates[column] = body[input];
  }

  if (body.skills !== undefined) {
    if (!Array.isArray(body.skills) || body.skills.length > 50 || body.skills.some((item) => typeof item !== 'string' || item.length > 80)) {
      throw new Error('Skills must be a list of up to 50 short entries.');
    }
    updates.skills = body.skills;
  }

  const collectionLimits = [
    ['projects', 40],
    ['education', 30],
    ['experience', 30],
  ] as const;
  for (const [field, limit] of collectionLimits) {
    if (body[field] === undefined) continue;
    if (!Array.isArray(body[field]) || body[field].length > limit) {
      throw new Error(`${field} has too many entries.`);
    }
    if (field === 'projects') {
      updates.projects = (body.projects as unknown[]).map((value, index) => {
        if (!value || typeof value !== 'object') throw new Error(`Invalid project ${index + 1}.`);
        const item = value as Record<string, unknown>;
        const image = cleanText(item.image, 2048, 'project image');
        if (!isPortfolioImage(image)) throw new Error('Upload project images using the profile image controls.');
        const link = cleanText(item.link, 2048, 'project link');
        if (link) {
          let parsed: URL;
          try {
            parsed = new URL(link);
          } catch {
            throw new Error('Project links must be valid HTTP or HTTPS URLs.');
          }
          if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            throw new Error('Project links must be valid HTTP or HTTPS URLs.');
          }
        }
        return {
          id: cleanText(item.id, 100, 'project id'),
          title: cleanText(item.title, 160, 'project title'),
          description: cleanText(item.description, 3000, 'project description'),
          image,
          link,
        };
      });
    } else if (field === 'education') {
      updates.education = (body.education as unknown[]).map((value, index) => {
        if (!value || typeof value !== 'object') throw new Error(`Invalid education ${index + 1}.`);
        const item = value as Record<string, unknown>;
        return {
          id: cleanText(item.id, 100, 'education id'),
          degree: cleanText(item.degree, 160, 'degree'),
          institution: cleanText(item.institution, 200, 'institution'),
          location: cleanText(item.location, 160, 'education location'),
          period: cleanText(item.period, 100, 'education dates'),
          result: cleanText(item.result, 100, 'education result'),
        };
      });
    } else {
      updates.experience = (body.experience as unknown[]).map((value, index) => {
        if (!value || typeof value !== 'object') throw new Error(`Invalid experience ${index + 1}.`);
        const item = value as Record<string, unknown>;
        return {
          id: cleanText(item.id, 100, 'experience id'),
          role: cleanText(item.role, 160, 'role'),
          organization: cleanText(item.organization, 200, 'organization'),
          period: cleanText(item.period, 100, 'experience dates'),
          description: cleanText(item.description, 3000, 'experience description'),
        };
      });
    }
  }

  return updates;
}

export async function GET(request: Request) {
  try {
    const username = new URL(request.url).searchParams.get('username')?.trim().toLowerCase();
    const supabase = await createSupabaseServerClient();
    const query = supabase.from('profiles').select('*');
    const { data, error } = username
      ? await query.eq('username', username).maybeSingle()
      : await query.eq('status', 'approved').order('created_at', { ascending: false });

    if (error) {
      console.error('Profile lookup failed:', error.message);
      return NextResponse.json({ error: 'Could not load this portfolio.' }, { status: 500 });
    }
    if (username && !data) {
      return NextResponse.json({ error: 'Portfolio not found.' }, { status: 404 });
    }

    if (username) {
      return NextResponse.json({ profile: toPortfolioProfile(data as Record<string, unknown>) });
    }

    const profiles = Array.isArray(data)
      ? (data as Record<string, unknown>[]).map((profile) => toPortfolioProfile(profile))
      : [];
    return NextResponse.json({ profiles });
  } catch (error) {
    console.error('Profile lookup failed:', error);
    return NextResponse.json({ error: 'Portfolio service is not configured.' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Sign in to submit your portfolio.' }, { status: 401 });
    }

    const draft = await request.json();
    const username = await createPendingPortfolio(user, draft);
    return NextResponse.json({ username }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not submit the portfolio.';
    const isDuplicate = message.includes('already been taken') || message.includes('duplicate key');
    const isValidationError =
      message.startsWith('Username ') ||
      message.startsWith('Name, email, phone') ||
      message.startsWith('Invalid ');
    console.error('Portfolio submission failed:', message);
    const status = isDuplicate ? 409 : isValidationError ? 400 : 500;
    return NextResponse.json(
      { error: isDuplicate ? 'That username is already taken.' : isValidationError ? message : 'Could not submit your portfolio. Please try again.' },
      { status },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Sign in to edit your portfolio.' }, { status: 401 });
    }

    const body = await request.json();
    const admin = createSupabaseAdminClient();
    const { data: existing, error: lookupError } = await admin
      .from('profiles')
      .select('user_id,status')
      .eq('username', String(body.username || '').toLowerCase())
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: 'You do not own this portfolio.' }, { status: 403 });
    }
    if (existing.status !== 'approved') {
      return NextResponse.json({ error: 'Portfolio editing is available after admin approval.' }, { status: 403 });
    }

    const updates = validateProfileUpdates(body);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'There are no profile changes to save.' }, { status: 400 });
    }

    const { data, error } = await admin
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (error) throw error;
    return NextResponse.json({ profile: toPortfolioProfile(data) });
  } catch (error) {
    console.error('Portfolio update failed:', error);
    const message = error instanceof Error ? error.message : 'Could not save your portfolio. Please try again.';
    const status = message.startsWith('Invalid ') || message.startsWith('Choose ') || message.startsWith('Upload ') || message.startsWith('Skills ') || message.endsWith('too many entries.') || message.startsWith('Project ') || message.startsWith('Project links') || message.startsWith('education ') || message.startsWith('experience ') || message.startsWith('degree ') || message.startsWith('institution ') || message.startsWith('role ') || message.startsWith('organization ') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
