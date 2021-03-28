import { ATaskWarrior, getTaskWarrior } from "./taskwarrior.ts";
import { ATask, TaskPriority, TaskAnnotation } from "./task.ts";

// workaround because of isolatedModules - https://github.com/microsoft/TypeScript/issues/28481
export type UUID = import("./utils.ts").UUID;

export { ATaskWarrior, getTaskWarrior, ATask, TaskPriority, TaskAnnotation};
