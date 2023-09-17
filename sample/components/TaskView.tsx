import * as React from 'react';
import { useDispatch } from 'react-redux';
import { Button, Card, CardBody, CardHeader, Col, Input, Row } from 'reactstrap';
import { deleteTask, setTaskTitle } from '../state/reducer';
import { TaskItem, TaskList } from './../state/state';

type TaskViewProps = {
    list: TaskList;
    listId: string;
    task: TaskItem;
    taskId: string;
};

export const TaskView = (props: TaskViewProps) => {
    const { listId, task, taskId } = props;
    
    const dispatch = useDispatch();
    const [editTitle, setEditTitle] = React.useState(task.title || '');

    React.useEffect(() => {
        setEditTitle(task.title || '');
    }, [task.title]);

    const doDelete = () => {
        dispatch(deleteTask({ listId, taskId }));
    };

    const doSetTitle = () => {
        dispatch(setTaskTitle({ listId, taskId, title: editTitle }));
    };

    return (
        <Card className='task'>
            <CardHeader>
                <Row className='align-items-center'>
                    <Col>
                        Task
                    </Col>
                    <Col xs='auto'>
                        <Button color='danger' size='sm' outline onClick={doDelete}>
                            Delete
                        </Button>
                    </Col>
                </Row>
            </CardHeader>
            <CardBody>
                <Input type='textarea' value={editTitle}
                    onChange={ev => setEditTitle(ev.target.value)}
                    onBlur={doSetTitle} />
            </CardBody>
        </Card>
    );
};
