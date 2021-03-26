import { UUID, Opt } from "./utils.ts";
import { _ } from "./deps.ts";

// ATask -----------------------------------------------------------------------
export abstract class ATask {
  /**
   * UUID of the Task
   * This should be the main *unique* field that identifies a Task object (i.e.,
   * don't rely on `id`, as the latter may change upon a TaskWarrior deletion,
   * addition)
   *
   * A task may not have been assigned a UUID yet. This is the case with newly
   * created tasks which haven't been passed to the TaskWarrior CLI yet.
   */
  abstract readonly uuid?: UUID;
  abstract props: ATaskProperties;

  /**
   * Convert the given task to a format suitable to be given to taskwarrior on
   * the command line
   * @todo unittest this
   */
  abstract formatForCLI(): string[];
}

// TODO
export class TaskAnnotation {}

export enum TaskPriority {
  L,
  M,
  H,
}

export enum TaskStatus {
  active,
  completed,
  deleted,
  waiting,
  recurring,
}

// ATaskProperties -------------------------------------------------------------

interface ATaskProperties {
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

export class Task extends ATask {
  private _uuid?: UUID;
  private _props: ATaskProperties;

  constructor(props: ATaskProperties) {
    super();
    // TODO assert types of ATaskProperties even during runtime?
    this._props = props;
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
    const dateC = (key: string, val: Date) => {
      const s = val.toISOString();
      return `${key}:${s.substr(0, s.lastIndexOf("."))}Z`;
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
        `Don't know how to format the ${key} field to the command line.`
      );
      return undefined;
    };
    const converter = Task.converters.get(key) ?? catchall;
    return converter(val);
  }

  get props(): ATaskProperties {
    return this._props;
  }

  set props(val: ATaskProperties) {
    this._props = val;
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

    // specify only UUID (not both UUID and ID). UUID may still be empty if task hasn't been
    // inserted yet
    delete cpy.props["id"];

    // cannot pass these to the CLI
    delete cpy.props["imask"];
    delete cpy.props["mask"];
    delete cpy.props["urgency"];

    // TODO A little bit of functional prog wouldn't hurt.
    const cliArgs: string[] = [];
    for (const [key, val] of Object.entries(cpy.props)) {
      const cur = this.formatFieldToCLI(key, val);
      if (cur) {
        cliArgs.push(cur);
      }
      console.log(`cliArgs: `, cliArgs);
    }

    return cliArgs;
  }
  // deno-lint-ignore no-explicit-any
  public static fromJSON(json: Record<string, any>): ATask {
    for (const field of [
      "due",
      "end",
      "entry",
      "modified",
      "scheduled",
      "start",
      "until",
      "wait",
    ]) {
      if (field in json) {
        json[field] = Task.parseISO8601Date(<string>Object(json)[field]);
      }
    }

    // deno-lint-ignore no-explicit-any
    const uuid = (<any>json)["uuid"];
    // deno-lint-ignore no-explicit-any
    delete (<any>json)["uuid"];

    // create tasks
    const t = new Task(Object(json));
    t.uuid = uuid;

    // TaskPriority
    // TaskStatus

    return t;
  }
}
