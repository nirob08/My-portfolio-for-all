# My portfolio

Public portfolio platform built with Next.js, Supabase Auth, Supabase Postgres, and Supabase Storage.

## Local development

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local` and fill in the project URL, anon/publishable key, and service-role key.
3. Run the SQL migrations in `supabase/migrations/` in filename order in the Supabase SQL Editor.
4. Set the private admin password and session secret in `.env.local`.
5. In Supabase Authentication URL Configuration, set the local site URL to `http://localhost:3000` and allow `http://localhost:3000/auth/callback`.
6. Configure Supabase email SMTP/confirmation settings, then run:

   ```bash
   npm install
   npm run dev
   ```

New users register with email and password. If email confirmation is enabled, the confirmation callback creates their pending portfolio after they verify their email. Returning users sign in at `/login` with either their email or username and password. Portfolio editing and image uploads are enabled only after admin approval.

## Deploy to Vercel

1. Push this project to your Git provider and import it into Vercel.
2. Apply the Supabase migration before accepting registrations.
3. Add these environment variables to Vercel for Production, Preview, and Development:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` — server-only; never use a `NEXT_PUBLIC_` prefix.
   - `ADMIN_GATE_PASSWORD` — use a private, unique password for the published site.
   - `ADMIN_SESSION_SECRET` — generate a cryptographically random value of at least 32 characters.
   - `COUPON_CODE` — `nirob@all` if that is the coupon you intend to offer.
   - `PORTFOLIO_PRICE` — amount in BDT (default `500`).
   - `COUPON_PRICE` — discounted amount in BDT (default `200`).
4. In Supabase Authentication URL Configuration, set the production Site URL to your Vercel domain and add `https://YOUR-DOMAIN/auth/callback` to the allowed redirect URLs.
5. Configure production email delivery in Supabase Auth. Test signup, confirmation, sign-in, profile uploads, coupon validation, and admin approval on the deployed preview before advertising the site.

The admin panel is opened by double-clicking “My portfolio” and entering `ADMIN_GATE_PASSWORD`. Admin access uses an HTTP-only, signed cookie; the password and Supabase service-role key are checked only on the server.

Coupon validation defaults to `nirob@all`, with a regular price of BDT 500 and a discounted price of BDT 200. Set `COUPON_CODE`, `PORTFOLIO_PRICE`, and `COUPON_PRICE` to override these server-side defaults.

## Important payment note

bKash payments are manually verified in the admin panel using the submitted transaction ID. The app does not connect to the bKash payment API and must not automatically approve a payment based only on the form submission. Coupon validation is performed server-side, and profiles remain pending until an administrator verifies payment and approves them.

Uploaded images are compressed in the browser and stored in the `portfolio-media` Supabase Storage bucket. Database policies allow public reads of approved portfolios and restrict profile edits and image uploads to the authenticated owner after approval. Admins can permanently delete a portfolio; deletion also removes the associated account, payment record, and stored portfolio images.
