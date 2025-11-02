$content = Get-Content 'mock.txt' -Raw

# Улучшенное разделение объектов - учитываем что объекты разделяются } и {
# Используем более надежный способ парсинга
$rawObjects = @()
$currentObject = ""
$braceCount = 0
$inString = $false
$escapeNext = $false

for ($i = 0; $i -lt $content.Length; $i++) {
    $char = $content[$i]
    $prevChar = if ($i -gt 0) { $content[$i-1] } else { '' }
    
    if ($escapeNext) {
        $currentObject += $char
        $escapeNext = $false
        continue
    }
    
    if ($char -eq '\' -and -not $escapeNext) {
        $escapeNext = $true
        $currentObject += $char
        continue
    }
    
    if ($char -eq '"' -and -not $escapeNext) {
        $inString = -not $inString
        $currentObject += $char
        continue
    }
    
    if (-not $inString) {
        if ($char -eq '{') {
            if ($braceCount -eq 0 -and $currentObject.Trim()) {
                # Сохраняем предыдущий объект если он был
                $rawObjects += $currentObject
                $currentObject = ""
            }
            $braceCount++
            $currentObject += $char
        }
        elseif ($char -eq '}') {
            $currentObject += $char
            $braceCount--
            if ($braceCount -eq 0) {
                # Объект завершен
                $rawObjects += $currentObject
                $currentObject = ""
            }
        }
        else {
            $currentObject += $char
        }
    }
    else {
        $currentObject += $char
    }
}

# Добавляем последний объект если есть
if ($currentObject.Trim()) {
    $rawObjects += $currentObject
}
$objects = @()

$errorCount = 0
$objIndex = 0
foreach ($rawObj in $rawObjects) {
    $objIndex++
    $objStr = $rawObj.Trim()
    
    # Пропускаем пустые объекты
    if ([string]::IsNullOrWhiteSpace($objStr)) {
        continue
    }
    
    # Убеждаемся что объект начинается с { и заканчивается }
    if (-not $objStr.StartsWith('{')) {
        continue
    }
    
    if (-not $objStr.EndsWith('}')) {
        $objStr = $objStr + '}'
    }
    
    try {
        $obj = $objStr | ConvertFrom-Json
        if ($obj -and $obj.round -and $obj.round.mode) {
            $objects += $obj
            Write-Host "Parsed object #$objIndex with mode: $($obj.round.mode)"
        }
    } catch {
        $errorCount++
        if ($errorCount -le 5) {
            Write-Host "Error parsing object #$objIndex : $($_.Exception.Message)"
        }
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

