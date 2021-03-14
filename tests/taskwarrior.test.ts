import {
  assertEquals,
  assert,
} from "https://deno.land/std@0.90.0/testing/asserts.ts";
import { copySync } from "https://deno.land/std/fs/mod.ts";
import makeloc from "https://deno.land/x/dirname@1.1.2/mod.ts";
import * as fsPro from "http://deno.land/x/fs_pro@3.7.0/mod.ts";

import { TaskWarrior } from "../taskwarrior/mod.ts";
import { Task, TaskPriority } from "../taskwarrior/mod.ts";
import { Opt } from "../taskwarrior/utils.ts";

/**
 * Rc File to create in the test directory
 */
enum RcConfig {
  /**
   * Create neither an Rc file nor any initial data for taskwarrior; Caller is responsible of providing both
   */
  None,
  /**
   * Create a sample Rc file and no initial data
   */
  Empty,
  /**
   * Create an Rc file and some initial data
   */
  Minimal,
}

class TestWrapper {
  private _tw: TaskWarrior;
  private _initDataLoc: string;
  private _oldpwd: string;
  /**
   * Directory to run the steps in
   */
  private _runInDir: string;
  /** Path to the TaskWarrior initialization data */

  get tw(): TaskWarrior {
    return this._tw;
  }

  constructor(
    runInDir: Opt<string> = undefined,
    rcConfig: RcConfig = RcConfig.None
  ) {
    this._oldpwd = Deno.cwd();
    const { __dirname, __filename } = makeloc(import.meta);

    this._initDataLoc = `${__dirname}/test_tasks`;
    this._runInDir = runInDir ?? __dirname;

    Deno.chdir(this._runInDir);

    let rcFile: string;
    if (rcConfig == RcConfig.None) {
      rcFile = `${this._runInDir}/test.taskrc`;
    } else {
      // create directory, put a sample rc file there, skip the data creation
      rcFile = "test.taskrc";
      const rcFileData = `data.location=./test_tasks
search.case.sensitive=no
summary.all.projects=yes
weekstart=monday
regex=on`;
      Deno.writeTextFileSync(rcFile, rcFileData);

      if (rcConfig == RcConfig.Minimal) {
        // put some sample data
        copySync(this._initDataLoc, `${this._runInDir}/test_tasks`);
      }
    }

    this._tw = new TaskWarrior(rcFile);
  }

  teardown() {
    // Back to prev directory
    Deno.chdir(this._oldpwd);
  }
}

Deno.test("fetch tasks", async () => {
  const expectedPendingTasks = 5;
  const expectedCompletedTasks = 1;
  const expectedTotalTasks = expectedPendingTasks + expectedCompletedTasks;

  const wrapper = new TestWrapper();

  // check length
  const pendingTasks = await wrapper.tw.getPendingTasks();
  assertEquals(pendingTasks.length, expectedPendingTasks);

  const completedTasks = await wrapper.tw.getCompletedTasks();
  assertEquals(completedTasks.length, expectedCompletedTasks);

  const allTasks = await wrapper.tw.getAllTasks();
  assertEquals(allTasks.length, expectedTotalTasks);

  // check contents of a single tasks to see if they match - property by
  // property
  // TODO
  const latestTask = await wrapper.tw.getLatestTask();
  assert(latestTask.uuid, "Latest task must have a valid UUID");
  {
    const p = latestTask.props;
    assertEquals(p.description, "Spam");
    // month is 0-based
    assertEquals(p.entry, new Date(2019, 7, 24, 20, 59, 20));
    assertEquals(p.modified, new Date(2019, 7, 24, 22, 48, 45));

    // TODO
    // assertEquals(p.priority, TaskPriority.H);
    assertEquals(p.status, "pending");
    assert(p.id);
    assert(p.urgency);

    // TODO Assert annotations
    // TODO Assert dependencies
  }

  wrapper.teardown();
});

Deno.test("create task", async () => {
  const dir = fsPro.Dir.tmpDir();
  console.log(`dir: `, dir.path);
  const wrapper = new TestWrapper(dir.path, RcConfig.Empty);

  const createAndAssertFn = async (desc: string) => {
    const tasksBefore = await wrapper.tw.getPendingTasks();
    const newTask = await wrapper.tw.createTask(
      new Task(Object({ description: desc }))
    );
    const tasksAfter = await wrapper.tw.getPendingTasks();
    assertEquals(tasksAfter.length, tasksBefore.length + 1);

    return newTask;
  };

  // no tasks at first
  const initTasks = await wrapper.tw.getPendingTasks();
  assertEquals(initTasks.length, 0);

  // create a task, verify that it's there
  const desc = "description1";
  await createAndAssertFn(desc);
  // Also check its contents
  const latestTask = await wrapper.tw.getLatestTask();
  console.log(`create - latestTask: `, latestTask);
  // TODO

  // create another
  await createAndAssertFn("description2");

  // and another
  await createAndAssertFn("description3");

  wrapper.teardown();
  dir.delete();
});
