/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { RootView } from './components/RootView';
import { Nav, Navbar, NavbarBrand, NavItem, NavLink } from 'reactstrap';
import { Presence } from './components/Presence';
import { useYjsReduxBinder } from './../lib';

localStorage.log = 'true';

export const App = () => {
    const binder = useYjsReduxBinder();
    const [provider, setProvider] = React.useState<WebrtcProvider | null>(null);
    const [undoManager, setUndoManager] = React.useState<Y.UndoManager | null>(null);

    React.useEffect(() => {
        const doc = new Y.Doc();

        const provider = new WebrtcProvider('demo-room', doc, {
            signaling: ['wss://signaling.mydraft.cc']
        });

        console.log(`Using client ID ${provider.awareness.clientID}.`);

        setProvider(provider);
        
        const disconnect = binder.connectSlice(doc, 'tasks', root => {
            setUndoManager(new Y.UndoManager(root));
        });

        return () => {
            disconnect();
            
            provider.disconnect();
            provider.destroy();
        };
    }, [binder]);

    const doUndo = () => {
        undoManager?.undo();
    };

    const doRedo = () => {
        undoManager?.redo();
    };

    if (!provider) {
        return null;
    }

    return (
        <>
            <Navbar dark color='primary' expand>
                <NavbarBrand>
                    Task Board
                </NavbarBrand>

                <Nav className='mr-auto' navbar>
                    <NavItem>
                        <NavLink style={{ cursor: 'pointer' }} onClick={doUndo}>Undo</NavLink>
                    </NavItem>

                    <NavItem>
                        <NavLink style={{ cursor: 'pointer' }} onClick={doRedo}>Redo</NavLink>
                    </NavItem>
                </Nav>

                <Nav className='ml-auto' navbar>
                    <Presence awareness={provider.awareness} />
                </Nav>
            </Navbar>

            <RootView />
        </>
    );
};
