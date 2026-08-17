$ErrorActionPreference = "Continue"
$base = "http://localhost:5000/api"
$script:pass = 0
$script:fail = 0

function Test-Endpoint {
  param($Name, [ScriptBlock]$Block)
  try {
    & $Block
    Write-Host "  [PASS] $Name" -ForegroundColor Green
    $script:pass++
  } catch {
    $msg = $_.Exception.Message
    Write-Host "  [FAIL] $Name : $msg" -ForegroundColor Red
    $script:fail++
  }
}

Write-Host ""
Write-Host "=== HMS FULL SMOKE TEST ===" -ForegroundColor Cyan

$loginBody = '{"usn":"1VE-25CS-048","password":"Test@1234"}'
$r = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$jwt = $r.data.token
$h = @{ Authorization = "Bearer $jwt" }
Write-Host "  [AUTH] Logged in as: $($r.data.user.name)" -ForegroundColor Cyan
Write-Host ""

Test-Endpoint "Health" { Invoke-RestMethod "$base/health" | Out-Null }
Test-Endpoint "Profile" {
  $d = (Invoke-RestMethod "$base/students/me" -Headers $h).data
  if (-not $d.name) { throw "missing name" }
}

Write-Host ""
Write-Host "  -- Attendance --" -ForegroundColor DarkGray
Test-Endpoint "Attendance Status" {
  $d = (Invoke-RestMethod "$base/attendance/status" -Headers $h).data
  Write-Host "     windowState=$($d.windowState) alreadyMarked=$($d.alreadyMarked)" -ForegroundColor DarkGray
}
Test-Endpoint "Attendance Summary" { Invoke-RestMethod "$base/attendance/summary" -Headers $h | Out-Null }
Test-Endpoint "Attendance History" { Invoke-RestMethod "$base/attendance/history" -Headers $h | Out-Null }
Test-Endpoint "Verify Location (inside)" {
  $locBody = '{"latitude":13.07381,"longitude":77.49467}'
  $d = (Invoke-RestMethod "$base/attendance/verify-location" -Method POST -Body $locBody -ContentType "application/json" -Headers $h).data
  Write-Host "     verified=$($d.verified) distance=$($d.distance)m" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "  -- Requests --" -ForegroundColor DarkGray
Test-Endpoint "GET Requests" { Invoke-RestMethod "$base/requests" -Headers $h | Out-Null }
Test-Endpoint "POST Request (Outing)" {
  $b = '{"type":"OUTING","fromDate":"2026-08-20","toDate":"2026-08-20","reason":"Visit to city for personal work","destination":"Bangalore"}'
  $res = Invoke-RestMethod "$base/requests" -Method POST -Body $b -ContentType "application/json" -Headers $h
  if (-not $res.success) { throw $res.message }
  Write-Host "     id=$($res.data.id)" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "  -- Problems --" -ForegroundColor DarkGray
Test-Endpoint "GET Problems" { Invoke-RestMethod "$base/problems" -Headers $h | Out-Null }
Test-Endpoint "POST Problem (WiFi)" {
  $b = '{"category":"WIFI","description":"Wi-Fi not working in my room since morning"}'
  $res = Invoke-RestMethod "$base/problems" -Method POST -Body $b -ContentType "application/json" -Headers $h
  if (-not $res.success) { throw $res.message }
  Write-Host "     id=$($res.data.id)" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "  -- Other Modules --" -ForegroundColor DarkGray
Test-Endpoint "Emergency Contacts" {
  $d = (Invoke-RestMethod "$base/emergency-contacts" -Headers $h).data
  Write-Host "     $($d.Count) contacts" -ForegroundColor DarkGray
}
Test-Endpoint "Notifications" {
  $d = (Invoke-RestMethod "$base/notifications" -Headers $h).data
  Write-Host "     total=$($d.total) unread=$($d.unreadCount)" -ForegroundColor DarkGray
}
Test-Endpoint "Unread Count" {
  $d = (Invoke-RestMethod "$base/notifications/unread-count" -Headers $h).data
  Write-Host "     count=$($d.count)" -ForegroundColor DarkGray
}
Test-Endpoint "Mark All Notifications Read" {
  Invoke-RestMethod "$base/notifications/read-all" -Method PATCH -Headers $h | Out-Null
}
Test-Endpoint "Notices" {
  $d = (Invoke-RestMethod "$base/notices" -Headers $h).data
  Write-Host "     total=$($d.total)" -ForegroundColor DarkGray
}
Test-Endpoint "Fees" { Invoke-RestMethod "$base/students/me/fees/current" -Headers $h | Out-Null }
Test-Endpoint "Entry/Exit" { Invoke-RestMethod "$base/entry-exit" -Headers $h | Out-Null }

Write-Host ""
Write-Host "  -- Security --" -ForegroundColor DarkGray
Test-Endpoint "Unauthorized request blocked (401)" {
  try {
    Invoke-RestMethod "$base/requests" | Out-Null
    throw "Should have returned 401"
  } catch {
    if ($_.Exception.Message -eq "Should have returned 401") { throw }
  }
}
Test-Endpoint "Invalid USN returns 404" {
  try {
    Invoke-RestMethod "$base/auth/check-usn/1VE-00XX-000" | Out-Null
    throw "Should have returned 404"
  } catch {
    if ($_.Exception.Message -eq "Should have returned 404") { throw }
  }
}

Write-Host ""
$color = if ($script:fail -eq 0) { "Cyan" } else { "Yellow" }
Write-Host "=== RESULTS: $($script:pass) passed, $($script:fail) failed ===" -ForegroundColor $color
Write-Host ""
