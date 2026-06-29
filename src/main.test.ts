import { expect } from "chai";
import {
    getPythonExecutableCandidates,
    getVirtualEnvPaths,
    isSupportedPythonVersion,
    parsePythonVersion,
} from "./lib/bootstrap";
import { normalizeDeviceChannelId } from "./lib/object-model";
import { satisfiesRequiresPython } from "./lib/pymammotion-metadata";

describe("bootstrap helpers", () => {
    it("accepts python 3.13", () => {
        const version = parsePythonVersion("Python 3.13.1", "python3.13");
        expect(isSupportedPythonVersion(version)).to.equal(true);
    });

    it("rejects python 3.12", () => {
        const version = parsePythonVersion("Python 3.12.9", "python3.12");
        expect(isSupportedPythonVersion(version)).to.equal(false);
    });

    it("builds deterministic venv paths", () => {
        const paths = getVirtualEnvPaths("/tmp/mammotion.0");
        expect(paths.root).to.include("python-sidecar");
        expect(paths.python).to.match(/python/);
    });

    it("expands a Homebrew prefix directory to executables", () => {
        const candidates = getPythonExecutableCandidates("/usr/local/opt/python@3.12", "darwin");
        expect(candidates).to.include("/usr/local/opt/python@3.12/bin/python3.12");
    });

    it("keeps an explicitly configured executable first", () => {
        const candidates = getPythonExecutableCandidates("/custom/python3.12", "linux");
        expect(candidates[0]).to.equal("/custom/python3.12");
    });

    it("evaluates simple Python version specifiers", () => {
        expect(satisfiesRequiresPython("3.13", "<3.15,>=3.13")).to.equal(true);
        expect(satisfiesRequiresPython("3.12", "<3.15,>=3.13")).to.equal(false);
    });
});

describe("object model helpers", () => {
    it("normalizes device ids for ioBroker channels", () => {
        expect(normalizeDeviceChannelId("Luba Mini/1")).to.equal("Luba_Mini_1");
    });
});
