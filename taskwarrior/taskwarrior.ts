import { ITask, Task } from "./task.ts";
import { UUID, Opt } from "./utils.ts";
import { existsSync } from "./deps.ts";

// ITaskWarrior ----------------------------------------------------------------
abstract class ITaskWarrior {
  /** Path to the configuration file */
  abstract readonly config: Opt<string>;
  abstract createTask(task: ITask): Promise<ITask>;
  /**
   * Update the given task based on the properties of the new object
   */
  abstract updateTask(task: ITask): ITask;
  /**
   * Mark the task with the given UUID as completled
   */
  abstract completeTask(uuid: UUID): void;
  /**
   * Delete the task with the given UUID
   */
  abstract deleteTask(uuid: UUID): void;
  /**
   * Given an incomplete Task object, e.g., one that only contains the title,
   * look for and retrieve Task objects that match.
   */
  abstract searchFor(task: ITask): ITask[];
  /**
   * Retrieve all the pending tasks
   */
  abstract getPendingTasks(): Promise<ITask[]>;
  /**
   * Retrieve all the completed tasks
   */
  abstract getCompletedTasks(): Promise<Array<ITask>>;
  /**
   * Fetch the most recently added task
   */
  abstract getLatestTask(): Promise<ITask>;
  /**
   * Get all tasks regardless of their status
   */
  async getAllTasks(): Promise<ITask[]> {
    return [
      ...(await this.getPendingTasks()),
      ...(await this.getCompletedTasks()),
    ];
  }
  /**
   * Sync the object with the updated contents of TaskWarrior
   */
  abstract sync(): void;
}

// DEFAULT_CONFIG_OVERRIDES = {
// }

// TaskWarrior -----------------------------------------------------------------
export default class TaskWarrior extends ITaskWarrior {
  private readonly _config: Opt<string>;
  private readonly configOverrides = [
    "rc.json.array=TRUE",
    "rc.verbose=nothing",
    "rc.confirmation=no",
    "rc.dependency.confirmation=no",
    "rc.recurrence.confirmation=no",
  ];
  constructor(config: Opt<string>) {
    super();

    // configuration file
    if (config && !existsSync(config)) {
      throw Deno.errors.NotFound(config);
    }
    this._config = config;
  }

  get config(): Opt<string> {
    return this._config;
  }

  /**
   * Execute the given command, return a {status, stdout} object if the command
   * succeeds, otherwise, throw an error.
   */
  private async execute(cmdArgs: string[]): Promise<string> {
    // format command
    cmdArgs = ["task", ...this.configOverrides, ...cmdArgs];

    if (this.config) {
      cmdArgs = [cmdArgs[0], `rc:${this.config}`, ...cmdArgs.slice(1)];
    }

    // TODO Do proper error handling - instead of throwing errors with custom
    // messages

    // execute it
    const cmd = Deno.run({
      cmd: cmdArgs,
      stdout: "piped",
      stderr: "piped",
    });

    const [status, stdout_, stderr_] = await Promise.all([
      cmd.status(),
      cmd.output(),
      cmd.stderrOutput(),
    ]);
    cmd.close();

    if (!status.success) {
      const stdout = new TextDecoder().decode(stdout_);
      const stderr = new TextDecoder().decode(stderr_);
      throw new Error(
        `*** Command execution [${cmdArgs.join(" ")}] failed ***\n\nStandard Output -----\n\n${stdout}\n\nStandard Error -----\n\n${stderr}`
      );
    } else {
      const stdout = new TextDecoder().decode(stdout_);
      return stdout;
    }
  }

  async getLatestTask(): Promise<ITask> {
    const stdout = await this.execute(["export", "+LATEST"]);
    const tasks = this.parseJsonTasksList(stdout);
    if (tasks.length !== 1) {
      throw Error(
        `Programmatic Error: Asked for the latest task but got more than 1. Tasks list:\n${tasks}`
      );
    }

    return tasks[0];
  }

  async createTask(task: ITask): Promise<ITask> {
    if (task.uuid) {
      throw Error(
        `Task that is to be created already contains a UUID - ${task}`
      );
    }

    const stdout = await this.execute(["add", ...task.formatForCLI()]);
    console.log("[taskwarrior.ts:122] DEBUGGING STRING ==> 4");
    console.log(`stdout: `, stdout);

    // task +LATEST uuids
    // TODO

    // TODO Add the annotations manually

    // Return the created task
    // TODO
    return Object({ description: "TODO" });
  }
  updateTask(task: ITask): ITask {
    // TODO
    return new Task(Object({ description: "kalimera" }));
  }
  async completeTask(uuid: UUID) {
    // TODO
    await this.execute(["complete", uuid]);
  }
  async deleteTask(uuid: UUID) {
    // TODO
    await this.execute(["delete", uuid]);
  }
  searchFor(task: ITask): ITask[] {
    // TODO
    return [];
  }
  async getPendingTasks(): Promise<ITask[]> {
    const stdout = await this.execute(["export", "status=pending"]);
    return this.parseJsonTasksList(stdout);
  }
  async getCompletedTasks(): Promise<Array<ITask>> {
    const stdout = await this.execute(["export", "status=completed"]);
    return this.parseJsonTasksList(stdout);
  }

  jsonElementToTask(json: Record<string, unknown>): ITask {
    // deno-lint-ignore no-explicit-any
    const uuid = (<any>json)["uuid"];
    // deno-lint-ignore no-explicit-any
    delete (<any>json)["uuid"];

    // initialise a new task
    const t = new Task(Object(json));
    t.uuid = uuid;

    return t;
  }

  /**
   * Parse the output of a TaskWarrior export command. The latter dumps its data
   * in a JSON array
   *
   * @todo Make a unittest for this
   */
  parseJsonTasksList(str: string): ITask[] {
    // deno-lint-ignore ban-types
    const json: Array<object> = JSON.parse(str);

    //
    // JSON Objects --> Tasks
    //
    const tasks = json.map((json_el) => {
      // deno-lint-ignore no-explicit-any
      return this.jsonElementToTask(<any>json_el);
    });

    return tasks;
  }
  sync(): void {
    // TODO
  }
}
