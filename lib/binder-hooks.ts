import { createContext, useContext } from 'react';
import { Binder } from './binder';

export const YReduxBinderContext = createContext<Binder>(null!);

export function useYjsReduxBinder() {
    return useContext(YReduxBinderContext);
}