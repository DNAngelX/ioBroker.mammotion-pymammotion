#!/usr/bin/env bash
set -euo pipefail

for candidate in "${@:-}" python3.13 python3 python; do
    if [[ -z "${candidate}" ]]; then
        continue
    fi
    if command -v "${candidate}" >/dev/null 2>&1; then
        echo "Gefunden: $(command -v "${candidate}")"
        "${candidate}" --version
        exit 0
    fi
done

echo "Kein Python gefunden. Siehe docs/python-install.md."
exit 1
