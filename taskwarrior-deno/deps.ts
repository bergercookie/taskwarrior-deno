export { existsSync } from "https://deno.land/std/fs/mod.ts";

// lodash ----------------------------------------------------------------------
import "https://deno.land/x/lodash@4.17.19/dist/lodash.js";
// deno-lint-ignore no-explicit-any
const _ = (self as any)._;
export { _ };
