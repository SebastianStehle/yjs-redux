import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Card, CardBody } from 'reactstrap';
import { addList } from '../state/reducer';
import { RootState } from '../state/store';
import { TaskListView } from './TaskListView';

export const RootView = () => {
    const lists = useSelector((state: RootState) => state.tasks.lists);
    const dispatch = useDispatch();

    const doAdd = () => {
        dispatch(addList());
    };

    return (
        <div className='lists'>
            {Object.entries(lists.raw).map(([key, value]) =>
                <TaskListView list={value} listId={key} key={key} />
            )}

            <Card className='list-add'>
                <CardBody>
                    <Button color='success' size='sm' className='me-1' onClick={doAdd}>
                        Add
                    </Button>
                </CardBody>
            </Card>
        </div>
    );
};