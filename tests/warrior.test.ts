import { assertEquals } from "https://deno.land/std@0.89.0/testing/asserts.ts";
import makeloc from 'https://deno.land/x/dirname@1.1.2/mod.ts';

import TaskWarrior from "../taskwarrior/taskwarrior.ts"

function init(): TaskWarrior {
    console.log(`Deno.cwd: `, Deno.cwd);

    const { __dirname,  __filename } = makeloc(import.meta);
    Deno.chdir(__dirname);
    return new TaskWarrior(`${__dirname}/test.taskrc`);
}

Deno.test("fetch tasks", async () => {
    const expectedPendingTasks = 5;
    const expectedCompletedTasks = 1;
    const expectedTotalTasks = expectedPendingTasks + expectedCompletedTasks;

    const tw = init();

    // check length
    const pendingTasks = await tw.getPendingTasks();
    assertEquals(pendingTasks.length, expectedPendingTasks);

    const completedTasks = await tw.getCompletedTasks();
    assertEquals(completedTasks.length, expectedCompletedTasks);

    const allTasks = await tw.getAllTasks();
    assertEquals(allTasks.length, expectedTotalTasks);

    // check contents of a single tasks to see if they match - property by
    // property
    console.log(`pendingTasks[0]: `, pendingTasks[0]);
})
