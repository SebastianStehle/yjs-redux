/* eslint-disable @typescript-eslint/no-explicit-any */
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { Root, TaskItem, TaskList } from './state';
import tasksReducer from './reducer';
import { bind, SyncOptions } from './../../../src';
import { ImmutableList, ImmutableMap, ImmutableSet } from '../immutability';
import ImmutableObjectResolver from '../immutability/immutable-object-resolver';
import ImmutableListResolver from '../immutability/immutable-list-resolver';
import ImmutableMapResolver from '../immutability/immutable-map-resolver';
import ImmutableSetResolver from '../immutability/immutable-set-resolver';

const ydoc = new Y.Doc();

new WebrtcProvider('demo-room4', ydoc);

const options: SyncOptions = {
    typeResolvers: {
        Root: ImmutableObjectResolver.create<Root>(values => {
            return new Root(values as any);
        }),
        TaskList: ImmutableObjectResolver.create<TaskList>(values => {
            return new TaskList(values as any);
        }),
        TaskItem: ImmutableObjectResolver.create<TaskItem>(values => {
            return new TaskItem(values as any);
        }),
        [ImmutableList.TYPE_NAME]: ImmutableListResolver.INSTANCE,
        [ImmutableMap.TYPE_NAME]: ImmutableMapResolver.INSTANCE,
        [ImmutableSet.TYPE_NAME]: ImmutableSetResolver.INSTANCE,
    },
    valueResolvers: {}
};

const binder = bind(ydoc, 'tasks', options);

export const store = configureStore({
    reducer: binder.enhanceReducer(combineReducers({
        tasks: tasksReducer
    })),
    middleware: [binder.middleware()]
});

export type RootState = ReturnType<typeof store.getState>;
