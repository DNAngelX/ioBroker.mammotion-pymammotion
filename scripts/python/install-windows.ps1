$ErrorActionPreference = "Stop"

if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Host "winget wurde nicht gefunden."
    Write-Host "Installiere Python 3.13 manuell von https://www.python.org/downloads/windows/."
    exit 1
}

winget install --id Python.Python.3.13 -e --source winget

if (Get-Command py -ErrorAction SilentlyContinue) {
    py -3.13 --version
    Write-Host "Empfohlener Wert für pythonExecutable im Adapter:"
    Write-Host "py -3.13"
    exit 0
}

if (Get-Command python3.13.exe -ErrorAction SilentlyContinue) {
    python3.13.exe --version
    Write-Host "Empfohlener Wert für pythonExecutable im Adapter:"
    Write-Host (Get-Command python3.13.exe).Source
    exit 0
}

Write-Host "Python 3.13 wurde installiert, aber kein ausführbarer Pfad wurde automatisch gefunden."
Write-Host "Setze pythonExecutable im Adapter manuell auf python.exe aus der 3.13-Installation."
exit 1
