/* eslint-disable no-prototype-builtins */
type ArrayDiff<T> = ArrayInsertDiff<T> | ArrayRemoveDiff | ArrayReplaceDiff<T>;

type ArrayBaseDiff = { index: number };

type ArrayInsertDiff<T> = { type: 'Insert', values: T[]; } & ArrayBaseDiff;

type ArrayRemoveDiff = { type: 'Remove', count: number } & ArrayBaseDiff;

type ArrayReplaceDiff<T> = { type: 'Replace', value: T, oldValue: T, oldIndex: number } & ArrayBaseDiff;

type Equality<T> = (lhs: T, rhs: T) => boolean;

const DEFAULT_EQUALITY: Equality<unknown> = (lhs, rhs) => lhs === rhs;

export function calculateArrayDiffs<T>(current: ReadonlyArray<T>, previous: ReadonlyArray<T>, equality?: (lhs: T, rhs: T) => boolean): ArrayDiff<T>[] {
    const diffs: ArrayDiff<T>[] = [];
    
    let indexCurrent = 0;
    let indexPrevious = 0;
    let indexDiff = 0;

    equality ||= DEFAULT_EQUALITY;

    while (indexCurrent < current.length && indexPrevious < previous.length) {
        const valueCurrent = current[indexCurrent];
        const valuePrevious = previous[indexPrevious];

        if (valueCurrent !== valuePrevious) {
            let insertDetected = false;

            for (let currentCandidate = indexCurrent + 1; currentCandidate < current.length; currentCandidate++) {
                const nextCurrent = current[currentCandidate];

                if (equality(nextCurrent, valuePrevious)) {
                    for (let i = indexCurrent; i < currentCandidate; i++) {
                        const value = current[i];

                        const previousDiff = diffs[diffs.length - 1];
                
                        // Consecutive inserts have increasing index.
                        if (previousDiff?.type === 'Insert' && previousDiff.index === indexDiff - 1) {
                            previousDiff.values.push(value);
                        } else {
                            diffs.push({ type: 'Insert', values: [value], index: indexDiff });
                        }
                
                        indexCurrent++;
                        indexDiff++;
                    }

                    insertDetected = true;
                    break;
                }
            }

            if (insertDetected) {
                continue;
            }

            let removeDetected = false;

            for (let previousCandidate = indexPrevious + 1; previousCandidate < previous.length; previousCandidate++) {
                const nextPrevious = previous[previousCandidate];

                if (equality(nextPrevious, valueCurrent)) {
                    for (let i = indexPrevious; i < previousCandidate; i++) {
                        const previousDiff = diffs[diffs.length - 1];
                
                        // Consecutive removes have the same index.
                        if (previousDiff?.type === 'Remove' && previousDiff.index === indexDiff) {
                            previousDiff.count++;
                        } else {
                            diffs.push({ type: 'Remove', count: 1, index: indexDiff });
                        }

                        indexPrevious++;
                    }

                    removeDetected = true;
                    break;
                }
            }

            if (removeDetected) {
                continue;
            }

            diffs.push({ type: 'Replace', index: indexPrevious, value: valueCurrent, oldValue: valuePrevious, oldIndex: indexPrevious });
        }

        indexCurrent++;
        indexPrevious++;
        indexDiff++;
    }

    if (indexCurrent < current.length) {
        diffs.push({ type: 'Insert', index: indexCurrent, values: current.slice(indexCurrent) });
    }

    if (indexPrevious < previous.length) {
        diffs.push({ type: 'Remove', index: indexPrevious, count: previous.length - indexPrevious });
    }

    return diffs;
}

export function applyArrayDiffs<T>(source: T[], diffs: ArrayDiff<T>[]) {
    const result = [...source];

    for (const diff of diffs) {
        if (diff.type === 'Insert') {
            result.splice(diff.index, 0, ...diff.values); 
        } else if (diff.type === 'Remove') {
            result.splice(diff.index, diff.count);
        } else {
            result[diff.index] = diff.value;
        }
    }

    return result;
}

type ObjectDiff<T> = ObjectAddDiff<T> | ObjectRemoveDiff | ObjectReplaceDiff<T>;

type ObjectBaseDiff = { key: string };

type ObjectAddDiff<T> = { type: 'Add', value: T; } & ObjectBaseDiff;

type ObjectRemoveDiff = { type: 'Remove' } & ObjectBaseDiff;

type ObjectReplaceDiff<T> = { type: 'Replace', value: T, oldValue: T } & ObjectBaseDiff;

export function calculateObjectDiffs<T>(current: Record<string, T>, previous: Record<string, T>): ObjectDiff<T>[] {
    const diffs: ObjectDiff<T>[] = [];

    for (const [key, valueCurrent] of Object.entries(current)) {
        if (!previous.hasOwnProperty(key)) {
            diffs.push({ type: 'Add', key, value: valueCurrent });
            continue;
        }

        const valuePrevious = previous[key];

        if (valueCurrent !== valuePrevious) {
            diffs.push({ type: 'Replace', key, value: valueCurrent, oldValue: valuePrevious });
        }
    }

    for (const key of Object.keys(previous)) {
        if (!current.hasOwnProperty(key)) {
            diffs.push({ type: 'Remove', key });
        }
    }

    return diffs;
}

export function applyObjectDiffs<T>(source: Record<string, T>, diffs: ObjectDiff<T>[]) {
    const result = { ...source };

    for (const diff of diffs) {
        if (diff.type === 'Add') {
            result[diff.key] = diff.value;
        } else if (diff.type === 'Replace') {
            result[diff.key] = diff.value;
        } else {
            delete result[diff.key];
        }
    }

    return result;
}
