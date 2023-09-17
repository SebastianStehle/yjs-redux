/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-namespace */

export module Types {
    export function isArray(value: any): value is ReadonlyArray<any> {
        return Array.isArray(value);
    }

    export function isString(value: any): value is string {
        return typeof value === 'string' || value instanceof String;
    }

    export function isNumber(value: any): value is number {
        return typeof value === 'number' && Number.isFinite(value);
    }

    export function isFunction(value: any): value is Function {
        return typeof value === 'function';
    }

    export function isObject(value: any): value is Object {
        return value && typeof value === 'object' && value.constructor === Object;
    }

    export function isBoolean(value: any): value is boolean {
        return typeof value === 'boolean';
    }

    export function isUndefined(value: any): value is undefined {
        return typeof value === 'undefined';
    }

    export function isRegExp(value: any): value is RegExp {
        return value && typeof value === 'object' && value.constructor === RegExp;
    }

    export function isNull(value: any): value is null {
        return value === null;
    }

    export function isDate(value: any): value is Date {
        return value instanceof Date;
    }

    export function is<TClass>(x: any, c: new (...args: any[]) => TClass): x is TClass {
        return x instanceof c;
    }

    export function isArrayOfNumber(value: any): value is Array<number> {
        return isArrayOf(value, isNumber);
    }

    export function isArrayOfObject(value: any): value is Array<Object> {
        return isArrayOf(value, isObject);
    }

    export function isArrayOfString(value: any): value is Array<string> {
        return isArrayOf(value, isString);
    }

    export function isArrayOf(value: any, validator: (v: any) => boolean): boolean {
        if (!Array.isArray(value)) {
            return false;
        }

        for (const v of value) {
            if (!validator(v)) {
                return false;
            }
        }

        return true;
    }

    export function equals(lhs: any, rhs: any, options?: EqualsOptions) {
        if (lhs === rhs || (lhs !== lhs && rhs !== rhs)) {
            return true;
        }

        if (options?.lazyString) {
            const result =
                (lhs === '' && Types.isUndefined(rhs) ||
                (rhs === '' && Types.isUndefined(lhs)));

            if (result) {
                return true;
            }
        }

        if (isValueObject(lhs) && isValueObject(rhs)) {
            return lhs.equals(rhs);
        }

        if (!lhs || !rhs) {
            return false;
        }

        if (Types.isArray(lhs) && Types.isArray(rhs)) {
            return equalsArray(lhs, rhs, options);
        } else if (Types.isObject(lhs) && Types.isObject(rhs)) {
            return equalsObject(lhs, rhs, options);
        }

        return false;
    }

    export function equalsArray(lhs: ReadonlyArray<any>, rhs: ReadonlyArray<any>, options?: EqualsOptions) {
        if (lhs.length !== rhs.length) {
            return false;
        }

        for (let i = 0; i < lhs.length; i++) {
            if (!equals(lhs[i], rhs[i], options)) {
                return false;
            }
        }

        return true;
    }

    export function equalsObject(lhs: Record<string, any>, rhs: Record<string, any>, options?: EqualsOptions) {
        const lhsKeys = Object.keys(lhs);

        if (lhsKeys.length !== Object.keys(rhs).length) {
            return false;
        }

        for (const key of lhsKeys) {
            if (!equals(lhs[key], rhs[key], options)) {
                return false;
            }
        }

        return true;
    }

    export function isValueObject(value: any) {
        return value && Types.isFunction(value.equals);
    }
}

type EqualsOptions = { lazyString?: boolean };
