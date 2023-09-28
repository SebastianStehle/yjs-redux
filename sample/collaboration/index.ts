import * as React from 'react';

const API_URL = process.env.NODE_ENV === 'test_development' ? 'http://localhost:4000' : 'https://api.mydraft.cc';

export async function getCollaborationToken(id: string) {
    const response = await fetch(`${API_URL}/session/${id}`, {
        method: 'POST',
        headers: {
            ContentType: 'text/json',
        },
        body: JSON.stringify({}),
    });

    if (!response.ok) {
        throw Error('Failed to load diagram');
    }

    const stored = await response.json();

    return stored;
}


type AsyncCleanupFunction = () => void;
type AsyncEffectFunction = (cancellation: { isCancelled: boolean }) => Promise<AsyncCleanupFunction | undefined>;

export const useAsyncEffect = (fn: AsyncEffectFunction, dependencies?: React.DependencyList) => {
    const previousCleaner = React.useRef<AsyncCleanupFunction | undefined>();

    React.useEffect(() => {
        previousCleaner.current?.();
        previousCleaner.current = undefined;

        const cancellation = {
            isCancelled: false,
        };

        async function invoke() {
            previousCleaner.current = await fn(cancellation);
        }

        invoke();

        return () => {
            previousCleaner.current?.();
            previousCleaner.current = undefined;

            cancellation.isCancelled = true;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, dependencies);
};