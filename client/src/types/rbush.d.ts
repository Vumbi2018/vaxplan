declare module "rbush" {
  export default class RBush<T = any> {
    constructor(maxEntries?: number);
    insert(item: T): this;
    load(items: T[]): this;
    remove(item: T, equalsFn?: (a: T, b: T) => boolean): this;
    clear(): this;
    search(bbox: { minX: number; minY: number; maxX: number; maxY: number }): T[];
    all(): T[];
    collides(bbox: { minX: number; minY: number; maxX: number; maxY: number }): boolean;
    toJSON(): any;
    fromJSON(data: any): this;
  }
}
