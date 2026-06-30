export interface ZonePreferenceEntry {
    hash: number;
    selected: boolean;
    order: number;
}

function normalizeAreaHashes(areaHashes: number[]): number[] {
    return areaHashes
        .map((entry) => Number(entry))
        .filter((entry) => Number.isFinite(entry) && entry > 0)
        .filter((entry, index, array) => array.indexOf(entry) === index);
}

export function parseAreaSelection(value: unknown): number[] {
    if (Array.isArray(value)) {
        return normalizeAreaHashes(value as number[]);
    }

    const text = String(value ?? "").trim();
    if (!text) {
        return [];
    }

    try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
            return normalizeAreaHashes(parsed as number[]);
        }
    } catch {
        // CSV fallback
    }

    return normalizeAreaHashes(
        text
            .split(/[,\s;]+/)
            .map((entry) => Number(entry.trim())),
    );
}

export function serializeAreaSelection(areaHashes: number[]): string {
    return normalizeAreaHashes(areaHashes)
        .map((entry) => String(entry))
        .join(",");
}

export function mergeZonePreference(
    currentAreaHashes: number[],
    zoneHash: number,
    selected: boolean,
    preferredOrder?: number,
): number[] {
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

export function buildZonePreferences(
    knownZoneHashes: number[],
    selectedAreaHashes: number[],
): ZonePreferenceEntry[] {
    const normalizedKnown = normalizeAreaHashes(knownZoneHashes);
    const normalizedSelected = normalizeAreaHashes(selectedAreaHashes);

    return normalizedKnown.map((hash) => {
        const selectedIndex = normalizedSelected.indexOf(hash);
        return {
            hash,
            selected: selectedIndex !== -1,
            order: selectedIndex === -1 ? 0 : selectedIndex + 1,
        };
    });
}
