# Rosesblumen

Static Astro website for Rosesblumen, styled with Tailwind CSS, shadcn/ui, and the Typography plugin.

all images and video are on uploadthing, project rosesblumen

emails send with resend

## Local development

```sh
npm install
npm run dev
```

Open <http://localhost:4321> for the Astro development server.

**Turnstile note:** The current Turnstile widget does not work on the local development hostname. Contact form submissions that require Turnstile can therefore only be completed on Vercel until a separate local widget is configured.

To run the contact form locally, copy `.env.example` to `.env`, add your Resend credentials and Turnstile keys, then run:

```sh
npm run build
npm start
```

The production server runs at <http://localhost:4321> and serves the static build plus `/api/contact`.

```text
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=Rosesblumen <kontakt@your-verified-domain.example>
CONTACT_TO_EMAIL=hallo@rosesblumen.com
PUBLIC_TURNSTILE_SITE_KEY=your-turnstile-site-key
TURNSTILE_SECRET_KEY=your-turnstile-secret-key
```

Verify the sender domain in Resend. `PUBLIC_TURNSTILE_SITE_KEY` is public and is embedded in the page at build time. Keep `TURNSTILE_SECRET_KEY` and `RESEND_API_KEY` private server-side values; never use a `PUBLIC_` prefix for either secret.

## Deploy

### VPS

Install Node.js 22 or newer, set all five environment variables above, run `npm ci && npm run build`, then run `npm start` under a process manager such as systemd or PM2. The server listens on `PORT` (4321 by default) and can sit behind a reverse proxy such as Nginx.

### Vercel

Import the repository into Vercel. It builds the Astro site into `dist/` and the API function from `api/contact.js`. Add `PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and optionally `CONTACT_TO_EMAIL` to the project environment variables. The site key must be available during the build; the secret keys are used by the server function.

## shadcn/ui

The complete available shadcn/ui component set is in `src/components/ui/`. This page uses the button, card, input, label, and textarea components. Add more later with `npx shadcn@latest add <component>`.
