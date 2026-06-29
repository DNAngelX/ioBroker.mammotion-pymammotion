export type Primitive = string | number | boolean | null;

export type SidecarCommand = "start" | "pause" | "stop" | "dock" | "refresh";

export interface NormalizedDeviceSnapshot {
    id: string;
    name: string;
    info: {
        productKey: string;
        firmwareVersion: string;
        model: string;
        serialNumber: string;
        mqttTransport: string;
    };
    status: {
        online: boolean;
        enabled: boolean;
        connectionState: string;
        activity: string;
        state: string;
    };
    telemetry: Record<string, Primitive>;
}

export interface JsonRpcRequest<TParams = unknown> {
    id: number;
    method: string;
    params?: TParams;
}

export interface JsonRpcResponse<TResult = unknown> {
    id: number;
    result?: TResult;
    error?: {
        code: number;
        message: string;
    };
}

export interface JsonRpcNotification<TParams = unknown> {
    method: string;
    params?: TParams;
}

export interface SidecarBootstrapParams {
    instance_data_dir: string;
    sidecar_log_level: string;
    adapter_version: string;
}

export interface SidecarBootstrapResult {
    adapter: string;
    version: string;
}

export interface SidecarHealthResult {
    ok: boolean;
    python_version: string;
}

export interface SidecarLoginParams {
    account: string;
    password: string;
    cache_path: string;
    sidecar_log_level: string;
}

export interface SidecarLoginResult {
    authenticated: boolean;
    devices: string[];
}

export interface SidecarDiagnosticLoginParams {
    account: string;
    password: string;
}

export interface SidecarDiagnosticLoginResult {
    ok: boolean;
    code: number;
    message: string;
}

export interface SidecarListDevicesResult {
    devices: string[];
}

export interface SidecarGetSnapshotParams {
    device_id: string;
}

export interface SidecarGetSnapshotResult {
    snapshot: NormalizedDeviceSnapshot | null;
}

export interface SidecarSendCommandParams {
    device_id: string;
    command: SidecarCommand;
}

export interface SidecarCommandResult {
    ok: boolean;
    device_id: string;
    command: SidecarCommand;
    message?: string;
}

export interface SidecarNotificationMap {
    ready: { version: string };
    auth_state: { authenticated: boolean; message?: string };
    device_discovered: { device_id: string; name: string };
    device_snapshot: { snapshot: NormalizedDeviceSnapshot };
    device_online: { device_id: string; online: boolean };
    command_result: SidecarCommandResult;
    log: { level: string; message: string };
    error: { message: string };
}
