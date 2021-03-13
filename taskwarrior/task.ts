import { UUID, Opt } from "./utils.ts";

// ITask -----------------------------------------------------------------------
export interface ITask {
  /**
   * UUID of the Task
   * This should be the main *unique* field that identifies a Task object (i.e.,
   * don't rely on `id`, as the latter may change upon a TaskWarrior deletion,
   * addition)
   *
   * A task may not have been assigned a UUID yet. This is the case with newly
   * created tasks which haven't been passed to the TaskWarrior CLI yet.
   */
  readonly uuid?: UUID;
  props: ITaskProperties;
}

// TODO
export class TaskAnnotation {}

export enum TaskPriority {
  L,
  M,
  H,
}

export enum TaskStatus {
  pending,
  completed,
  deleted,
  waiting,
  recurring,
}

// ITaskProperties -------------------------------------------------------------

// TODO Wrap this around a Property type (include the name)?
interface ITaskProperties {
  annotations?: TaskAnnotation[];
  depends?: UUID[];
  description?: string;
  due?: Date;
  end?: Date;
  entry?: Date;
  id?: number;
  imask?: number;
  mask?: string;
  modified?: Date;
  priority?: TaskPriority;
  project?: string;
  recur?: number // Duration in milliseconds
  scheduled?: Date;
  start?: Date;
  status?: TaskStatus;
  tags?: string[];
  title?: string;
  until?: Date;
  urgency?: number;
  wait?: Date;
}

// Task ------------------------------------------------------------------------

export class Task implements ITask {
  private _uuid?: UUID;
  private _props: ITaskProperties;

  constructor(props: ITaskProperties) {
    this._props = props;
  }

  get props(): ITaskProperties {
    return this._props;
  }

  set props(val: ITaskProperties) {
    this._props = val;
  }

  get uuid(): Opt<UUID> {
    return this._uuid;
  }

  /**
   * Value should be a valid UUID (and not undefined). If undefined is given it
   * will throw an error at runtime. This is due to a constraint in TypeScript.
   *
   * @sa https://github.com/microsoft/TypeScript/issues/2521
   */
  set uuid(val: Opt<UUID>) {
    this._uuid = val;
  }
}
