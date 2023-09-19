/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, test } from 'vitest';
import { isArray, isString } from './../lib/utils';
import { ArrayDiff, ArrayTypeResolver, DefaultSyncOptions, ObjectDiff, ObjectTypeResolver, SourceArray, SourceObject, SyncOptions, syncToYjs, TypeProperties } from './../lib';
import { testInitialSync } from './test-utils';

let id = 0;
function idGenerator() {
    return `${id++}`;
}

class ImmutableArray<T> {
    public readonly __typeName = ImmutableArray.TYPE_NAME;

    public static readonly TYPE_NAME = 'ImmutableArray';

    constructor(
        public readonly __instanceId: string,
        public readonly __generation: number,
        public readonly items: ReadonlyArray<T>,
    ) {
    }
}

class ImmutableObject<T> {
    public readonly __typeName = ImmutableObject.TYPE_NAME;

    public static readonly TYPE_NAME = 'ImmutableObject';

    constructor(
        public readonly __instanceId: string,
        public readonly __generation: number,
        public readonly values: Record<string, T>
    ) {
    }
}

class ImmutableArrayResolver<T> implements ArrayTypeResolver<ImmutableArray<T>> {
    public readonly sourceType = 'Array';

    public static readonly INSTANCE = new ImmutableArrayResolver();

    private constructor() {
    }

    public create(source: SourceArray): ImmutableArray<T> {
        return new ImmutableArray<T>(idGenerator(), 0, source as T[],);
    }

    public syncToYjs(value: ImmutableArray<T>): SourceArray {
        return value.items;
    }

    public syncToObject(existing: ImmutableArray<T>, diffs: ArrayDiff[]): ImmutableArray<T> {
        const newItems = [...existing.items];

        for (const diff of diffs) {
            if (diff.type === 'Set') {
                newItems[diff.index] = diff.value as T;
            } else if (diff.type === 'Insert') {
                newItems.splice(diff.index, 0, diff.value as T);
            } else {
                newItems.splice(diff.index, 1);
            }
        }

        return new ImmutableArray<T>(existing.__instanceId, existing.__generation + 1, newItems);
    }
}

class ImmutableObjectResolver<T> implements ObjectTypeResolver<ImmutableObject<T>> {
    public readonly sourceType = 'Object';

    public static readonly INSTANCE = new ImmutableObjectResolver();

    private constructor() {
    }

    public create(source: SourceObject): ImmutableObject<T> {
        return new ImmutableObject<T>(idGenerator(), 0, source as Record<string, any>);
    }

    public syncToYjs(value: ImmutableObject<T>): SourceObject {
        return value.values;
    }

    public syncToObject(existing: ImmutableObject<T>, diffs: ObjectDiff[]): ImmutableObject<T> {
        const newValues = { ...existing.values };

        for (const diff of diffs) {
            if (diff.type === 'Set') {
                newValues[diff.key] = diff.value as T;
            } else {
                delete newValues[diff.key];
            }
        }

        return new ImmutableObject<T>(existing.__instanceId, existing.__generation + 1, newValues);
    }
}

const options: SyncOptions = {
    ...DefaultSyncOptions,
    typeResolvers: {
        [ImmutableArray.TYPE_NAME]: ImmutableArrayResolver.INSTANCE,
        [ImmutableObject.TYPE_NAME]: ImmutableObjectResolver.INSTANCE
    },
};

