# Connect CivicFix to Supabase

The application is ready to use Supabase once the schema and public client settings are added.

## 1. Apply the migration

In the Supabase Dashboard, open **SQL Editor**, create a new query, paste the contents of:

`supabase/migrations/202609230001_civicfix_v1.sql`

Then run it once. This creates the categories, departments, profiles, issues, issue history, automatic routing, public-safe view, and RLS policies.

Run `supabase/migrations/202609230002_fix_issue_history_trigger.sql` after the first migration. It fixes report creation history so new issues can be submitted successfully.

For AWS photo uploads, run `supabase/migrations/202609230003_aws_issue_attachments.sql` after the two migrations above. It creates the private attachment metadata table and its RLS policy. The AWS Lambda uses the Supabase service-role key server-side to insert metadata; never add that key to the Expo app.

## 2. Configure sign-in

In **Authentication → Providers → Email**, enable Email. Since you turned email confirmation off, new accounts can log in immediately after signup. If you later turn confirmation back on, the same screen will show a confirmation notice and the user must confirm before logging in.

Password signup/login does not require an auth redirect URL while email confirmation is off. Password recovery and the legacy magic-link flow do. Add these redirect URLs:

- `http://localhost:8081/auth/callback`
- Your current Expo Go redirect URL returned by `Linking.createURL('auth/callback')` (it varies by LAN address)
- `civicfix://auth/callback`
- `civicfix://auth/callback?mode=reset`
- `https://civicfix.dhrusti.xyz/auth/callback`

## 3. Add public app settings

Copy `.env.example` to `.env` and replace both values using **Project Settings → API**:

```text
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<publishable-or-anon-key>
```

Never add a service-role key to the Expo app.

Maps use Leaflet and OpenStreetMap tiles on both web and native screens, so no Google Maps key or billing account is required. OpenStreetMap’s public tile server is best-effort and has usage limits; for a high-traffic production launch, move to a free-tier OSM-derived tile provider or self-host tiles while keeping the required attribution.

## 4. Run the app

```powershell
npm run web
# or
npm run android
```

## 5. Make a staff/admin account

Create a normal user using the app first. Then, in SQL Editor, update that user's profile. Replace the placeholders with real values:

```sql
update public.profiles
set role = 'admin'
where id = '<auth-user-id>';
```

For a department staff member, set the appropriate department id as well:

```sql
update public.profiles
set role = 'staff', department_id = '<department-id>'
where id = '<auth-user-id>';
```
