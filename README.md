# Brew Lab

A private, single-owner coffee notebook built with Next.js App Router, strict TypeScript, Tailwind, shadcn-style Radix primitives, Lucide and Supabase. Light theme, responsive mobile/desktop layout and installable PWA. No timer, AI, charts, inventory or registration.

## Setup

Requires Node.js 22.12 or later and a Supabase project.

1. `npm install`
2. Copy `.env.example` to `.env.local`. Set your Supabase URL and **server-only** service-role key. Choose a four-digit `APP_PIN` and a random `SESSION_SECRET` of at least 32 characters (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`). Set `APP_ORIGIN` to the exact app origin.
3. Apply the SQL files in `supabase/migrations/` in filename order in the Supabase SQL editor. Alternatively, link your Supabase CLI project and run `supabase db push`. The migrations create the private `bean-covers` bucket and taste note management function.
4. `npm run seed` seeds equipment, categorized taste notes, processes and pour patterns. It is repeatable and creates no beans or personal brew history. `supabase/seed.sql` supplies equipment/process/pattern defaults for local Supabase reset; the JS seed also adds all taste notes.
5. `npm run dev`, then open http://localhost:3000 and unlock with your PIN.

Without environment variables, the app shows a setup message and remains locked. There is no authentication bypass or fake database fallback.

## Vercel

Import this repository into Vercel using its Next.js preset. Set the five environment variables from `.env.example` in the server environment. Use your HTTPS deployment origin for `APP_ORIGIN`. Apply migrations and run the seed before use. `npm run build` then `npm start` also works on a Node server. PWA installation requires HTTPS (localhost is allowed for development).

## Everyday flow

Add a bean with just its name and roaster. Optional details include a cover photo, roast, process, categorized taste notes and Dislike/Like/Love rating. Purchases are entered later using Buy again, priced in THB. Archive preserves everything; delete confirms before cascading.

Home has exactly three choices. Americano selects pour over, then 15g, 20g or custom dose; both latte choices select moka pot with independent recipe families. No starting recipe is generated: enter your own recipe. Pour targets are cumulative scale readings. Log this brew copies the visible recipe and lets you edit actual values, rate the cup and add feedback. Saving the log does not change Latest. After feedback, choose deterministic adjustment presets, inspect the preview, and explicitly choose Use as next recipe. Pins are independent snapshots. Custom doses scale water from the nearest canonical dose (17.5g chooses 20g), cannot be pinned, and cannot update canonical Latest.

## Architecture and integrity

- `src/features`: bean management, recipe editors/reference views, brew logging and settings.
- `src/lib/domain`: Zod types, validation, dose scaling and arithmetic.
- `src/lib/recommendations`: pure, non-mutating deterministic rule engine.
- `src/lib/server`: server-only database access and sessions.
- `src/app/api`: authenticated data, image, unlock and logout endpoints.

Beans, reusable choices, equipment, purchases, recipe families, immutable recipe versions, pins and brew logs are separate relational entities. A version stores the complete reproduction snapshot as JSONB, including ordered pour steps and equipment names/types. This deliberate snapshot representation prevents edits/deletion of equipment from rewriting history. Latest is a pointer updated in one transaction with version creation. Database triggers prohibit version updates; composite foreign keys prevent pins pointing to the wrong bean/family. Logs have their own editable snapshots and do not update family pointers. Deletes cascade only from the explicitly deleted bean.

Settings includes a searchable taste note library with five categories: Fruity, Floral, Sweet, Chocolate / Nutty, and Other. Common suggestions are stored in `src/lib/domain/taste-notes.json`. Tags can be added, renamed, moved between categories, or deleted. Renaming updates every bean using that tag; deleting removes it from those beans after confirmation. Tag changes and bean links are updated in one database transaction. Add missing suggested notes from Settings or the bean editor to restore suggestions without changing existing tags or selecting them on a bean.

## Security

There are no browser Supabase credentials. Because the single owner uses a PIN rather than Supabase Auth, all data passes through authenticated server routes using a server-only service-role client. RLS is enabled on every table with no anonymous/authenticated policies and grants revoked. Private storage has no public access policies. Images are served through the authenticated server and private responses are never cached by the service worker.

PINs are compared on the server using a constant-time comparison. Database rate limiting permits five attempts per forwarded IP in 15 minutes; rely on your deployment's trusted forwarding headers (Vercel supplies these). Random 256-bit sessions are hashed with the server secret in the database and stored in HttpOnly, SameSite=Strict cookies, Secure in production. Cookie persistence is ten years, subject to browser storage policies. Logout deletes the server session. Changing SESSION_SECRET invalidates all existing sessions. To revoke all devices, delete rows in app_sessions. Expired unused sessions and PIN attempt rows may be periodically cleared by the owner.

All mutations check same-origin requests, authenticate sessions and validate values server-side. Uploads accept JPEG/PNG/WebP under 12MB, limit decoded pixels, strip metadata, rotate, resize to at most 1200px and re-encode WebP. Cover replacement removes the old storage object; bean deletion removes its cover. An upload abandoned before saving a bean can leave an unreferenced object; periodically remove such objects if needed. JSON export includes all notebook records and choices but never PINs, credentials or session/rate-limit metadata. Cover files remain in private storage; their object paths are exported.

## Checks

`npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.

Tests cover canonical dose selection, cumulative scaling, recommendations, multiple adjustments, validation, price/ratio calculations, and PostgreSQL historical integrity using PGlite. Database tests execute the migration locally with mocked storage schema/roles; live Supabase connectivity and storage need configured credentials. `npm run test:browser` exercises the core UI flow at desktop and mobile sizes with mocked API responses; install its browser first using `npx playwright install chromium`.
# brewlab
