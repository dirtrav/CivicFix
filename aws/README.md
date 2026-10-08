# CivicFix AWS upload API

This package adds private S3 issue-photo uploads while Supabase remains the authentication and authorization source.

## Current AWS deployment

The AWS Core connector deployed the CloudFormation stack `civicfix-aws` in `ap-south-1`.

- API Gateway: `https://wexxkrp2ac.execute-api.ap-south-1.amazonaws.com`
- S3 bucket: `civicfix-aws-uploadsbucket-4xgxdlo0e835`
- Stack status: `CREATE_COMPLETE`

The deployed Lambda uses the same Supabase user token for authorization and does not store a Supabase service-role key in AWS.

## Deploy

From this directory, install dependencies and deploy with AWS SAM:

```powershell
npm install
npx sam build
npx sam deploy --guided
```

Pass the values from the Supabase dashboard as `SupabaseUrl` and `SupabaseAnonKey`. The Lambda validates the user's Supabase access token and uses that same user-scoped token for issue ownership and attachment metadata, so no Supabase service-role key is needed.

Copy the stack output `UploadApiUrl` into the root `.env`:

```text
EXPO_PUBLIC_AWS_API_URL=https://<api-id>.execute-api.<region>.amazonaws.com
```

Apply `supabase/migrations/202609230003_aws_issue_attachments.sql` in Supabase before using uploads. The bucket is private and all upload URLs expire after five minutes.

## Public web app on S3

The Expo web export can also be hosted publicly from a separate S3 bucket. This does not expose the private issue-photo upload bucket.

From the project root, after installing/configuring the AWS CLI:

```powershell
powershell -ExecutionPolicy Bypass -File .\aws\deploy-static-site.ps1
```

The script builds `dist/`, creates or updates the `civicfix-web` CloudFormation stack, uploads the same files used by Vercel, and prints the public S3 website URL. It uses `index.html` as both the index and error document so Expo Router deep links continue to load the app.

AWS recommends CloudFront with Origin Access Control for HTTPS and for keeping the S3 bucket private. The template here intentionally uses the direct public S3 website endpoint because a public S3 deployment was requested.
