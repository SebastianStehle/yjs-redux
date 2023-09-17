/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Y from 'yjs';
import { getTypeName, TypeProperties } from './identity';
import { SyncOptions } from './sync-utils';
import { isObject } from './utils';

const mapToTarget = new WeakMap();

export function setSource(target: Y.AbstractType<any>, source: any) {
    (target as any)['__source'] = source,

    // The source object is from redux and potentially frozen.
    mapToTarget.set(source, target);
}

export function setTarget(source: any, target: Y.AbstractType<any>) {
    (target as any)['__source'] = source,

    // The source object is from redux and potentially frozen.
    mapToTarget.set(source, target);
}

export function getSource(target: Y.AbstractType<any>) {
    return (target as any)['__source'];
}

export function getTarget(target: Y.AbstractType<any>) {
    return mapToTarget.get(target);
}

export function yjsToValue(source: any, options: SyncOptions) {
    let result = source;

    if (source instanceof Y.Map) {
        result = createFromMap(source, options);
        setSource(source, result);
    } else if (source instanceof Y.Array) {
        result = createFromArray(source, options);
        setSource(source, result);
    }

    if (isObject(source)) {
        const typeName = getTypeName(source);

        if (!typeName) {
            return result;
        }

        const valueResolver = options.valueResolvers[typeName];
    
        if (!valueResolver) {
            throw new Error(`Cannot find value resolver for '${typeName}'.`);
        }

        // Delete the type name, because it was not part of the object that has been created when syncing to yjs.
        delete source[TypeProperties.typeName];

        return valueResolver.fromYJS(source);
    }

    return result;
}

function createFromMap(source: Y.Map<any>, options: SyncOptions) {
    const typeName = source.get(TypeProperties.typeName) as string;

    if (!typeName && options.syncAlways) {
        return createFromMapCore(source, null, options);
    }
    
    const typeResolver = options.typeResolvers[typeName];
    
    if (!typeResolver || typeResolver.sourceType !== 'Object') {
        throw new Error(`Cannot find type resolver for '${typeName}'.`);
    }

    const values = createFromMapCore(source, TypeProperties.typeName, options);

    return typeResolver.create(values);
}

function createFromMapCore(source: Y.Map<any>, skipKey: string | null, options: SyncOptions) {
    const values: Record<string, any> = {};

    source.forEach((value: any, key: string) => {      
        if (key !== skipKey) {
            values[key] = yjsToValue(value, options);
        }
    });

    return values;
}

function createFromArray(source: Y.Array<any>, options: SyncOptions): any {
    const typeName = getTypeName(source.get(0));

    if (!typeName) {
        return createFromArrayCore(source, -1, options);
    }
    
    const typeResolver = options.typeResolvers[typeName];
    
    if (!typeResolver || typeResolver.sourceType !== 'Array') {
        throw new Error(`Cannot find type resolver for '${typeName}'.`);
    }

    const values = createFromArrayCore(source, 0, options);

    return typeResolver.create(values);
}

function createFromArrayCore(source: Y.Array<any>, skipIndex: number, options: SyncOptions) {
    const values: any[] = [];

    for (let i = 0; i < source.length; i++) {
        if (i !== skipIndex) {
            values.push(yjsToValue(source.get(i), options));
        }
    } 

    return values;
}