/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Y from 'yjs';
import { Middleware, MiddlewareAPI, Reducer } from 'redux';
import { initToYjs, syncToYjs } from './sync-to-yjs';
import { syncFromYjs } from './sync-from-yjs';
import { DefaultSyncOptions, SyncOptions } from './sync-utils';
import { isFunction, isObject } from './utils';
import { getRootType, yjsToValue } from './sync-internals';
import * as logging from 'lib0/logging';

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
     * @param options - The required options.
     * 
     * @returns The synchronizer.
     */
    connectSlice: (options: ConnectOptions) => SliceSynchonizer;
};

/**
 * Defines the connect options.
 */
export type ConnectOptions = {
    /**
     * The document to sync from.
     */
    document: Y.Doc;

    /**
     * The slice of the redux store or empty not defined if the root should be synced.
     */
    sliceName?: string | null;

    /**
     * Invoked, when the initial sync has been done.
     */
    onSynced?: (synchronizer: SliceSynchonizer, root: Y.AbstractType<any>) => void;

    /**
     * Invoked, when the a sync to yjs has been completed.
     */
    onUpdateToYjs?: (synchronizer: SliceSynchonizer) => void;

    /**
     * Invoked, when the a sync from yjs has been completed.
     */
    onUpdateFromYjs?: (synchronizer: SliceSynchonizer) => void;

    /**
     * Invoked, when the initial sync from yjs has been completed.
     */
    onSyncedAsInit?: (synchronizer: SliceSynchonizer, state: any) => void;

    /**
     * Invoked when a new transaction is created.
     * 
     * @param transaction The transaction.
     * @param action The action that has changed the state.
     * @param newState The current state.
     * @param oldState The previous state.
     */
    onBeforeTransaction?: (transaction: Y.Transaction, action: any, newState: any, oldState: any) => void;

    /**
     * Invoked, when the initial sync to yjs has been completed.
     */
    onSyncedAsDiff?: () => void;
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
                        synchronizer.sync(newState, oldState, action);
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

    const connectSlice = (options: ConnectOptions) => {
        const actualSliceName = options.sliceName || '';
        const actualSynchronizer = synchronizers[actualSliceName];

        if (actualSynchronizer) {
            // The connect method might be called twice, because uses that approach.
            return actualSynchronizer;
        }

        options.sliceName ||= '';
    
        const synchronizer = new SliceSynchonizer(actualOptions, options, actualSliceName, synchronizers);

        if (currentStore) {
            synchronizer.connect(currentStore);
        }

        return synchronizer;
    };

    return { connectSlice, middleware, enhanceReducer };
}

const log = logging.createModuleLogger('yjs-redux');

/**
 * Synchronizes one slice of the redux store to a root type of a yjs document.
 */
export class SliceSynchonizer {
    private isSyncTransactionRunning = false;
    private currentRoot: Y.AbstractType<any> | null = null;
    private currentStore: MiddlewareAPI | null = null;
    private currentUpdate?: { statePrevious: any, stateCurrent: any, action: any };

    constructor(
        private readonly options: SyncOptions,
        private readonly connectOptions: ConnectOptions,
        private readonly sliceName: string,
        private readonly synchronizers: Record<string, SliceSynchonizer>
    ) {
        synchronizers[sliceName] = this;
    }

    /**
     * Returns the current action if the synchronization to yjs is currently in progress.
     * 
     * @returns The current action.
     */
    public getcurrentAction() {
        return this.currentUpdate?.action;
    }

    /**
     * Synchronize from redux to yjs. This is triggered by the middleware.
     * 
     * @param stateCurrent The current state.
     * @param statePrevious The previous state
     * @param action The action that changed the current state to the previous state.
     */
    public sync(stateCurrent: any, statePrevious: any, action: any) {
        const root = this.currentRoot;

        if (!root) {
            throw new Error('Synchronizer has not been connected.');
        }
        
        const sliceCurrent = getSlice(stateCurrent, this.sliceName);
        const slicePrevious = getSlice(statePrevious, this.sliceName);

        if (sliceCurrent === slicePrevious) {
            return;
        }

        this.currentUpdate = {
            statePrevious,
            stateCurrent,
            action
        };

        try {
            this.transact(() => {
                syncToYjs(sliceCurrent, slicePrevious, root, this.options);
            });
        } finally {
            this.currentUpdate = undefined;
        }

        this.connectOptions.onUpdateToYjs?.(this);
    }

    /**
     * Desroy the synchronizer and unsubscribes from all events.
     */
    public destroy() {
        delete this.synchronizers[this.sliceName];

        this.unsubscribe();
    }

    private subscribe(root: Y.AbstractType<any>) {
        this.currentRoot = root;
        this.currentRoot?.observeDeep(this.observerFunction);
        this.connectOptions.document.on('beforeTransaction', this.beforeTransactionFunction);
    }

    private unsubscribe() {
        this.currentRoot?.unobserveDeep(this.observerFunction);
        this.currentRoot = null;
        this.connectOptions.document.off('beforeTransaction', this.beforeTransactionFunction);
    }

    public connect(store: MiddlewareAPI) {
        if (this.currentRoot) {
            // Connect has already been called.
            return;
        }

        this.currentStore = store;

        const sliceName = this.sliceName;
        const sliceExists = !!this.connectOptions.document.share.get(sliceName);
        const initialState = getState(store, this.sliceName);

        // The root will be created if it does not exists, therefore we check first, if it would exist.
        const root = getRootType(this.connectOptions.document, this.sliceName, initialState, this.options);

        if (sliceExists) {
            const state = yjsToValue(root, this.options);

            // If the slice already exists in the document we synchronize from the remote store to the redux store.
            store.dispatch(syncAction({ state, sliceName }));

            this.connectOptions.onSyncedAsInit?.(this, state);
        } else {
            this.transact(() => {
                // Make an initial synchronization which also creates the root type.
                initToYjs(initialState, root, this.options);
            });

            this.connectOptions.onSyncedAsDiff?.();
        }
                
        this.connectOptions.onSynced?.(this, root);
        this.subscribe(root);
    }

    private beforeTransactionFunction = (transaction: Y.Transaction) => {
        if (!this.currentUpdate || !this.connectOptions.onBeforeTransaction) {
            return;
        }

        this.connectOptions.onBeforeTransaction(transaction,
            this.currentUpdate.action,
            this.currentUpdate.stateCurrent,
            this.currentUpdate.statePrevious);
    };

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

            this.connectOptions.onUpdateFromYjs?.(this);
        } catch (e) {
            log('Error in synchronizing from jys', e);
            throw e;
        }
    };

    private transact(handler: () => void) {
        this.isSyncTransactionRunning = true;
        try {
            this.connectOptions.document.transact(() => {
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

const SYNC_TYPE = 'SYNC_FROM_JS';

const syncAction = (payload: { state: unknown; sliceName: string | undefined }) => {
    return { type: SYNC_TYPE, payload };
};