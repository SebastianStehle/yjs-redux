/* eslint-disable @typescript-eslint/no-explicit-any */
import { ImmutableSet } from "./immutable-set";
import { ObjectDiff, ObjectTypeResolver, SourceObject } from "./../../src";

export default class ImmutableSetResolver implements ObjectTypeResolver<ImmutableSet> {
    public readonly sourceType = 'Object';

    public static readonly INSTANCE = new ImmutableSetResolver();

    public static readonly TYPE_NAME = ImmutableSet.TYPE_NAME;

    private constructor() {
    }

    public create(source: SourceObject): ImmutableSet {
        return ImmutableSet.of(source as any);
    }

    public syncToYJS(value: ImmutableSet): SourceObject {
        return value.raw;
    }

    public syncToObject(existing: ImmutableSet, diffs: ObjectDiff[]): ImmutableSet {
        return existing.mutate(mutator => {
            for (const diff of diffs) {
                if (diff.type === 'Remove') {
                    mutator.remove(diff.key);
                } else {
                    mutator.add(diff.key);
                }
            }
        });
    }
}