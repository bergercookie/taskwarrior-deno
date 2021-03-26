import { TaskWarrior } from "./taskwarrior.ts";
import { Task, TaskPriority, TaskAnnotation } from "./task.ts";

// workaround because of isolatedModules - https://github.com/microsoft/TypeScript/issues/28481
export type UUID = import("./utils.ts").UUID;

export { TaskWarrior, Task, TaskPriority, TaskAnnotation};
