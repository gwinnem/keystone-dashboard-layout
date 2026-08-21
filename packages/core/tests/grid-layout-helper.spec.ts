// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import {describe, expect, it} from 'vitest';
import {getBottomYCoordinate} from "../src/gridlayout/helpers/grid-layout-helper";
import {TLayout} from "../src/layout-definition";
import {EErrorMessage} from "../src/common/enums/ErrorMessages";

const l1: TLayout = [
    {
        i: 0,
        h: 1,
        w: 1,
        x: 0,
        y: 0,
    },
    {
        i: 0,
        h: 1,
        w: 1,
        x: 0,
        y: 1,
    }
];

describe(`getBottomYCoordinate`, () => {
    it(`Should throw error when layout is undefined`, () => {
        expect(() => getBottomYCoordinate()).toThrowError(EErrorMessage.INVALID_LAYOUT);
    });

    it(`Should return 0 (not throw) when layout is empty`, () => {
        // Behavior change (see docs/REFACTORING.md #33): a grid with no
        // items yet has nothing occupying any row, which is 0, not an
        // error — distinct from `layout` being `undefined` entirely
        // (still genuinely invalid, see the test above).
        expect(getBottomYCoordinate([])).toBe(0);
    });

    it(`Should return 2 for the l1 layout`, () => {
        const result = getBottomYCoordinate(l1);
        expect(result).toBe(2);
    });

    it(`Should not lower the running max when a later item's own bottom edge is smaller than an earlier one's`, () => {
        // Confirmed gap via a fresh coverage report: every existing test
        // has each subsequent item extend the running max (the
        // `if(bottomY > max)` check's own true branch) -- this layout's
        // second item (bottomY: 0+1=1) is smaller than the first's
        // (bottomY: 0+3=3), exercising that check's own false branch for
        // the first time.
        const layout: TLayout = [
            { h: 3, i: 'tall', w: 1, x: 0, y: 0 },
            { h: 1, i: 'short', w: 1, x: 1, y: 0 },
        ];
        expect(getBottomYCoordinate(layout)).toBe(3);
    });
})
