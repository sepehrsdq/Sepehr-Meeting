# Rewrites CDN references in public/views/*.html to local /vendor/ paths.
# Idempotent: skips URLs already rewritten.
$ErrorActionPreference = 'Stop'
$viewsDir = Join-Path $PSScriptRoot '..\public\views'

# URL -> local path relative to /views (files live in public/vendor)
$map = [ordered]@{
    'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation'                               = '../vendor/mediapipe/selfie_segmentation.js'
    'https://cdn.jsdelivr.net/npm/@simonwep/pickr/dist/pickr.min.js'                            = '../vendor/pickr/pickr.min.js'
    'https://cdn.jsdelivr.net/npm/@simonwep/pickr/dist/pickr.es5.min.js'                        = '../vendor/pickr/pickr.es5.min.js'
    'https://cdn.jsdelivr.net/npm/@simonwep/pickr/dist/themes/classic.min.css'                  = '../vendor/pickr/themes/classic.min.css'
    'https://cdn.jsdelivr.net/npm/@simonwep/pickr/dist/themes/monolith.min.css'                 = '../vendor/pickr/themes/monolith.min.css'
    'https://cdn.jsdelivr.net/npm/https://cdn.jsdelivr.net/npm/@simonwep/pickr/dist/themes/nano.min.css' = ''
    'https://cdn.jsdelivr.net/npm/@simonwep/pickr/dist/themes/nano.min.css'                     = '../vendor/pickr/themes/nano.min.css'
    'https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js'                                      = '../vendor/axios/axios.min.js'
    'https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css'                   = '../vendor/bootstrap/css/bootstrap.min.css'
    'download.microsoft.com'                                                                    = ''
    'https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js'              = '../vendor/bootstrap/js/bootstrap.bundle.min.js'
    'https://cdn.jsdelivr.net/npm/emoji-mart@latest/dist/browser.js'                            = '../vendor/emoji-mart/browser.js'
    'https://cdn.jsdelivr.net/npm/fabric@5.3.0-browser/dist/fabric.min.js'                      = '../vendor/fabric/fabric.min.js'
    'https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css'                             = '../vendor/flatpickr/flatpickr.min.css'
    'https://cdn.jsdelivr.net/npm/flatpickr/dist/themes/dark.css'                               = '../vendor/flatpickr/themes/dark.css'
    'https://cdn.jsdelivr.net/npm/flatpickr"'                                                   = '../vendor/flatpickr/flatpickr.min.js"'
    'https://cdn.jsdelivr.net/npm/gifler@0.1.0/gifler.min.js'                                   = '../vendor/gifler/gifler.min.js'
    'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js'                    = '../vendor/html2canvas/html2canvas.min.js'
    'https://cdn.jsdelivr.net/npm/jspdf@3.0.4/dist/jspdf.umd.min.js'                            = '../vendor/jspdf/jspdf.umd.min.js'
    'https://cdn.jsdelivr.net/npm/livekit-client/dist/livekit-client.umd.js'                    = '../vendor/livekit/livekit-client.umd.js'
    'https://cdn.jsdelivr.net/npm/marked/marked.min.js'                                         = '../vendor/marked/marked.min.js'
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js'                         = '../vendor/pdfjs/pdf.min.js'
    'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js'                                 = '../vendor/qrcode/qrcode.min.js'
    'https://cdn.jsdelivr.net/npm/qrious@4.0.2/dist/qrious.min.js'                              = '../vendor/qrious/qrious.min.js'
    'https://cdn.jsdelivr.net/npm/quill@2/dist/quill.js'                                        = '../vendor/quill/quill.js'
    'https://cdn.jsdelivr.net/npm/quill@2/dist/quill.snow.css'                                  = '../vendor/quill/quill.snow.css'
    'https://cdn.jsdelivr.net/npm/sweetalert2@11.4.8'                                           = '../vendor/sweetalert2/sweetalert2.min.js'
    'https://cdn.jsdelivr.net/npm/ua-parser-js@latest/dist/ua-parser.min.js'                    = '../vendor/ua-parser/ua-parser.min.js'
    'https://cdn.jsdelivr.net/npm/xss/dist/xss.min.js'                                          = '../vendor/xss/xss.min.js'
    'https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css'                  = '../vendor/animatecss/animate.min.css'
    'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.2.0/crypto-js.min.js'                   = '../vendor/crypto-js/crypto-js.min.js'
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css'                 = '../vendor/fontawesome/6.1.1/css/all.min.css'
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css'                 = '../vendor/fontawesome/6.4.2/css/all.min.css'
    'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.10.0/highlight.min.js'              = '../vendor/highlightjs/highlight.min.js'
    'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.10.0/styles/atom-one-dark.min.css'  = '../vendor/highlightjs/styles/atom-one-dark.min.css'
    'https://cdnjs.cloudflare.com/ajax/libs/popper.js/2.11.8/umd/popper.min.js'                 = '../vendor/popper/popper.min.js'
    'https://cdnjs.cloudflare.com/ajax/libs/tippy.js/6.3.7/tippy-bundle.umd.min.js'             = '../vendor/tippy/tippy-bundle.umd.min.js'
    'https://unpkg.com/animejs@3.0.1/lib/anime.min.js'                                          = '../vendor/animejs/anime.min.js'
    'https://unpkg.com/scrollreveal@4.0.0/dist/scrollreveal.min.js'                             = '../vendor/scrollreveal/scrollreveal.min.js'
    'https://www.w3schools.com/w3css/4/w3.css'                                                  = '../vendor/w3css/w3.css'
    'https://buttons.github.io/buttons.js'                                                      = '../vendor/github-buttons/buttons.js'
    # Fonts
    'https://fonts.googleapis.com/css?family=IBM+Plex+Sans:400,600'                             = '../vendor/fonts/ibm-plex-sans.css'
    'https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600&family=IBM+Plex+Sans:wght@400;600&display=swap' = '../vendor/fonts/montserrat-ibm-plex.css'
}

# Remove the bogus self-referencing entry
$map.Remove('https://cdn.jsdelivr.net/npm/https://cdn.jsdelivr.net/npm/@simonwep/pickr/dist/themes/nano.min.css')
$map.Remove('download.microsoft.com')

$changed = 0
foreach ($file in Get-ChildItem $viewsDir -Filter *.html) {
    $content = Get-Content $file.FullName -Raw
    $original = $content
    foreach ($url in $map.Keys) {
        $local = $map[$url]
        if (-not $local) { continue }
        # plain replace of the exact URL string (in src="" or href="")
        $content = $content.Replace($url, $local)
    }
    if ($content -ne $original) {
        Set-Content -Path $file.FullName -Value $content -NoNewline -Encoding UTF8
        $changed++
        Write-Host "updated: $($file.Name)"
    }
}
Write-Host "`n$changed files updated."

# Report any remaining external script/style refs
Write-Host "`n--- Remaining external refs (should be only legitimate external links) ---"
foreach ($file in Get-ChildItem $viewsDir -Filter *.html) {
    $content = Get-Content $file.FullName -Raw
    $refs = [regex]::Matches($content, '(?:src|href)="(https?://[^"]+)"') | ForEach-Object { $_.Groups[1].Value } | Where-Object { $_ -match 'cdnjs|jsdelivr|unpkg|w3schools|fonts\.googleapis|buttons\.github' }
    if ($refs) { Write-Host "$($file.Name):"; $refs | ForEach-Object { Write-Host "  $_" } }
}
