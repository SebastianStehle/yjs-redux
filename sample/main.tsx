/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { binder, store } from './state/store';
import { App } from './App';
import { YjsReduxBinderProvider } from './../lib';
import 'bootstrap/dist/css/bootstrap.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <Provider store={store}>
            <YjsReduxBinderProvider binder={binder}>
                <App />
            </YjsReduxBinderProvider>
        </Provider>
    </React.StrictMode>,
);
