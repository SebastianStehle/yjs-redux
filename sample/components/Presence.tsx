/* eslint-disable @typescript-eslint/no-explicit-any */
import * as awarenessProtocol from 'y-protocols/awareness.js';
import * as React from 'react';
import { getRandomUser } from './colors';
import { idGenerator } from '../immutability/helpers';

type UserInfo = { id: string, color: string, initial: string, self?: true };

const currentUser = { id: idGenerator(), ...getRandomUser() };

export const Presence = (props: { awareness: awarenessProtocol.Awareness }) => {
    const { awareness } = props;
    const [users, setUsers] = React.useState([] as UserInfo[]);

    React.useEffect(() => {
        awareness.on('change', () => {
            const users: UserInfo[] = [];
            const values = awareness.getStates().values();

            // eslint-disable-next-line no-constant-condition
            while (true) {
                const next = values.next();

                if (next.done) {
                    break;
                }

                const user = next.value as UserInfo;

                if (user?.id) {
                    users.push(user);
                }
            }

            users.sort((a, b) => {
                return a.initial.localeCompare(b.initial);
            });

            setUsers(users);
        });

        awareness.setLocalState(currentUser);
    }, [awareness]);

    return (
        <div className='users'>
            {users.map((user, i) =>
                <div key={user.initial} className='user' style={{ backgroundColor: user.color, zIndex: 1000 - i }}>
                    {user.initial}
                </div>
            )}
        </div>
    );
};