describe('Redux classes', () => {
    test('should add value to empty array', () => {
        const initial = () => new ImmutableArray('1', 0, []);

        const update = new ImmutableArray('1', 1, [
            11,
        ]);

        const result = testInitialSync(initial, (root, prev) => syncToYjs(update, prev, root, options), options);

        expect(removeInstanceIds(result)).toEqual(removeInstanceIds(update));
    });

    test('should add value to existing array', () => {
        const initial = () => new ImmutableArray('1', 0, [
            11,
        ]);

        const update = new ImmutableArray('1', 1, [
            11,
            12,
        ]);

        const result = testInitialSync(initial, (root, prev) => syncToYjs(update, prev, root, options), options);

        expect(removeInstanceIds(result)).toEqual(removeInstanceIds(update));
    });


    test('should add complex object', () => {
        const initial = () => new ImmutableObject('1', 0, {});
    
        const update = new ImmutableObject('1', 1, {
            nested1: new ImmutableArray('2', 0, [
                new ImmutableObject('3', 0, {
                    nested1_1: new ImmutableArray('4', 0, [
                        new ImmutableObject('5', 0, {
                            nested1_1_1: 'Hello Redux'
                        }),
                    ]),
                }),
            ])
        });
    
        const result = testInitialSync(initial, (root, prev) => syncToYjs(update, prev, root, options), options);
    
        expect(removeInstanceIds(result)).toEqual(removeInstanceIds(update));
    });

    test('should add property to object', () => {
        const initial = () => new ImmutableObject('1', 0, {});

        const update = new ImmutableObject('1', 1, {
            newKey: 'Hello Redux'
        });

        const result = testInitialSync(initial, (root, prev) => syncToYjs(update, prev, root, options), options);

        expect(removeInstanceIds(result)).toEqual(removeInstanceIds(update));
    });

    test('should remove items from array', () => {
        const initial = () => new ImmutableArray('1', 0, [
            11,
            12,
            13
        ]);

        const update = new ImmutableArray('1', 1, [
            13,
        ]);

        const result = testInitialSync(initial, (root, prev) => syncToYjs(update, prev, root, options), options);

        expect(removeInstanceIds(result)).toEqual(removeInstanceIds(update));
    });

    test('should remove property from object', () => {
        const initial = () =>  new ImmutableObject('1', 0, {
            removedKey: 'Hello Redux'
        });

        const update = new ImmutableObject('1', 1, {
        });

        const result = testInitialSync(initial, (root, prev) => syncToYjs(update, prev, root, options), options);

        expect(removeInstanceIds(result)).toEqual(removeInstanceIds(update));
    });

    test('should update property in object', () => {
        const initial =  () => new ImmutableObject('1', 0, {
            updatedKey: 'Hello Redux'
        });

        const update = new ImmutableObject('1', 1, {
            updatedKey: 'Hello Yjs'
        });

        const result = testInitialSync(initial, (root, prev) => syncToYjs(update, prev, root, options), options);

        expect(removeInstanceIds(result)).toEqual(removeInstanceIds(update));
    });

    test('should update property in array', () => {
        const initial =  () => new ImmutableArray('1', 0, [
            11,
            12,
            13
        ]);

        const update = new ImmutableArray('1', 1, [
            11,
            120,
            13
        ]);

        const result = testInitialSync(initial, (root, prev) => syncToYjs(update, prev, root, options), options);

        expect(removeInstanceIds(result)).toEqual(removeInstanceIds(update));
    });

    test('should update property in complex object', () => {
        const initial = () => new ImmutableObject('1', 0, {
            nested1: new ImmutableArray('2', 0, [
                new ImmutableObject('3', 0, {
                    nested1_1: new ImmutableArray('4', 0, [
                        new ImmutableObject('5', 1, {
                            nested1_1_1: 'Hello Redux'
                        }),
                    ]),
                }),
            ]),
            nested2: new ImmutableArray('2', 0, [
                new ImmutableObject('3', 0, {
                    nested2_1: new ImmutableArray('4', 0, [
                        new ImmutableObject('5', 1, {
                            nested2_1_1: 'Hello Redux'
                        }),
                    ]),
                }),
            ])
        });
    
        const update = new ImmutableObject('1', 1, {
            nested1: new ImmutableArray('2', 1, [
                new ImmutableObject('3', 1, {
                    nested1_1: new ImmutableArray('4', 1, [
                        new ImmutableObject('5', 2, {
                            nested1_1_1: 'Hello Yjs'
                        }),
                    ]),
                }),
            ]),
            nested2: new ImmutableArray('2', 0, [
                new ImmutableObject('3', 0, {
                    nested2_1: new ImmutableArray('4', 0, [
                        new ImmutableObject('5', 1, {
                            nested2_1_1: 'Hello Redux'
                        }),
                    ]),
                }),
            ])
        });
    
        const result = testInitialSync(initial, (root, prev) => syncToYjs(update, prev, root, options), options);
    
        expect(removeInstanceIds(result)).toEqual(removeInstanceIds(update));
    });
});

function removeInstanceIds(source: any) {
    if (source) {
        delete source[TypeProperties.instanceId];
    }

    if (!isString(source)) {
        for (const key of Object.keys(source)) {
            removeInstanceIds((source as any)[key]);
        }
    }

    if (isArray(source)) {
        for (const value of source) {
            removeInstanceIds(value);
        }
    }

    return source;
}