import { idGenerator, without } from './helpers';
import { Types } from './types';

/* eslint-disable no-prototype-builtins */
type Mutator = {
    add: (item: string) => void;

    remove: (item: string) => void;
};

export class ImmutableSet {
    public readonly __typeName = ImmutableSet.TYPE_NAME;

    public static readonly TYPE_NAME = 'ImmutableSet';

    public get length() {
        return Object.keys(this.items).length;
    }

    public [Symbol.iterator]() {
        return Object.keys(this.items)[Symbol.iterator]();
    }

    public get raw() {
        return this.items;
    }

    public has(item: string) {
        return this.items.hasOwnProperty(item);
    }

    private constructor(private readonly items: { [item: string]: boolean },
        public readonly __instanceId: string
    ) {
        Object.freeze(items);
    }

    public static empty(): ImmutableSet {
        return new ImmutableSet({}, idGenerator());
    }

    public static of(...items: string[]): ImmutableSet {
        if (!items || items.length === 0) {
            return ImmutableSet.empty();
        } else {
            const itemMap: Record<string, boolean> = {};

            for (const item of items) {
                itemMap[item] = true;
            }

            return new ImmutableSet(itemMap, idGenerator());
        }
    }

    public add(item: string): ImmutableSet {
        if (!item || this.has(item)) {
            return this;
        }

        const items = { ...this.items, [item]: true };

        return new ImmutableSet(items, this.__instanceId);
    }

    public remove(item: string): ImmutableSet {
        if (!item || !this.has(item)) {
            return this;
        }

        const items = without(this.items, item);

        return new ImmutableSet(items, this.__instanceId);
    }

    public mutate(updater: (mutator: Mutator) => void) {
        const items = { ...this.items };

        let updated = false;

        updater({
            add: (k) => {
                if (k) {
                    if (!items.hasOwnProperty(k)) {
                        updated = true;

                        items[k] = true;
                    }
                }
            },
            remove: (k) => {
                if (k) {
                    if (items.hasOwnProperty(k)) {
                        updated = true;

                        delete items[k];
                    }
                }
            },
        });

        if (!updated) {
            return this;
        }

        return new ImmutableSet(items, this.__instanceId);
    }

    public equals(other: ImmutableSet) {
        if (!other) {
            return false;
        }

        return Types.equalsObject(this.items, other.items);
    }
}
