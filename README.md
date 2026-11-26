# Rosesblumen

Static Astro website for Rosesblumen, styled with Tailwind CSS, shadcn/ui, and the Typography plugin.

all images and video are on uploadthing, project rosesblumen

## Local development

```sh
npm install
npm run dev
```

Open <http://localhost:4321> for the Astro development server.

To test the Resend form locally, create `.env` from `.env.example`, add your Resend credentials, then run:

```sh
npm run build
npm start
```

The production server runs at <http://localhost:4321> and serves the static build plus `/api/contact`.

```text
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=Rosesblumen <kontakt@your-verified-domain.example>
CONTACT_TO_EMAIL=hallo@rosesblumen.com
```

Verify the sender domain in Resend. Keep the API key on the server and never expose it in a `PUBLIC_` variable.

## Deploy

### VPS

Install Node.js 22 or newer, run `npm ci && npm run build`, set the three environment variables above, then run `npm start` under a process manager such as systemd or PM2. The server listens on `PORT` (4321 by default) and can sit behind a reverse proxy such as Nginx.

### Vercel

Import the repository into Vercel. It builds the Astro site into `dist/` and the API function from `api/contact.js`. Add `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and optionally `CONTACT_TO_EMAIL` to the project environment variables.

## shadcn/ui

The complete available shadcn/ui component set is in `src/components/ui/`. This page uses the button, card, input, label, and textarea components. Add more later with `npx shadcn@latest add <component>`.
