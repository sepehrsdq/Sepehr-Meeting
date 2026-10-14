# Downloads IBM Plex Sans + Montserrat woff2 fonts and generates local CSS.
$ErrorActionPreference = 'Continue'
$fontsDir = Join-Path $PSScriptRoot '..\public\vendor\fonts'
New-Item -ItemType Directory -Force -Path $fontsDir | Out-Null

# Google Fonts CSS with a modern UA returns woff2 @font-face rules
$ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

function Get-GoogleFontCss($cssUrl, $outCssName) {
    $cssFile = Join-Path $fontsDir $outCssName
    if (Test-Path $cssFile) { Write-Host "cached: $outCssName"; return }
    $headers = @{ 'User-Agent' = $ua }
    $css = (Invoke-WebRequest -Uri $cssUrl -Headers $headers -UseBasicParsing -TimeoutSec 60).Content
    # Download each font file and rewrite url(...) to local
    $urls = [regex]::Matches($css, 'url\((https://[^)]+)\)') | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique
    $i = 0
    foreach ($u in $urls) {
        $i++
        $ext = if ($u -match '\.woff2') { 'woff2' } elseif ($u -match '\.woff') { 'woff' } else { 'bin' }
        # Extract a readable name: family-weight-style-subset
        $family = if ($u -match '/([a-z0-9-]+)\.(woff2|woff)') { $Matches[1] } else { "font$i" }
        $local = "files/$family.$ext"
        $dest = Join-Path $fontsDir $local
        $destDir = Split-Path $dest -Parent
        if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Force -Path $destDir | Out-Null }
        if (-not (Test-Path $dest)) {
            try { Invoke-WebRequest -Uri $u -OutFile $dest -Headers $headers -UseBasicParsing -TimeoutSec 60 }
            catch { Write-Host "FAILED: $u"; continue }
        }
        $css = $css.Replace($u, $local)
    }
    Set-Content -Path $cssFile -Value $css -Encoding UTF8
    Write-Host "ok: $outCssName ($i font files)"
}

Get-GoogleFontCss 'https://fonts.googleapis.com/css?family=IBM+Plex+Sans:400,600' 'ibm-plex-sans.css'
Get-GoogleFontCss 'https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600&family=IBM+Plex+Sans:wght@400;600&display=swap' 'montserrat-ibm-plex.css'
Write-Host 'Done.'
