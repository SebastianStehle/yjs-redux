export type SyncOptions = {
    /**
     * The type resolvers.
     */
    typeResolvers: Record<string, ObjectTypeResolver<unknown> | ArrayTypeResolver<unknown>>;

    /**
     * The value resolvers.
     */
    valueResolvers: Record<string, ValueResolver<unknown>>;

    /**
     * True when all objects should be synced.
     */
    syncAlways: boolean;

    /**
     * Keep the type name in the value options input.
     */
    keepTypeNameForValueOptions?: boolean;

    /**
     * Return true, when a value should be handled as value object and not be mapped to an array.
     */
    isValueType: (value: SourceArray | SourceObject) => boolean;
};

export const DefaultSyncOptions: SyncOptions = {
    typeResolvers: {
    },
    valueResolvers: {
    },
    syncAlways: true,
    isValueType: () => false
};

export type SyncStrategy = 'Always' | 'IsEntity';

export type ArrayDiff = ArrayInsert | ArraySet | ArrayDeletion;

export type ArrayBaseDiff = { index: number; };

export type ArrayInsert = { type: 'Insert', value: unknown } & ArrayBaseDiff;

export type ArraySet = { type: 'Set', value: unknown } & ArrayBaseDiff;

export type ArrayDeletion = { type: 'Delete' } & ArrayBaseDiff;

export type ObjectDiff = ObjectSet | ObjectRemove;

export type ObjectBaseDiff = { key: string; };

export type ObjectSet = { type: 'Set', value: unknown } & ObjectBaseDiff;

export type ObjectRemove = { type: 'Remove' } & ObjectBaseDiff;

export type SourceObject = Readonly<{ [key: string]: unknown }>;

export type SourceArray = ReadonlyArray<unknown>;

/**
 * Implements a type resolver that converts a value to either an array or object that can be converted to yjs.
 */
export interface TypeResolver<T, TSource, TDiff> {
    /**
     * Creates a new value from the source type.
     *
     * @param source - The source value.
     */
    create(source: TSource): T;

    /**
     * Converts the typed value to an array or object.
     * 
     * @param value - The source value.
     */
    syncToYjs(value: T): TSource;

    /**
     * Updates an existing instance from a list of diffs.
     * 
     * @param existing - The existing value.
     * @param diffs - The list of differences.
     * @returns The new value.
     */
    syncToObject(existing: T, diffs: TDiff[]): T;
}

/**
 * A type converter from objects.
 */
export interface ObjectTypeResolver<T> extends TypeResolver<T, SourceObject, ObjectDiff> {
    sourceType: 'Object';
}

/**
 * A type converter from arrays.
 */
export interface ArrayTypeResolver<T> extends TypeResolver<T, SourceArray, ArrayDiff> {
    sourceType: 'Array';
}

/**
 * Converts a value type from a plain javascript object that can be serialized.
 */
export interface ValueResolver<T> {
    /**
     * Creates a new value from a deserialized object.
     * 
     * @param source - The source object.
     * @returns The created object.
     */
    fromYjs(source: SourceObject): T;

    /**
     * Creates a plain object from the source value.
     * 
     * @param source - The source object.
     * @returns The created object.
     */
    fromValue(source: T): Record<string, unknown>;
}

/**
 * A value converter that is created from 2 functions.
 */
export function valueResolver<T>(fromYjs: (Source: SourceObject) => T, fromValue: (Source: T) => SourceObject) {
    return { fromYjs, fromValue };
}