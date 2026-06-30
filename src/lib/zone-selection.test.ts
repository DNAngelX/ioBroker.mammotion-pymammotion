import { expect } from "chai";
import {
    buildZonePreferences,
    mergeZonePreference,
    parseAreaSelection,
    serializeAreaSelection,
} from "./zone-selection";

describe("zone selection helpers", () => {
    it("parses comma separated area hashes", () => {
        expect(parseAreaSelection("101, 202;303 202")).to.deep.equal([101, 202, 303]);
    });

    it("parses JSON arrays", () => {
        expect(parseAreaSelection("[5,6,6,7]")).to.deep.equal([5, 6, 7]);
    });

    it("serializes normalized area hashes", () => {
        expect(serializeAreaSelection([9, 9, 2])).to.equal("9,2");
    });

    it("adds a selected zone at the requested order", () => {
        expect(mergeZonePreference([10, 30], 20, true, 2)).to.deep.equal([10, 20, 30]);
    });

    it("removes an unselected zone", () => {
        expect(mergeZonePreference([10, 20, 30], 20, false)).to.deep.equal([10, 30]);
    });

    it("builds per-zone preferences from selected areas", () => {
        expect(buildZonePreferences([10, 20, 30], [30, 10])).to.deep.equal([
            { hash: 10, selected: true, order: 2 },
            { hash: 20, selected: false, order: 0 },
            { hash: 30, selected: true, order: 1 },
        ]);
    });
});
