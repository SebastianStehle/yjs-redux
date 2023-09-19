/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { provider, store } from './state/store';
import { RootView } from './components/RootView';
import 'bootstrap/dist/css/bootstrap.css';
import './index.css';
import { Nav, Navbar, NavbarBrand } from 'reactstrap';
import { Presence } from './components/Presence';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <Provider store={store}>
            <Navbar dark color='primary'>
                <NavbarBrand>
                    Task Board
                </NavbarBrand>

                <Nav className='ml-auto' navbar>
                    <Presence awareness={provider.awareness} />
                </Nav>
            </Navbar>

            <RootView />
        </Provider>
    </React.StrictMode>,
);
