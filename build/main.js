"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var utils = __toESM(require("@iobroker/adapter-core"));
var import_promises = __toESM(require("node:fs/promises"));
var import_node_path = __toESM(require("node:path"));
var import_object_model = require("./lib/object-model");
var import_bootstrap = require("./lib/bootstrap");
var import_pymammotion_metadata = require("./lib/pymammotion-metadata");
var import_sidecar_client = require("./lib/sidecar-client");
const RESTART_WINDOW_MS = 10 * 60 * 1e3;
const RESTART_LIMIT = 5;
const RESTART_BACKOFF_BASE_MS = 2e3;
const RESTART_BACKOFF_MAX_MS = 6e4;
class MammotionPyMammotion extends utils.Adapter {
  sidecar = null;
  deviceSnapshots = /* @__PURE__ */ new Map();
  deviceChannels = /* @__PURE__ */ new Map();
  sidecarStopRequested = false;
  restartTimer;
  restartAttempt = 0;
  restartHistory = [];
  bootstrappedPython = "";
  constructor(options = {}) {
    super({
      ...options,
      name: "mammotion-pymammotion"
    });
    this.on("ready", this.onReady.bind(this));
    this.on("stateChange", this.onStateChange.bind(this));
    this.on("unload", this.onUnload.bind(this));
  }
  async onReady() {
    await (0, import_object_model.ensureBaseObjects)(this);
    await this.resetInfoStates();
    await this.subscribeStatesAsync("devices.*.commands.*");
    await this.subscribeStatesAsync("diagnostics.*");
    try {
      const instanceDataDir = utils.getAbsoluteInstanceDataDir(this);
      const python = await (0, import_bootstrap.bootstrapPythonEnvironment)({
        adapterDir: this.adapterDir,
        instanceDataDir,
        preferredPython: this.config.pythonExecutable || void 0,
        bootstrapOnStart: this.config.bootstrapOnStart !== false,
        log: this.log
      });
      this.bootstrappedPython = python;
      await this.setStateChangedAsync("info.pythonReady", true, true);
      await this.updatePythonAndPymammotionInfo(python);
      await this.startSidecar();
    } catch (error) {
      await this.handleFatalError(error, "Python bootstrap failed");
    }
  }
  async onUnload(callback) {
    this.sidecarStopRequested = true;
    try {
      if (this.restartTimer) {
        this.clearTimeout(this.restartTimer);
        this.restartTimer = void 0;
      }
      if (this.sidecar) {
        await this.sidecar.shutdown().catch(() => void 0);
        await this.sidecar.stop().catch(() => void 0);
        this.sidecar = null;
      }
    } finally {
      callback();
    }
  }
  async resetInfoStates() {
    await this.setStateChangedAsync("info.connection", false, true);
    await this.setStateChangedAsync("info.sidecarReady", false, true);
    await this.setStateChangedAsync("info.pythonReady", false, true);
    await this.setStateChangedAsync("info.authenticated", false, true);
    await this.setStateChangedAsync("info.lastError", "", true);
    await this.setStateChangedAsync("info.lastSync", "", true);
    await this.setStateChangedAsync("info.pythonVersion", "", true);
    await this.setStateChangedAsync("info.pymammotionVersion", "", true);
    await this.setStateChangedAsync("info.pymammotionLatestVersion", "", true);
    await this.setStateChangedAsync("info.pymammotionLatestCompatibleVersion", "", true);
    await this.setStateChangedAsync("info.pymammotionLatestRequiresPython", "", true);
    await this.setStateChangedAsync("info.pymammotionPinnedRequiresPython", "", true);
    await this.setStateChangedAsync("info.pymammotionUpdateAvailable", false, true);
    await this.setStateChangedAsync("info.pythonUpgradeRequired", false, true);
    await this.setStateChangedAsync("info.lastLoginCode", 0, true);
    await this.setStateChangedAsync("info.lastLoginMessage", "", true);
  }
  async updatePythonAndPymammotionInfo(pythonExecutable) {
    const pythonVersionInfo = await (0, import_bootstrap.detectPythonVersion)(pythonExecutable);
    const pythonVersion = pythonVersionInfo ? `${pythonVersionInfo.major}.${pythonVersionInfo.minor}.${pythonVersionInfo.patch}` : "";
    await this.setStateChangedAsync("info.pythonVersion", pythonVersion, true);
    if (!pythonVersion) {
      return;
    }
    try {
      const metadata = await (0, import_pymammotion_metadata.checkPymammotionUpdates)(this.adapterDir, `${pythonVersionInfo == null ? void 0 : pythonVersionInfo.major}.${pythonVersionInfo == null ? void 0 : pythonVersionInfo.minor}`);
      await this.setStateChangedAsync("info.pymammotionVersion", metadata.pinnedVersion, true);
      await this.setStateChangedAsync("info.pymammotionLatestVersion", metadata.latestVersion, true);
      await this.setStateChangedAsync("info.pymammotionLatestCompatibleVersion", metadata.latestCompatibleVersion, true);
      await this.setStateChangedAsync("info.pymammotionLatestRequiresPython", metadata.latestRequiresPython, true);
      await this.setStateChangedAsync("info.pymammotionPinnedRequiresPython", metadata.pinnedRequiresPython, true);
      await this.setStateChangedAsync("info.pymammotionUpdateAvailable", metadata.updateAvailable, true);
      await this.setStateChangedAsync("info.pythonUpgradeRequired", metadata.pythonUpgradeRequired, true);
      if (metadata.updateAvailable) {
        this.log.info(
          `PyMammotion update info: pinned=${metadata.pinnedVersion}, latest=${metadata.latestVersion}, latestCompatible=${metadata.latestCompatibleVersion}`
        );
      }
      if (metadata.pythonUpgradeRequired) {
        this.log.warn(
          `Latest PyMammotion ${metadata.latestVersion} requires Python ${metadata.latestRequiresPython}; current Python is ${metadata.pythonVersion}`
        );
      }
    } catch (error) {
      this.log.debug(`PyMammotion metadata check failed: ${String(error)}`);
    }
  }
  async startSidecar() {
    const sidecar = new import_sidecar_client.SidecarClient({
      pythonExecutable: this.bootstrappedPython,
      scriptPath: import_node_path.default.join(this.adapterDir, "python-daemon", "sidecar.py"),
      workingDirectory: this.adapterDir,
      namespace: this.namespace,
      log: this.log
    });
    this.sidecar = sidecar;
    this.sidecarStopRequested = false;
    this.attachSidecarHandlers(sidecar);
    await sidecar.start();
    await sidecar.health();
    await sidecar.bootstrap({
      instance_data_dir: utils.getAbsoluteInstanceDataDir(this),
      sidecar_log_level: this.config.sidecarLogLevel || "info",
      adapter_version: this.version || "0.0.0"
    });
    await this.setStateChangedAsync("info.sidecarReady", true, true);
    if (!this.config.email || !this.config.password) {
      const message = "Missing Mammotion credentials in adapter configuration";
      this.log.warn(message);
      await this.setStateChangedAsync("info.authenticated", false, true);
      await this.setStateChangedAsync("info.connection", false, true);
      await this.setStateChangedAsync("info.lastError", message, true);
      this.restartAttempt = 0;
      return;
    }
    const cachePath = import_node_path.default.join(utils.getAbsoluteInstanceDataDir(this), "pymammotion-cache.json");
    const loginResult = await sidecar.loginOrRestore({
      account: this.config.email,
      password: this.config.password,
      cache_path: cachePath,
      sidecar_log_level: this.config.sidecarLogLevel || "info"
    });
    await this.setStateChangedAsync("info.authenticated", Boolean(loginResult.authenticated), true);
    await this.refreshDeviceList();
    this.restartAttempt = 0;
    await this.setStateChangedAsync("info.lastError", "", true);
  }
  attachSidecarHandlers(sidecar) {
    sidecar.on("notification", (message) => {
      void this.handleNotification(message.method, message.params).catch((error) => {
        this.log.warn(`Failed to process sidecar notification ${message.method}: ${String(error)}`);
      });
    });
    sidecar.on("stderr", (line) => {
      this.log.debug(`[sidecar-stderr] ${line}`);
    });
    sidecar.on("exit", ({ code, signal }) => {
      void this.handleSidecarExit(code, signal);
    });
  }
  async handleSidecarExit(code, signal) {
    await this.setStateChangedAsync("info.sidecarReady", false, true);
    await this.setStateChangedAsync("info.connection", false, true);
    if (this.sidecarStopRequested) {
      return;
    }
    const now = Date.now();
    this.restartHistory.push(now);
    while (this.restartHistory.length && now - this.restartHistory[0] > RESTART_WINDOW_MS) {
      this.restartHistory.shift();
    }
    if (this.restartHistory.length >= RESTART_LIMIT) {
      await this.handleFatalError(
        new Error(`Sidecar crashed too often (code=${code != null ? code : "null"}, signal=${signal != null ? signal : "null"})`),
        "Sidecar restart limit reached"
      );
      return;
    }
    const delay = Math.min(RESTART_BACKOFF_BASE_MS * 2 ** this.restartAttempt, RESTART_BACKOFF_MAX_MS);
    this.restartAttempt += 1;
    this.log.warn(`Sidecar exited unexpectedly. Restarting in ${delay} ms.`);
    this.restartTimer = this.setTimeout(() => {
      this.restartTimer = void 0;
      void this.restartSidecar();
    }, delay);
  }
  async restartSidecar() {
    if (this.sidecarStopRequested) {
      return;
    }
    try {
      if (this.sidecar) {
        await this.sidecar.stop().catch(() => void 0);
        this.sidecar = null;
      }
      await this.startSidecar();
    } catch (error) {
      await this.handleFatalError(error, "Sidecar restart failed");
    }
  }
  async refreshDeviceList() {
    if (!this.sidecar) {
      return;
    }
    const devices = await this.sidecar.listDevices();
    for (const deviceId of devices.devices) {
      const snapshotResult = await this.sidecar.getSnapshot({ device_id: deviceId });
      if (snapshotResult.snapshot) {
        await this.applySnapshot(snapshotResult.snapshot);
      }
    }
  }
  async handleNotification(method, params) {
    switch (method) {
      case "ready": {
        await this.setStateChangedAsync("info.sidecarReady", true, true);
        break;
      }
      case "auth_state": {
        const payload = params;
        await this.setStateChangedAsync("info.authenticated", payload.authenticated, true);
        if (!payload.authenticated && payload.message) {
          await this.setStateChangedAsync("info.lastError", payload.message, true);
        }
        break;
      }
      case "device_discovered": {
        const payload = params;
        await this.ensureDeviceRegistration(payload.device_id, payload.name || payload.device_id);
        break;
      }
      case "device_snapshot": {
        const payload = params;
        await this.applySnapshot(payload.snapshot);
        break;
      }
      case "device_online": {
        const payload = params;
        await this.updateDeviceConnection(payload.device_id, payload.online);
        break;
      }
      case "command_result": {
        const payload = params;
        if (!payload.ok && payload.message) {
          await this.setStateChangedAsync("info.lastError", payload.message, true);
        }
        break;
      }
      case "log": {
        const payload = params;
        this.forwardSidecarLog(payload.level, payload.message);
        break;
      }
      case "error": {
        const payload = params;
        await this.setStateChangedAsync("info.lastError", payload.message, true);
        this.log.warn(`[sidecar-error] ${payload.message}`);
        break;
      }
    }
  }
  forwardSidecarLog(level, message) {
    switch (level) {
      case "debug":
        this.log.debug(`[sidecar] ${message}`);
        break;
      case "warning":
        this.log.warn(`[sidecar] ${message}`);
        break;
      case "error":
        this.log.error(`[sidecar] ${message}`);
        break;
      default:
        this.log.info(`[sidecar] ${message}`);
        break;
    }
  }
  async ensureDeviceRegistration(deviceId, name) {
    const channelId = (0, import_object_model.normalizeDeviceChannelId)(deviceId);
    this.deviceChannels.set(channelId, deviceId);
    await (0, import_object_model.ensureDeviceObjects)(this, {
      id: deviceId,
      channelId,
      name
    });
  }
  async applySnapshot(snapshot) {
    const previous = this.deviceSnapshots.get(snapshot.id);
    await this.ensureDeviceRegistration(snapshot.id, snapshot.name);
    await (0, import_object_model.applyDeviceSnapshot)(this, snapshot, previous);
    this.deviceSnapshots.set(snapshot.id, snapshot);
    await this.setStateChangedAsync("info.lastSync", (/* @__PURE__ */ new Date()).toISOString(), true);
    await this.updateConnectionState();
  }
  async updateDeviceConnection(deviceId, online) {
    const snapshot = this.deviceSnapshots.get(deviceId);
    if (!snapshot) {
      return;
    }
    const updated = {
      ...snapshot,
      status: {
        ...snapshot.status,
        online
      }
    };
    await this.applySnapshot(updated);
  }
  async updateConnectionState() {
    const anyOnline = [...this.deviceSnapshots.values()].some((snapshot) => snapshot.status.online);
    await this.setStateChangedAsync("info.connection", anyOnline, true);
  }
  onStateChange(id, state) {
    if (!state || state.ack !== false) {
      return;
    }
    if (id === `${this.namespace}.diagnostics.testLogin`) {
      void this.runDiagnosticLogin("diagnostics.testLogin");
      return;
    }
    if (id === `${this.namespace}.diagnostics.clearCache`) {
      void this.clearSessionCache("diagnostics.clearCache");
      return;
    }
    const parsed = this.parseCommandId(id);
    if (!parsed) {
      return;
    }
    if (state.val !== true) {
      void this.setStateChangedAsync(parsed.stateId, false, true);
      return;
    }
    void this.executeCommand(parsed.deviceId, parsed.command, parsed.stateId);
  }
  parseCommandId(id) {
    var _a;
    const localId = id.replace(`${this.namespace}.`, "");
    const match = localId.match(/^devices\.([^.]+)\.commands\.(start|pause|stop|dock|refresh)$/);
    if (!match) {
      return null;
    }
    const deviceId = (_a = this.deviceChannels.get(match[1])) != null ? _a : match[1];
    return {
      deviceId,
      command: match[2],
      stateId: localId
    };
  }
  async executeCommand(deviceId, command, stateId) {
    try {
      if (!this.sidecar) {
        throw new Error("Sidecar is not running");
      }
      await this.sidecar.sendCommand({ device_id: deviceId, command });
      if (command === "refresh") {
        const snapshotResult = await this.sidecar.getSnapshot({ device_id: deviceId });
        if (snapshotResult.snapshot) {
          await this.applySnapshot(snapshotResult.snapshot);
        }
      }
    } catch (error) {
      await this.setStateChangedAsync("info.lastError", String(error), true);
      this.log.warn(`Command ${command} failed for ${deviceId}: ${String(error)}`);
    } finally {
      await this.setStateChangedAsync(stateId, false, true);
    }
  }
  async runDiagnosticLogin(stateId) {
    try {
      if (!this.sidecar) {
        throw new Error("Sidecar is not running");
      }
      if (!this.config.email || !this.config.password) {
        throw new Error("Missing Mammotion credentials in adapter configuration");
      }
      const result = await this.sidecar.diagnosticLogin({
        account: this.config.email,
        password: this.config.password
      });
      await this.setStateChangedAsync("info.lastLoginCode", result.code, true);
      await this.setStateChangedAsync("info.lastLoginMessage", result.message, true);
      if (!result.ok) {
        await this.setStateChangedAsync("info.lastError", `Diagnostic login failed: ${result.message}`, true);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.setStateChangedAsync("info.lastLoginMessage", message, true);
      await this.setStateChangedAsync("info.lastError", `Diagnostic login failed: ${message}`, true);
    } finally {
      await this.setStateChangedAsync(stateId, false, true);
    }
  }
  async clearSessionCache(stateId) {
    try {
      const cachePath = import_node_path.default.join(utils.getAbsoluteInstanceDataDir(this), "pymammotion-cache.json");
      await import_promises.default.rm(cachePath, { force: true });
      await this.setStateChangedAsync("info.lastError", "", true);
      await this.setStateChangedAsync("info.lastLoginMessage", "Session cache cleared", true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.setStateChangedAsync("info.lastError", `Clear cache failed: ${message}`, true);
    } finally {
      await this.setStateChangedAsync(stateId, false, true);
    }
  }
  async handleFatalError(error, prefix) {
    const message = error instanceof Error ? error.message : String(error);
    this.log.error(`${prefix}: ${message}`);
    await this.setStateChangedAsync("info.lastError", `${prefix}: ${message}`, true);
    await this.setStateChangedAsync("info.connection", false, true);
    await this.setStateChangedAsync("info.sidecarReady", false, true);
  }
}
if (require.main !== module) {
  module.exports = (options) => new MammotionPyMammotion(options);
} else {
  (() => new MammotionPyMammotion())();
}
//# sourceMappingURL=main.js.map
