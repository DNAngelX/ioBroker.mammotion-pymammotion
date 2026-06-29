# Architecture

- `src/main.ts`: ioBroker adapter lifecycle, bootstrap and sidecar supervision
- `src/lib/bootstrap.ts`: Python detection, `venv` creation and dependency installation
- `src/lib/sidecar-client.ts`: JSON-RPC transport over `stdio`
- `python-daemon/sidecar.py`: `PyMammotion` integration and device command handling

The Node.js layer does not implement Mammotion protocol logic.
