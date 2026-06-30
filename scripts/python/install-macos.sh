#!/usr/bin/env bash
set -euo pipefail

if ! command -v brew >/dev/null 2>&1; then
    echo "Homebrew wurde nicht gefunden."
    echo "Installiere zuerst Homebrew: https://brew.sh/"
    exit 1
fi

brew install python@3.13

prefix="$(brew --prefix python@3.13)"
python_bin="${prefix}/bin/python3.13"

if [[ ! -x "${python_bin}" ]]; then
    echo "Python 3.13 wurde installiert, aber ${python_bin} wurde nicht gefunden."
    exit 1
fi

echo "Python 3.13 ist installiert."
echo "Empfohlener Wert für pythonExecutable im Adapter:"
echo "${python_bin}"
"${python_bin}" --version
