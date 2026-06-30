# Python-Installation für `ioBroker.mammotion-pymammotion`

Der Adapter installiert **kein System-Python** selbst. Für die aktuelle `PyMammotion`-Version wird **Python 3.13+** benötigt.

## Schnellprüfung

```bash
./scripts/python/check-python.sh
```

Wenn du bereits einen festen Pfad hast, kannst du ihn direkt prüfen:

```bash
./scripts/python/check-python.sh /usr/local/bin/python3.13
```

## macOS

Empfohlen ist Homebrew:

```bash
./scripts/python/install-macos.sh
```

Danach typischerweise:

- Intel-Mac: `/usr/local/opt/python@3.13/bin/python3.13`
- Apple Silicon: `/opt/homebrew/opt/python@3.13/bin/python3.13`

Diesen Pfad kannst du direkt als `pythonExecutable` im Adapter hinterlegen.

## Linux

Es gibt **kein** garantiert universelles Installationskommando für alle Distributionen. Das Repo enthält deshalb ein **Best-Effort-Skript**:

```bash
./scripts/python/install-linux.sh
```

Das Skript versucht Paketinstallationen über:

- `apt-get`
- `dnf`
- `zypper`
- `apk`

Wenn deine Distribution kein `python3.13`-Paket bereitstellt, bricht das Skript bewusst ab. In dem Fall brauchst du eine distributionsspezifische Lösung oder ein Host-/Container-Image mit Python 3.13.

## Docker

Für Docker ist der robusteste Weg ein eigenes Image, in dem Python 3.13 bereits vorhanden ist.

Wichtig:

- Der Adapter kann das `venv` selbst anlegen.
- Das Container-Image muss aber ein nutzbares Python 3.13 bereitstellen.

Pragmatische Optionen:

- ioBroker-Image erweitern und Python 3.13 per Paketmanager installieren
- eigenes Basis-Image verwenden, das Python 3.13 bereits enthält

Nach dem Containerstart kannst du im ioBroker-Adapter optional `pythonExecutable` setzen, wenn `python3.13` nicht im normalen `PATH` liegt.

## Windows

Empfohlen ist `winget`:

```powershell
PowerShell -ExecutionPolicy Bypass -File .\scripts\python\install-windows.ps1
```

Wenn `winget` nicht vorhanden ist:

- Python 3.13 von der offiziellen Windows-Installation installieren
- danach `pythonExecutable` im Adapter auf `python.exe` oder `py -3.13` ausrichten

## ioBroker-Adapter

Nach erfolgreicher Installation:

1. Adapter-Konfiguration öffnen
2. optional `pythonExecutable` setzen
3. Adapter neu starten

Wenn die Autodetektion nicht greift, ist ein expliziter Pfad der sauberste Weg.

## Hinweis zu `syncMap`

`syncMap` hängt von der Mammotion-Cloud/API-Antwort ab. Fehler wie `gateway.hsf.invoke.timeout` kommen von der Gegenseite und bedeuten nicht automatisch einen Adapterfehler. In dem Fall den Sync später erneut auslösen.
