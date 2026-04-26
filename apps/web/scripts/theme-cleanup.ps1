# theme-cleanup.ps1
# One-shot mass find/replace to scrub legacy theme overrides from the web app source.
# Run from apps/web with: pwsh ./scripts/theme-cleanup.ps1
# Safe to delete after running.

$ErrorActionPreference = "Stop"

# Order matters: longer / more-specific patterns first so they don't get caught
# by shorter generic ones (e.g. text-brand-900 must come before text-brand-9 etc.).
# Each entry is @(find, replace) using literal strings (we use [regex]::Escape).
$replacements = @(
    # ----- Fonts -----
    @('font-display', 'font-serif'),
    @('font-body',    'font-sans'),

    # ----- Brand palette -> semantic primary/secondary -----
    # Cover every numeric stop including ones that never existed in the original
    # palette but appear in the codebase (200/400/600/800 fall back to the closest
    # semantic mapping).
    @('text-brand-900',   'text-primary'),
    @('text-brand-800',   'text-secondary'),
    @('text-brand-700',   'text-secondary'),
    @('text-brand-600',   'text-secondary'),
    @('text-brand-500',   'text-secondary'),
    @('text-brand-400',   'text-secondary/80'),
    @('text-brand-300',   'text-secondary/70'),
    @('text-brand-200',   'text-secondary/40'),
    @('text-brand-100',   'text-secondary/30'),
    @('text-brand-50',    'text-secondary/10'),
    @('bg-brand-900',     'bg-primary'),
    @('bg-brand-800',     'bg-secondary'),
    @('bg-brand-700',     'bg-secondary'),
    @('bg-brand-600',     'bg-secondary'),
    @('bg-brand-500',     'bg-secondary'),
    @('bg-brand-400',     'bg-secondary/80'),
    @('bg-brand-300',     'bg-secondary/70'),
    @('bg-brand-200',     'bg-secondary/40'),
    @('bg-brand-100',     'bg-secondary/30'),
    @('bg-brand-50',      'bg-secondary/10'),
    @('border-brand-900', 'border-primary'),
    @('border-brand-800', 'border-secondary'),
    @('border-brand-700', 'border-secondary'),
    @('border-brand-600', 'border-secondary'),
    @('border-brand-500', 'border-secondary'),
    @('border-brand-400', 'border-secondary/80'),
    @('border-brand-300', 'border-secondary/70'),
    @('border-brand-200', 'border-secondary/40'),
    @('border-brand-100', 'border-secondary/30'),
    @('border-brand-50',  'border-secondary/10'),
    @('ring-brand-900',   'ring-primary'),
    @('ring-brand-800',   'ring-secondary'),
    @('ring-brand-700',   'ring-secondary'),
    @('ring-brand-600',   'ring-secondary'),
    @('ring-brand-500',   'ring-secondary'),
    @('ring-brand-400',   'ring-secondary/80'),
    @('ring-brand-300',   'ring-secondary/70'),
    @('ring-brand-200',   'ring-secondary/40'),
    @('ring-brand-100',   'ring-secondary/30'),
    @('ring-brand-50',    'ring-secondary/10'),
    @('from-brand-900',   'from-primary'),
    @('from-brand-800',   'from-secondary'),
    @('from-brand-700',   'from-secondary'),
    @('from-brand-600',   'from-secondary'),
    @('from-brand-500',   'from-secondary'),
    @('from-brand-400',   'from-secondary/80'),
    @('from-brand-300',   'from-secondary/70'),
    @('from-brand-200',   'from-secondary/40'),
    @('from-brand-100',   'from-secondary/30'),
    @('from-brand-50',    'from-secondary/10'),
    @('via-brand-900',    'via-primary'),
    @('via-brand-800',    'via-secondary'),
    @('via-brand-700',    'via-secondary'),
    @('via-brand-500',    'via-secondary'),
    @('to-brand-900',     'to-primary'),
    @('to-brand-800',     'to-secondary'),
    @('to-brand-700',     'to-secondary'),
    @('to-brand-600',     'to-secondary'),
    @('to-brand-500',     'to-secondary'),
    @('to-brand-400',     'to-secondary/80'),
    @('to-brand-300',     'to-secondary/70'),
    @('to-brand-200',     'to-secondary/40'),
    @('to-brand-100',     'to-secondary/30'),
    @('to-brand-50',      'to-secondary/10'),

    # ----- Accent numeric stops -> semantic accent -----
    @('text-accent-900', 'text-accent'),
    @('text-accent-700', 'text-accent'),
    @('text-accent-500', 'text-accent'),
    @('text-accent-400', 'text-accent/80'),
    @('text-accent-200', 'text-accent/40'),
    @('text-accent-100', 'text-accent/20'),
    @('text-accent-50',  'text-accent/10'),
    @('bg-accent-900',   'bg-accent'),
    @('bg-accent-700',   'bg-accent'),
    @('bg-accent-500',   'bg-accent'),
    @('bg-accent-400',   'bg-accent/80'),
    @('bg-accent-200',   'bg-accent/40'),
    @('bg-accent-100',   'bg-accent/20'),
    @('bg-accent-50',    'bg-accent/10'),
    @('border-accent-900','border-accent'),
    @('border-accent-700','border-accent'),
    @('border-accent-500','border-accent'),
    @('border-accent-400','border-accent/80'),
    @('border-accent-200','border-accent/40'),
    @('border-accent-100','border-accent/20'),
    @('border-accent-50', 'border-accent/10'),
    @('ring-accent-500',  'ring-accent'),
    @('ring-accent-400',  'ring-accent/80'),
    @('from-accent-50',   'from-accent/10'),
    @('to-accent-50',     'to-accent/10'),
    @('via-accent-50',    'via-accent/10'),

    # ----- Status: success -> emerald -----
    @('text-success-900',   'text-emerald-900'),
    @('text-success-800',   'text-emerald-800'),
    @('text-success-700',   'text-emerald-700'),
    @('text-success-600',   'text-emerald-600'),
    @('text-success-500',   'text-emerald-500'),
    @('text-success-400',   'text-emerald-400'),
    @('text-success-300',   'text-emerald-300'),
    @('text-success-200',   'text-emerald-200'),
    @('text-success-100',   'text-emerald-100'),
    @('text-success-50',    'text-emerald-50'),
    @('bg-success-900',     'bg-emerald-900'),
    @('bg-success-800',     'bg-emerald-800'),
    @('bg-success-700',     'bg-emerald-700'),
    @('bg-success-600',     'bg-emerald-600'),
    @('bg-success-500',     'bg-emerald-500'),
    @('bg-success-400',     'bg-emerald-400'),
    @('bg-success-300',     'bg-emerald-300'),
    @('bg-success-200',     'bg-emerald-200'),
    @('bg-success-100',     'bg-emerald-100'),
    @('bg-success-50',      'bg-emerald-50'),
    @('border-success-900', 'border-emerald-900'),
    @('border-success-800', 'border-emerald-800'),
    @('border-success-700', 'border-emerald-700'),
    @('border-success-600', 'border-emerald-600'),
    @('border-success-500', 'border-emerald-500'),
    @('border-success-400', 'border-emerald-400'),
    @('border-success-300', 'border-emerald-300'),
    @('border-success-200', 'border-emerald-200'),
    @('border-success-100', 'border-emerald-100'),
    @('border-success-50',  'border-emerald-50'),
    @('ring-success-900',   'ring-emerald-900'),
    @('ring-success-700',   'ring-emerald-700'),
    @('ring-success-500',   'ring-emerald-500'),
    @('ring-success-200',   'ring-emerald-200'),
    @('ring-success-100',   'ring-emerald-100'),
    @('ring-success-50',    'ring-emerald-50'),

    # ----- Status: warning -> amber -----
    @('text-warning-900',   'text-amber-900'),
    @('text-warning-800',   'text-amber-800'),
    @('text-warning-700',   'text-amber-700'),
    @('text-warning-600',   'text-amber-600'),
    @('text-warning-500',   'text-amber-500'),
    @('text-warning-400',   'text-amber-400'),
    @('text-warning-300',   'text-amber-300'),
    @('text-warning-200',   'text-amber-200'),
    @('text-warning-100',   'text-amber-100'),
    @('text-warning-50',    'text-amber-50'),
    @('bg-warning-900',     'bg-amber-900'),
    @('bg-warning-800',     'bg-amber-800'),
    @('bg-warning-700',     'bg-amber-700'),
    @('bg-warning-600',     'bg-amber-600'),
    @('bg-warning-500',     'bg-amber-500'),
    @('bg-warning-400',     'bg-amber-400'),
    @('bg-warning-300',     'bg-amber-300'),
    @('bg-warning-200',     'bg-amber-200'),
    @('bg-warning-100',     'bg-amber-100'),
    @('bg-warning-50',      'bg-amber-50'),
    @('border-warning-900', 'border-amber-900'),
    @('border-warning-800', 'border-amber-800'),
    @('border-warning-700', 'border-amber-700'),
    @('border-warning-600', 'border-amber-600'),
    @('border-warning-500', 'border-amber-500'),
    @('border-warning-400', 'border-amber-400'),
    @('border-warning-300', 'border-amber-300'),
    @('border-warning-200', 'border-amber-200'),
    @('border-warning-100', 'border-amber-100'),
    @('border-warning-50',  'border-amber-50'),
    @('ring-warning-900',   'ring-amber-900'),
    @('ring-warning-700',   'ring-amber-700'),
    @('ring-warning-500',   'ring-amber-500'),
    @('ring-warning-200',   'ring-amber-200'),
    @('ring-warning-100',   'ring-amber-100'),
    @('ring-warning-50',    'ring-amber-50'),

    # ----- Status: danger -> red (status semantic; reserve `destructive` token for explicit delete actions) -----
    @('text-danger-900',   'text-red-900'),
    @('text-danger-800',   'text-red-800'),
    @('text-danger-700',   'text-red-700'),
    @('text-danger-600',   'text-red-600'),
    @('text-danger-500',   'text-red-500'),
    @('text-danger-400',   'text-red-400'),
    @('text-danger-300',   'text-red-300'),
    @('text-danger-200',   'text-red-200'),
    @('text-danger-100',   'text-red-100'),
    @('text-danger-50',    'text-red-50'),
    @('bg-danger-900',     'bg-red-900'),
    @('bg-danger-800',     'bg-red-800'),
    @('bg-danger-700',     'bg-red-700'),
    @('bg-danger-600',     'bg-red-600'),
    @('bg-danger-500',     'bg-red-500'),
    @('bg-danger-400',     'bg-red-400'),
    @('bg-danger-300',     'bg-red-300'),
    @('bg-danger-200',     'bg-red-200'),
    @('bg-danger-100',     'bg-red-100'),
    @('bg-danger-50',      'bg-red-50'),
    @('border-danger-900', 'border-red-900'),
    @('border-danger-800', 'border-red-800'),
    @('border-danger-700', 'border-red-700'),
    @('border-danger-600', 'border-red-600'),
    @('border-danger-500', 'border-red-500'),
    @('border-danger-400', 'border-red-400'),
    @('border-danger-300', 'border-red-300'),
    @('border-danger-200', 'border-red-200'),
    @('border-danger-100', 'border-red-100'),
    @('border-danger-50',  'border-red-50'),
    @('ring-danger-900',   'ring-red-900'),
    @('ring-danger-700',   'ring-red-700'),
    @('ring-danger-500',   'ring-red-500'),
    @('ring-danger-200',   'ring-red-200'),
    @('ring-danger-100',   'ring-red-100'),
    @('ring-danger-50',    'ring-red-50'),

    # ----- Status: info -> sky (info palette; standard Tailwind sky/blue family) -----
    @('text-info-900',   'text-sky-900'),
    @('text-info-800',   'text-sky-800'),
    @('text-info-700',   'text-sky-700'),
    @('text-info-600',   'text-sky-600'),
    @('text-info-500',   'text-sky-500'),
    @('text-info-400',   'text-sky-400'),
    @('text-info-300',   'text-sky-300'),
    @('text-info-200',   'text-sky-200'),
    @('text-info-100',   'text-sky-100'),
    @('text-info-50',    'text-sky-50'),
    @('bg-info-900',     'bg-sky-900'),
    @('bg-info-800',     'bg-sky-800'),
    @('bg-info-700',     'bg-sky-700'),
    @('bg-info-600',     'bg-sky-600'),
    @('bg-info-500',     'bg-sky-500'),
    @('bg-info-400',     'bg-sky-400'),
    @('bg-info-300',     'bg-sky-300'),
    @('bg-info-200',     'bg-sky-200'),
    @('bg-info-100',     'bg-sky-100'),
    @('bg-info-50',      'bg-sky-50'),
    @('border-info-900', 'border-sky-900'),
    @('border-info-800', 'border-sky-800'),
    @('border-info-700', 'border-sky-700'),
    @('border-info-600', 'border-sky-600'),
    @('border-info-500', 'border-sky-500'),
    @('border-info-400', 'border-sky-400'),
    @('border-info-300', 'border-sky-300'),
    @('border-info-200', 'border-sky-200'),
    @('border-info-100', 'border-sky-100'),
    @('border-info-50',  'border-sky-50'),
    @('ring-info-900',   'ring-sky-900'),
    @('ring-info-700',   'ring-sky-700'),
    @('ring-info-500',   'ring-sky-500'),
    @('ring-info-200',   'ring-sky-200'),
    @('ring-info-100',   'ring-sky-100'),
    @('ring-info-50',    'ring-sky-50'),

    # ----- Status: error -> red (alias of danger; some pages used this naming) -----
    @('text-error-900',   'text-red-900'),
    @('text-error-800',   'text-red-800'),
    @('text-error-700',   'text-red-700'),
    @('text-error-600',   'text-red-600'),
    @('text-error-500',   'text-red-500'),
    @('text-error-400',   'text-red-400'),
    @('text-error-300',   'text-red-300'),
    @('text-error-200',   'text-red-200'),
    @('text-error-100',   'text-red-100'),
    @('text-error-50',    'text-red-50'),
    @('bg-error-900',     'bg-red-900'),
    @('bg-error-800',     'bg-red-800'),
    @('bg-error-700',     'bg-red-700'),
    @('bg-error-600',     'bg-red-600'),
    @('bg-error-500',     'bg-red-500'),
    @('bg-error-400',     'bg-red-400'),
    @('bg-error-300',     'bg-red-300'),
    @('bg-error-200',     'bg-red-200'),
    @('bg-error-100',     'bg-red-100'),
    @('bg-error-50',      'bg-red-50'),
    @('border-error-900', 'border-red-900'),
    @('border-error-800', 'border-red-800'),
    @('border-error-700', 'border-red-700'),
    @('border-error-600', 'border-red-600'),
    @('border-error-500', 'border-red-500'),
    @('border-error-400', 'border-red-400'),
    @('border-error-300', 'border-red-300'),
    @('border-error-200', 'border-red-200'),
    @('border-error-100', 'border-red-100'),
    @('border-error-50',  'border-red-50'),
    @('ring-error-900',   'ring-red-900'),
    @('ring-error-700',   'ring-red-700'),
    @('ring-error-500',   'ring-red-500'),
    @('ring-error-200',   'ring-red-200'),
    @('ring-error-100',   'ring-red-100'),
    @('ring-error-50',    'ring-red-50'),

    # ----- Tailwind default gray (theme-agnostic, bypasses --foreground/--muted) -----
    @('text-gray-950',  'text-foreground'),
    @('text-gray-900',  'text-foreground'),
    @('text-gray-800',  'text-foreground'),
    @('text-gray-700',  'text-foreground/90'),
    @('text-gray-600',  'text-muted-foreground'),
    @('text-gray-500',  'text-muted-foreground'),
    @('text-gray-400',  'text-muted-foreground'),
    @('text-gray-300',  'text-muted-foreground/70'),
    @('text-gray-200',  'text-muted-foreground/50'),
    @('text-gray-100',  'text-muted-foreground/30'),
    @('text-gray-50',   'text-muted-foreground/10'),

    @('bg-gray-50',   'bg-muted'),
    @('bg-gray-100',  'bg-muted'),
    @('bg-gray-200',  'bg-muted'),
    @('bg-gray-300',  'bg-muted'),
    @('bg-gray-700',  'bg-foreground/90'),
    @('bg-gray-800',  'bg-foreground'),
    @('bg-gray-900',  'bg-foreground'),
    @('bg-gray-950',  'bg-foreground'),

    @('border-gray-100', 'border-border'),
    @('border-gray-200', 'border-border'),
    @('border-gray-300', 'border-border'),
    @('border-gray-400', 'border-border'),
    @('border-gray-500', 'border-muted-foreground'),
    @('border-gray-600', 'border-muted-foreground'),
    @('border-gray-700', 'border-foreground/40'),
    @('border-gray-800', 'border-foreground/60'),

    @('placeholder-gray-400', 'placeholder-muted-foreground'),
    @('placeholder-gray-500', 'placeholder-muted-foreground'),
    @('placeholder-gray-600', 'placeholder-muted-foreground'),

    @('divide-gray-100', 'divide-border'),
    @('divide-gray-200', 'divide-border'),
    @('divide-gray-300', 'divide-border'),

    @('ring-gray-200', 'ring-border'),
    @('ring-gray-300', 'ring-border'),
    @('ring-gray-400', 'ring-border'),

    @('hover:bg-gray-50',  'hover:bg-muted'),
    @('hover:bg-gray-100', 'hover:bg-muted'),
    @('hover:bg-gray-200', 'hover:bg-muted'),
    @('hover:text-gray-900', 'hover:text-foreground'),
    @('hover:text-gray-700', 'hover:text-foreground/90'),
    @('hover:text-gray-600', 'hover:text-muted-foreground'),

    # ----- Pure white/black -> theme tokens (dark-mode safe) -----
    @('bg-white',   'bg-background'),
    @('bg-black',   'bg-foreground'),
    @('text-black', 'text-foreground')
)

