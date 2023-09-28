/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import * as Y from 'yjs';
import { RootView } from './components/RootView';
import { Nav, Navbar, NavbarBrand, NavItem, NavLink } from 'reactstrap';
import { Presence } from './components/Presence';
import { useYjsReduxBinder } from './../lib';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from './state/store';
import { useNavigate, useParams } from 'react-router';
import { loadProject, newProject } from './state/reducer';
import { useAsyncEffect } from './utils';
import { TiptapCollabProvider  } from "@hocuspocus/provider";

localStorage.log = 'true';

function useInitialToken() {
    const [token, setToken] = React.useState<string | undefined>();
    const params = useParams();

    React.useEffect(() => {
        setToken(params.token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return token;
}

export const App = () => {
    const binder = useYjsReduxBinder();
    const disposer = React.useRef<() => void>();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const routeToken = useInitialToken();
    const rootState = useSelector((state: RootState) => state.tasks);
    const [provider, setProvider] = React.useState<TiptapCollabProvider | null>(null);
    const [undoManager, setUndoManager] = React.useState<Y.UndoManager | null>(null);

    React.useEffect(() => {
        if (routeToken) {
            dispatch(loadProject({ identity: routeToken }));
        }
    }, [dispatch, routeToken]);

    React.useEffect(() => {
        if (rootState.isEmpty) {
            navigate('/');
        } else {
            navigate(`/${rootState.identity}`);
        }
    }, [navigate, rootState]);

    useAsyncEffect(async cancellation => {
        if (cancellation?.isCancelled) {
            return undefined;
        }

        const provider = new TiptapCollabProvider({ appId: '7ME5ZQMY', name: rootState.identity });

        setProvider(provider);

        await new Promise(resolve => {
            const handler = () => {
                if (!provider.hasUnsyncedChanges && provider.isConnected) {
                    resolve(true);
                }
            };

            provider.on('unsyncedChanges', handler);
        });

        if (cancellation?.isCancelled) {
            return undefined;
        }
        
        const synchronizer = binder.connectSlice({
            document: provider.document,
            onConnected: root => {
                setUndoManager(new Y.UndoManager(root));
            },
            sliceName: 'tasks'
        });

        disposer.current = () => {
            synchronizer.destroy();
            
            provider.disconnect();
            provider.destroy();
            
            disposer.current = undefined;
        };

        return disposer.current;
    }, [rootState.identity]);

    const doCreate = () => {
        disposer.current?.();
    
        dispatch(newProject());
    };

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
                        <NavLink style={{ cursor: 'pointer' }} onClick={doCreate}>New Project</NavLink>
                    </NavItem>

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
