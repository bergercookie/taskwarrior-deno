"use strict";
exports.__esModule = true;
exports.Task = void 0;
var mod_ts_1 = require("https://deno.land/std/fs/mod.ts");
/**
 * Current file holds the main components for the TypeScript API to TaskWarrior
 */
var Task = /** @class */ (function () {
    function Task() {
    }
    return Task;
}());
exports.Task = Task;
// DEFAULT_CONFIG_OVERRIDES = {
//     'json': {
//         'array': 'TRUE'
//     },
//     'verbose': 'nothing',
//     'confirmation': 'no',
//     'dependency': {
//         'confirmation': 'no',
//     },
//     'recurrence': {
//         'confirmation': 'no'
//     },
// }
var TaskWarrior = /** @class */ (function () {
    function TaskWarrior(config) {
        // configuration file
        this._config = config;
        if (!mod_ts_1.existsSync(this._config)) {
            throw Deno.errors.NotFound(this._config);
        }
    }
    Object.defineProperty(TaskWarrior.prototype, "config", {
        get: function () {
            return this._config;
        },
        enumerable: false,
        configurable: true
    });
    TaskWarrior.prototype.createTask = function (task) {
        console.log("[taskwarrior.ts:90] DEBUGGING STRING ==> 0");
        return new Task();
    };
    TaskWarrior.prototype.updateTask = function (task) {
        console.log("[taskwarrior.ts:93] DEBUGGING STRING ==> 1");
        return new Task();
    };
    TaskWarrior.prototype.deleteTask = function (task) {
        console.log("[taskwarrior.ts:96] DEBUGGING STRING ==> 2");
    };
    TaskWarrior.prototype.sync = function () { };
    return TaskWarrior;
}());
exports["default"] = TaskWarrior;
