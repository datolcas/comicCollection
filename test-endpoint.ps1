$url = 'http://localhost:5000/api/usa-volumes/fetch-from-url'
$body = @{
  url = 'https://marvel.fandom.com/wiki/Fantastic_Four_Vol_1'
} | ConvertTo-Json

try {
  $response = Invoke-WebRequest -Uri $url -Method POST -Body $body -ContentType "application/json" -ErrorAction Stop
  Write-Host "Status: $($response.StatusCode)"
  $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
  if ($_.Exception.Response) {
    Write-Host "Error Status: $($_.Exception.Response.StatusCode.Value)"
    try {
      $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
      $errorContent = $reader.ReadToEnd()
      Write-Host "Response: $errorContent"
    } catch {
      Write-Host "Could not read response body"
    }
  } else {
    Write-Host "Error: $($_.Exception.Message)"
  }
}
