/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { RootView } from './components/RootView';
import { Nav, Navbar, NavbarBrand } from 'reactstrap';
import { Presence } from './components/Presence';
import { useYjsReduxBinder } from './../lib';

export const App = () => {
    const binder = useYjsReduxBinder();
    const [provider, setProvider] = React.useState<WebrtcProvider | null>(null);

    React.useEffect(() => {
        const doc = new Y.Doc();
        const provider = new WebrtcProvider('demo-room4', doc);

        setProvider(provider);
        
        const disconnect = binder.connectSlice(doc, 'tasks');

        return () => {
            disconnect();
            
            provider.disconnect();
            provider.destroy();
        };
    }, [binder]);

    if (!provider) {
        return null;
    }

    return (
        <>
            <Navbar dark color='primary'>
                <NavbarBrand>
                    Task Board
                </NavbarBrand>

                <Nav className='ml-auto' navbar>
                    <Presence awareness={provider.awareness} />
                </Nav>
            </Navbar>

            <RootView />
        </>
    );
};
