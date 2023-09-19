/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Y from 'yjs';
import { Middleware, MiddlewareAPI, Reducer } from 'redux';
import { initToYjs, syncToYjs } from './sync-to-yjs';
import { syncFromYjs } from './sync-from-yjs';
import { DefaultSyncOptions, SyncOptions } from './sync-utils';
import { isFunction, isObject } from './utils';

const SYNC_TYPE = 'SYNC_FROM_JS';

const syncAction = (payload: { value: unknown; sliceName: string | undefined }) => {
    return { type: SYNC_TYPE, payload };
};

export type Binder = {
    // Enhances the existing reducer to inject the sync functionality.
    enhanceReducer: <S>(currentReducer: Reducer<S>) => Reducer<S>;

    // Enhances the middleware pipeline inject the sync functionality.
    middleware: Middleware;

    // Connects one part of the state to the document and returns a function to disconnect.
    connectSlice: (doc: Y.Doc, sliceName?: string) => () => void;
};

export function createYjsReduxBinder(options: Partial<SyncOptions>): Binder {
    const actualOptions: SyncOptions = { ...DefaultSyncOptions, ...options };

    if (!isFunction(actualOptions.isValueType)) {
        actualOptions.isValueType = DefaultSyncOptions.isValueType;
    }

    if (!isObject(actualOptions.typeResolvers)) {
        actualOptions.typeResolvers = DefaultSyncOptions.typeResolvers;
    }

    if (!isObject(actualOptions.valueResolvers)) {
        actualOptions.valueResolvers = DefaultSyncOptions.valueResolvers;
    }

    const synchronizers: Record<string, SliceSynchonizer> = {};

    // Provide the store for synchronizers that are registered after the middleware has started.
    let currentStore: MiddlewareAPI | null = null;

    const middleware: Middleware = store => {
        currentStore = store;

        // Connect all the synchronizers that are registered before the middleware has started.
        for (const synchronizer of Object.values(synchronizers)) {
            synchronizer.connect(store);
        }

        return next => action => {
            const oldState = store.getState();

            const result = next(action);
            
            if (action.type !== SYNC_TYPE) {
                const newState = store.getState();

                if (newState !== oldState) {
                    for (const synchronizer of Object.values(synchronizers)) {
                        synchronizer.sync(newState, oldState);
                    }
                }
            }

            return result;
        };
    };

    const enhanceReducer = <S>(currentReducer: Reducer<S>): Reducer<S> => {
        const reducer: Reducer<S> = (state, action) => {
            if (action.type === SYNC_TYPE) {
                if (action.payload.sliceName) {
                    return {
                        ...state,
                        [action.payload.sliceName]: action.payload.value
                    } as S;
                } else {
                    return action.payload.value as S;
                }
            }
            
            return currentReducer(state, action);
        };

        return reducer;
    };

    const connectSlice = (doc: Y.Doc, sliceName: string | undefined) => {
        const actualSliceName = sliceName || '';

        if (synchronizers[actualSliceName]) {
            // The connect method might be called twice, because uses that approach.
            return () => {};
        }
    
        const synchronizer = new SliceSynchonizer(doc, actualOptions, actualSliceName);

        synchronizers[actualSliceName] = synchronizer;

        if (currentStore) {
            synchronizer.connect(currentStore);
        }

        return () => {
            synchronizer.disconnect();

            delete synchronizers[actualSliceName];
        };
    };

    return { connectSlice, middleware, enhanceReducer };
}

class SliceSynchonizer {
    private disconnectHandler?: () => void;
    private root: Y.AbstractType<any> | null = null;

    constructor(
        public readonly doc: Y.Doc,
        public readonly options: SyncOptions,
        public readonly sliceName: string,
    ) {
    }

    public sync(stateCurrent: any, statePrevious: any) {
        const root = this.root;

        if (!root) {
            throw new Error('Synchronizer has not been connected.');
        }
        
        const sliceCurrent = getSlice(stateCurrent, this.sliceName);
        const slicePrevious = getSlice(statePrevious, this.sliceName);

        if (sliceCurrent === slicePrevious) {
            return;
        }

        this.doc.transact(() => {
            syncToYjs(sliceCurrent, slicePrevious, root, this.options);
        });
    }

    public disconnect() {
        this.disconnectHandler?.();
    }

    public connect(store: MiddlewareAPI) {
        if (this.root) {
            // Connect has already been called.
            return;
        }
            
        this.doc.transact(() => {
            // Make an initial synchronization which also creates the root type.
            this.root = initToYjs(getState(store, this.sliceName), this.doc, this.sliceName, this.options);
        });

        const root = this.root!;

        if (root === null) {
            // This should actually never happen.
            throw new Error('Initial synchronization returns not root object.');
        }
    
        const observerFunction = (events: Y.YEvent<any>[], transaction: Y.Transaction) => {
            if (transaction.local) {
                return;
            }
    
            const stateOld = getState(store, this.sliceName);
            const stateNew = syncFromYjs<any>(stateOld, events, this.options);
    
            if (stateOld !== stateNew) {
                store.dispatch(syncAction({ value: stateNew, sliceName: this.sliceName }));
            }   
        };
    
        root.observeDeep(observerFunction);

        this.disconnectHandler = () => {
            root.unobserveDeep(observerFunction);
        };
    }
}

function getState(store: MiddlewareAPI, sliceName: string) {
    const state = store.getState();

    return getSlice(state, sliceName);
}

function getSlice(state: any, sliceName: string) {
    if (sliceName) {
        return state[sliceName];
    }

    return state;
}
