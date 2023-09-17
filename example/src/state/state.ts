import { ImmutableMap, ImmutableObject } from "./../immutability";
import { SourceObject, ValueResolver } from "./../../../src";

interface RootProps {
    lists: ImmutableMap<TaskList>;
}

export class Root extends ImmutableObject<RootProps> {
    public get lists() {
        return this.get('lists');
    }

    constructor(values?: RootProps) {
        super({
            lists: ImmutableMap.empty(),
            ...values || {}
        }, 'Root');
    }

    public add(list: TaskList) {
        return this.set('lists', this.lists.set(list.__instanceId, list));
    }

    public remove(id: string) {
        return this.set('lists', this.lists.remove(id));
    }

    public updateList(id: string, updater: (source: TaskList) => TaskList) {
        return this.set('lists', this.lists.update(id, updater));
    }
}

interface TaskListProps {
    tasks: ImmutableMap<TaskItem>;

    title?: string;
}

export class TaskList extends ImmutableObject<TaskListProps> {
    public get tasks() {
        return this.get('tasks');
    }

    public get title() {
        return this.get('title');
    }

    constructor(values?: TaskListProps) {
        super({
            tasks: ImmutableMap.empty(),
            ...values || {},
        }, 'TaskList');
    }

    public add(task: TaskItem) {
        return this.set('tasks', this.tasks.set(task.__instanceId, task));
    }

    public remove(id: string) {
        return this.set('tasks', this.tasks.remove(id));
    }

    public updateTask(id: string, updater: (source: TaskItem) => TaskItem) {
        return this.set('tasks', this.tasks.update(id, updater));
    }

    public setTitle(title: string) {
        return this.set('title', title);
    }
}

interface TaskItemProps {
    color?: Color;

    title?: string;
}

export class TaskItem extends ImmutableObject<TaskItemProps> {
    public get color() {
        return this.get('color');
    }

    public get title() {
        return this.get('title');
    }

    constructor(values?: TaskItemProps) {
        super({
            title: '',
            ...values || {},
        }, 'TaskItem');
    }

    public setColor(color?: Color) {
        return this.set('color', color);
    }

    public setTitle(title?: string) {
        return this.set('title', title);
    }
}

export class Color {
    public readonly __typeName = Color.TYPE_NAME;

    public static readonly TYPE_NAME = 'ImmutableList';

    public constructor(
        public readonly value: string
    ) {
    }
}

export class ColorValueResolver implements ValueResolver<Color> {
    public static readonly INSTANCE = new ColorValueResolver();

    public static readonly TYPE_NAME = Color.TYPE_NAME;

    private constructor() {
    }

    public fromYJS(source: SourceObject): Color {
        return new Color(source['value'] as string);
    }

    public fromValue(source: Color): Readonly<{ [key: string]: unknown; }> {
        return { value: source.value };
    }
}