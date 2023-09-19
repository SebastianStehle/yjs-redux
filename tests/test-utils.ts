/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Y from 'yjs';
import { SyncOptions, initToYjs, syncFromYjs } from './../lib/core';

export function testInitialSync(initial: () => any, update: (root: Y.AbstractType<any>, prev: any) => void, options: SyncOptions) {
    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();

    doc1.on('update', (update: Uint8Array) => {
        Y.applyUpdate(doc2, update); 
    });

    doc2.on('update', (update: Uint8Array) => {
        Y.applyUpdate(doc1, update); 
    });

    const initial1 = initial();
    const initial2 = initial();

    const root1 = initToYjs(initial1, doc1, 'slice', options);
    const root2 = initToYjs(initial2, doc2, 'slice', options);

    const state = {
        synced: initial2
    };

    root2.observeDeep((events: any) => {
        state.synced = syncFromYjs(initial2, events, options);
    });

    doc1.transact(() => {
        update(root1, initial1);
    });

    doc1.destroy();
    doc2.destroy();

    return state.synced;
}