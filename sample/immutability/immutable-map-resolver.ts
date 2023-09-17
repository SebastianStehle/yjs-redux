/* eslint-disable @typescript-eslint/no-explicit-any */
import { ImmutableMap } from './immutable-map';
import { ObjectDiff, ObjectTypeResolver, SourceObject } from './../../src';

export default class ImmutableMapResolver implements ObjectTypeResolver<ImmutableMap<unknown>> {
    public readonly sourceType = 'Object';

    public static readonly INSTANCE = new ImmutableMapResolver();

    private constructor() {
    }

    public create(source: SourceObject): ImmutableMap<unknown> {
        return ImmutableMap.of(source as any);
    }

    public syncToYJS(value: ImmutableMap<unknown>): SourceObject {
        return value.raw;
    }

    public syncToObject(existing: ImmutableMap<unknown>, diffs: ObjectDiff[]): ImmutableMap<unknown> {
        return existing.mutate(mutator => {
            for (const diff of diffs) {
                if (diff.type === 'Remove') {
                    mutator.remove(diff.key);
                } else {
                    mutator.set(diff.key, diff.value);
                }
            }
        });
    }
}