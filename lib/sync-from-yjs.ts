/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Y from 'yjs';
import { getTypeName } from './identity';
import { yjsToValue, getSource, getTarget, setTarget } from './sync-internals';
import { ArrayDiff, ArrayTypeResolver, ObjectDiff, ObjectTypeResolver, SyncOptions } from './sync-utils';
import { isArray, isObject } from './utils';

function syncValue(source: any, options: SyncOptions) {
    if (!isInvalid(source)) {
        return source;
    }

    let result: any;

    const typeName = getTypeName(source);

    if (!typeName) {
        if (isObject(source)) {
            result = syncObject(source, getEvent(source), options);
        } else if (isArray(source)) {
            result = syncArray(source, getEvent(source), options);
        }

        return result;
    }


    const typeResolver = options.typeResolvers[typeName];

    if (!typeResolver) {
        throw new Error(`Cannot find type resolver for '${typeName}'.`);
    }

    if (typeResolver.sourceType === 'Object') {
        result = syncTypedObject(source, getEvent(source), typeResolver, options);
    } else if (typeResolver.sourceType === 'Array') {
        result = syncTypedArray(source, getEvent(source), typeResolver, options);
    }

    setTarget(result, getTarget(source));
    return result;
}

function syncObject(source: Readonly<Record<string, object>>, event: Y.YEvent<any> | undefined, options: SyncOptions) {
    let result: Record<string, object> | undefined = undefined;

    // Because of immutability we have to check if there is a change down the path.
    for (const [key, valueOld] of Object.entries(source)) {
        const valueNew = syncValue(valueOld, options);

        if (valueNew !== valueOld) {
            result ||= { ...source };
            result[key] = valueNew;
        }
    }
    
    if (event) {
        const target = event.target as Y.Map<unknown>;

        if (!(target instanceof Y.Map)) {
            throw new Error('Cannot sync from invalid target.');
        }

        event.changes.keys.forEach((change, key) => {
            result ||= { ...source };
    
            switch (change.action) {
                case 'add':
                    result[key] = yjsToValue(target.get(key), options);
                    break;
                case 'update':
                    result[key] = yjsToValue(target.get(key), options);
                    break;
                case 'delete':
                    delete result[key];
                    break;
            }
        });
    }

    return result || source;
}

function syncTypedObject(source: any, event: Y.YEvent<any> | undefined, typeResolver: ObjectTypeResolver<any>, options: SyncOptions) {
    let diffs: ObjectDiff[] | undefined;

    const sourceValue = typeResolver.syncToYjs(source);

    // Because of immutability we have to check if there is a change down the path.
    for (const [key, valueOld] of Object.entries(sourceValue)) {
        const valueNew = syncValue(valueOld, options);

        if (valueNew !== valueOld) {
            diffs ||= [];
            diffs.push({ type: 'Set', key, value: valueNew });
        }
    }
    
    if (event) {
        const target = event.target as Y.Map<unknown>;

        if (!(target instanceof Y.Map)) {
            throw new Error('Cannot sync from invalid target.');
        }

        event.changes.keys.forEach((change, key) => {
            diffs ||= [];

            switch (change.action) {
                case 'add':
                    diffs.push({ type: 'Set', key, value: yjsToValue(target.get(key), options) });
                    break;
                case 'update':
                    diffs.push({ type: 'Set', key, value: yjsToValue(target.get(key), options) });
                    break;
                case 'delete':
                    diffs.push({ type: 'Remove', key });
                    break;
            }
        });
    }

    if (diffs) {
        return typeResolver.syncToObject(source, diffs);
    }

    return source;
}

function syncArray(source: ReadonlyArray<unknown>, event: Y.YEvent<any> | undefined, options: SyncOptions) {
    let result: unknown[] | undefined = undefined;

    // Because of immutability we have to check if there is a change down the path.
    for (let i = 0; i < source.length; i++) {
        const itemOld = source[i];
        const itemNew = syncValue(itemOld, options);

        if (itemOld !== itemNew) {
            result ||= [...source];
            result[i] = itemNew;
        }
    }
    
    if (event) {
        const target = event.target as Y.Array<unknown>;

        if (!(target instanceof Y.Array)) {
            throw new Error('Cannot sync from invalid target.');
        }

        let index = 0;
        event.changes.delta.map(({ retain, insert, delete: deletion }) => {
            if (retain) {
                index += retain;
            }

            if (insert && isArray(insert)) {
                result ||= [...source];
                result.splice(index, 0, ...insert.map(x => yjsToValue(x, options)));
                index += insert.length;
            }

            if (deletion) {
                result ||= [...source];
                result.splice(index, deletion);
            }
        });
    }

    return result || source;
}

function syncTypedArray(source: any, event: Y.YEvent<any> | undefined, typeResolver: ArrayTypeResolver<any>, options: SyncOptions) {
    let diffs: ArrayDiff[] | undefined = undefined;

    const sourceValue = typeResolver.syncToYjs(source);

    // Because of immutability we have to check if there is a change down the path.
    for (let i = 0; i < sourceValue.length; i++) {
        const itemOld = sourceValue[i];
        const itemNew = syncValue(itemOld, options);

        if (itemOld !== itemNew) {
            diffs ||= [];
            diffs.push({ type: 'Set', index: i, value: itemNew });
        }
    }
    
    if (event) {
        const target = event.target as Y.Array<unknown>;

        if (!(target instanceof Y.Array)) {
            throw new Error('Cannot sync from invalid target.');
        }

        let index = 0;
        event.changes.delta.map(({ retain, insert, delete: deletion }) => {
            if (retain) {
                index += retain;
            }

            if (insert && isArray(insert)) {
                diffs ||= [];

                for (const item of insert) {
                    diffs.push({ type: 'Insert', index, value: yjsToValue(item, options) });
                    index++;
                }
            }

            if (deletion) {
                diffs ||= [];
        
                for (let i = 0; i < deletion; i++) {
                    diffs.push({ type: 'Delete', index });
                }
            }
        });
    }

    if (diffs) {
        return typeResolver.syncToObject(source, diffs);
    }

    return source;
}

export function syncFromYjs<T>(source: T, events: ReadonlyArray<Y.YEvent<any>>, options: SyncOptions) {
    for (const event of events) {
        invalidate(event.target, event);
    }

    return syncValue(source, options) as T;
}

function invalidate(target: Y.AbstractType<any> | null, event: Y.YEvent<any> | null) {
    if (!target) {
        return;
    }

    const source = getSource(target);

    if (source && event) {
        setEvent(source, event);
    }

    if (isInvalid(source)) {
        return;
    }
    
    if (source) {
        setInvalid(source);
    }

    invalidate(target.parent, null);
}

// We need weak maps here because the target object could be frozen due to the redux store.
const mapToEvent = new WeakMap();
const mapToInvalid = new WeakMap();

function setEvent(target: object, event: Y.YEvent<any>) {
    mapToEvent.set(target, event);
}

function getEvent(target: object): Y.YEvent<any> | undefined {
    return mapToEvent.get(target);
}

function setInvalid(target: object, invalid = true) {
    mapToInvalid.set(target, invalid);
}

function isInvalid(target: object) {
    return mapToInvalid.get(target) === true;
}