# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # dev server (localhost:3000)
npm run build      # production build
npx tsc --noEmit   # TypeScript check (run before deploying)
npx vercel --prod  # deploy to production manually
git add -A && git commit -m "..." && git push  # commit + push → triggers Vercel auto-deploy
```

## Stack

- **Next.js 16.2.6** App Router — server components by default, `"use client"` only when needed
- **Supabase** — auth + database (postgres). Client: `@/lib/supabase/client` (browser), `@/lib/supabase/server` (server components/actions)
- **Tailwind v4** — config via `@theme` block in `globals.css`, no `tailwind.config.js`
- **Stripe** — subscriptions for hosts (placeholders for now, Phase 2)
- **Vercel** — production at `kabanalouer.vercel.app`, GitHub auto-deploy from `main`

## Architecture

- `app/` — Next.js App Router pages. `(auth)/` group for login/signup
- `components/` — shared UI. `components/chalets/` for listing-specific components. `components/dashboard/` for host dashboard
- `lib/` — utilities: `supabase/`, `photo.ts`, `amenities.ts`
- `public/` — static assets including logo SVGs and hero image
- `design-system/` — brand reference files (SKILL.md, assets, previews). Read `design-system/SKILL.md` before any UI work

## Design system

**Primary color:** coral `#f04e45` — always use `text-primary`, `bg-primary`, `border-primary` (never hardcode the hex)

**Tailwind tokens defined in `globals.css`:**
- `--color-primary` → coral `#f04e45`
- `--color-charcoal-{50,100,200,300,400,500,600,700,800}` → dark text/border scale
- `bg-primary/5`, `bg-primary/10` for tinted backgrounds (NOT `bg-primary-50`)

**Rules (apply to all UI work):**
- No emojis in the UI — use inline SVG icons (Heroicons style, `strokeWidth={1.75}`)
- Sentence case on all titles
- CTA buttons → `rounded-full`
- Inputs/borders → `border-[#ebebeb]`
- Section backgrounds → `bg-charcoal-50`
- Heading text → `text-charcoal-800`
- Muted text → `text-charcoal-400`
- Prix québécois format: `120 $/nuit`, `299 $/an`
- Never use `border-gray-*` — use `border-[#ebebeb]` or charcoal tokens

**Typography:** Plus Jakarta Sans (loaded via `next/font/google`, variable `--font-jakarta`)

## Logo & favicon

All logo files are in `public/`:
- `logo-wordmark.svg` — coral wordmark, use on light backgrounds (Navbar, Footer)
- `logo-wordmark-light.svg` — white wordmark, use on dark/colored backgrounds
- `logo-mark.svg` — icon only (no text)
- `favicon.svg` — copied to `app/icon.svg` for Next.js App Router auto-detection

In Navbar and Footer, logos are rendered with `<Image src="/logo-wordmark.svg" ... />`.

## Key components

**`components/Navbar.tsx`** — client component, 3 variants:
1. Host navbar (dashboard tabs) — when `isHost && !voyageurMode`
2. Traveler navbar (avatar pill + dropdown)
3. Public navbar (login + CTA buttons)

On homepage (`pathname === "/"`): simple navbar, no search bar, no center links.
On all other pages: `NavSearchBar` centered between logo and buttons.

**`components/NavSearchBar.tsx`** — Airbnb-style mini search bar. Reads URL params via `useSearchParams` to pre-fill fields. Wrapped in `Suspense`. Includes `FiltersModal`. On mobile shows loupe icon → full-screen overlay.

**`components/SearchBar.tsx`** — full-size search bar used on homepage hero and mobile overlay of NavSearchBar.

**`components/chalets/FiltersModal.tsx`** — uses `createPortal(modal, document.body)` to escape the navbar's `backdrop-filter` stacking context. Must always use portal to render correctly from any parent.

**`app/page.tsx`** — homepage. Hero is `h-[100svh] md:h-screen`. Background image `public/hero-chalet.webp`.

**`app/chalets/page.tsx`** — search results + Google Maps split layout. No SearchBar on this page (it's in the navbar). FiltersModal is in NavSearchBar.

## Security

`SUPABASE_SERVICE_ROLE_KEY` must NEVER be prefixed with `NEXT_PUBLIC_` and must only be used in server-side code (API routes, server actions).

## Environment variables

Required in `.env.local` (and in Vercel → Settings → Environment Variables for production):

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY          # server-side only
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
ANTHROPIC_API_KEY
NEXT_PUBLIC_APP_URL                # https://kabanalouer.vercel.app in prod
NEXT_PUBLIC_VERCEL_URL             # https://kabanalouer.vercel.app in prod
```

## Deployment

- **Manual:** `npx vercel --prod` from local
- **Auto:** push to `main` on GitHub → Vercel builds automatically
- GitHub repo: `https://github.com/Kabanalouer/kabanalouer`
- Production URL: `https://kabanalouer.vercel.app`

**Next step:** Add all environment variables in Vercel → Settings → Environment Variables so that the automatic GitHub → Vercel build succeeds. The build currently fails with `supabaseKey is required` because the new Vercel project (connected to GitHub) doesn't have the env vars yet.
