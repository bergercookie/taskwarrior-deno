import { UUID, Opt } from "./utils.ts";
import { _ } from "./deps.ts";

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

  /**
   * Convert the given task to a format suitable to be given to taskwarrior on
   * the command line
   * @todo unittest this
   */
  formatForCLI(): string[];
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
  recur?: number; // Duration in milliseconds
  scheduled?: Date;
  start?: Date;
  status?: TaskStatus;
  tags?: string[];
  until?: Date;
  urgency?: number;
  wait?: Date;

  [Symbol.iterator](): IterableIterator<any>;
  // I can index my type using a string, i.e., props["string"]
  // deno-lint-ignore no-explicit-any
  [key: string]: any;
}

// Task ------------------------------------------------------------------------

// deno-lint-ignore no-explicit-any
type FieldConverterFunction = (val: any) => string;

export class Task implements ITask {
  private _uuid?: UUID;
  private _props: ITaskProperties;

  constructor(props: ITaskProperties) {
    this._props = Task.toTaskProperties(props);
  }

  private static toTaskProperties(
    obj: Record<string, unknown>
  ): ITaskProperties {
    // dates
    const dateFields = [
      "due",
      "end",
      "entry",
      "modified",
      "scheduled",
      "start",
      "until",
      "wait",
    ];

    for (const field of dateFields) {
      if (field in obj) {
        obj[field] = Task.parseISO8601Date(<string>Object(obj)[field]);
      }
    }

    // UUIDs
    // TaskPriority
    // TaskStatus

    return Object(obj);
  }

  private static parseISO8601Date(dateStr: string): Date {
    // raise on invalid date
    const year = dateStr.substr(0, 4);
    const month = dateStr.substr(4, 2);
    const day = dateStr.substr(6, 2);
    const hours = dateStr.substr(9, 2);
    const minutes = dateStr.substr(11, 2);
    const seconds = dateStr.substr(13, 2);
    return new Date(`${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`);
  }

  /**
   * Map each one of the fields of a TaskWarrior task, to a function that
   * formats it accordingly when called.
   */
  private static getConvertersMap(): Map<string, FieldConverterFunction> {
    // TODO Handle it as an actual date
    const dateC = (key: string, val: Date) => {
      return `${key}:${val
        .toISOString()
        .replace(/-/g, "")
        .replace(/:/g, "")
        .replace(".", "")}`;
    };

    const m = new Map<string, FieldConverterFunction>([
      [
        "description",
        (val: string) => {
          return `description:"${val}"`;
        },
      ],
      [
        "due",
        (val: Date) => {
          return dateC("due", val);
        },
      ],
      [
        "entry",
        (val: Date) => {
          return dateC("entry", val);
        },
      ],
      [
        "end",
        (val: Date) => {
          return dateC("end", val);
        },
      ],
      [
        "start",
        (val: Date) => {
          return dateC("start", val);
        },
      ],
      [
        "until",
        (val: Date) => {
          return dateC("until", val);
        },
      ],
      [
        "wait",
        (val: Date) => {
          return dateC("wait", val);
        },
      ],
      [
        "modified",
        (val: Date) => {
          return dateC("modified", val);
        },
      ],
      [
        "scheduled",
        (val: Date) => {
          return dateC("scheduled", val);
        },
      ],
      [
        "project",
        (val: string) => {
          return `project:"${val}"`;
        },
      ],
      [
        "status",
        (val: string) => {
          return `status:"${val}"`;
        },
      ],
      [
        "tags",
        (val: string[]) => {
          return `tags:"${val.join(",")}"`;
        },
      ],
    ]);
    // TODO recur
    // TODO priority
    // TODO depends

    return m;
  }

  private static readonly converters = Task.getConvertersMap();

  // deno-lint-ignore no-explicit-any
  private formatFieldToCLI(key: string, val: any): Opt<string> {
    const catchall = (key: string) => {
      console.warn(
        `Don't know how to format ${key} field for the to the command line.`
      );
      return undefined;
    };
    const converter = Task.converters.get(key) ?? catchall;
    return converter(val);
  }

  get props(): ITaskProperties {
    return this._props;
  }

  set props(val: ITaskProperties) {
    this._props = Task.toTaskProperties(val);
  }

  get annotations(): TaskAnnotation[] {
    return this.props.annotations ?? [];
  }
  set annotations(val: TaskAnnotation[]) {
    this.props.annotations = val;
  }

  get uuid(): Opt<UUID> {
    return this._uuid;
  }

  set uuid(val: Opt<UUID>) {
    this._uuid = val;
  }

  formatForCLI(): string[] {
    // make a copy - change that instead
    const cpy = _.cloneDeep(this);

    // annotations can't appear in the CLI; instead use the annotation() getter
    // to fetch them from the task
    delete cpy.props["annotations"];

    //
    // assemble CLI
    //

    // specify only one of ID, UUID. This ID may still be empty, e.g., if this
    // task hasn't been inserted to taskwarrior yet.
    delete cpy.props["id"];

    // cannot pass these to the CLI
    delete cpy.props["imask"];
    delete cpy.props["mask"];
    delete cpy.props["urgency"];


    // TODO A little bit of functional prog wouldn't hurt.
    const cliArgs: string[] = [];
    for (const [key, val] of Object.entries(cpy.props)) {
      const cur = `${this.formatFieldToCLI(key, val)}`;
      if (cur) {
        cliArgs.push(cur);
      }
    }

    return cliArgs;
  }
}
