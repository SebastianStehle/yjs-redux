/* eslint-disable @typescript-eslint/no-explicit-any */
export const TypeProperties = {
    /**
     * The unique ID of the object across generations.
     */
    instanceId: '__instanceId',

    /**
     * Used to identity the type name of previous files.
     */
    typeName: '__typeName',

    /**
     * Used to identiy how often an object has been updated.
     */
    generation: '__generation',
};

type TypeInfo = string | undefined | null;

export function getInstanceId(target: unknown) {
    return (target as any)?.[TypeProperties.instanceId] as TypeInfo;
}

export function getTypeName(target: unknown) {
    return (target as any)?.[TypeProperties.typeName] as TypeInfo;
}

export function isSameInstanceId(current: any, previous: any) {
    const currentId = current?.[TypeProperties.instanceId];

    if (!currentId) {
        return false;
    }

    return currentId == previous?.[TypeProperties.instanceId];
}