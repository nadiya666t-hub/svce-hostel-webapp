$ErrorActionPreference = "Continue"
$base = "http://localhost:5000/api"
$script:pass = 0; $script:fail = 0

function Test-EP {
  param($Name, [ScriptBlock]$Block)
  try { & $Block; Write-Host "  [PASS] $Name" -ForegroundColor Green; $script:pass++ }
  catch { Write-Host "  [FAIL] $Name : $($_.Exception.Message)" -ForegroundColor Red; $script:fail++ }
}

Write-Host "`n=== DATABASE FOUNDATION SMOKE TEST ===" -ForegroundColor Cyan

# ── Health ────────────────────────────────────────────────────────────────────
Test-EP "Health" { Invoke-RestMethod "$base/health" | Out-Null }

# ── USN check (both dev students) ────────────────────────────────────────────
Test-EP "USN check: Girikarnika (1VE-25CS-048)" {
  $r = Invoke-RestMethod "$base/auth/check-usn/1VE-25CS-048"
  if (-not $r.success) { throw "not found" }
  Write-Host "     exists=$($r.data.exists) requiresSetup=$($r.data.requiresSetup)" -ForegroundColor DarkGray
}
Test-EP "USN check: Nadia (1VE-25CS-020)" {
  $r = Invoke-RestMethod "$base/auth/check-usn/1VE-25CS-020"
  if (-not $r.success) { throw "not found" }
}
Test-EP "Invalid USN blocked (404)" {
  try { Invoke-RestMethod "$base/auth/check-usn/INVALID-USN" | Out-Null; throw "should 404" }
  catch { if ($_.Exception.Message -eq "should 404") { throw } }
}

# ── Login (Girikarnika has isActive=true from previous UI setup) ───────────────
$loginBody = '{"usn":"1VE-25CS-048","password":"Test@1234"}'
$loginRes = $null
Test-EP "Login: Girikarnika" {
  $script:loginRes = Invoke-RestMethod "$base/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
  if (-not $script:loginRes.success) { throw $script:loginRes.message }
  Write-Host "     name=$($script:loginRes.data.user.name) role=$($script:loginRes.data.user.role)" -ForegroundColor DarkGray
}

if ($script:loginRes -and $script:loginRes.data.token) {
  $h = @{ Authorization = "Bearer $($script:loginRes.data.token)" }

  # ── Profile — verify new fields + room from HostelAllocation ───────────────
  Test-EP "Profile: new foundation fields" {
    $d = (Invoke-RestMethod "$base/students/me" -Headers $h).data
    if (-not $d.name) { throw "no name" }
    if (-not $d.floorNumber) { throw "no floorNumber" }
    if (-not $d.roomNumber)  { throw "no roomNumber" }
    Write-Host "     name=$($d.name)  floor=$($d.floorNumber)  room=$($d.roomNumber)" -ForegroundColor DarkGray
    Write-Host "     course=$($d.course)  branch=$($d.branch)  admissionYear=$($d.admissionYear)" -ForegroundColor DarkGray
    Write-Host "     year=$($d.year)  semester=$($d.semester)  semStart=$($d.semesterStartDate)" -ForegroundColor DarkGray
    Write-Host "     importSource=$($d.importSource)  status=$($d.status)  gender=$($d.gender)" -ForegroundColor DarkGray
  }

  Test-EP "Attendance status (server time)" {
    $d = (Invoke-RestMethod "$base/attendance/status" -Headers $h).data
    Write-Host "     windowState=$($d.windowState)  serverTime=$($d.serverTime.istDisplay)" -ForegroundColor DarkGray
  }

  Test-EP "Fees (current academic year)" {
    $d = (Invoke-RestMethod "$base/students/me/fees/current" -Headers $h).data
    Write-Host "     total=$($d.totalAmount) paid=$($d.paidAmount) pending=$($d.pendingAmount)" -ForegroundColor DarkGray
  }

  Test-EP "Emergency contacts (9 seeded)" {
    $d = (Invoke-RestMethod "$base/emergency-contacts" -Headers $h).data
    if ($d.Count -lt 9) { throw "expected 9, got $($d.Count)" }
    Write-Host "     contacts=$($d.Count)" -ForegroundColor DarkGray
  }

  Test-EP "Requests endpoint" { Invoke-RestMethod "$base/requests" -Headers $h | Out-Null }
  Test-EP "Problems endpoint"  { Invoke-RestMethod "$base/problems" -Headers $h | Out-Null }
  Test-EP "Notifications"      { Invoke-RestMethod "$base/notifications" -Headers $h | Out-Null }
  Test-EP "Entry/Exit"         { Invoke-RestMethod "$base/entry-exit" -Headers $h | Out-Null }
  Test-EP "Notices"            { Invoke-RestMethod "$base/notices" -Headers $h | Out-Null }
}

Write-Host ""
$col = if ($script:fail -eq 0) { "Cyan" } else { "Yellow" }
Write-Host "=== RESULTS: $($script:pass) passed, $($script:fail) failed ===" -ForegroundColor $col
Write-Host ""
