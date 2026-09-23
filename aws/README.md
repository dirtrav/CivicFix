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
