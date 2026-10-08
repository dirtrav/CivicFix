param(
  [string]$StackName = 'civicfix-web',
  [string]$Region = 'ap-south-1',
  [string]$BucketName = 'civicfix-web-854010287096'
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$distPath = Join-Path $projectRoot 'dist'
$templatePath = Join-Path $PSScriptRoot 'static-site.yaml'
$aws = 'C:\Program Files\Amazon\AWSCLIV2\aws.exe'
if (-not (Test-Path $aws)) { $aws = 'aws' }

if (-not (Test-Path (Join-Path $distPath 'index.html'))) {
  Push-Location $projectRoot
  try { npm run build:web } finally { Pop-Location }
}

& $aws cloudformation deploy --template-file $templatePath --stack-name $StackName --region $Region --parameter-overrides "BucketName=$BucketName" --no-fail-on-empty-changeset
if ($LASTEXITCODE -ne 0) { throw "CloudFormation deployment failed with exit code $LASTEXITCODE." }

& $aws s3 sync $distPath "s3://$BucketName" --region $Region --delete --cache-control 'public,max-age=31536000,immutable' --exclude 'index.html' --exclude 'sw.js' --exclude 'manifest.webmanifest'
if ($LASTEXITCODE -ne 0) { throw "Static asset upload failed with exit code $LASTEXITCODE." }

& $aws s3 cp (Join-Path $distPath 'index.html') "s3://$BucketName/index.html" --region $Region --cache-control 'no-cache, no-store, must-revalidate' --content-type 'text/html; charset=utf-8'
& $aws s3 cp (Join-Path $distPath 'sw.js') "s3://$BucketName/sw.js" --region $Region --cache-control 'no-cache, no-store, must-revalidate' --content-type 'application/javascript'
& $aws s3 cp (Join-Path $distPath 'manifest.webmanifest') "s3://$BucketName/manifest.webmanifest" --region $Region --cache-control 'no-cache' --content-type 'application/manifest+json'
if ($LASTEXITCODE -ne 0) { throw "HTML/PWA metadata upload failed with exit code $LASTEXITCODE." }

$websiteUrl = (& $aws cloudformation describe-stacks --stack-name $StackName --region $Region --query "Stacks[0].Outputs[?OutputKey=='WebsiteURL'].OutputValue" --output text).Trim()
Write-Host "CivicFix is public at: $websiteUrl"
