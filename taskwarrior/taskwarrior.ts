import { ITask, Task } from "./task.ts";
import { Opt } from "./utils.ts";

import { existsSync } from "https://deno.land/std/fs/mod.ts";

// ITaskWarrior ----------------------------------------------------------------
abstract class ITaskWarrior {
  /** Path to the configuration file */
  abstract readonly config: Opt<string>;
  abstract createTask(task: ITask): ITask;
  /**
   * Update the given task based on the properties of the new object
   */
  abstract updateTask(task: ITask): ITask;
  /**
   * Delete the given task
   */
  abstract deleteTask(task: ITask): void;
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
  abstract getCompletedTasks(): Promise<ITask[]>;
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
  private async execute(
    cmdArgs: string[]
  ): Promise<{ code: number; stdout: string }> {
    // format command
    cmdArgs = ["task", ...this.configOverrides, ...cmdArgs];

    if (this.config) {
      cmdArgs = [cmdArgs[0], `rc:${this.config}`, ...cmdArgs.slice(1)];
    }

    // TODO Do I need the extra async `f`?

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
      const stderr = new TextDecoder().decode(stderr_);
      throw new Error(`Command execution failed\nStandard Error:\n\n${stderr}`);
    } else {
      const stdout = new TextDecoder().decode(stdout_);
      const code = status.code;
      return { code, stdout };
    }
  }

  createTask(task: ITask): ITask {
    return new Task({ title: "kalimera" });
  }
  updateTask(task: ITask): ITask {
    return new Task({ title: "kalimera" });
  }
  deleteTask(task: ITask): void {}
  searchFor(task: ITask): ITask[] {
    return [];
  }
  async getPendingTasks(): Promise<ITask[]> {
    const {code, stdout} = await this.execute(["export", "status=pending"]);
    return this.parseJsonTasksList(stdout);
  }
  async getCompletedTasks(): Promise<ITask[]> {
    const {code, stdout} = await this.execute(["export", "status=completed"]);
    return this.parseJsonTasksList(stdout);
  }

  /**
   * Parse the output of a TaskWarrior export command. The latter dumps its data
   * in a JSON array
   *
   * @todo Make a unittest for this
   */
  parseJsonTasksList(str: string): Task[] {
    // deno-lint-ignore ban-types
    const json: Array<object> = JSON.parse(str);

    //
    // JSON Objects --> Tasks
    //
    const tasks = json.map((json_el) => {
      // deno-lint-ignore no-explicit-any
      const uuid = (<any>json_el)["uuid"];
      // deno-lint-ignore no-explicit-any
      delete (<any>json_el)["uuid"];

      // initialise a new task
      const t = new Task(json_el);
      t.uuid = uuid;

      return t;
    });

    return tasks;
  }
  sync(): void {
    // TODO
  }
}
