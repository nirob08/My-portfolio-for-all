import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  let code: unknown;
  try {
    ({ code } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const expected = (process.env.COUPON_CODE || 'nirob@all').trim();

  if (typeof code !== 'string' || code.trim().toLowerCase() !== expected.toLowerCase()) {
    return NextResponse.json({ error: 'Invalid coupon code.' }, { status: 400 });
  }

  const regularPrice = Number(process.env.PORTFOLIO_PRICE || 500);
  const discountedPrice = Number(process.env.COUPON_PRICE || 200);
  if (!Number.isSafeInteger(regularPrice) || !Number.isSafeInteger(discountedPrice) || discountedPrice < 0 || discountedPrice > regularPrice) {
    console.error('Invalid portfolio price configuration.');
    return NextResponse.json({ error: 'Coupon pricing is temporarily unavailable. Please contact the site owner.' }, { status: 503 });
  }

  return NextResponse.json({ valid: true, price: discountedPrice });
}
