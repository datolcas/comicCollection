$url = 'http://localhost:5000/api/usa-volumes/fetch-from-url'
$body = @{
  url = 'https://marvel.fandom.com/wiki/Fantastic_Four_Vol_1'
} | ConvertTo-Json

Write-Host "Testing endpoint: $url"
Write-Host "Request body: $body"
Write-Host ""

try {
  $response = Invoke-WebRequest -Uri $url -Method POST -Body $body -ContentType "application/json" -TimeoutSec 30
  Write-Host "Status: $($response.StatusCode)"
  Write-Host "Response:"
  $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
  Write-Host "Status Code: $($_.Exception.Response.StatusCode.Value)"
  Write-Host "Exception: $($_.Exception.Message)"
  
  if ($_.Exception.Response.StatusCode.Value -eq 500) {
    try {
      $stream = $_.Exception.Response.GetResponseStream()
      $reader = New-Object System.IO.StreamReader($stream)
      $body = $reader.ReadToEnd()
      Write-Host "Error Response:"
      $body | ConvertFrom-Json | ConvertTo-Json -Depth 10
    } catch {
      Write-Host "Response: $body"
    }
  }
}
