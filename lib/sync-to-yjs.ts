/* eslint-disable no-prototype-builtins */
/* eslint-disable @typescript-eslint/no-explicit-any */

import * as Y from 'yjs';
import { calculateArrayDiffs, calculateObjectDiffs } from './diffs';
import { getTypeName, isSameInstanceId, TypeProperties } from './identity';
import { setSource } from './sync-internals';
import { SourceArray, SourceObject, SyncOptions } from './sync-utils';
import { isArray, isObject } from './utils';

function valueToYjs(source: any, options: SyncOptions, root: Y.AbstractType<any> | null) {
    if (!source) {
        return source;
    }

    const typeName = getTypeName(source);

    if (!typeName) {
        if (options.syncAlways) {
            if (isArray(source) && !options.isValueType(source)) {
                return valueToYjsArray(source, source, [], options, root);
            }
            
            if (isObject(source) && !options.isValueType(source)) {
                return valueToYjsObject(source, source, {}, options, root);
            }
        }

        return source;
    }

    const valueResolver = options.valueResolvers[typeName];

    if (valueResolver) {
        const result = valueResolver.fromValue(source);

        // Also set the type name so that we can read from it.
        result[TypeProperties.typeName] = typeName;
        return result;
    }

    const typeResolver = options.typeResolvers[typeName];

    if (!typeResolver) {
        throw new Error(`Cannot find type resolver for '${typeName}'.`);
    }

    if (typeResolver.sourceType === 'Object') {
        const initial: Record<string, any> = {
            [TypeProperties.typeName]: typeName
        };
        
        return valueToYjsObject(source, typeResolver.syncToYjs(source), initial, options, root);
    } else {
        const initial: any[] = [
            { [TypeProperties.typeName]: typeName }
        ];
        
        return valueToYjsArray(source, typeResolver.syncToYjs(source), initial, options, root);
    }
}

function valueToYjsObject(source: any, values: SourceObject, initial: Record<string, object>, options: SyncOptions, root: Y.AbstractType<any> | null) {
    let map: Y.Map<unknown>;
    if (root) {
        if (root instanceof Y.Map) {
            map = root;
        } else {
            throw new Error(`Root object must be an object, got ${typeof root}.`);
        }
    } else {
        map = new Y.Map();
    }

    for (const [key, value] of Object.entries(initial)) {
        map.set(key, value);
    }

    for (const [key, value] of Object.entries(values)) {
        map.set(key, valueToYjs(value, options, null));
    }

    setSource(map, source);
    return map;
}

function valueToYjsArray(source: any, values: SourceArray, initial: any[], options: SyncOptions, root: Y.AbstractType<any> | null) {
    let array: Y.Array<unknown>;
    if (root) {
        if (root instanceof Y.Array) {
            array = root;
        } else {
            throw new Error(`Root object must be an array, got ${typeof root}.`);
        }
    } else {
        array = new Y.Array();
    }

    array.push(initial);
    array.push(values.map(v => valueToYjs(v, options, null)));

    setSource(array, source);
    return array;
}

function diffValues(current: any, previous: any, target: any, options: SyncOptions) {
    if (!target) {
        return false;
    }

    if (target instanceof Y.Map) {
        return diffObjects(current, previous, target, options);
    } else if (target instanceof Y.Array) {
        return diffArrays(current, previous, target, options);
    }
    
    return false;
}

function diffObjects(current: any, previous: any, target: Y.Map<any>, options: SyncOptions) {
    const typeName = target.get(TypeProperties.typeName) as string;

    if (!typeName) {
        if (options.syncAlways && isObject(current) && isObject(previous)) {
            diffObjectsCore(current, previous, current, target, options);
            return true;
        }

        return false;
    }

    if (!isSameInstanceId(current, previous)) {
        // If the instance ids do not match, we assume that the properties have been replaced.
        return false;
    }

    // Type names do not match.
    if (getTypeName(current) !== typeName || getTypeName(previous) !== typeName) {
        return false;
    }

    const typeResolver = options.typeResolvers[typeName];

    if (!typeResolver || typeResolver.sourceType !== 'Object') {
        throw new Error(`Cannot find type resolver for '${typeName}'.`);
    }
    
    const objCurrent = typeResolver.syncToYjs(current);
    const objPrevious = typeResolver.syncToYjs(previous);

    diffObjectsCore(objCurrent, objPrevious, current, target, options);
    return true;
}

function diffObjectsCore(current: SourceObject, previous: SourceObject, source: any, target: Y.Map<any>, options: SyncOptions) {
    const diffs = calculateObjectDiffs(current, previous);

    for (const diff of diffs) {
        const key = diff.key;

        if (diff.type === 'Remove') {
            target.delete(key);
        } else if (diff.type === 'Add') {
            target.set(key, valueToYjs(diff.value, options, null));
        } else if (!diffValues(diff.value, diff.oldValue, target.get(diff.key), options)) {
            target.set(key, valueToYjs(diff.value, options, null));
        }
    }

    setSource(target, source);
}

function diffArrays(current: any, previous: any, target: Y.Array<any>, options: SyncOptions) {
    const typeName = getTypeName(target.get(0)) as string;

    if (!typeName) {
        if (options.syncAlways && isArray(current) && isArray(previous)) {
            diffArraysCore(current, previous, current, target, 0, options);
            return true;
        }

        return false;
    }

    if (!isSameInstanceId(current, previous)) {
        // If the instance ids do not match, we assume that the properties have been replaced.
        return false;
    }

    // Type names do not match.
    if (getTypeName(current) !== typeName || getTypeName(previous) !== typeName) {
        return false;
    }

    const typeResolver = options.typeResolvers[typeName];

    if (!typeResolver || typeResolver.sourceType !== 'Array') {
        throw new Error(`Cannot find type resolver for '${typeName}'.`);
    }
    
    const arrayCurrent = typeResolver.syncToYjs(current);
    const arrayPrevious = typeResolver.syncToYjs(previous);

    diffArraysCore(arrayCurrent, arrayPrevious, current, target, 1, options);
    return true;
}

function diffArraysCore(current: SourceArray, previous: SourceArray, source: any, target: Y.Array<any>, indexOffset: number, options: SyncOptions) {
    const diffs = calculateArrayDiffs(current, previous);

    for (const diff of diffs) {
        const index = diff.index + indexOffset;
    
        if (diff.type === 'Remove') {
            target.delete(index, diff.count);
        } else if (diff.type === 'Insert') {
            target.insert(index, diff.values.map(v => valueToYjs(v, options, null)));
        } else if (!diffValues(diff.value, diff.oldValue, target.get(diff.oldIndex + indexOffset), options)) {
            target.delete(index, 1);
            target.insert(index, [valueToYjs(diff.value, options, null)]);
        }
    }
    setSource(target, source);
}

export function syncToYjs(current: any, previous: any, target: Y.AbstractType<any>, options: SyncOptions) {
    diffValues(current, previous, target, options);
}

export function initToYjs(current: any, root: Y.AbstractType<any>, options: SyncOptions) {
    valueToYjs(current, options, root);
}