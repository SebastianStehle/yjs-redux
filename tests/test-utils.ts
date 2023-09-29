/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Y from 'yjs';
import { getRootType, yjsToValue } from './../lib/sync-internals';
import { SyncOptions, initToYjs, syncFromYjs, syncToYjs } from './../lib/core';

export function testInitialSync(initial: any, update: any, options: SyncOptions) {
    const sourceState = initial;
    const sourceDoc = new Y.Doc();
    const sourceRoot = getRootType(sourceDoc, 'slice', sourceState, options);

    // Create an initial state on the source document.
    initToYjs(sourceState, sourceRoot, options);

    const targetDoc = new Y.Doc();

    // Apply the update from the source doc to the target doc to simulate a load from the database.
    Y.applyUpdate(targetDoc, Y.encodeStateAsUpdate(sourceDoc));

    const targetRoot = getRootType(targetDoc, 'slice', sourceState, options);
    const targetState = yjsToValue(targetRoot, options);

    const state = {
        synced: targetState
    };

    // Sync all changes from the source to the target.
    sourceDoc.on('update', (update: Uint8Array) => {
        Y.applyUpdate(targetDoc, update); 
    });

    // Observe the changes at the target.
    targetRoot.observeDeep((events: any) => {
        state.synced = syncFromYjs(targetState, events, options);
    });

    sourceDoc.transact(() => {
        syncToYjs(update, sourceState, sourceRoot, options);
    });

    const afterRead = yjsToValue(targetRoot, options);

    return { afterSync: state.synced, afterRead };
}