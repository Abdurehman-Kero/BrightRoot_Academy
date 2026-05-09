# Redate all commits using sequential git amend approach
# This is the most reliable method on Windows PowerShell

$env:GIT_AUTHOR_NAME    = "Abdurehman Kero"
$env:GIT_AUTHOR_EMAIL   = "Keroabdurehman@gmail.com"
$env:GIT_COMMITTER_NAME = $env:GIT_AUTHOR_NAME
$env:GIT_COMMITTER_EMAIL= $env:GIT_AUTHOR_EMAIL

# Get all commits oldest → newest
$hashes = @(git log --reverse --format="%H") | Where-Object { $_ -ne "" }
$messages = @(git log --reverse --format="%s") | Where-Object { $_ -ne "" }
$total = $hashes.Count
Write-Host "Commits to redate: $total" -ForegroundColor Cyan

# Date range: April 24 → May 8, 2026
# We'll use realistic daytime hours (8 AM - 7 PM EAT = +0300)
$startDate = [DateTime]"2026-04-24 08:30:00"
$endDate   = [DateTime]"2026-05-08 18:00:00"
$totalSpan = ($endDate - $startDate).TotalSeconds

# Pre-compute dates
$dates = @()
for ($i = 0; $i -lt $total; $i++) {
    $frac = if ($total -gt 1) { $i / ($total - 1) } else { 0 }
    $dates += $startDate.AddSeconds([long]($totalSpan * $frac))
}

Write-Host "  First commit date: $($dates[0].ToString('yyyy-MM-dd HH:mm'))"
Write-Host "  Last  commit date: $($dates[-1].ToString('yyyy-MM-dd HH:mm'))"

# Create an orphan branch and re-apply all commits with new dates
Write-Host "`nRebasing with new dates..." -ForegroundColor Cyan

# Go to the very first commit (detached HEAD)
$firstHash = $hashes[0]
git checkout --detach $firstHash 2>&1 | Out-Null

# Amend the first commit's date
$d = $dates[0]
$dateStr = $d.ToString("ddd MMM dd HH:mm:ss yyyy") + " +0300"
$env:GIT_AUTHOR_DATE    = $dateStr
$env:GIT_COMMITTER_DATE = $dateStr
git commit --amend --no-edit --date=$dateStr 2>&1 | Out-Null
Write-Host "  [1/$total] $($d.ToString('yyyy-MM-dd HH:mm')) — $($messages[0].Substring(0, [Math]::Min(50,$messages[0].Length)))"

# Cherry-pick remaining commits one by one with their dates
for ($i = 1; $i -lt $total; $i++) {
    $d = $dates[$i]
    $dateStr = $d.ToString("ddd MMM dd HH:mm:ss yyyy") + " +0300"
    $env:GIT_AUTHOR_DATE    = $dateStr
    $env:GIT_COMMITTER_DATE = $dateStr

    # Cherry-pick the commit (--allow-empty for empty commits)
    git cherry-pick --allow-empty --no-commit $hashes[$i] 2>&1 | Out-Null
    git commit --allow-empty --date=$dateStr -C $hashes[$i] --reset-author 2>&1 | Out-Null

    $label = $messages[$i]
    if ($label.Length -gt 55) { $label = $label.Substring(0,55) + "..." }
    Write-Host "  [$($i+1)/$total] $($d.ToString('yyyy-MM-dd HH:mm')) — $label"
}

# Move master branch to our new HEAD
git branch -f master HEAD
git checkout master 2>&1 | Out-Null

# Verify result
Write-Host "`n=== Sample of redated commits ===" -ForegroundColor Cyan
git log --reverse --format="%h %ad %s" --date=format:"%Y-%m-%d %H:%M" | Select-Object -First 8
Write-Host "..."
git log --format="%h %ad %s" --date=format:"%Y-%m-%d %H:%M" | Select-Object -First 5

$count = git rev-list --count HEAD
Write-Host "`nTotal commits: $count" -ForegroundColor Green

# Force push
Write-Host "`nForce pushing to GitHub..." -ForegroundColor Cyan
git push origin master --force
Write-Host "`nDone! https://github.com/Abdurehman-Kero/BrightRoot_Academy" -ForegroundColor Green
