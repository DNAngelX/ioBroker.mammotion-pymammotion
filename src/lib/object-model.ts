import { NormalizedDeviceSnapshot, Primitive } from "./protocol";

export interface DeviceRegistration {
    id: string;
    channelId: string;
    name: string;
}

function inferType(value: Primitive): ioBroker.CommonType {
    if (typeof value === "boolean") {
        return "boolean";
    }
    if (typeof value === "number") {
        return "number";
    }
    return "string";
}

function normalizeValue(value: Primitive): string | number | boolean {
    if (value === null) {
        return "";
    }
    return value;
}

export function normalizeDeviceChannelId(deviceId: string): string {
    return deviceId.replace(/[^A-Za-z0-9_-]/g, "_");
}

function toTelemetryStateId(key: string): string {
    return key.replace(/[^A-Za-z0-9_]/g, "_");
}

async function ensureState(adapter: ioBroker.Adapter, id: string, common: ioBroker.StateCommon): Promise<void> {
    await adapter.setObjectNotExistsAsync(id, {
        type: "state",
        common,
        native: {},
    });
}

export async function ensureBaseObjects(adapter: ioBroker.Adapter): Promise<void> {
    await adapter.setObjectNotExistsAsync("info", {
        type: "channel",
        common: { name: "Information" },
        native: {},
    });
    await ensureState(adapter, "info.connection", {
        name: "Service connected",
        type: "boolean",
        role: "indicator.connected",
        read: true,
        write: false,
        def: false,
    });
    await ensureState(adapter, "info.sidecarReady", {
        name: "Sidecar ready",
        type: "boolean",
        role: "indicator.connected",
        read: true,
        write: false,
        def: false,
    });
    await ensureState(adapter, "info.pythonReady", {
        name: "Python ready",
        type: "boolean",
        role: "indicator.connected",
        read: true,
        write: false,
        def: false,
    });
    await ensureState(adapter, "info.authenticated", {
        name: "Authenticated",
        type: "boolean",
        role: "indicator.connected",
        read: true,
        write: false,
        def: false,
    });
    await ensureState(adapter, "info.lastError", {
        name: "Last error",
        type: "string",
        role: "text",
        read: true,
        write: false,
        def: "",
    });
    await ensureState(adapter, "info.lastSync", {
        name: "Last sync",
        type: "string",
        role: "text",
        read: true,
        write: false,
        def: "",
    });
    await ensureState(adapter, "info.pythonVersion", {
        name: "Python version",
        type: "string",
        role: "text",
        read: true,
        write: false,
        def: "",
    });
    await ensureState(adapter, "info.pymammotionVersion", {
        name: "Pinned PyMammotion version",
        type: "string",
        role: "text",
        read: true,
        write: false,
        def: "",
    });
    await ensureState(adapter, "info.pymammotionLatestVersion", {
        name: "Latest PyMammotion version",
        type: "string",
        role: "text",
        read: true,
        write: false,
        def: "",
    });
    await ensureState(adapter, "info.pymammotionLatestCompatibleVersion", {
        name: "Latest compatible PyMammotion version",
        type: "string",
        role: "text",
        read: true,
        write: false,
        def: "",
    });
    await ensureState(adapter, "info.pymammotionLatestRequiresPython", {
        name: "Latest PyMammotion Python requirement",
        type: "string",
        role: "text",
        read: true,
        write: false,
        def: "",
    });
    await ensureState(adapter, "info.pymammotionPinnedRequiresPython", {
        name: "Pinned PyMammotion Python requirement",
        type: "string",
        role: "text",
        read: true,
        write: false,
        def: "",
    });
    await ensureState(adapter, "info.pymammotionUpdateAvailable", {
        name: "PyMammotion update available",
        type: "boolean",
        role: "indicator",
        read: true,
        write: false,
        def: false,
    });
    await ensureState(adapter, "info.pythonUpgradeRequired", {
        name: "Python upgrade required for latest PyMammotion",
        type: "boolean",
        role: "indicator",
        read: true,
        write: false,
        def: false,
    });
    await ensureState(adapter, "info.lastLoginCode", {
        name: "Last login code",
        type: "number",
        role: "value",
        read: true,
        write: false,
        def: 0,
    });
    await ensureState(adapter, "info.lastLoginMessage", {
        name: "Last login message",
        type: "string",
        role: "text",
        read: true,
        write: false,
        def: "",
    });
    await adapter.setObjectNotExistsAsync("diagnostics", {
        type: "channel",
        common: { name: "Diagnostics" },
        native: {},
    });
    await ensureState(adapter, "diagnostics.testLogin", {
        name: "Test login",
        type: "boolean",
        role: "button",
        read: false,
        write: true,
        def: false,
    });
    await ensureState(adapter, "diagnostics.clearCache", {
        name: "Clear session cache",
        type: "boolean",
        role: "button",
        read: false,
        write: true,
        def: false,
    });
}

