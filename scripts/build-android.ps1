param([switch]$CreateSigningKey)
$ErrorActionPreference = 'Stop'
$projectPath = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$signingPath = Join-Path ([Environment]::GetFolderPath('UserProfile')) '.lqadwa-signing'
$keystorePath = Join-Path $signingPath 'upload.keystore'
$passwordPath = Join-Path $signingPath 'password.dpapi'
if ($CreateSigningKey -and !(Test-Path -LiteralPath $keystorePath)) {
    New-Item -ItemType Directory -Path $signingPath -Force | Out-Null
    $sid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
    & icacls $signingPath /inheritance:r /grant:r "*${sid}:(OI)(CI)F" '*S-1-5-18:(OI)(CI)F' | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Could not protect signing directory permissions' }
    $password = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(36))
    $env:LQADWA_STORE_PASSWORD = $password
    $env:LQADWA_KEY_PASSWORD = $password
    & (Join-Path $env:JAVA_HOME 'bin/keytool.exe') -genkeypair -keystore $keystorePath -storetype PKCS12 -storepass:env LQADWA_STORE_PASSWORD -keypass:env LQADWA_KEY_PASSWORD -alias lqadwa-upload -keyalg RSA -keysize 3072 -sigalg SHA256withRSA -validity 10000 -dname 'CN=LQADWA upload key'
    if ($LASTEXITCODE -ne 0) { throw 'Signing key creation failed' }
    # Windows DPAPI: decryptable only by this Windows account. No password in the repository/logs.
    (ConvertTo-SecureString $password -AsPlainText -Force | ConvertFrom-SecureString) | Set-Content -LiteralPath $passwordPath
    $password = $null
}
if (!(Test-Path -LiteralPath $keystorePath) -or !(Test-Path -LiteralPath $passwordPath)) { throw 'Missing signing material. Run with -CreateSigningKey once, or restore the owner-controlled key.' }
$securePassword = Get-Content -LiteralPath $passwordPath | ConvertTo-SecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
    $env:LQADWA_STORE_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    $env:LQADWA_KEY_PASSWORD = $env:LQADWA_STORE_PASSWORD
    $env:LQADWA_KEYSTORE = $keystorePath
    $env:LQADWA_KEY_ALIAS = 'lqadwa-upload'
    & (Join-Path $projectPath '.sites-runtime/android-tools/gradle-8.13/bin/gradle.bat') -p (Join-Path $projectPath 'android') assembleRelease bundleRelease --console=plain --no-daemon
    if ($LASTEXITCODE -ne 0) { throw 'Android build failed' }
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    Remove-Item Env:LQADWA_STORE_PASSWORD,Env:LQADWA_KEY_PASSWORD,Env:LQADWA_KEYSTORE,Env:LQADWA_KEY_ALIAS -ErrorAction SilentlyContinue
}
