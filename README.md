# CivicFix

CivicFix is a mobile-first civic problem tracker for reporting public issues, following progress, and giving departments a clear work queue.

## How it works

1. A resident browses civic categories, signs in, and submits a report with a title, description, address, map location, and optional photo.
2. Supabase stores the report, assigns it to the matching department, creates its public reference, and records its history.
3. Residents can explore public reports on a map, open report details, view status updates, and track their own submissions.
4. Staff see reports assigned to their department and publish progress updates. Admins can manage all reports and delete reports with their attachments.

## Main features

- Email/password sign-up, login, password reset, and deep-link callbacks.
- Public issue feed, category filtering, map exploration, issue detail pages, and progress timelines.
- Location capture with Expo Location and photo capture/selection with Expo ImagePicker.
- Private photo storage in Amazon S3 using short-lived presigned URLs.
- Role-based citizen, staff, and admin workspaces.
- Row Level Security and database functions enforce access rules in Supabase.
- Responsive Expo web app, installable as a free PWA from the browser.
- Android and iOS compatible Expo/React Native app.

## Stack

| Layer | Technology |
| --- | --- |
| App | Expo SDK 57, React Native, TypeScript, Expo Router |
| Web/PWA | React Native Web, static Expo export, Workbox service worker |
| UI | Inter, Space Grotesk, Expo Vector Icons |
| Data/auth | Supabase Postgres, Auth, RLS, SQL migrations |
| Maps | Leaflet with OpenStreetMap tiles |
| Uploads | AWS API Gateway, Lambda, S3, presigned URLs |
| Hosting | Vercel for the web/PWA |

## Repository structure

- `src/app/` — Expo Router screens and navigation.
- `src/` — shared UI, auth, session, Supabase, AWS, map, and issue logic.
- `supabase/migrations/` — database schema, policies, triggers, and security functions.
- `aws/` — the private photo-upload API and SAM deployment files.
- `public/` — PWA manifest and install icon.
- `workbox-config.js` — production service-worker caching rules.

## Local development

```powershell
npm install
Copy-Item .env.example .env
npm run web
```

Set these values in `.env`:

```text
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<publishable-or-anon-key>
EXPO_PUBLIC_AWS_API_URL=https://<api-id>.execute-api.<region>.amazonaws.com
```

Apply the SQL files in `supabase/migrations/` in order. See [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for authentication, roles, and redirect URLs.

Useful commands:

```powershell
npm run web
npm run build:web
npx expo lint
npx tsc --noEmit
```

## Deployment

Connect the repository to Vercel. The configured build command exports the static web app and generates the Workbox service worker. Add the three `EXPO_PUBLIC_*` variables to the Vercel Production environment, then attach `civicfix.dhrusti.xyz` as the custom domain.

The web app can be installed from Chrome on Android or Safari on iPhone using **Add to Home Screen**. No app-store publication is required.
