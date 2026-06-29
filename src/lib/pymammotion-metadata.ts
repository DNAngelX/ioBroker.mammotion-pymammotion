import fs from "node:fs/promises";
import path from "node:path";

export interface PymammotionUpdateInfo {
    packageName: string;
    pinnedVersion: string;
    latestVersion: string;
    latestRequiresPython: string;
    pinnedRequiresPython: string;
    latestCompatibleVersion: string;
    pythonVersion: string;
    updateAvailable: boolean;
    pythonUpgradeRequired: boolean;
}

interface PyPiReleaseFile {
    requires_python?: string;
}

interface PyPiResponse {
    info: {
        version: string;
        requires_python?: string;
    };
    releases: Record<string, PyPiReleaseFile[]>;
}

function parseVersionParts(version: string): number[] | null {
    if (!/^\d+(\.\d+)*$/.test(version)) {
        return null;
    }
    return version.split(".").map((part) => Number(part));
}

function compareVersions(left: string, right: string): number {
    const leftParts = parseVersionParts(left);
    const rightParts = parseVersionParts(right);
    if (!leftParts || !rightParts) {
        return left.localeCompare(right);
    }
    const maxLength = Math.max(leftParts.length, rightParts.length);
    for (let index = 0; index < maxLength; index += 1) {
        const leftValue = leftParts[index] ?? 0;
        const rightValue = rightParts[index] ?? 0;
        if (leftValue !== rightValue) {
            return leftValue - rightValue;
        }
    }
    return 0;
}

function comparePythonVersions(left: string, right: string): number {
    return compareVersions(left, right);
}

function satisfiesSpecifier(pythonVersion: string, specifier: string): boolean {
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

export function satisfiesRequiresPython(pythonVersion: string, requiresPython?: string): boolean {
    if (!requiresPython) {
        return true;
    }
    return requiresPython
        .split(",")
        .map((specifier) => specifier.trim())
        .filter((specifier) => specifier.length > 0)
        .every((specifier) => satisfiesSpecifier(pythonVersion, specifier));
}

async function readPinnedPymammotionVersion(adapterDir: string): Promise<string> {
    const requirementsPath = path.join(adapterDir, "python-daemon", "requirements.txt");
    const content = await fs.readFile(requirementsPath, "utf8");
    const line = content
        .split(/\r?\n/u)
        .map((entry) => entry.trim())
        .find((entry) => entry.startsWith("pymammotion=="));
    if (!line) {
        throw new Error("Pinned pymammotion version not found in requirements.txt");
    }
    return line.split("==")[1];
}

async function fetchPyPiMetadata(): Promise<PyPiResponse> {
    const response = await fetch("https://pypi.org/pypi/pymammotion/json");
    if (!response.ok) {
        throw new Error(`PyPI metadata request failed with status ${response.status}`);
    }
    return (await response.json()) as PyPiResponse;
}

export async function checkPymammotionUpdates(
    adapterDir: string,
    pythonVersion: string,
): Promise<PymammotionUpdateInfo> {
    const pinnedVersion = await readPinnedPymammotionVersion(adapterDir);
    const metadata = await fetchPyPiMetadata();
    const latestVersion = metadata.info.version;
    const latestRequiresPython = metadata.info.requires_python || "";
    const pinnedRequiresPython = metadata.releases[pinnedVersion]?.[0]?.requires_python || "";

    const compatibleVersions = Object.entries(metadata.releases)
        .filter(([version, files]) => parseVersionParts(version) && files.length > 0)
        .filter(([, files]) => satisfiesRequiresPython(pythonVersion, files[0]?.requires_python))
        .map(([version]) => version)
        .sort(compareVersions);

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
        pythonUpgradeRequired: !satisfiesRequiresPython(pythonVersion, latestRequiresPython),
    };
}
