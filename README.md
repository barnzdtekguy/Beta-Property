# Beta Property Website

A Next.js website that combines the Beta Property marketing site with the
realtor referral portal. The marketing site is served at `/`; the realtor
registration, dashboard, and admin portal live under `/realtor`.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The app uses the Supabase environment
variables shown in `.env.local.example`; keep real credentials in the
ignored `.env.local` file.

## Fresh Supabase setup

The Supabase SQL files are prepared locally; no remote database reset or
migration has been run. To install this as a fresh application in the
configured Supabase project:

1. In Supabase, verify that you selected the intended project before running
   any SQL. `supabase/reset.sql` is destructive: it removes the application's
   `public` tables, views, and functions, plus the `property-images` bucket
   and its objects. It preserves Supabase Auth identities, extensions, and
   other schemas. Existing Auth users will no longer have application rows;
   remove any such accounts separately in Supabase Auth only if desired.
2. Run `supabase/reset.sql` in the Supabase SQL Editor.
3. Run `supabase/schema.sql`.
4. Run `supabase/migrations/005_sales_payouts_announcements.sql`,
   `supabase/migrations/006_email_verification_and_lockout.sql`, and
   `supabase/migrations/007_real_estate_platform.sql`, in that order.
   The base `schema.sql` already includes the functionality from migrations
   002-004, so do not run those migrations again after the reset.
5. In Supabase Authentication settings, enable email confirmations and set
   the site URL and redirect URL for `/realtor/auth/confirm`. Configure SMTP
   if the project needs to send real confirmation email.
6. Create the first admin as an Auth user, then link that user in the SQL
   Editor. Replace the sample values with the Auth user's exact email:

   ```sql
   insert into public.admins (id, email, full_name, role)
   select id, email, 'Admin name', 'superadmin'
   from auth.users
   where email = 'admin@example.com'
   on conflict (id) do update
   set email = excluded.email,
       full_name = excluded.full_name,
       role = excluded.role;
   ```

Do not run `supabase/seed.sql` for a live system; it inserts optional demo
realtors and referral activity. The app does not invent or seed property
listings.

## Deploy

Deploy this project as a Next.js app. The original static website files
remain in `dist/` and are also included in `public/` so existing marketing
pages and assets keep working. The former standalone portal project is
kept in `referral-admin/` as an untouched local copy during the migration.

The repository is configured for a Next.js deployment, but no live
deployment has been changed. The current production site and standalone
portal remain as they are until you deploy this unified app. Before
cutover, configure the Vercel project with the root `.env.local` values
and confirm the Supabase Auth site URL and `/realtor/auth/confirm`
callback URL.

## Current scope
- Complete animated homepage, mobile menu, accessible location tabs, property-category links and search navigation.
- Marketing pages, including `/admin`, display Under Development. The realtor registration and admin portal use Next.js and Supabase in this same app under `/realtor`.
- Public `/properties` and `/contact` pages use the Supabase property and inquiry workflows. Admins can add, publish, archive, and assign properties; agents can view assigned listings and handle assigned inquiries.
- The header and mobile menu link directly to realtor registration at `/realtor/register`.
- Working WhatsApp destination is centralised in `dist/app.js`: +234 907 944 0776, supplied in the brief and pending business confirmation.
- No fabricated listings, prices, credentials or testimonials. Unsplash architecture/interior images are illustrative, explicitly identified on the page.
- Preview is excluded from indexing.

## Assets
Original client logo retained in `dist/assets/beta-logo.png`; the site uses `dist/assets/beta-logo-transparent.png` with a transparent background.
Illustrative photography: images.unsplash.com photo IDs 1600596542815-ffad4c1539a9, 1600585154340-be6161a56a0c, 1486406146926-c627a92ad1ab, 1600210492486-724fe5c67fb0 and 1600607687920-4e2a09cf159d.
Typefaces: DM Sans and Manrope from Google Fonts, with system fallbacks.

## Cutover checklist
- Confirm Vercel uses this repository root as the Next.js project.
- Ensure all three Supabase environment variables are set in Vercel.
- Confirm the Supabase Auth site URL and `/realtor/auth/confirm` callback.
- Deploy only when ready to replace the current production routing. No
  deployment or domain disconnection has been performed as part of this
  integration.
