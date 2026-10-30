import { NextRequest, NextResponse } from 'next/server';
import { hasValidAdminSession } from '../../../lib/admin-session';
import { createSupabaseAdminClient } from '../../../lib/supabase/server';

function requireAdmin(request: NextRequest) {
  return hasValidAdminSession(request);
}

export async function GET(request: NextRequest) {
  try {
    if (!requireAdmin(request)) {
      return NextResponse.json({ error: 'Admin session required.' }, { status: 401 });
    }

    const admin = createSupabaseAdminClient();
    const [{ data: profiles, error: profilesError }, { data: payments, error: paymentsError }] =
      await Promise.all([
        admin.from('profiles').select('*').order('created_at', { ascending: false }),
        admin.from('payment_submissions').select('*'),
      ]);

    if (profilesError) throw profilesError;
    if (paymentsError) throw paymentsError;

    const paymentByUser = new Map((payments || []).map((payment) => [payment.user_id, payment]));
    const accounts = (profiles || []).map((profile) => {
      const payment = paymentByUser.get(profile.user_id);
      return {
        id: profile.user_id,
        username: profile.username,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        title: profile.title,
        bio: profile.bio,
        image: profile.image,
        bgImage: profile.bg_image,
        accentColor: profile.accent_color,
        skills: profile.skills || [],
        projects: profile.projects || [],
        education: profile.education || [],
        experience: profile.experience || [],
        status: profile.status,
        createdAt: profile.created_at,
        trxId: payment?.trx_id || '',
        couponCode: payment?.coupon_code || '',
        amount: payment?.amount || 0,
        couponValid: payment?.coupon_valid || false,
        paymentVerified: payment?.payment_verified || false,
      };
    });

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error('Admin profile lookup failed:', error);
    return NextResponse.json({ error: 'Could not load admin data.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!requireAdmin(request)) {
      return NextResponse.json({ error: 'Admin session required.' }, { status: 401 });
    }

    const body = await request.json();
    const username = typeof body.username === 'string' ? body.username.toLowerCase() : '';
    const admin = createSupabaseAdminClient();
    const { data: profile, error: lookupError } = await admin
      .from('profiles')
      .select('user_id,status')
      .eq('username', username)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (!profile) {
      return NextResponse.json({ error: 'Portfolio not found.' }, { status: 404 });
    }

    const paymentUpdates: Record<string, boolean> = {};
    if (typeof body.paymentVerified === 'boolean') paymentUpdates.payment_verified = body.paymentVerified;
    if (typeof body.couponValid === 'boolean') paymentUpdates.coupon_valid = body.couponValid;

    let paymentVerified = false;
    if (Object.keys(paymentUpdates).length > 0) {
      const { data: payment, error: paymentError } = await admin
        .from('payment_submissions')
        .update(paymentUpdates)
        .eq('user_id', profile.user_id)
        .select('payment_verified')
        .single();

      if (paymentError) throw paymentError;
      paymentVerified = payment.payment_verified;
    } else {
      const { data: payment, error: paymentError } = await admin
        .from('payment_submissions')
        .select('payment_verified')
        .eq('user_id', profile.user_id)
        .single();
      if (paymentError) throw paymentError;
      paymentVerified = payment.payment_verified;
    }

    if (body.status !== undefined) {
      if (!['pending', 'approved', 'rejected'].includes(body.status)) {
        return NextResponse.json({ error: 'Invalid profile status.' }, { status: 400 });
      }
      if (body.status === 'approved' && !paymentVerified) {
        return NextResponse.json({ error: 'Verify the payment before approving this portfolio.' }, { status: 400 });
      }

      const { error: statusError } = await admin
        .from('profiles')
        .update({ status: body.status, updated_at: new Date().toISOString() })
        .eq('user_id', profile.user_id);
      if (statusError) throw statusError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin profile update failed:', error);
    return NextResponse.json({ error: 'Could not update this account.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!requireAdmin(request)) {
      return NextResponse.json({ error: 'Admin session required.' }, { status: 401 });
    }

    const body = await request.json();
    const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
    if (!username) {
      return NextResponse.json({ error: 'A username is required.' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { data: profile, error: lookupError } = await admin
      .from('profiles')
      .select('user_id')
      .eq('username', username)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!profile) {
      return NextResponse.json({ error: 'Portfolio not found.' }, { status: 404 });
    }

    const mediaPaths: string[] = [];
    for (let offset = 0; ; offset += 100) {
      const { data: files, error: listError } = await admin.storage
        .from('portfolio-media')
        .list(profile.user_id, { limit: 100, offset });
      if (listError) throw listError;
      mediaPaths.push(...(files || []).map((file) => `${profile.user_id}/${file.name}`));
      if (!files || files.length < 100) break;
    }

    if (mediaPaths.length > 0) {
      const { error: removeError } = await admin.storage.from('portfolio-media').remove(mediaPaths);
      if (removeError) throw removeError;
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(profile.user_id);
    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin profile deletion failed:', error);
    return NextResponse.json({ error: 'Could not delete this account.' }, { status: 500 });
  }
}
