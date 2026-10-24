# Beta Property — homepage presentation

A responsive, buildless presentation website. Serve `dist/` with any static host. All secondary paths use the SPA fallback and show the branded Under Development screen. No installation or compilation is required.

## Current scope
- Complete animated homepage, mobile menu, accessible location tabs, property-category links and search navigation.
- Marketing pages, including `/admin`, display Under Development. The separate `referral-admin/` project provides the realtor registration and admin portal using Next.js and Supabase.
- The header and mobile menu link directly to realtor registration at `/realtor/register` on the same domain. Vercel proxies `/realtor/*` to the separate Next.js portal deployment at `referral-admin-dashboard.vercel.app`.
- The referral portal is outside `dist/` so its server-side code, local dependencies and environment settings are not published as static website files. It remains a separate Git project; deploy it to `referral-admin-dashboard.vercel.app` and set up Supabase using `referral-admin/README.md`. The proxy target currently has no deployment, so `/realtor/register` becomes live after that portal is deployed and the Supabase callback URL is configured.
- Working WhatsApp destination is centralised in `dist/app.js`: +234 907 944 0776, supplied in the brief and pending business confirmation.
- No fabricated listings, prices, credentials or testimonials. Unsplash architecture/interior images are illustrative, explicitly identified on the page.
- Preview is excluded from indexing.

## Assets
Original client logo retained in `dist/assets/beta-logo.png`; the site uses `dist/assets/beta-logo-transparent.png` with a transparent background.
Illustrative photography: images.unsplash.com photo IDs 1600596542815-ffad4c1539a9, 1600585154340-be6161a56a0c, 1486406146926-c627a92ad1ab, 1600210492486-724fe5c67fb0 and 1600607687920-4e2a09cf159d.
Typefaces: DM Sans and Manrope from Google Fonts, with system fallbacks.

## Next phase
Deploy the realtor portal and confirm its public URL, configure its Supabase project, replace illustrative content with approved property media, and confirm the WhatsApp destination.
