/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
export function isArray(value: any): value is ReadonlyArray<any> {
    return Array.isArray(value);
}

export function isObject(value: any): value is Object {
    return value && typeof value === 'object' && value.constructor === Object;
}

export function isString(value: any): value is string {
    return typeof value === 'string' || value instanceof String;
}

export function isFunction(value: any): value is Function {
    return typeof value === 'function';
}

export function logException(e: any) {
    (console.error || console.log).call(console, e.stack || e);
}