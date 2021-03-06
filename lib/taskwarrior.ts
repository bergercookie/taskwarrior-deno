import { ATask, Task } from "./task.ts";
import { UUID, Opt } from "./utils.ts";
import { existsSync } from "deno-fs";

import "lodash";
// deno-lint-ignore no-explicit-any
const _ = (self as any)._;

// ATaskWarrior ----------------------------------------------------------------
export abstract class ATaskWarrior {
  /** Path to the configuration file */
  abstract readonly config: Opt<string>;
  abstract createTask(task: ATask): Promise<ATask>;
  /**
   * Update the given task based on the properties of the new object
   */
  abstract updateTask(task: ATask): ATask;
  /**
   * Mark the task with the given UUID as completled
   */
  abstract completeTask(uuid: UUID): void;
  /**
   * Log a completed task
   */
  abstract logTask(task: ATask): void;
  /**
   * Delete the task with the given UUID
   */
  abstract deleteTask(uuid: UUID): void;
  /**
   * Given an incomplete Task object, e.g., one that only contains the title,
   * look for and retrieve Task objects that match.
   */
  abstract searchFor(task: ATask): Promise<ATask[]>;
  /**
   * Retrieve all the active tasks
   */
  abstract getActiveTasks(): Promise<ATask[]>;
  /**
   * Retrieve all the completed tasks
   */
  abstract getCompletedTasks(): Promise<Array<ATask>>;
  /**
   * Get multiple tasks by their UUIDs
   */
  abstract getMultipleTasks(uuid: UUID[]): Promise<ATask[]>;
  /**
   * Fetch the most recently added task
   */
  abstract getLatestTask(): Promise<ATask>;
  /**
   * Fetch the tasks that currently block other tasks
   */
  abstract getBlockingTasks(): Promise<ATask[]>;
  /**
   * Fetch the tasks that are currently blocked by other tasks
   */
  abstract getBlockedTasks(): Promise<ATask[]>;
  /**
   * Fetch the most urgent actionable tasks
   */
  abstract getReadyTasks(): Promise<ATask[]>;
  /**
   * Fetch currently unblocked tasks
   */
  abstract getUnblockedTasks(): Promise<ATask[]>;
  /**
   * Get all tasks regardless of their status
   */
  async getAllTasks(): Promise<ATask[]> {
    return [
      ...(await this.getActiveTasks()),
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
class TaskWarrior extends ATaskWarrior {
  private readonly _config: Opt<string>;
  private readonly configOverrides = [
    "rc.json.array=TRUE",
    "rc.verbose=nothing",
    "rc.confirmation=no",
    "rc.dependency.confirmation=no",
    "rc.recurrence.confirmation=no",
  ];
  constructor(config: Opt<string> = undefined) {
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
        `*** Command execution [${cmdArgs.join(
          " "
        )}] failed ***\n\nStandard Output -----\n\n${stdout}\n\nStandard Error -----\n\n${stderr}`
      );
    } else {
      const stdout = new TextDecoder().decode(stdout_);
      return stdout;
    }
  }

  // TODO Test this
  async getTaskByUUID(uuid: UUID): Promise<ATask> {
    const stdout = await this.execute(["export", uuid]);
    return this.parseJsonSingleTask(stdout);
  }

  // TODO Test this
  async getMultipleTasks(uuids: UUID[]): Promise<ATask[]> {
    const stdout = await this.execute(["export", ...uuids]);
    return this.parseJsonTasksList(stdout);
  }

  async getLatestTask(): Promise<ATask> {
    const stdout = await this.execute(["export", "+LATEST"]);
    return this.parseJsonSingleTask(stdout);
  }

  private static checkTaskNotCreated(task: ATask) {
    if (task.uuid) {
      throw Error(
        `Task that is to be created already contains a UUID - ${task}`
      );
    }
  }

  private static checkTaskCreated(task: ATask) {
    if (!task.uuid) {
      throw Error(
        `Task that that has already been created must contain a UUID - ${task}`
      );
    }
  }

  async createTask(task: ATask): Promise<ATask> {
    TaskWarrior.checkTaskNotCreated(task);

    // TODO Add the annotations manually
    if (!_.isEmpty(task.props.annotations)) {
    }
    await this.execute(["add", ...task.formatForCLI()]);
    return await this.getLatestTask();
  }

  updateTask(task: ATask): ATask {
    // TODO
    return new Task(Object({ description: "kalimera" }));
  }
  async logTask(task: ATask) {
    TaskWarrior.checkTaskNotCreated(task);
    await this.execute(["log", ...task.formatForCLI()]);
    // TODO Don't know how to retrieve the latest logged task
    //      OR how to check that this was successful
  }
  async completeTask(uuid: UUID) {
    // TODO Test it
    await this.execute(["done", uuid]);
  }
  async deleteTask(uuid: UUID) {
    // TODO Test it
    await this.execute(["delete", uuid]);
  }
  async searchFor(task: ATask): Promise<ATask[]> {
    // TODO Implement this - first load all the tasks, then search based on
    // language syntax
    //
    // Searching via a CLI command doesn't seem to work for some bizzare reason
    const stdout = await this.execute(["export", ...task.formatForCLI()]);
    return this.parseJsonTasksList(stdout);
  }
  async getActiveTasks(): Promise<ATask[]> {
    const stdout = await this.execute(["export", "+PENDING"]);
    return this.parseJsonTasksList(stdout);
  }
  async getCompletedTasks(): Promise<ATask[]> {
    const stdout = await this.execute(["export", "+COMPLETED"]);
    return this.parseJsonTasksList(stdout);
  }
  async getBlockingTasks(): Promise<ATask[]> {
    const stdout = await this.execute(["export", "+BLOCKING"]);
    return this.parseJsonTasksList(stdout);
  }
  async getBlockedTasks(): Promise<ATask[]> {
    const stdout = await this.execute(["export", "+BLOCKED"]);
    return this.parseJsonTasksList(stdout);
  }
  async getReadyTasks(): Promise<ATask[]> {
    const stdout = await this.execute(["export", "+READY"]);
    return this.parseJsonTasksList(stdout);
  }
  async getUnblockedTasks(): Promise<ATask[]> {
    const stdout = await this.execute(["export", "+UNBLOCKED"]);
    return this.parseJsonTasksList(stdout);
  }
  /**
   * Parse the output of a TaskWarrior export command. The latter dumps its data
   * in a JSON array
   *
   * @todo Make a unittest for this
   */
  parseJsonTasksList(str: string): ATask[] {
    // deno-lint-ignore ban-types
    const json: Array<object> = JSON.parse(str);

    //
    // JSON Objects --> Tasks
    //
    const tasks = json.map((json_el) => {
      // deno-lint-ignore no-explicit-any
      return Task.fromJSON(<any>json_el);
    });

    return tasks;
  }
  parseJsonSingleTask(str: string): ATask {
    const tasks = this.parseJsonTasksList(str);
    if (tasks.length !== 1) {
      throw Error(
        `Programmatic Error: Asked for the latest task but got more than 1. Tasks list:\n${tasks}`
      );
    }

    return tasks[0];
  }

  sync(): void {
    throw new Error("Not implemented yet.");
  }
}

export function getTaskWarrior(): ATaskWarrior {
  return new TaskWarrior();
}
