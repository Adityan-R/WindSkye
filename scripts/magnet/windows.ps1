try {
    $regPath = "HKCU:\Software\Classes\magnet"

    if (-not (Test-Path $regPath)) {
        New-Item -Path $regPath -Force -ErrorAction Stop | Out-Null
    }

    Set-ItemProperty -Path $regPath -Name "(Default)" -Value "URL:magnet protocol" -ErrorAction Stop
    Set-ItemProperty -Path $regPath -Name "URL Protocol" -Value "" -ErrorAction Stop

    $commandPath = "$regPath\shell\open\command"
    if (-not (Test-Path $commandPath)) {
        New-Item -Path $commandPath -Force -ErrorAction Stop | Out-Null
    }

    $command = 'cmd.exe /c windskye "%1"'
    Set-ItemProperty -Path $commandPath -Name "(Default)" -Value $command -ErrorAction Stop

    Write-Host "Registered Windskye as magnet handler for Windows." -ForegroundColor Green
} catch {
    Write-Host "Failed to register magnet handler. Please check your permissions or run as administrator." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