export async function ensureDeviceObjects(adapter: ioBroker.Adapter, device: DeviceRegistration): Promise<void> {
    const baseId = `devices.${device.channelId}`;
    await adapter.setObjectNotExistsAsync(baseId, {
        type: "device",
        common: { name: device.name },
        native: { deviceId: device.id },
    });
    for (const channel of ["info", "status", "telemetry", "commands"]) {
        await adapter.setObjectNotExistsAsync(`${baseId}.${channel}`, {
            type: "channel",
            common: { name: channel },
            native: {},
        });
    }

    await ensureState(adapter, `${baseId}.info.name`, {
        name: "Device name",
        type: "string",
        role: "text",
        read: true,
        write: false,
    });
    await ensureState(adapter, `${baseId}.info.model`, {
        name: "Model",
        type: "string",
        role: "text",
        read: true,
        write: false,
    });
    await ensureState(adapter, `${baseId}.info.productKey`, {
        name: "Product key",
        type: "string",
        role: "text",
        read: true,
        write: false,
    });
    await ensureState(adapter, `${baseId}.info.firmwareVersion`, {
        name: "Firmware version",
        type: "string",
        role: "text",
        read: true,
        write: false,
    });
    await ensureState(adapter, `${baseId}.info.serialNumber`, {
        name: "Serial number",
        type: "string",
        role: "text",
        read: true,
        write: false,
    });
    await ensureState(adapter, `${baseId}.info.mqttTransport`, {
        name: "MQTT transport",
        type: "string",
        role: "text",
        read: true,
        write: false,
    });

    await ensureState(adapter, `${baseId}.status.online`, {
        name: "Online",
        type: "boolean",
        role: "indicator.reachable",
        read: true,
        write: false,
    });
    await ensureState(adapter, `${baseId}.status.enabled`, {
        name: "Enabled",
        type: "boolean",
        role: "indicator",
        read: true,
        write: false,
    });
    await ensureState(adapter, `${baseId}.status.connectionState`, {
        name: "Connection state",
        type: "string",
        role: "text",
        read: true,
        write: false,
    });
    await ensureState(adapter, `${baseId}.status.activity`, {
        name: "Activity",
        type: "string",
        role: "text",
        read: true,
        write: false,
    });
    await ensureState(adapter, `${baseId}.status.state`, {
        name: "State",
        type: "string",
        role: "text",
        read: true,
        write: false,
    });

    for (const command of ["start", "pause", "stop", "dock", "refresh"]) {
        await ensureState(adapter, `${baseId}.commands.${command}`, {
            name: command,
            type: "boolean",
            role: "button",
            read: false,
            write: true,
            def: false,
        });
    }
}

async function ensureTelemetryState(
    adapter: ioBroker.Adapter,
    baseId: string,
    key: string,
    value: Primitive,
): Promise<void> {
    const id = `${baseId}.telemetry.${toTelemetryStateId(key)}`;
    await ensureState(adapter, id, {
        name: key,
        type: inferType(value),
        role: typeof value === "number" ? "value" : typeof value === "boolean" ? "indicator" : "text",
        read: true,
        write: false,
    });
}

async function setTelemetryValue(
    adapter: ioBroker.Adapter,
    baseId: string,
    key: string,
    value: Primitive,
): Promise<void> {
    await ensureTelemetryState(adapter, baseId, key, value);
    await adapter.setStateChangedAsync(`${baseId}.telemetry.${toTelemetryStateId(key)}`, normalizeValue(value), true);
}

export async function applyDeviceSnapshot(
    adapter: ioBroker.Adapter,
    snapshot: NormalizedDeviceSnapshot,
    previous?: NormalizedDeviceSnapshot,
): Promise<void> {
    const channelId = normalizeDeviceChannelId(snapshot.id);
    const baseId = `devices.${channelId}`;

    await adapter.setStateChangedAsync(`${baseId}.info.name`, snapshot.name, true);
    await adapter.setStateChangedAsync(`${baseId}.info.model`, snapshot.info.model, true);
    await adapter.setStateChangedAsync(`${baseId}.info.productKey`, snapshot.info.productKey, true);
    await adapter.setStateChangedAsync(`${baseId}.info.firmwareVersion`, snapshot.info.firmwareVersion, true);
    await adapter.setStateChangedAsync(`${baseId}.info.serialNumber`, snapshot.info.serialNumber, true);
    await adapter.setStateChangedAsync(`${baseId}.info.mqttTransport`, snapshot.info.mqttTransport, true);

    await adapter.setStateChangedAsync(`${baseId}.status.online`, snapshot.status.online, true);
    await adapter.setStateChangedAsync(`${baseId}.status.enabled`, snapshot.status.enabled, true);
    await adapter.setStateChangedAsync(`${baseId}.status.connectionState`, snapshot.status.connectionState, true);
    await adapter.setStateChangedAsync(`${baseId}.status.activity`, snapshot.status.activity, true);
    await adapter.setStateChangedAsync(`${baseId}.status.state`, snapshot.status.state, true);

    for (const [key, value] of Object.entries(snapshot.telemetry)) {
        if (previous?.telemetry[key] === value) {
            continue;
        }
        await setTelemetryValue(adapter, baseId, key, value);
    }
}
