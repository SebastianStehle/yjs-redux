/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Y from 'yjs';
import { Middleware, MiddlewareAPI, Reducer } from 'redux';
import { initToYjs, syncToYjs } from './sync-to-yjs';
import { syncFromYjs } from './sync-from-yjs';
import { DefaultSyncOptions, SyncOptions } from './sync-utils';
import { isFunction, isObject } from './utils';
import { yjsToValue } from './sync-internals';
import * as logging from 'lib0/logging';
import { Observable } from 'lib0/observable';

const SYNC_TYPE = 'SYNC_FROM_JS';

const syncAction = (payload: { state: unknown; sliceName: string | undefined }) => {
    return { type: SYNC_TYPE, payload };
};

/**
 * Connects a yjs type to a redux store.
 */
export type Binder = {
    /**
     * Enhances the existing reducer to inject the sync functionality. Register this once.
     * 
     * @param currentReducer - The existing reducer to enhance.
     * 
     * @returns The enhanced reducerr.
     */
    enhanceReducer: <S>(currentReducer: Reducer<S>) => Reducer<S>;

    /**
     * Provides the middleware for the store. Register this once.
     * 
     * @returns The middleware for the store.
     */
    middleware: Middleware;

    /**
     * Connects one part of the state to the document and returns the synchronizer.
     * 
     * @param doc - The yjs document to connect.
     * @param sliceName - The name of the redux slice.
     * 
     * @returns The synchronizer.
     */
    connectSlice: (doc: Y.Doc, sliceName?: string) => SliceSynchonizer;
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
                        [action.payload.sliceName]: action.payload.state
                    } as S;
                } else {
                    return action.payload.state as S;
                }
            }
            
            return currentReducer(state, action);
        };

        return reducer;
    };

    const connectSlice = (doc: Y.Doc, sliceName: string | undefined) => {
        const actualSliceName = sliceName || '';
        const actualSynchronizer = synchronizers[actualSliceName];

        if (actualSynchronizer) {
            // The connect method might be called twice, because uses that approach.
            return actualSynchronizer;
        }
    
        const synchronizer = new SliceSynchonizer(doc, actualOptions, actualSliceName, synchronizers);

        if (currentStore) {
            synchronizer.connect(currentStore);
        }

        return synchronizer;
    };

    return { connectSlice, middleware, enhanceReducer };
}

const log = logging.createModuleLogger('yjs-redux');

type SynchronizerEvents = {
    'connected': (event: { root: Y.Map<any> }) => void;
    'initToYjs': () => void;
    'initFromYjs': () => void;
    'syncedToYjs': () => void;
    'syncedFromYjs': () => void;
};

export class SliceSynchonizer extends Observable<keyof SynchronizerEvents> {
    private readonly events = new EventTarget();
    private isSyncTransactionRunning = false;
    private currentRoot: Y.Map<any> | null = null;
    private currentStore: MiddlewareAPI | null;

    constructor(
        private readonly doc: Y.Doc,
        private readonly options: SyncOptions,
        private readonly sliceName: string,
        private readonly synchronizers: Record<string, SliceSynchonizer>
    ) {
        super();

        synchronizers[sliceName] = this;
    }

    public sync(stateCurrent: any, statePrevious: any) {
        const root = this.currentRoot;

        if (!root) {
            throw new Error('Synchronizer has not been connected.');
        }
        
        const sliceCurrent = getSlice(stateCurrent, this.sliceName);
        const slicePrevious = getSlice(statePrevious, this.sliceName);

        if (sliceCurrent === slicePrevious) {
            return;
        }

        this.transact(() => {
            syncToYjs(sliceCurrent, slicePrevious, root, this.options);
        });

        this.emit('syncedToYjs', []);
    }

    public off<NAME extends keyof SynchronizerEvents>(name: NAME, handler: SynchronizerEvents[NAME]) {
        super.off(name, handler);
    }

    public on<NAME extends keyof SynchronizerEvents>(name: NAME, handler: SynchronizerEvents[NAME]) {
        if (name === 'connected' && this.currentRoot) {
            handler({ root: this.currentRoot });
        }

        super.on(name, handler);
    }

    public destroy() {
        delete this.synchronizers[this.sliceName];

        this.unsubscribe();
    }

    private subscribe(root: Y.Map<any>) {
        this.currentRoot = root;
        this.currentRoot?.observeDeep(this.observerFunction);
    }

    private unsubscribe() {
        this.currentRoot?.unobserveDeep(this.observerFunction);
        this.currentRoot = null;
    }

    public connect(store: MiddlewareAPI) {
        if (this.currentRoot) {
            // Connect has already been called.
            return;
        }

        this.currentStore = store;

        const sliceName = this.sliceName;
        const sliceExists = !!this.doc.share.get(sliceName);

        // The root will be created if it does not exists, therefore we check first, if it would exist.
        const root = this.doc.getMap(sliceName);

        if (sliceExists) {
            const state = yjsToValue(root, this.options);

            // If the slice already exists in the document we synchronize from the remote store to the redux store.
            store.dispatch(syncAction({ state, sliceName }));

            this.emit('initFromYjs', []);
        } else {
            this.transact(() => {
                // Make an initial synchronization which also creates the root type.
                initToYjs(getState(store, sliceName), root, this.options);
            });

            this.emit('initToYjs', []);
        }
                
        this.emit('connected', [{ root }]);
        this.subscribe(root);
    }

    private observerFunction = (events: Y.YEvent<any>[]) => {
        if (!this.currentStore || this.isSyncTransactionRunning) {
            return;
        }

        try {
            const stateOld = getState(this.currentStore, this.sliceName);
            const stateNew = syncFromYjs<any>(stateOld, events, this.options);
    
            if (stateOld === stateNew) {
                return;
            }
                
            this.currentStore.dispatch(syncAction({ state: stateNew, sliceName: this.sliceName }));

            this.emit('syncedFromYjs', []);
        } catch (e) {
            log('Error in synchronizing from jys', e);
            throw e;
        }
    };

    private transact(handler: () => void) {
        this.isSyncTransactionRunning = true;
        try {
            this.doc.transact(() => {
                try {
                    handler();
                } catch (e) {
                    // This exception is sometimes swallowed, therefore we need to log it.
                    log('Error in yjs transaction.', e);
                    throw e;
                }
            });
        }
        finally {
            this.isSyncTransactionRunning = false;
        }
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
