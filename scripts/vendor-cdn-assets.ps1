# Downloads all CDN assets used by Sepehr Meeting views into public/vendor/
# and reports failures. Run from the project root.
$ErrorActionPreference = 'Continue'
$vendor = Join-Path $PSScriptRoot 'public\vendor'
New-Item -ItemType Directory -Force -Path $vendor | Out-Null

# Map: URL -> local relative path (inside public/vendor)
$assets = [ordered]@{
    # jsdelivr
    'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation'                                        = 'mediapipe/selfie_segmentation.js'
    'https://cdn.jsdelivr.net/npm/@simonwep/pickr/dist/pickr.min.js'                                     = 'pickr/pickr.min.js'
    'https://cdn.jsdelivr.net/npm/@simonwep/pickr/dist/pickr.es5.min.js'                                 = 'pickr/pickr.es5.min.js'
    'https://cdn.jsdelivr.net/npm/@simonwep/pickr/dist/themes/classic.min.css'                           = 'pickr/themes/classic.min.css'
    'https://cdn.jsdelivr.net/npm/@simonwep/pickr/dist/themes/monolith.min.css'                          = 'pickr/themes/monolith.min.css'
    'https://cdn.jsdelivr.net/npm/@simonwep/pickr/dist/themes/nano.min.css'                              = 'pickr/themes/nano.min.css'
    'https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js'                                              = 'axios/axios.min.js'
    'https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css'                           = 'bootstrap/css/bootstrap.min.css'
    'https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js'                      = 'bootstrap/js/bootstrap.bundle.min.js'
    'https://cdn.jsdelivr.net/npm/emoji-mart@latest/dist/browser.js'                                    = 'emoji-mart/browser.js'
    'https://cdn.jsdelivr.net/npm/fabric@5.3.0-browser/dist/fabric.min.js'                              = 'fabric/fabric.min.js'
    'https://cdn.jsdelivr.net/npm/flatpickr'                                                            = 'flatpickr/flatpickr.min.js'
    'https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css'                                     = 'flatpickr/flatpickr.min.css'
    'https://cdn.jsdelivr.net/npm/flatpickr/dist/themes/dark.css'                                       = 'flatpickr/themes/dark.css'
    'https://cdn.jsdelivr.net/npm/gifler@0.1.0/gifler.min.js'                                           = 'gifler/gifler.min.js'
    'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js'                            = 'html2canvas/html2canvas.min.js'
    'https://cdn.jsdelivr.net/npm/jspdf@3.0.4/dist/jspdf.umd.min.js'                                    = 'jspdf/jspdf.umd.min.js'
    'https://cdn.jsdelivr.net/npm/livekit-client/dist/livekit-client.umd.js'                            = 'livekit/livekit-client.umd.js'
    'https://cdn.jsdelivr.net/npm/marked/marked.min.js'                                                 = 'marked/marked.min.js'
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js'                                 = 'pdfjs/pdf.min.js'
    'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js'                                         = 'qrcode/qrcode.min.js'
    'https://cdn.jsdelivr.net/npm/qrious@4.0.2/dist/qrious.min.js'                                      = 'qrious/qrious.min.js'
    'https://cdn.jsdelivr.net/npm/quill@2/dist/quill.js'                                                = 'quill/quill.js'
    'https://cdn.jsdelivr.net/npm/quill@2/dist/quill.snow.css'                                          = 'quill/quill.snow.css'
    'https://cdn.jsdelivr.net/npm/sweetalert2@11.4.8'                                                   = 'sweetalert2/sweetalert2.min.js'
    'https://cdn.jsdelivr.net/npm/ua-parser-js@latest/dist/ua-parser.min.js'                            = 'ua-parser/ua-parser.min.js'
    'https://cdn.jsdelivr.net/npm/xss/dist/xss.min.js'                                                  = 'xss/xss.min.js'
    # cdnjs
    'https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css'                          = 'animatecss/animate.min.css'
    'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.2.0/crypto-js.min.js'                           = 'crypto-js/crypto-js.min.js'
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css'                         = 'fontawesome/6.1.1/css/all.min.css'
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css'                         = 'fontawesome/6.4.2/css/all.min.css'
    'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.10.0/highlight.min.js'                      = 'highlightjs/highlight.min.js'
    'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.10.0/styles/atom-one-dark.min.css'          = 'highlightjs/styles/atom-one-dark.min.css'
    'https://cdnjs.cloudflare.com/ajax/libs/popper.js/2.11.8/umd/popper.min.js'                         = 'popper/popper.min.js'
    'https://cdnjs.cloudflare.com/ajax/libs/tippy.js/6.3.7/tippy-bundle.umd.min.js'                     = 'tippy/tippy-bundle.umd.min.js'
    # unpkg
    'https://unpkg.com/animejs@3.0.1/lib/anime.min.js'                                                  = 'animejs/anime.min.js'
    'https://unpkg.com/scrollreveal@4.0.0/dist/scrollreveal.min.js'                                     = 'scrollreveal/scrollreveal.min.js'
    # w3css
    'https://www.w3schools.com/w3css/4/w3.css'                                                          = 'w3css/w3.css'
    # github buttons
    'https://buttons.github.io/buttons.js'                                                              = 'github-buttons/buttons.js'
}

$results = @()
foreach ($url in $assets.Keys) {
    $dest = Join-Path $vendor $assets[$url]
    $destDir = Split-Path $dest -Parent
    if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Force -Path $destDir | Out-Null }
    if (Test-Path $dest) { $results += [pscustomobject]@{ Url=$url; Status='cached'; File=$assets[$url] }; continue }
    try {
        Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing -TimeoutSec 60
        $size = (Get-Item $dest).Length
        $results += [pscustomobject]@{ Url=$url; Status="ok ($([Math]::Round($size/1KB,1)) KB)"; File=$assets[$url] }
    } catch {
        $results += [pscustomobject]@{ Url=$url; Status="FAILED: $($_.Exception.Message)"; File=$assets[$url] }
    }
}
$results | Format-Table -AutoSize | Out-String -Width 200

# Font Awesome needs its webfonts too
Write-Host "`n--- Font Awesome webfonts ---"
$faVersions = @('6.1.1', '6.4.2')
foreach ($ver in $faVersions) {
    $fontsDir = Join-Path $vendor "fontawesome\$ver\webfonts"
    New-Item -ItemType Directory -Force -Path $fontsDir | Out-Null
    foreach ($font in @('fa-solid-900.woff2','fa-solid-900.woff','fa-brands-400.woff2','fa-brands-400.woff','fa-regular-400.woff2','fa-regular-400.woff','fa-v4compatibility.woff2','fa-v4compatibility.woff')) {
        $dest = Join-Path $fontsDir $font
        if (Test-Path $dest) { continue }
        $url = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/$ver/webfonts/$font"
        try { Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing -TimeoutSec 60; Write-Host "ok: $ver/$font" }
        catch { Write-Host "FAILED: $ver/$font" }
    }
}
Write-Host "`nDone."
