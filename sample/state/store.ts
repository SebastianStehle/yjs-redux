/* eslint-disable @typescript-eslint/no-explicit-any */
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { Root, TaskItem, TaskList } from './state';
import tasksReducer from './reducer';
import { createYjsReduxBinder, SyncOptions } from './../../lib';
import { ImmutableList, ImmutableMap, ImmutableSet } from './../immutability';
import ImmutableObjectResolver from './../immutability/immutable-object-resolver';
import ImmutableListResolver from './../immutability/immutable-list-resolver';
import ImmutableMapResolver from './../immutability/immutable-map-resolver';
import ImmutableSetResolver from './../immutability/immutable-set-resolver';

const options: Partial<SyncOptions> = {
    typeResolvers: {
        [ImmutableList.TYPE_NAME]: ImmutableListResolver.INSTANCE,
        [ImmutableMap.TYPE_NAME]: ImmutableMapResolver.INSTANCE,
        [ImmutableSet.TYPE_NAME]: ImmutableSetResolver.INSTANCE,
        [Root.TYPE_NAME]: ImmutableObjectResolver.create<Root>(values => new Root(values as any)),
        [TaskItem.TYPE_NAME]: ImmutableObjectResolver.create<TaskItem>(values => new TaskItem(values as any)),
        [TaskList.TYPE_NAME]: ImmutableObjectResolver.create<TaskList>(values => new TaskList(values as any)),
    },
};

export const binder = createYjsReduxBinder(options);

export const store = configureStore({
    reducer: binder.enhanceReducer(combineReducers({
        tasks: tasksReducer
    })),
    middleware: [binder.middleware]
});

export type RootState = ReturnType<typeof store.getState>;
