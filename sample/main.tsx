/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { binder, store } from './state/store';
import { App } from './App';
import { YjsReduxBinderProvider } from './../lib';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.css';
import './index.css';

const router = createBrowserRouter([
    {
        path: ":token?",
        element: (
            <App />
        ),
    }
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
    <Provider store={store}>
        <YjsReduxBinderProvider binder={binder}>
            <RouterProvider router={router} />
        </YjsReduxBinderProvider>
    </Provider>
);
