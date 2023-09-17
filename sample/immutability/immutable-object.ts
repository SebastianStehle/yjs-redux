/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-prototype-builtins */
import { idGenerator } from './helpers';
import { Types } from './types';

export abstract class ImmutableObject<T extends object> {
    private readonly values: T;

    public readonly __instanceId: string;

    constructor(values: T,
        public readonly __typeName: string, id?: string,
    ){
        this.__instanceId = id || (values as any)['__instanceId'] || idGenerator();
        this.values = values;
        this.values = this.afterClone(this.values);

        Object.freeze(values);
    }

    public get<K extends keyof T>(key: K): T[K] {
        return this.values[key];
    }

    public set<K extends keyof T>(key: K, value: T[K]): this {
        const current = this.values[key];
    
        if (current === value) {
            return this;
        }

        const values = { ...this.values };

        if (Types.isUndefined(value)) {
            delete values[key];
        } else {
            values[key] = value;
        }

        return this.makeRecord(values);
    }

    public setMany(updates: Partial<T>): this {
        return this.makeRecord({ ...this.values, ...updates });
    }

    private makeRecord(values: T) {
        const record = Object.create(Object.getPrototypeOf(this));

        record.__instanceId = this.__instanceId;
        record.__typeName = this.__typeName;

        record.values = values;
        record.values = record.afterClone(values, this);

        Object.freeze(record.values);

        return record;
    }

    protected afterClone(values: T) {
        return values;
    }

    public unsafeValues() {
        return this.values;
    }
}