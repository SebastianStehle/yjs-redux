import * as React from 'react';

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