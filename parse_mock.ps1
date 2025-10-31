$content = Get-Content 'mock.txt' -Raw
$rawObjects = $content -split '(?<=})\r?\n(?=\{)'
$objects = @()

foreach ($rawObj in $rawObjects) {
    $objStr = $rawObj.Trim()
    if (-not $objStr.EndsWith('}')) {
        $objStr = $objStr + '}'
    }
    
    try {
        $obj = $objStr | ConvertFrom-Json
        $objects += $obj
        Write-Host "Parsed object with mode: $($obj.round.mode)"
    } catch {
        Write-Host "Error parsing object"
    }
}

Write-Host "Total objects parsed: $($objects.Count)"

$baseObjects = @()
$anteObjects = @()
$chaosObjects = @()

foreach ($obj in $objects) {
    if ($obj.round.mode -eq 'base') {
        $baseObjects += $obj
    } elseif ($obj.round.mode -eq 'ante') {
        $anteObjects += $obj
    } elseif ($obj.round.mode -eq 'chaos') {
        $chaosObjects += $obj
    }
}

Write-Host "Base objects: $($baseObjects.Count)"
Write-Host "Ante objects: $($anteObjects.Count)"
Write-Host "Chaos objects: $($chaosObjects.Count)"

New-Item -ItemType Directory -Force -Path "mocks/api" | Out-Null

for ($i = 0; $i -lt $baseObjects.Count; $i++) {
    $filename = "mocks/api/wallet_play_from_mock_base_$($i+1).json"
    $baseObjects[$i] | ConvertTo-Json -Depth 100 | Out-File -FilePath $filename -Encoding utf8
}

for ($i = 0; $i -lt $anteObjects.Count; $i++) {
    $filename = "mocks/api/wallet_play_from_mock_ante_$($i+1).json"
    $anteObjects[$i] | ConvertTo-Json -Depth 100 | Out-File -FilePath $filename -Encoding utf8
}

for ($i = 0; $i -lt $chaosObjects.Count; $i++) {
    $filename = "mocks/api/wallet_play_from_mock_chaos_$($i+1).json"
    $chaosObjects[$i] | ConvertTo-Json -Depth 100 | Out-File -FilePath $filename -Encoding utf8
}

Write-Host "All files saved successfully!"

