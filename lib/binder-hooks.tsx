/* eslint-disable react-refresh/only-export-components */
import * as React from 'react';
import { Binder } from './binder';

const YReduxBinderContext = React.createContext<Binder>(null!);

export function useYjsReduxBinder() {
    return React.useContext(YReduxBinderContext);
}

export const YjsReduxBinderProvider = (props: { binder: Binder, children: React.ReactNode }) => {
    return (
        <YReduxBinderContext.Provider value={props.binder}>
            {props.children}
        </YReduxBinderContext.Provider>
    );
};