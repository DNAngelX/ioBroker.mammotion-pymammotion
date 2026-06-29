# ioBroker.mammotion-pymammotion

ioBroker adapter for Mammotion devices using a Python sidecar built on `PyMammotion`.

## Scope

- New adapter implementation
- No direct Mammotion cloud/MQTT/Aliyun logic in Node.js
- Python 3.13+ required on the target system for current `PyMammotion`
- Adapter bootstraps its own virtual environment under the ioBroker instance data directory

## Features

- Sidecar bootstrap with `venv` and pinned `pymammotion==0.8.8`
- Session restore via cached `PyMammotion` credentials
- One long-running Python sidecar per ioBroker adapter instance
- JSON-RPC over `stdio`
- Basic commands: `start`, `pause`, `stop`, `dock`, `refresh`
- Normalized device snapshots mapped to ioBroker states
- Sidecar crash detection with exponential restart backoff

## Configuration

- `email`: Mammotion account email
- `password`: Mammotion account password
- `pythonExecutable`: optional explicit Python 3.13+ path
- `sidecarLogLevel`: `debug`, `info`, `warning`, `error`
- `bootstrapOnStart`: bootstrap or update the sidecar environment on adapter start

## Runtime layout

- Node.js adapter handles admin/config/state mapping and process supervision
- Python sidecar handles `PyMammotion`, session restore, discovery, telemetry and commands
- Sidecar cache is stored in the ioBroker instance data directory
- Adapter checks PyPI metadata on startup and exposes version compatibility states in `info.*`

## Notes

- The adapter expects Python to already be installed; it does not install system Python.
- Packaging and redistribution must stay aligned with the `PyMammotion` license.

## Development

- Local `dev-server` support is included via `npm run dev-server -- <command>`.
- The script forces a temp directory under `/tmp` because `@iobroker/dev-server` breaks on macOS paths with spaces.
- Typical flow:
  - `npm run dev-server -- setup`
  - `npm run dev-server -- watch`
- For a real adapter start inside `dev-server`, `Python 3.13+` must still be available, for example via `pythonExecutable` in the instance config.
