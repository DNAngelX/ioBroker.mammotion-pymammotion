#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/../.." && pwd)"

if [[ "${EUID}" -ne 0 ]]; then
    if command -v sudo >/dev/null 2>&1; then
        exec sudo bash "$0" "$@"
    fi
    echo "Bitte als root oder mit sudo ausführen."
    exit 1
fi

install_ok=0

if command -v apt-get >/dev/null 2>&1; then
    apt-get update
    # python3-setuptools provides 'distutils', removed in Python 3.12+, needed by older node-gyp
    apt-get install -y python3-setuptools 2>/dev/null || true
    if apt-get install -y python3.13 python3.13-venv; then
        install_ok=1
    fi
elif command -v dnf >/dev/null 2>&1; then
    if dnf install -y python3.13; then
        install_ok=1
    fi
elif command -v zypper >/dev/null 2>&1; then
    if zypper --non-interactive install python313 python313-base; then
        install_ok=1
    fi
elif command -v apk >/dev/null 2>&1; then
    apk add --no-cache python3 py3-virtualenv
    if python3 --version 2>/dev/null | grep -q "3.13"; then
        install_ok=1
    fi
fi

if [[ "${install_ok}" -ne 1 ]]; then
    echo "Python 3.13 konnte nicht automatisch aus den Paketquellen installiert werden."
    echo "Prüfe ${repo_root}/docs/python-install.md für Alternativen."
    exit 1
fi

if command -v python3.13 >/dev/null 2>&1; then
    echo "Python 3.13 ist installiert."
    echo "Empfohlener Wert für pythonExecutable im Adapter:"
    command -v python3.13
    python3.13 --version
    exit 0
fi

if command -v python3 >/dev/null 2>&1 && python3 --version 2>/dev/null | grep -q "3.13"; then
    echo "Python 3.13 ist installiert."
    echo "Empfohlener Wert für pythonExecutable im Adapter:"
    command -v python3
    python3 --version
    exit 0
fi

echo "Installation lief durch, aber kein nutzbares Python 3.13 wurde gefunden."
exit 1
