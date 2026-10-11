param(
    [Parameter(Mandatory=$true)][string]$Profile,
    [string]$AwsCli = 'aws',
    [switch]$CheckOnly
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$region = 'ap-south-1'
$env:AWS_PAGER = ''

function Invoke-JalSetuAws([string[]]$Arguments) {
    $result = & $AwsCli @Arguments --profile $Profile --region $region --output json
    if ($LASTEXITCODE -ne 0) { throw 'AWS command failed. No fallback credentials or account-plan changes are attempted.' }
    return ($result | ConvertFrom-Json)
}

# An update uses the existing stack and original expiry. It never creates IAM
# access, updates infrastructure, connects GitHub or upgrades an account plan.
$plan = Invoke-JalSetuAws -Arguments @('freetier','get-account-plan-state')
if ($plan.accountPlanType -ne 'FREE' -or $plan.accountPlanStatus -ne 'ACTIVE' -or
    $plan.accountPlanRemainingCredits.unit -ne 'USD' -or $plan.accountPlanRemainingCredits.amount -lt 30) {
    throw 'Publishing requires an active AWS free plan with at least $30 remaining credits (the extra $20 plus a $10 buffer remain unused). Review costs before proceeding.'
}
$stack = (Invoke-JalSetuAws -Arguments @('cloudformation','describe-stacks','--stack-name','JalSetuDemo')).Stacks[0]
if ($stack.StackStatus -notin @('CREATE_COMPLETE','UPDATE_COMPLETE','UPDATE_ROLLBACK_COMPLETE')) {
    throw 'The existing application stack is not ready for a frontend release.'
}
$values = @{}
foreach ($item in $stack.Outputs) { $values[$item.OutputKey] = $item.OutputValue }
if ($values.AmplifyAppId -notmatch '^[a-z0-9]+$') { throw 'Expected the deployed hosting application.' }
$app = (Invoke-JalSetuAws -Arguments @('amplify','get-app','--app-id',$values.AmplifyAppId)).app
if ($app.name -ne 'jalsetu-example-demo' -or $values.FrontendUrl -ne "https://main.$($app.defaultDomain)") {
    throw 'Hosting identity does not match the JalSetu stack.'
}
$releaseFolder = Join-Path ([IO.Path]::GetTempPath()) ('jalsetu-public-release-' + [guid]::NewGuid())
New-Item -ItemType Directory -Path $releaseFolder | Out-Null
$outputsPath = Join-Path $releaseFolder 'outputs.json'
[IO.File]::WriteAllText($outputsPath, (@{JalSetuDemo=$values} | ConvertTo-Json -Depth 8), [Text.UTF8Encoding]::new($false))
$bundlePath = Join-Path $releaseFolder 'bundle'
Push-Location $projectRoot
try {
    & pnpm build
    if ($LASTEXITCODE -ne 0) { throw 'Production build failed; nothing uploaded.' }
    & node scripts/prepare-hosted-web.mjs $outputsPath $bundlePath
    if ($LASTEXITCODE -ne 0) { throw 'Public configuration or hosting package validation failed; nothing uploaded.' }
    if ($CheckOnly) { Write-Output 'Release checks passed. No upload or deployment was made.'; return }
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zipPath = Join-Path $releaseFolder 'website.zip'
    [IO.Compression.ZipFile]::CreateFromDirectory($bundlePath, $zipPath)
    $deployment = Invoke-JalSetuAws -Arguments @('amplify','create-deployment','--app-id',$values.AmplifyAppId,'--branch-name','main')
    # The signed upload URL stays in memory and is never printed or saved.
    try {
        Invoke-WebRequest -Uri $deployment.zipUploadUrl -Method Put -InFile $zipPath -ContentType 'application/zip' | Out-Null
    } catch { throw 'The signed upload failed. Its private URL is omitted; no deployment was started.' }
    $null = Invoke-JalSetuAws -Arguments @('amplify','start-deployment','--app-id',$values.AmplifyAppId,'--branch-name','main','--job-id',$deployment.jobId)
    $deadline = [DateTime]::UtcNow.AddMinutes(10)
    do {
        $job = (Invoke-JalSetuAws -Arguments @('amplify','get-job','--app-id',$values.AmplifyAppId,'--branch-name','main','--job-id',$deployment.jobId)).job.summary
        if ($job.status -eq 'SUCCEED') { Write-Output "Published successfully: $($values.FrontendUrl)"; return }
        if ($job.status -in @('FAILED','CANCELLED')) { throw 'Amplify did not complete the release. Check its deployment log in AWS.' }
        Write-Output "Amplify release: $($job.status)"
        Start-Sleep -Seconds 10
    } while ([DateTime]::UtcNow -lt $deadline)
    throw 'Amplify is still processing the release. Check its status before trying another upload.'
} finally { Pop-Location }
