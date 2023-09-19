/* eslint-disable @typescript-eslint/no-explicit-any */
import { ImmutableObject } from './immutable-object';
import { ObjectDiff, ObjectTypeResolver, SourceObject } from './../../lib';

export default class ImmutableObjectResolver<T extends ImmutableObject<any>> implements ObjectTypeResolver<T> {
    public readonly sourceType = 'Object';

    public static create<T extends ImmutableObject<any>>(factory: (source: SourceObject) => T) {
        return new ImmutableObjectResolver<T>(factory);
    }

    private constructor(
        private readonly factory: (source: SourceObject) => T
    ) {
    }

    public create(source: SourceObject): T {
        return this.factory(source);
    }

    public syncToYjs(value: T): SourceObject {
        return value.unsafeValues();
    }

    public syncToObject(existing: T, diffs: ObjectDiff[]): T {
        const merge: Record<string, unknown> = {};

        for (const diff of diffs) {
            if (diff.type === 'Remove') {
                merge[diff.key] = undefined;
            } else {
                merge[diff.key] = diff.value;
            }
        }
        
        return existing.setMany(merge);
    }
}