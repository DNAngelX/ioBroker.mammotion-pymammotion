"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var zone_selection_exports = {};
__export(zone_selection_exports, {
  buildZonePreferences: () => buildZonePreferences,
  mergeZonePreference: () => mergeZonePreference,
  parseAreaSelection: () => parseAreaSelection,
  serializeAreaSelection: () => serializeAreaSelection
});
module.exports = __toCommonJS(zone_selection_exports);
function normalizeAreaHashes(areaHashes) {
  return areaHashes.map((entry) => Number(entry)).filter((entry) => Number.isFinite(entry) && entry > 0).filter((entry, index, array) => array.indexOf(entry) === index);
}
function parseAreaSelection(value) {
  if (Array.isArray(value)) {
    return normalizeAreaHashes(value);
  }
  const text = String(value != null ? value : "").trim();
  if (!text) {
    return [];
  }
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return normalizeAreaHashes(parsed);
    }
  } catch {
  }
  return normalizeAreaHashes(
    text.split(/[,\s;]+/).map((entry) => Number(entry.trim()))
  );
}
function serializeAreaSelection(areaHashes) {
  return normalizeAreaHashes(areaHashes).map((entry) => String(entry)).join(",");
}
function mergeZonePreference(currentAreaHashes, zoneHash, selected, preferredOrder) {
  const normalizedCurrent = normalizeAreaHashes(currentAreaHashes);
  const normalizedHash = Number(zoneHash);
  if (!Number.isFinite(normalizedHash) || normalizedHash <= 0) {
    return normalizedCurrent;
  }
  const filtered = normalizedCurrent.filter((entry) => entry !== normalizedHash);
  if (!selected) {
    return filtered;
  }
  const order = Number(preferredOrder);
  if (!Number.isFinite(order) || order <= 0) {
    return [...filtered, normalizedHash];
  }
  const insertIndex = Math.max(0, Math.min(filtered.length, Math.trunc(order) - 1));
  filtered.splice(insertIndex, 0, normalizedHash);
  return filtered;
}
function buildZonePreferences(knownZoneHashes, selectedAreaHashes) {
  const normalizedKnown = normalizeAreaHashes(knownZoneHashes);
  const normalizedSelected = normalizeAreaHashes(selectedAreaHashes);
  return normalizedKnown.map((hash) => {
    const selectedIndex = normalizedSelected.indexOf(hash);
    return {
      hash,
      selected: selectedIndex !== -1,
      order: selectedIndex === -1 ? 0 : selectedIndex + 1
    };
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  buildZonePreferences,
  mergeZonePreference,
  parseAreaSelection,
  serializeAreaSelection
});
//# sourceMappingURL=zone-selection.js.map
