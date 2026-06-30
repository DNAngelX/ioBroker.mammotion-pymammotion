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

function toDynamicStateId(key: string): string {
    return key.replace(/[^A-Za-z0-9_]/g, "_");
}

function toZoneChannelId(hash: number): string {
    return `zone_${String(hash).replace(/[^A-Za-z0-9_-]/g, "_")}`;
}

function isWritableConfigurationKey(key: string): boolean {
    return [
        "bladeHeight",
        "workingSpeed",
        "rainDetection",
        "traversalMode",
        "turningMode",
        "sideLight",
        "manualLight",
        "nightLight",
        "cutterMode",
    ].includes(key);
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
    for (const channel of [
        "info",
        "status",
        "telemetry",
        "capabilities",
        "diagnostics",
        "configuration",
        "controls",
        "commands",
        "zones",
    ]) {
        await adapter.setObjectNotExistsAsync(`${baseId}.${channel}`, {
            type: "channel",
            common: { name: channel },
            native: {},
        });
    }
    await adapter.setObjectNotExistsAsync(`${baseId}.configuration.limits`, {
        type: "channel",
        common: { name: "limits" },
        native: {},
    });

    await ensureState(adapter, `${baseId}.info.name`, {
        name: "Device name",
        type: "string",
        role: "text",
        read: true,
        write: false,
    });
    await ensureState(adapter, `${baseId}.info.deviceType`, {
        name: "Device type",
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

    for (const channel of ["controls", "commands"]) {
        for (const command of [
            "start",
            "pause",
            "stop",
            "dock",
            "refresh",
            "leaveDock",
            "cancelTask",
            "nudgeForward",
            "nudgeBack",
            "nudgeLeft",
            "nudgeRight",
            "bladeOn",
            "bladeOff",
        ]) {
            await ensureState(adapter, `${baseId}.${channel}.${command}`, {
                name: command,
                type: "boolean",
                role: "button",
                read: false,
                write: true,
                def: false,
            });
        }
    }

    await ensureState(adapter, `${baseId}.zones.currentAreas`, {
        name: "Current area hashes",
        type: "string",
        role: "text",
        read: true,
        write: false,
        def: "",
    });
    await ensureState(adapter, `${baseId}.zones.selectedAreas`, {
        name: "Selected area hashes",
        type: "string",
        role: "text",
        read: true,
        write: true,
        def: "",
    });
    await ensureState(adapter, `${baseId}.zones.startPayload`, {
        name: "Zone start payload",
        type: "string",
        role: "json",
        read: true,
        write: true,
        def: "",
    });
    for (const action of ["startSelected", "startAll", "syncMap", "syncAreaNames", "syncPlans"]) {
        await ensureState(adapter, `${baseId}.zones.${action}`, {
            name: action,
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

async function ensureDynamicState(
    adapter: ioBroker.Adapter,
    baseId: string,
    channel: "capabilities" | "diagnostics" | "configuration" | "configurationLimits",
    key: string,
    value: Primitive,
): Promise<void> {
    const channelPrefix = channel === "configurationLimits" ? "configuration.limits" : channel;
    const id = `${baseId}.${channelPrefix}.${toDynamicStateId(key)}`;
    const writable = channel === "configuration" && isWritableConfigurationKey(key);
    await ensureState(adapter, id, {
        name: key,
        type: inferType(value),
        role:
            typeof value === "number"
                ? writable
                    ? "level"
                    : "value"
                : typeof value === "boolean"
                  ? writable
                      ? "switch"
                      : "indicator"
                  : "text",
        read: true,
        write: writable,
    });
}

async function setDynamicValue(
    adapter: ioBroker.Adapter,
    baseId: string,
    channel: "capabilities" | "diagnostics" | "configuration" | "configurationLimits",
    key: string,
    value: Primitive,
): Promise<void> {
    await ensureDynamicState(adapter, baseId, channel, key, value);
    const channelPrefix = channel === "configurationLimits" ? "configuration.limits" : channel;
    await adapter.setStateChangedAsync(`${baseId}.${channelPrefix}.${toDynamicStateId(key)}`, normalizeValue(value), true);
}

async function ensureZoneObjects(
    adapter: ioBroker.Adapter,
    baseId: string,
    hash: number,
): Promise<string> {
    const zoneId = `${baseId}.zones.${toZoneChannelId(hash)}`;
    await adapter.setObjectNotExistsAsync(zoneId, {
        type: "channel",
        common: { name: `zone ${hash}` },
        native: { hash },
    });
    for (const channel of ["info", "status"]) {
        await adapter.setObjectNotExistsAsync(`${zoneId}.${channel}`, {
            type: "channel",
            common: { name: channel },
            native: {},
        });
    }
    await adapter.setObjectNotExistsAsync(`${zoneId}.config`, {
        type: "channel",
        common: { name: "config" },
        native: {},
    });
    await ensureState(adapter, `${zoneId}.info.hash`, {
        name: "Hash",
        type: "number",
        role: "value",
        read: true,
        write: false,
    });
    await ensureState(adapter, `${zoneId}.info.name`, {
        name: "Name",
        type: "string",
        role: "text",
        read: true,
        write: false,
    });
    await ensureState(adapter, `${zoneId}.status.selected`, {
        name: "Selected",
        type: "boolean",
        role: "indicator",
        read: true,
        write: false,
    });
    await ensureState(adapter, `${zoneId}.status.active`, {
        name: "Active",
        type: "boolean",
        role: "indicator",
        read: true,
        write: false,
    });
    await ensureState(adapter, `${zoneId}.status.order`, {
        name: "Order",
        type: "number",
        role: "value",
        read: true,
        write: false,
    });
    await ensureState(adapter, `${zoneId}.config.selected`, {
        name: "Selected for automation",
        type: "boolean",
        role: "switch",
        read: true,
        write: true,
        def: false,
    });
    await ensureState(adapter, `${zoneId}.config.order`, {
        name: "Automation order",
        type: "number",
        role: "level",
        read: true,
        write: true,
        def: 0,
    });
    return zoneId;
}

export async function applyDeviceSnapshot(
    adapter: ioBroker.Adapter,
    snapshot: NormalizedDeviceSnapshot,
    previous?: NormalizedDeviceSnapshot,
): Promise<void> {
    const channelId = normalizeDeviceChannelId(snapshot.id);
    const baseId = `devices.${channelId}`;

    await adapter.setStateChangedAsync(`${baseId}.info.name`, snapshot.name, true);
    await adapter.setStateChangedAsync(`${baseId}.info.deviceType`, snapshot.info.deviceType, true);
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

    for (const [key, value] of Object.entries(snapshot.capabilities)) {
        if (previous?.capabilities[key] === value) {
            continue;
        }
        await setDynamicValue(adapter, baseId, "capabilities", key, value);
    }

    for (const [key, value] of Object.entries(snapshot.diagnostics)) {
        if (previous?.diagnostics[key] === value) {
            continue;
        }
        await setDynamicValue(adapter, baseId, "diagnostics", key, value);
    }

    for (const [key, value] of Object.entries(snapshot.configuration)) {
        if (previous?.configuration[key] === value) {
            continue;
        }
        await setDynamicValue(adapter, baseId, "configuration", key, value);
    }

    for (const [key, value] of Object.entries(snapshot.configurationLimits)) {
        if (previous?.configurationLimits[key] === value) {
            continue;
        }
        await setDynamicValue(adapter, baseId, "configurationLimits", key, value);
    }

    const currentAreas = snapshot.zones
        .filter((zone) => zone.selected)
        .sort((left, right) => left.order - right.order)
        .map((zone) => String(zone.hash))
        .join(",");
    await adapter.setStateChangedAsync(`${baseId}.zones.currentAreas`, currentAreas, true);

    for (const zone of snapshot.zones) {
        const zoneId = await ensureZoneObjects(adapter, baseId, zone.hash);
        await adapter.setStateChangedAsync(`${zoneId}.info.hash`, zone.hash, true);
        await adapter.setStateChangedAsync(`${zoneId}.info.name`, zone.name, true);
        await adapter.setStateChangedAsync(`${zoneId}.status.selected`, zone.selected, true);
        await adapter.setStateChangedAsync(`${zoneId}.status.active`, zone.active, true);
        await adapter.setStateChangedAsync(`${zoneId}.status.order`, zone.order, true);
    }
}
