import * as React from 'react';
import { Binder } from "./binder";
import { YReduxBinderContext } from "./binder-hooks";

export const YjsReduxBinderProvider = (props: { binder: Binder, children: React.ReactNode }) => {
    return (
        <YReduxBinderContext.Provider value={props.binder}>
            {props.children}
        </YReduxBinderContext.Provider>
    );
};