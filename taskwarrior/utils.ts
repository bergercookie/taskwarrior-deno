type Opaque<K, T> = T & { __TYPE__: K };

/**
 * Optional type
 */
export type Opt<T> = T | undefined;

/**
 * UUID of a task
 */
export type UUID = Opaque<"UUID", string>;
