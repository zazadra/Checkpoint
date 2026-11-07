$routes = @('/', '/capsules', '/vault', '/verify')
foreach ($route in $routes) {
  $url = "http://localhost:3000" + $route
  try {
    $res = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 8
    Write-Host "$route -> $($res.StatusCode) OK"
  } catch {
    Write-Host "$route -> FAIL: $($_.Exception.Message)"
  }
}
