from __future__ import annotations

import asyncio
from dataclasses import asdict, is_dataclass
import json
import logging
from pathlib import Path
import sys
from typing import Any

from pymammotion.client import MammotionClient
from pymammotion.http.http import MammotionHTTP
from pymammotion.proto import RptAct, RptInfoType


class JsonRpcError(Exception):
    def __init__(self, message: str, code: int = -32000) -> None:
        super().__init__(message)
        self.code = code


class Sidecar:
    def __init__(self) -> None:
        self.client: MammotionClient | None = None
        self.cache_path: Path | None = None
        self.account: str = ""
        self.password: str = ""
        self.log_level = "info"
        self.version = "0.1.0"
        self._state_subscriptions: list[Any] = []
        self._ready_emitted = False

    async def emit(self, method: str, params: dict[str, Any] | None = None) -> None:
        payload = {"method": method}
        if params is not None:
            payload["params"] = self.make_json_compatible(params)
        sys.stdout.write(json.dumps(payload) + "\n")
        sys.stdout.flush()

    async def respond(self, id_: int, result: dict[str, Any] | None = None, error: JsonRpcError | None = None) -> None:
        payload: dict[str, Any] = {"id": id_}
        if error is not None:
            payload["error"] = {"code": error.code, "message": str(error)}
        else:
            payload["result"] = self.make_json_compatible(result or {})
        sys.stdout.write(json.dumps(payload) + "\n")
        sys.stdout.flush()

    async def log(self, level: str, message: str) -> None:
        await self.emit("log", {"level": level, "message": message})

    async def handle_request(self, request: dict[str, Any]) -> None:
        request_id = request.get("id")
        method = request.get("method")
        params = request.get("params") or {}
        try:
            if method == "health":
                await self.respond(request_id, {"ok": True, "python_version": sys.version.split()[0]})
            elif method == "bootstrap":
                self.log_level = params.get("sidecar_log_level", "info")
                self.version = str(params.get("adapter_version") or self.version)
                if not self._ready_emitted:
                    self._ready_emitted = True
                    await self.emit("ready", {"version": self.version})
                await self.respond(request_id, {"adapter": "mammotion-pymammotion", "version": self.version})
            elif method == "login_or_restore":
                result = await self.login_or_restore(params)
                await self.respond(request_id, result)
            elif method == "diagnostic_login":
                result = await self.diagnostic_login(params)
                await self.respond(request_id, result)
            elif method == "list_devices":
                await self.respond(request_id, {"devices": self.list_device_names()})
            elif method == "get_snapshot":
                device_id = params.get("device_id")
                await self.respond(request_id, {"snapshot": self.get_snapshot(device_id)})
            elif method == "send_command":
                result = await self.send_command(params["device_id"], params["command"])
                await self.respond(request_id, result)
            elif method == "shutdown":
                await self.shutdown()
                await self.respond(request_id, {"stopped": True})
                raise EOFError
            else:
                raise JsonRpcError(f"Unknown method: {method}", -32601)
        except EOFError:
            raise
        except JsonRpcError as error:
            await self.respond(request_id, error=error)
        except Exception as error:  # noqa: BLE001
            await self.emit("error", {"message": str(error)})
            await self.respond(request_id, error=JsonRpcError(str(error)))

    async def login_or_restore(self, params: dict[str, Any]) -> dict[str, Any]:
        self.account = params["account"]
        self.password = params["password"]
        self.cache_path = Path(params["cache_path"])
        await self.teardown_client()
        self.client = MammotionClient(ha_version=self.version)

        used_cache = False
        cache_data: dict[str, Any] = {}
        if self.cache_path.exists():
            try:
                cache_data = json.loads(self.cache_path.read_text("utf8"))
            except Exception:  # noqa: BLE001
                cache_data = {}

        if cache_data:
            try:
                await self.client.restore_credentials(self.account, self.password, cache_data)
                used_cache = True
            except Exception as error:  # noqa: BLE001
                await self.log("warning", f"Credential restore failed, falling back to login: {error}")
                await self.client.login_and_initiate_cloud(self.account, self.password)
        else:
            await self.client.login_and_initiate_cloud(self.account, self.password)

        await self.persist_cache()
        await self.register_device_watchers()
        await self.emit("auth_state", {"authenticated": True, "message": "restored" if used_cache else "logged_in"})
        for device_id in self.list_device_names():
            snapshot = self.get_snapshot(device_id)
            if snapshot is None:
                continue
            await self.emit("device_discovered", {"device_id": device_id, "name": snapshot["name"]})
            await self.emit("device_snapshot", {"snapshot": snapshot})
        return {"authenticated": True, "devices": self.list_device_names()}

    async def diagnostic_login(self, params: dict[str, Any]) -> dict[str, Any]:
        account = params["account"]
        password = params["password"]
        mammotion_http = MammotionHTTP(ha_version=self.version)
        response = await mammotion_http.login_v2(account, password)
        return {
            "ok": bool(response.code == 0),
            "code": int(response.code),
            "message": response.msg or "",
        }

    async def register_device_watchers(self) -> None:
        await self.clear_subscriptions()
        if self.client is None:
            return
        for device_id in self.list_device_names():
            handle = self.client.mower(device_id)
            if handle is None:
                continue

            async def on_state_changed(snapshot: Any, current_device_id: str = device_id) -> None:
                normalized = self.get_snapshot(current_device_id)
                if normalized is None:
                    return
                await self.emit("device_snapshot", {"snapshot": normalized})
                await self.emit("device_online", {"device_id": current_device_id, "online": bool(normalized["status"]["online"])})

            self._state_subscriptions.append(handle.subscribe_state_changed(on_state_changed))

    async def clear_subscriptions(self) -> None:
        for subscription in self._state_subscriptions:
            try:
                subscription.cancel()
            except Exception:  # noqa: BLE001
                pass
        self._state_subscriptions.clear()

    def make_json_compatible(self, value: Any) -> Any:
        if value is None or isinstance(value, str | int | float | bool):
            return value
        if isinstance(value, dict):
            return {str(key): self.make_json_compatible(entry) for key, entry in value.items()}
        if isinstance(value, list | tuple | set):
            return [self.make_json_compatible(entry) for entry in value]
        if is_dataclass(value):
            return self.make_json_compatible(asdict(value))
        to_dict = getattr(value, "to_dict", None)
        if callable(to_dict):
            return self.make_json_compatible(to_dict())
        if hasattr(value, "__dict__"):
            return self.make_json_compatible(vars(value))
        return str(value)

    async def persist_cache(self) -> None:
        if self.client is None or self.cache_path is None:
            return
        self.cache_path.parent.mkdir(parents=True, exist_ok=True)
        serialized_cache = self.make_json_compatible(self.client.to_cache())
        self.cache_path.write_text(json.dumps(serialized_cache), "utf8")

    def list_device_names(self) -> list[str]:
        if self.client is None:
            return []
        registry = getattr(self.client, "_device_registry", None)
        if registry is None:
            return []
        return sorted(handle.device_name for handle in registry.all_devices)

    def get_snapshot(self, device_id: str | None) -> dict[str, Any] | None:
        if self.client is None or not device_id:
            return None
        handle = self.client.mower(device_id)
        device = self.client.get_device_by_name(device_id)
        if handle is None or device is None:
            return None

        snapshot = handle.snapshot
        raw_snapshot = getattr(snapshot, "raw", None)
        mower_state = getattr(device, "mower_state", None)
        device_firmwares = getattr(device, "device_firmwares", None)
        location = getattr(device, "location", None)
        report_data = getattr(device, "report_data", None)

        product_key = getattr(mower_state, "product_key", "") or getattr(device, "product_key", "") or ""
        firmware = getattr(mower_state, "swversion", "") or getattr(device_firmwares, "device_version", "") or getattr(
            device,
            "device_version",
            "",
        )
        model = getattr(mower_state, "model", "") or getattr(mower_state, "internal_model", "") or getattr(
            device_firmwares,
            "model_name",
            "",
        )
        serial_number = getattr(mower_state, "wifi_mac", "") or getattr(device, "wifi_mac", "") or ""
        mqtt_transport = "cloud_mammotion" if product_key and "Y" not in product_key else "cloud"
        state_code = getattr(getattr(report_data, "dev", None), "sys_status", 0) or getattr(device, "rtk_status", 0) or getattr(
            device,
            "basestation_status",
            0,
        )
        connection_state = getattr(snapshot.connection_state, "value", str(snapshot.connection_state))
        blade_height = getattr(getattr(raw_snapshot, "work", None), "knife_height", 0) or getattr(
            getattr(getattr(raw_snapshot, "report_data", None), "work", None),
            "knife_height",
            0,
        )
        activity = getattr(getattr(raw_snapshot, "work", None), "job_mode", 0) or getattr(
            getattr(getattr(raw_snapshot, "report_data", None), "work", None),
            "nav_run_mode",
            0,
        )
        telemetry = {
            "batteryLevel": snapshot.battery_level,
            "bladeHeight": blade_height,
            "latitude": getattr(getattr(location, "device", None), "latitude", 0.0) or getattr(device, "lat", 0.0),
            "longitude": getattr(getattr(location, "device", None), "longitude", 0.0) or getattr(device, "lon", 0.0),
            "workZone": getattr(location, "work_zone", 0),
            "wifiRssi": getattr(getattr(report_data, "connect", None), "wifi_rssi", 0) or getattr(device, "wifi_rssi", 0),
            "stateCode": state_code,
            "rtkLatitude": getattr(getattr(location, "RTK", None), "latitude", 0.0) or getattr(device, "lat", 0.0),
            "rtkLongitude": getattr(getattr(location, "RTK", None), "longitude", 0.0) or getattr(device, "lon", 0.0),
        }
        return {
            "id": device_id,
            "name": device.name or device_id,
            "info": {
                "productKey": product_key,
                "firmwareVersion": firmware,
                "model": model,
                "serialNumber": serial_number,
                "mqttTransport": mqtt_transport,
            },
            "status": {
                "online": bool(snapshot.online),
                "enabled": bool(snapshot.enabled),
                "connectionState": connection_state,
                "activity": str(activity),
                "state": str(state_code),
            },
            "telemetry": telemetry,
        }

    async def send_command(self, device_id: str, command: str) -> dict[str, Any]:
        if self.client is None:
            raise JsonRpcError("Client is not initialized")

        if command == "start":
            await self.client.send_command_with_args(device_id, "start_job")
        elif command == "pause":
            await self.client.send_command_with_args(device_id, "pause_execute_task")
        elif command == "stop":
            await self.client.send_command_with_args(device_id, "cancel_job")
        elif command == "dock":
            await self.client.send_command_with_args(device_id, "return_to_dock")
        elif command == "refresh":
            await self.client.send_command_with_args(
                device_id,
                "request_iot_sys",
                rpt_act=RptAct.RPT_START,
                rpt_info_type=[
                    RptInfoType.RIT_DEV_STA,
                    RptInfoType.RIT_DEV_LOCAL,
                    RptInfoType.RIT_WORK,
                    RptInfoType.RIT_MAINTAIN,
                    RptInfoType.RIT_BASESTATION_INFO,
                    RptInfoType.RIT_VIO,
                ],
                timeout=10000,
                period=3000,
                no_change_period=4000,
                count=0,
            )
        else:
            raise JsonRpcError(f"Unsupported command: {command}")

        await self.persist_cache()
        result = {"ok": True, "device_id": device_id, "command": command}
        await self.emit("command_result", result)
        snapshot = self.get_snapshot(device_id)
        if snapshot is not None:
            await self.emit("device_snapshot", {"snapshot": snapshot})
        return result

    async def teardown_client(self) -> None:
        await self.clear_subscriptions()
        if self.client is not None:
            await self.client.stop()
        self.client = None

    async def shutdown(self) -> None:
        await self.teardown_client()


async def main() -> None:
    sidecar = Sidecar()
    while True:
        line = await asyncio.to_thread(sys.stdin.readline)
        if not line:
            break
        request = json.loads(line)
        try:
            await sidecar.handle_request(request)
        except EOFError:
            break


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
