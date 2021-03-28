import { assertEquals, assert } from "deno-assert";
import { copySync } from "deno-fs";
import makeloc from "https://deno.land/x/dirname@1.1.2/mod.ts";
import * as fsPro from "http://deno.land/x/fs_pro@3.7.0/mod.ts";

import { TaskWarrior } from "../lib/mod.ts";
import { Task, TaskPriority } from "../lib/mod.ts";
import { Opt } from "../lib/utils.ts";

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
  const expectedActiveTasks = 5;
  const expectedCompletedTasks = 1;
  const expectedTotalTasks = expectedActiveTasks + expectedCompletedTasks;

  const wrapper = new TestWrapper();

  // check length
  const activeTasks = await wrapper.tw.getActiveTasks();
  assertEquals(activeTasks.length, expectedActiveTasks);

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

// TODO Fix this when you have a working search function
Deno.test({
  name: "search tasks",
  ignore: true,
  async fn() {
    const dir = fsPro.Dir.tmpDir();
    console.debug(`Operating in dir: `, dir.path);
    const wrapper = new TestWrapper(dir.path, RcConfig.Empty);

    await wrapper.tw.createTask(
      new Task(
        Object({
          description: "mydescription1",
          tags: ["kalimera", "kalinuxta", "kalispera"],
        })
      )
    );
    await wrapper.tw.createTask(
      new Task(
        Object({
          description: "mydescription2",
          tags: ["kalimera", "kalinuxta", "kalispera"],
        })
      )
    );
    await wrapper.tw.createTask(
      new Task(
        Object({
          description: "mydescription3",
          tags: ["kalinuxta", "kalispera"],
        })
      )
    );
    await wrapper.tw.createTask(
      new Task(
        Object({
          description: "somerandomname",
          tags: ["kalinuxta", "kalispera"],
        })
      )
    );

    const results1 = await wrapper.tw.searchFor(
      new Task(
        Object({
          description: "description",
        })
      )
    );
    assertEquals(results1.length, 3);

    const results2 = await wrapper.tw.searchFor(
      new Task(
        Object({
          description: "description",
          tags: ["kalimera"],
        })
      )
    );
    assertEquals(results2.length, 2);
  },
});

Deno.test("create task", async () => {
  const dir = fsPro.Dir.tmpDir();
  const wrapper = new TestWrapper(dir.path, RcConfig.Empty);

  const createAndAssertFn = async (desc: string) => {
    const tasksBefore = await wrapper.tw.getActiveTasks();
    // TODO Make the dependencies upon the dates explicit
    const newTaskBeforeAdd = new Task(
      Object({
        description: desc,
        entry: new Date(1901000005000), // ~2191
        start: new Date(1901000015000),
        due: new Date(1901000025000),
        until: new Date(1901000020000),
        tags: ["kalimera", "kalinuxta", "kalispera"],
        // TODO Add the rest of the now untested fields (annotations, urgency,...)
        //      + Add it to the loop below
      })
    );
    const newTaskAfterAdd = await wrapper.tw.createTask(newTaskBeforeAdd);

    for (const prop of [
      "description",
      "due",
      "entry",
      "start",
      "until",
      "tags",
    ]) {
      assertEquals(newTaskBeforeAdd.props[prop], newTaskAfterAdd.props[prop]);
    }

    // should have an ID and a UUID
    assert(
      newTaskAfterAdd.props.id,
      `Task should have an ID - task:\n\n${newTaskAfterAdd}`
    );
    assert(
      newTaskAfterAdd.uuid,
      `Task should have an UUID - task:\n\n${newTaskAfterAdd}`
    );

    // make sure we've added a single task after the previous
    const tasksAfter = await wrapper.tw.getActiveTasks();
    assertEquals(tasksAfter.length, tasksBefore.length + 1);

    return newTaskAfterAdd;
  };

  // no tasks at first
  const initTasks = await wrapper.tw.getActiveTasks();
  assertEquals(initTasks.length, 0);

  // create and verify the contents of a bunch of tasks
  await createAndAssertFn("description1");
  await createAndAssertFn("description2");
  await createAndAssertFn("description3");

  wrapper.teardown();
  dir.delete();
});

// TODO Test update
// TODO Test delete
// TODO Test complete
// TODO Test log
// TODO Test searchFor
