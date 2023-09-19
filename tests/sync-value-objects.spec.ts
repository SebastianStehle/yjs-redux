/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, test } from 'vitest';
import { syncToYjs, SourceObject, SyncOptions, ValueResolver, DefaultSyncOptions } from './../lib';
import { testInitialSync } from './test-utils';

class Color {
    public readonly __typeName = Color.TYPE_NAME;

    public static readonly TYPE_NAME = 'Color';

    public constructor(
        public readonly value: string
    ) {
    }
}

class ColorValueResolver implements ValueResolver<Color> {
    public static readonly INSTANCE = new ColorValueResolver();

    private constructor() {
    }

    public fromYjs(source: SourceObject): Color {
        return new Color(source['value'] as string);
    }

    public fromValue(source: Color): Readonly<{ [key: string]: unknown; }> {
        return { value: source.value };
    }
}

const options: SyncOptions = {
    ...DefaultSyncOptions,
    valueResolvers: {
        [Color.TYPE_NAME]: ColorValueResolver.INSTANCE
    },
};

describe('value objects', () => {
    test('should add value type', () => {
        const initial = () => ({});
    
        const update = {
            color: new Color('yellow'),
        };
    
        const result = testInitialSync(initial, (root, prev) => syncToYjs(update, prev, root, options), options);
    
        expect(result).toEqual(update);
        expect(result.color instanceof Color).toBeTruthy();
    });
    
    test('should replace value type', () => {
        const initial = () => ({
            color: new Color('red'),
        });
    
        const update = {
            color: new Color('green'),
        };
    
        const result = testInitialSync(initial, (root, prev) => syncToYjs(update, prev, root, options), options);
    
        expect(result).toEqual(update);
        expect(result.color instanceof Color).toBeTruthy();
    });
});