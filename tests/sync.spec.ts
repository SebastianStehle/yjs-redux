/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, test } from 'vitest';
import { DefaultSyncOptions, SyncOptions } from './../lib/core';
import { testInitialSync } from './test-utils';

const options: SyncOptions = {
    ...DefaultSyncOptions,
};

describe('Redux objects', () => {
    test('should add value to existing array', () => {
        const initial = [
            11,
        ];

        const update = [
            11,
            12,
        ];

        const result = testInitialSync(initial, update, options);

        assertSync(result, update);
    });

    test('should add value to empty array', () => {
        const initial = [];

        const update = [
            11,
        ];

        const result = testInitialSync(initial, update, options);

        assertSync(result, update);
    });

    test('should add complex object', () => {
        const initial = {};
    
        const update = {
            nested1: [
                {
                    nested1_1: [
                        {
                            nested1_1_1: 'Hello Redux'
                        }
                    ]
                }
            ]
        };
    
        const result = testInitialSync(initial, update, options);
    
        assertSync(result, update);
    });

    test('should add property to object', () => {
        const initial = {};

        const update = {
            newKey: 'Hello Redux'
        };

        const result = testInitialSync(initial, update, options);

        assertSync(result, update);
    });

    test('should remove items from array', () => {
        const initial = [
            11,
            12,
            13
        ];

        const update = [
            13,
        ];

        const result = testInitialSync(initial, update, options);

        assertSync(result, update);
    });

    test('should remove property from object', () => {
        const initial = {
            removedKey: 'Hello Redux'
        };

        const update = {
        };

        const result = testInitialSync(initial, update, options);

        assertSync(result, update);
    });

    test('should update property in object', () => {
        const initial = {
            updatedKey: 'Hello Redux'
        };

        const update = {
            updatedKey: 'Hello Yjs'
        };

        const result = testInitialSync(initial, update, options);

        assertSync(result, update);
    });

    test('should update item in array', () => {
        const initial = [
            11,
            12,
            13
        ];

        const update = [
            11,
            120,
            33
        ];

        const result = testInitialSync(initial, update, options);

        assertSync(result, update);
    });

    test('should update value in value type', () => {
        const actualOptions = {
            ...options,
            isValueType: value => (value as any)['isValueType'] === true,
        };

        const initial = {};

        const update = {
            update: {
                isValueType: true,
                key1: 1,
                key2: 2,
            }
        };

        const result = testInitialSync(initial, update, actualOptions);

        assertSync(result, update);
    });

    test('should update property in complex object', () => {
        const initial = {
            nested1: [
                {
                    nested1_1: [
                        {
                            nested1_1_1: 'Hello Redux'
                        }
                    ]
                }
            ],
            nested2: [
                {
                    nested2_1: [
                        {
                            nested2_1_1: 'Hello Redux'
                        }
                    ]
                }
            ]
        };
    
        const update = {
            nested1: [
                {
                    nested1_1: [
                        {
                            nested1_1_1: 'Hello Yjs'
                        }
                    ]
                }
            ],
            nested2: [
                {
                    nested2_1: [
                        {
                            nested2_1_1: 'Hello Yjs'
                        }
                    ]
                }
            ]
        };
    
        const result = testInitialSync(initial, update, options);
    
        assertSync(result, update);
    });
});

function assertSync(result: { afterSync: any; afterRead: any; }, update: any) {
    expect(result.afterRead).toEqual(update);
    expect(result.afterSync).toEqual(update);
}