$searchRoots = @(
    "$PSScriptRoot/../app",
    "$PSScriptRoot/../components",
    "$PSScriptRoot/../hooks",
    "$PSScriptRoot/../lib",
    "$PSScriptRoot/../store"
)

$totalFiles = 0
$totalReplacements = 0
$filesChanged = 0

foreach ($root in $searchRoots) {
    if (-not (Test-Path $root)) { continue }
    $files = Get-ChildItem -Path $root -Recurse -Include *.tsx,*.ts -File
    foreach ($file in $files) {
        $totalFiles++
        $content = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8
        if ($null -eq $content) { continue }
        $original = $content
        $fileReplacements = 0

        foreach ($pair in $replacements) {
            $find = [regex]::Escape($pair[0])
            # \b after the class to avoid partial matches (e.g. text-gray-900 inside text-gray-9000)
            $pattern = "$find(?![A-Za-z0-9_-])"
            $matches = [regex]::Matches($content, $pattern)
            if ($matches.Count -gt 0) {
                $content = [regex]::Replace($content, $pattern, $pair[1])
                $fileReplacements += $matches.Count
            }
        }

        # Post-process: collapse any broken double-opacity artifact (e.g. `bg-secondary/10/60`)
        # into a single opacity (`bg-secondary/10`) that earlier replacements introduced when
        # the original class already carried an opacity modifier (e.g. `bg-accent-50/60`).
        $doubleOpacityPattern = '(?<![A-Za-z0-9_-])((?:bg|text|border|ring|placeholder|divide|from|to|via|fill|stroke|outline|decoration|caret|shadow)-[a-z][a-z0-9_-]*/\d+)/\d+(?![A-Za-z0-9_-])'
        $matches = [regex]::Matches($content, $doubleOpacityPattern)
        if ($matches.Count -gt 0) {
            $content = [regex]::Replace($content, $doubleOpacityPattern, '$1')
            $fileReplacements += $matches.Count
        }

        if ($content -ne $original) {
            Set-Content -LiteralPath $file.FullName -Value $content -NoNewline -Encoding UTF8
            $filesChanged++
            $totalReplacements += $fileReplacements
            Write-Host ("  {0,4} {1}" -f $fileReplacements, ($file.FullName -replace [regex]::Escape("$PSScriptRoot/.."), "."))
        }
    }
}

Write-Host ""
Write-Host "Scanned   : $totalFiles files"
Write-Host "Modified  : $filesChanged files"
Write-Host "Replaced  : $totalReplacements occurrences"
