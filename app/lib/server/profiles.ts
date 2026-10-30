import type { User } from '@supabase/supabase-js';
import type { PortfolioProfile } from '../portfolio-data';
import { createSupabaseAdminClient } from '../supabase/server';

type PortfolioDraft = {
  username?: unknown;
  name?: unknown;
  phone?: unknown;
  title?: unknown;
  bio?: unknown;
  trxId?: unknown;
  couponCode?: unknown;
};

function text(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export function normalizePortfolioDraft(value: unknown, email: string) {
  const draft = (value && typeof value === 'object' ? value : {}) as PortfolioDraft;
  const username = text(draft.username, 30).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  const name = text(draft.name, 100);
  const phone = text(draft.phone, 40);
  const title = text(draft.title, 120) || 'Creative Professional';
  const bio = text(draft.bio, 2000);
  const trxId = text(draft.trxId, 120);
  const couponCode = text(draft.couponCode, 100);

  if (!/^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$/.test(username)) {
    throw new Error('Username must be 1–30 characters using lowercase letters, numbers, and hyphens.');
  }
  if (!name || !email || !trxId || !phone) {
    throw new Error('Name, email, phone number, and bKash transaction ID are required.');
  }

  return { username, name, email, phone, title, bio, trxId, couponCode };
}

export async function createPendingPortfolio(user: User, draftValue: unknown) {
  const email = user.email?.trim().toLowerCase() || '';
  const draft = normalizePortfolioDraft(draftValue, email);
  const admin = createSupabaseAdminClient();

  const { data: existing, error: existingError } = await admin
    .from('profiles')
    .select('username')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return existing.username as string;

  const configuredCoupon = process.env.COUPON_CODE?.trim().toLowerCase() || '';
  const couponValid = Boolean(configuredCoupon && draft.couponCode.toLowerCase() === configuredCoupon);
  const amount = couponValid
    ? Number(process.env.COUPON_PRICE || 200)
    : Number(process.env.PORTFOLIO_PRICE || 500);

  const { error: profileError } = await admin.from('profiles').insert({
    user_id: user.id,
    username: draft.username,
    name: draft.name,
    email: draft.email,
    phone: draft.phone,
    title: draft.title,
    bio: draft.bio,
    status: 'pending',
  });

  if (profileError) throw profileError;

  const { error: paymentError } = await admin.from('payment_submissions').insert({
    user_id: user.id,
    trx_id: draft.trxId,
    coupon_code: draft.couponCode,
    amount,
    coupon_valid: couponValid,
    payment_verified: false,
  });

  if (paymentError) {
    const { error: rollbackError } = await admin.from('profiles').delete().eq('user_id', user.id);
    if (rollbackError) {
      throw new Error(`Payment submission failed and profile rollback failed: ${rollbackError.message}`);
    }
    throw paymentError;
  }

  const { error: metadataError } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { portfolio_draft: null },
  });
  if (metadataError) throw metadataError;

  return draft.username;
}

export function toPortfolioProfile(row: Record<string, unknown>): PortfolioProfile {
  return {
    id: String(row.user_id || ''),
    username: String(row.username || ''),
    name: String(row.name || ''),
    email: String(row.email || ''),
    phone: String(row.phone || ''),
    title: String(row.title || ''),
    bio: String(row.bio || ''),
    image: String(row.image || ''),
    bgImage: String(row.bg_image || ''),
    accentColor: String(row.accent_color || '#3b82f6'),
    skills: Array.isArray(row.skills) ? row.skills as string[] : [],
    projects: Array.isArray(row.projects) ? row.projects as PortfolioProfile['projects'] : [],
    education: Array.isArray(row.education) ? row.education as PortfolioProfile['education'] : [],
    experience: Array.isArray(row.experience) ? row.experience as PortfolioProfile['experience'] : [],
    status: row.status === 'approved' || row.status === 'rejected' ? row.status : 'pending',
    createdAt: String(row.created_at || ''),
  };
}
