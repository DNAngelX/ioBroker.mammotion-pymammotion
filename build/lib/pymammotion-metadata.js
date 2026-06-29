"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var pymammotion_metadata_exports = {};
__export(pymammotion_metadata_exports, {
  checkPymammotionUpdates: () => checkPymammotionUpdates,
  satisfiesRequiresPython: () => satisfiesRequiresPython
});
module.exports = __toCommonJS(pymammotion_metadata_exports);
var import_promises = __toESM(require("node:fs/promises"));
var import_node_path = __toESM(require("node:path"));
function parseVersionParts(version) {
  if (!/^\d+(\.\d+)*$/.test(version)) {
    return null;
  }
  return version.split(".").map((part) => Number(part));
}
function compareVersions(left, right) {
  var _a, _b;
  const leftParts = parseVersionParts(left);
  const rightParts = parseVersionParts(right);
  if (!leftParts || !rightParts) {
    return left.localeCompare(right);
  }
  const maxLength = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < maxLength; index += 1) {
    const leftValue = (_a = leftParts[index]) != null ? _a : 0;
    const rightValue = (_b = rightParts[index]) != null ? _b : 0;
    if (leftValue !== rightValue) {
      return leftValue - rightValue;
    }
  }
  return 0;
}
function comparePythonVersions(left, right) {
  return compareVersions(left, right);
}
function satisfiesSpecifier(pythonVersion, specifier) {
  const trimmed = specifier.trim();
  if (!trimmed) {
    return true;
  }
  const match = trimmed.match(/^(<=|>=|<|>|==|!=)\s*(\d+(?:\.\d+)*)$/);
  if (!match) {
    return true;
  }
  const operator = match[1];
  const version = match[2];
  const comparison = comparePythonVersions(pythonVersion, version);
  switch (operator) {
    case "<":
      return comparison < 0;
    case "<=":
      return comparison <= 0;
    case ">":
      return comparison > 0;
    case ">=":
      return comparison >= 0;
    case "==":
      return comparison === 0;
    case "!=":
      return comparison !== 0;
    default:
      return true;
  }
}
function satisfiesRequiresPython(pythonVersion, requiresPython) {
  if (!requiresPython) {
    return true;
  }
  return requiresPython.split(",").map((specifier) => specifier.trim()).filter((specifier) => specifier.length > 0).every((specifier) => satisfiesSpecifier(pythonVersion, specifier));
}
async function readPinnedPymammotionVersion(adapterDir) {
  const requirementsPath = import_node_path.default.join(adapterDir, "python-daemon", "requirements.txt");
  const content = await import_promises.default.readFile(requirementsPath, "utf8");
  const line = content.split(/\r?\n/u).map((entry) => entry.trim()).find((entry) => entry.startsWith("pymammotion=="));
  if (!line) {
    throw new Error("Pinned pymammotion version not found in requirements.txt");
  }
  return line.split("==")[1];
}
async function fetchPyPiMetadata() {
  const response = await fetch("https://pypi.org/pypi/pymammotion/json");
  if (!response.ok) {
    throw new Error(`PyPI metadata request failed with status ${response.status}`);
  }
  return await response.json();
}
async function checkPymammotionUpdates(adapterDir, pythonVersion) {
  var _a, _b;
  const pinnedVersion = await readPinnedPymammotionVersion(adapterDir);
  const metadata = await fetchPyPiMetadata();
  const latestVersion = metadata.info.version;
  const latestRequiresPython = metadata.info.requires_python || "";
  const pinnedRequiresPython = ((_b = (_a = metadata.releases[pinnedVersion]) == null ? void 0 : _a[0]) == null ? void 0 : _b.requires_python) || "";
  const compatibleVersions = Object.entries(metadata.releases).filter(([version, files]) => parseVersionParts(version) && files.length > 0).filter(([, files]) => {
    var _a2;
    return satisfiesRequiresPython(pythonVersion, (_a2 = files[0]) == null ? void 0 : _a2.requires_python);
  }).map(([version]) => version).sort(compareVersions);
  const latestCompatibleVersion = compatibleVersions[compatibleVersions.length - 1] || pinnedVersion;
  return {
    packageName: "pymammotion",
    pinnedVersion,
    latestVersion,
    latestRequiresPython,
    pinnedRequiresPython,
    latestCompatibleVersion,
    pythonVersion,
    updateAvailable: compareVersions(latestVersion, pinnedVersion) > 0,
    pythonUpgradeRequired: !satisfiesRequiresPython(pythonVersion, latestRequiresPython)
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  checkPymammotionUpdates,
  satisfiesRequiresPython
});
//# sourceMappingURL=pymammotion-metadata.js.map
