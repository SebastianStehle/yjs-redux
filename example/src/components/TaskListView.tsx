import * as React from 'react';
import { useDispatch } from 'react-redux';
import { Button, Card, CardBody, CardHeader, Col, Row } from 'reactstrap';
import { addTask, deleteList } from '../state/reducer';
import { TaskList } from './../state/state';
import { TaskView } from './TaskView';

type TaskListViewProps = {
    list: TaskList;
    listId: string;
};

export const TaskListView = (props: TaskListViewProps) => {
    const { list, listId } = props;
    const dispatch = useDispatch();

    const doAdd = () => {
        dispatch(addTask({ listId }));
    };

    const doDelete = () => {
        dispatch(deleteList({ listId }));
    };

    return (
        <Card className='list'>
            <CardHeader>
                <Row className='align-items-center'>
                    <Col>
                        {list.title || 'List'} {listId}
                    </Col>
                    <Col xs='auto'>
                        <Button color='success' size='sm' className='me-1' onClick={doAdd}>
                            Add
                        </Button>

                        <Button color='danger' size='sm' outline onClick={doDelete}>
                            Delete
                        </Button>
                    </Col>
                </Row>
            </CardHeader>
            <CardBody>
                {Object.entries(list.tasks.raw).map(([key, value]) =>
                    <TaskView task={value} taskId={key} list={list} listId={listId} key={key} />
                )}
            </CardBody>
        </Card>
    );
};