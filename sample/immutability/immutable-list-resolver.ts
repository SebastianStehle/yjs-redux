/* eslint-disable @typescript-eslint/no-explicit-any */
import { ImmutableList } from './immutable-list';
import { ArrayDiff, ArrayTypeResolver, SourceArray } from './../../lib';

export default class ImmutableListResolver implements ArrayTypeResolver<ImmutableList<unknown>> {
    public readonly sourceType = 'Array';

    public static readonly INSTANCE = new ImmutableListResolver();

    private constructor() {
    }

    public create(source: SourceArray): ImmutableList<unknown> {
        return ImmutableList.of(source as any);
    }

    public syncToYjs(value: ImmutableList<unknown>): SourceArray {
        return value.raw;
    }

    public syncToObject(existing: ImmutableList<unknown>, diffs: ArrayDiff[]): ImmutableList<unknown> {
        return existing.mutate(mutator => {
            for (const diff of diffs) {
                if (diff.type === 'Delete') {
                    mutator.removeAt(diff.index);
                } else {
                    mutator.insert(diff.index, diff.value);
                }
            }
        });
    }
}