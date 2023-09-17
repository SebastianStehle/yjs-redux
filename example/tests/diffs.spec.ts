import { describe, expect, it } from 'vitest';
import { applyArrayDiffs, applyObjectDiffs, calculateArrayDiffs, calculateObjectDiffs } from './../../src/diffs';

describe('Arrays', () => {
    it('should return no diffs from empty arrays', () => {
        const next: number[] = [];
        const prev: number[] = [];

        const diffs = calculateArrayDiffs(next, prev);

        expect(diffs).toEqual([]);
        expect(applyArrayDiffs(prev, diffs)).toEqual(next);
    });

    it('should return no diffs from equal arrays', () => {
        const next = [1, 2, 3];
        const prev = [1, 2, 3];

        const diffs = calculateArrayDiffs(next, prev);

        expect(diffs).toEqual([]);
        expect(applyArrayDiffs(prev, diffs)).toEqual(next);
    });

    it('should detect new array', () => {
        const next = [1, 2, 3];
        const prev: number[] = [];
        
        const diffs = calculateArrayDiffs(next, prev);

        expect(diffs).toEqual([
            {
                type: 'Insert',
                index: 0,
                values: [1, 2, 3]
            }
        ]);
        expect(applyArrayDiffs(prev, diffs)).toEqual(next);
    });

    it('should detect insert at end', () => {
        const next = [1, 2, 3, 4];
        const prev = [1, 2, 3];

        const diffs = calculateArrayDiffs(next, prev);

        expect(diffs).toEqual([
            {
                type: 'Insert',
                index: 3,
                values: [4]
            }
        ]);
    });

    it('should detect insert at start', () => {
        const next = [0, 1, 2, 3];
        const prev = [1, 2, 3];

        const diffs = calculateArrayDiffs(next, prev);

        expect(diffs).toEqual([
            {
                type: 'Insert',
                index: 0,
                values: [0]
            }
        ]);
        expect(applyArrayDiffs(prev, diffs)).toEqual(next);
    });

    it('should detect multiple inserts', () => {
        const next = [-1, 0, 1, 2, 3];
        const prev = [1, 2, 3];

        const diffs = calculateArrayDiffs(next, prev);

        expect(diffs).toEqual([
            {
                type: 'Insert',
                index: 0,
                values: [-1, 0]
            }
        ]);
        expect(applyArrayDiffs(prev, diffs)).toEqual(next);
    });

    it('should detect removal at end', () => {
        const next = [1, 2, 3];
        const prev = [1, 2, 3, 4];

        const diffs = calculateArrayDiffs(next, prev);

        expect(diffs).toEqual([
            {
                type: 'Remove',
                index: 3,
                count: 1
            }
        ]);
    });

    it('should detect removal at start', () => {
        const next = [1, 2, 3];
        const prev = [0, 1, 2, 3];

        const diffs = calculateArrayDiffs(next, prev);

        expect(diffs).toEqual([
            {
                type: 'Remove',
                index: 0,
                count: 1
            }
        ]);
        expect(applyArrayDiffs(prev, diffs)).toEqual(next);
    });

    it('should detect multiple removals', () => {
        const next = [1, 2, 3];
        const prev = [-1, 0, 1, 2, 3];

        const diffs = calculateArrayDiffs(next, prev);

        expect(diffs).toEqual([
            {
                type: 'Remove',
                index: 0,
                count: 2
            }
        ]);
        expect(applyArrayDiffs(prev, diffs)).toEqual(next);
    });

    it('should detect changed item', () => {
        const next = [1, 4, 3];
        const prev = [1, 2, 3];

        const diffs = calculateArrayDiffs(next, prev);

        expect(diffs).toEqual([
            {
                type: 'Replace',
                index: 1,
                value: 4,
                oldValue: 2,
                oldIndex: 1,
            }
        ]);
        expect(applyArrayDiffs(prev, diffs)).toEqual(next);
    });

    it('should detect removal and insert 1', () => {
        const next = [1, 4, 5, 7, 8, 6];
        const prev = [1, 2, 3, 4, 5, 6];

        const diffs = calculateArrayDiffs(next, prev);

        expect(diffs).toEqual([
            {
                type: 'Remove',
                index: 1,
                count: 2
            },
            {
                type: 'Insert',
                index: 3,
                values: [7, 8]
            }
        ]);
        expect(applyArrayDiffs(prev, diffs)).toEqual(next);
    });

    it('should detect removal and insert 2', () => {
        const next = [1, 2, 3, 4, 5, 6];
        const prev = [1, 4, 5, 7, 8, 6];

        const diffs = calculateArrayDiffs(next, prev);

        expect(diffs).toEqual([
            {
                type: 'Insert',
                index: 1,
                values: [2, 3]
            },
            {
                type: 'Remove',
                index: 5,
                count: 2
            }
        ]);
        expect(applyArrayDiffs(prev, diffs)).toEqual(next);
    });
});

describe('Objects', () => {
    it('should return no diffs from empty objects', () => {
        const next = {};
        const prev = {};

        const diffs = calculateObjectDiffs(next, prev);

        expect(diffs).toEqual([]);
        expect(applyObjectDiffs(prev, diffs)).toEqual(next);
    });

    it('should return no diffs from equal objects', () => {
        const next = { a: 1, b: 2, c: 3 };
        const prev = { a: 1, b: 2, c: 3 };

        const diffs = calculateObjectDiffs(next, prev);

        expect(diffs).toEqual([]);
        expect(applyObjectDiffs(prev, diffs)).toEqual(next);
    });

    it('should detect added value', () => {
        const next = { a: 1, b: 2, c: 3 };
        const prev = { a: 1, b: 2 };

        const diffs = calculateObjectDiffs(next, prev);

        expect(diffs).toEqual([
            {
                type: 'Add',
                key: 'c',
                value: 3
            }
        ]);
        expect(applyObjectDiffs(prev, diffs)).toEqual(next);
    });

    it('should detect removed value', () => {
        const next = { a: 1, b: 2 };
        const prev = { a: 1, b: 2, c: 3 };

        const diffs = calculateObjectDiffs(next, prev);

        expect(diffs).toEqual([
            {
                type: 'Remove',
                key: 'c'
            }
        ]);
        expect(applyObjectDiffs(prev, diffs)).toEqual(next);
    });

    it('should detect replaced value', () => {
        const next = { a: 1, b: 4, c: 3 };
        const prev = { a: 1, b: 2, c: 3 };

        const diffs = calculateObjectDiffs(next, prev);

        expect(diffs).toEqual([
            {
                type: 'Replace',
                key: 'b',
                value: 4,
                oldValue: 2
            }
        ]);
        expect(applyObjectDiffs(prev, diffs)).toEqual(next);
    });
});