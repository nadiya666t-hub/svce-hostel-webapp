$ErrorActionPreference = "Continue"
$base = "http://localhost:5000/api"
$script:pass = 0; $script:fail = 0

function Test-EP {
  param($Name, [ScriptBlock]$Block)
  try { & $Block; Write-Host "  [PASS] $Name" -ForegroundColor Green; $script:pass++ }
  catch { Write-Host "  [FAIL] $Name : $($_.Exception.Message)" -ForegroundColor Red; $script:fail++ }
}

Write-Host "`n=== RAISE REQUEST SMOKE TEST ===" -ForegroundColor Cyan

# Login as Girikarnika
$body = '{"usn":"1VE-25CS-048","password":"Test@1234"}'
$r = Invoke-RestMethod "$base/auth/login" -Method POST -Body $body -ContentType "application/json"
$h = @{ Authorization = "Bearer $($r.data.token)" }
Write-Host "  [AUTH] $($r.data.user.name)" -ForegroundColor Cyan

# Also login as Nadia to test isolation
$body2 = '{"usn":"1VE-25CS-020","password":"changeme123"}'
$r2 = $null
try {
  $setBody = '{"usn":"1VE-25CS-020","password":"changeme123","confirmPassword":"changeme123"}'
  $r2 = Invoke-RestMethod "$base/auth/set-password" -Method POST -Body $setBody -ContentType "application/json"
} catch {
  try { $r2 = Invoke-RestMethod "$base/auth/login" -Method POST -Body $body2 -ContentType "application/json" } catch {}
}
$h2 = if ($r2) { @{ Authorization = "Bearer $($r2.data.token)" } } else { $null }

Write-Host ""

# 1. Student info endpoint
Test-EP "GET /requests/student-info" {
  $d = (Invoke-RestMethod "$base/requests/student-info" -Headers $h).data
  if (-not $d.name) { throw "missing name" }
  Write-Host "     name=$($d.name) usn=$($d.usn) floor=$($d.floorNumber) room=$($d.roomNumber)" -ForegroundColor DarkGray
}

# 2. Create a request
$script:reqId = $null
Test-EP "POST /requests (create Outing)" {
  $b = '{"type":"OUTING","fromDate":"2026-08-20","toDate":"2026-08-20","reason":"City visit for personal work","destination":"Bangalore City"}'
  $res = Invoke-RestMethod "$base/requests" -Method POST -Body $b -ContentType "application/json" -Headers $h
  if (-not $res.success) { throw $res.message }
  if ($res.data.status -ne "PENDING") { throw "expected PENDING got $($res.data.status)" }
  $script:reqId = $res.data.id
  Write-Host "     id=$($res.data.id) status=$($res.data.status)" -ForegroundColor DarkGray
}

# 3. Destination required validation
Test-EP "POST /requests validates destination for GOING_HOME" {
  $b = '{"type":"GOING_HOME","fromDate":"2026-08-21","toDate":"2026-08-22","reason":"Visiting parents at home","destination":""}'
  try {
    Invoke-RestMethod "$base/requests" -Method POST -Body $b -ContentType "application/json" -Headers $h | Out-Null
    throw "should have failed"
  } catch {
    if ($_.Exception.Message -eq "should have failed") { throw }
    Write-Host "     correctly rejected missing destination" -ForegroundColor DarkGray
  }
}

# 4. Create a Leave request (no destination needed)
Test-EP "POST /requests (create Leave, no destination)" {
  $b = '{"type":"LEAVE","fromDate":"2026-08-25","toDate":"2026-08-27","reason":"Medical leave required for dental procedure"}'
  $res = Invoke-RestMethod "$base/requests" -Method POST -Body $b -ContentType "application/json" -Headers $h
  if (-not $res.success) { throw $res.message }
  Write-Host "     id=$($res.data.id) type=LEAVE status=$($res.data.status)" -ForegroundColor DarkGray
}

# 5. List own requests
Test-EP "GET /requests (own list)" {
  $d = (Invoke-RestMethod "$base/requests" -Headers $h).data
  Write-Host "     total=$($d.total)" -ForegroundColor DarkGray
  if ($d.total -eq 0) { throw "expected requests in list" }
}

# 6. Get single request
if ($script:reqId) {
  Test-EP "GET /requests/:id (own request)" {
    $d = (Invoke-RestMethod "$base/requests/$($script:reqId)" -Headers $h).data
    if ($d.id -ne $script:reqId) { throw "id mismatch" }
    Write-Host "     type=$($d.type) status=$($d.status)" -ForegroundColor DarkGray
  }
}

# 7. Data isolation — Nadia should NOT see Girikarnika's request
if ($h2 -and $script:reqId) {
  Test-EP "Security: Nadia cannot access Girikarnika's request" {
    try {
      Invoke-RestMethod "$base/requests/$($script:reqId)" -Headers $h2 | Out-Null
      throw "should have returned 404"
    } catch {
      if ($_.Exception.Message -eq "should have returned 404") { throw }
      Write-Host "     correctly blocked (404)" -ForegroundColor DarkGray
    }
  }
}

# 8. Cancel the Outing request
if ($script:reqId) {
  Test-EP "PATCH /requests/:id/cancel" {
    $res = Invoke-RestMethod "$base/requests/$($script:reqId)/cancel" -Method PATCH -Headers $h
    if (-not $res.success) { throw $res.message }
    if ($res.data.status -ne "CANCELLED") { throw "expected CANCELLED got $($res.data.status)" }
    Write-Host "     status=$($res.data.status)" -ForegroundColor DarkGray
  }

  # 9. Cannot cancel an already-cancelled request
  Test-EP "Cannot cancel already-CANCELLED request" {
    try {
      Invoke-RestMethod "$base/requests/$($script:reqId)/cancel" -Method PATCH -Headers $h | Out-Null
      throw "should have failed"
    } catch {
      if ($_.Exception.Message -eq "should have failed") { throw }
      Write-Host "     correctly rejected" -ForegroundColor DarkGray
    }
  }
}

# 10. Filter by status
Test-EP "GET /requests?status=CANCELLED" {
  $d = (Invoke-RestMethod "$base/requests?status=CANCELLED" -Headers $h).data
  Write-Host "     cancelled count=$($d.total)" -ForegroundColor DarkGray
}

# 11. End-to-end date validation
Test-EP "POST /requests rejects end-before-start date" {
  $b = '{"type":"LEAVE","fromDate":"2026-08-30","toDate":"2026-08-20","reason":"Testing invalid dates here"}'
  try {
    Invoke-RestMethod "$base/requests" -Method POST -Body $b -ContentType "application/json" -Headers $h | Out-Null
    throw "should fail"
  } catch {
    if ($_.Exception.Message -eq "should fail") { throw }
    Write-Host "     correctly rejected" -ForegroundColor DarkGray
  }
}

# 12. Verify existing features still work
Test-EP "Profile still works" {
  $d = (Invoke-RestMethod "$base/students/me" -Headers $h).data
  if (-not $d.name) { throw "profile broken" }
  Write-Host "     $($d.name) floor=$($d.floorNumber) room=$($d.roomNumber)" -ForegroundColor DarkGray
}

Test-EP "Attendance status still works" {
  $d = (Invoke-RestMethod "$base/attendance/status" -Headers $h).data
  Write-Host "     windowState=$($d.windowState)" -ForegroundColor DarkGray
}

Write-Host ""
$col = if ($script:fail -eq 0) { "Cyan" } else { "Yellow" }
Write-Host "=== RESULTS: $($script:pass) passed, $($script:fail) failed ===" -ForegroundColor $col
Write-Host ""
