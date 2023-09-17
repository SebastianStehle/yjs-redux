# Redux Binding for YJS

Connects a redux store to yjs (https://docs.yjs.dev/) with support for all kind of javascript objects, including custom classes.

## Install

```
npm i yjs-redux
```

## General Usage

```ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { bind, SyncOptions } from 'yjs-redux';

const ydoc = new Y.Doc();

new WebrtcProvider('demo-room', ydoc);

const options: SyncOptions = {
    typeResolvers: {},
    valueResolvers: {},
    syncAlways: true // Also sync arrays and objects.
};

// Call this for every slice you want to synchronize.
const binder = bind(ydoc, 'tasks', options);

export const store = configureStore({
    reducer: binder.enhanceReducer(combineReducers({
        ... YOUR REDUCERS
    })),
    middleware: [binder.middleware()]
});

export type RootState = ReturnType<typeof store.getState>;
```

## Features

### Reduces changes

This implementation keeps the changes low and only synchronizes the minimum amount of changes as they have happened in the redx store. Changes are only applied when the object has been changed. This guarantees best performance for react equality checks and for writing selectors.

### Custom Type system

By default we distinguish between custom types, that have the following properties:

* `__typeName`: Unique type name within your redux store.
* `__instanceId`: Globally unique ID for an object and updated versions of the same object.

Only when the type name is present values are either mapped to `Y.Array` or `Y.Map` instances. This guarantees that values that should be treated as atomar values are not updated partially. Consider an object position with an **x** and **y** property. If we would map this property to a map and two users would move an object simultanously, we could end up with an position that is a combination of both updates.

If you want to map all values you can set the `syncAlways` property to `true`.

### Insert and Removal detection

Inserts to an array are automatically detected. This keeps the number of changes low and improves the network performance and the reduces the number of updates in your components or selectors.

### Support for custom value types

If you have implemented custom value types like vectors, colors and so on as classes, you can implement the `ValueResolver` interface to support the serialization of these values.

```ts
import { ValueResolver } from 'yjs-redux';

class Color {
    public readonly __typeName = Color.TYPE_NAME;

    public static readonly TYPE_NAME = 'Color';

    public constructor(
        public readonly value: string
    ) {
    }
}

class ColorValueResolver implements ValueResolver<Color> {
    public static readonly INSTANCE = new ColorValueResolver();

    private constructor() {
    }

    public fromYJS(source: SourceObject): Color {
        return new Color(source['value'] as string);
    }

    public fromValue(source: Color): Readonly<{ [key: string]: unknown; }> {
        return { value: source.value };
    }
}

const options: SyncOptions = {
    typeResolvers: {
    },
    valueResolvers: {
        [Color.TYPE_NAME]: ColorValueResolver.INSTANCE
    },
    syncAlways: true
};
```

### Support for custom classes

Classes that are not handled as value types and can be updated partially can also be mapped to yjs if you implement one of the following interfaces:

* `ArrayTypeResolver`: If your type should be mapped to `Y.Array` instance.
* `ObjectTypeResolver`: If you type should be mapped to `Y.Map` instance.

For example we can implement custom immutable class like this:

```ts
import { ObjectDiff, ObjectTypeResolver, SourceObject } from 'yjs-redux';

class ImmutableArray<T> {
    public readonly __typeName = ImmutableArray.TYPE_NAME;

    public static readonly TYPE_NAME = 'ImmutableArray';

    constructor(
        public readonly __instanceId: string,
        public readonly __generation: number,
        public readonly items: ReadonlyArray<T>,
    ) {
    }
}

class ImmutableArrayResolver<T> implements ArrayTypeResolver<ImmutableArray<T>> {
    public readonly sourceType = 'Array';

    public static readonly INSTANCE = new ImmutableArrayResolver();

    private constructor() {
    }

    public create(source: SourceArray): ImmutableArray<T> {
        return new ImmutableArray<T>(idGenerator(), 0, source as T[],);
    }

    public syncToYJS(value: ImmutableArray<T>): SourceArray {
        return value.items;
    }

    public syncToObject(existing: ImmutableArray<T>, diffs: ArrayDiff[]): ImmutableArray<T> {
        const newItems = [...existing.items];

        for (const diff of diffs) {
            if (diff.type === 'Set') {
                newItems[diff.index] = diff.value as T;
            } else if (diff.type === 'Insert') {
                newItems.splice(diff.index, 0, diff.value as T);
            } else {
                newItems.splice(diff.index, 1);
            }
        }

        return new ImmutableArray<T>(existing.__instanceId, existing.__generation + 1, newItems);
    }
}
```

## Contributing

Contributions are very welcome. Just go to the example folder and run:

```
npm i
npm run test
// OR
npm run dev
```

We use vite for the example and therefore it was easy to integrate vitest into the project for running the tests. Therefore the tests are in the example folder for now.

## How it works

### Sync from Redux to YJS

To synchronize from redux to yjs we compare the current and the previous state and compare the value. Because of the immutable nature of redux you can usually skip large parts of the state tree, that have not been changed. Then we basically do one of the following operations:

* Set a map value.
* Remove an map key.
* Push an item to an array.
* Remove an item from an array.
* Create new yjs structures when new state is created.

Whenever we create a yjs we also define where this object. We create a bidirectional mappign with the following properties.

* `yjs[__source] = state` to define the synchronization source from a yjs type. We can use that to resolve the state object from a yjs instance.
* `state[__target] = yjs` to define the synchronization yjs type for a state object. We can use that to resolve the yjs type from a state object.

### Sync from YJS
 
We use the events from synchronize from yjs to states. Because of the immutable nature of redux, we always have to update all parents if we update one of the ancestores. Therefore we use the following flow:

* From and event target (the yjs type) we resolve the source state object.
* We mark the state object as **invalid** and attach the event to the state object.
* We loop to the root object using the `parent` property of the yjs type to also navigate to the state root and also mark all items as invalid, that need to be changed.

Lets assume we have the following state and that we receive and update for the paragraph. This would create the following metadata.

```
root [__invalid: true]
   pages [__invalid: true]
      page [__invalid: true]
         paragraphs [__invalid: true]
            paragraph [__invalid: true, event]
      page
         paragraphs
            paragraph
   images
      image
```

Now we have to loop from root to the children and update all state objects using a depth first search.