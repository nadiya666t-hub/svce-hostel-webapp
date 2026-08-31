$base = "http://localhost:5000/api"
$script:pass = 0; $script:fail = 0

function Test-Login($name, $url, $body) {
  try {
    $r = Invoke-RestMethod -Uri "$base$url" -Method POST -Body $body -ContentType "application/json"
    if ($r.success) { Write-Host "  [PASS] $name" -ForegroundColor Green; $script:pass++ }
    else { Write-Host "  [FAIL] $name : $($r.message)" -ForegroundColor Red; $script:fail++ }
  } catch {
    Write-Host "  [FAIL] $name : $($_.ErrorDetails.Message)" -ForegroundColor Red; $script:fail++
  }
}

Write-Host "`n=== ALL PORTAL LOGIN TESTS ===" -ForegroundColor Cyan

Test-Login "Student: Girikarnika"  "/auth/login"          '{"usn":"1VE25CS048","password":"Student@123"}'
Test-Login "Student: Nadia"        "/auth/login"          '{"usn":"1VE25CS020","password":"Student@123"}'
Test-Login "Parent: Girikarnika"   "/parent/auth/login"   '{"usn":"1VE25CS048","password":"Parent@2024"}'
Test-Login "Parent: Nadia"         "/parent/auth/login"   '{"usn":"1VE25CS020","password":"Parent@2024"}'
Test-Login "Warden"                "/warden/auth/login"   '{"wardenId":"WARDEN001","password":"Warden@2024"}'
Test-Login "Overseer"              "/overseer/auth/login" '{"overseerId":"OVERSEER001","password":"Overseer@2024"}'
Test-Login "Watchman"              "/watchman/auth/login" '{"watchmanId":"WATCHMAN001","password":"Watchman@2024"}'

Write-Host "`n=== $($script:pass) passed, $($script:fail) failed ===" -ForegroundColor $(if($script:fail -eq 0){"Cyan"}else{"Yellow"})
