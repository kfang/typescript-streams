import {pipeline, PassThrough, Readable, Transform, Writable, Duplex} from "stream";
import fs, {PathLike} from "fs";
import {promisify} from "util";
import {LineTransformer} from "./line.transformer";
import {AsyncMapTransformer, MapTransformer} from "./map.transformer";
import {GroupedTransformer} from "./grouped.transformer";

export class TypedPipeline<T1> {

    public static fromFile(path: PathLike, options?: string | {
        flags?: string;
        encoding?: string;
        fd?: number;
        mode?: number;
        autoClose?: boolean;
        emitClose?: boolean;
        start?: number;
        end?: number;
        highWaterMark?: number;
    }): TypedPipeline<Buffer> {
        return new TypedPipeline<Buffer>(fs.createReadStream(path, options));
    }

    public static fromReadable<T>(readable: Readable): TypedPipeline<T> {
        return new TypedPipeline<T>(readable);
    }

    private readonly _stages: Array<Readable | Duplex>;

    private constructor(source: Readable) {
        this._stages = [source];
    }

    public lines(): TypedPipeline<string> {
        const t = new LineTransformer();
        this._stages.push(t);
        return (this as any as TypedPipeline<string>);
    }

    public map<T2>(fn: (t1: T1) => T2): TypedPipeline<T2> {
        const t = new MapTransformer(fn);
        this._stages.push(t);
        return (this as any as TypedPipeline<T2>);
    }

    public mapAsync<T2>(fn: (t1: T1) => Promise<T2>): TypedPipeline<T2> {
        const t = new AsyncMapTransformer(fn);
        this._stages.push(t);
        return (this as any as TypedPipeline<T2>);
    }

    public filter(fn: (t1: T1) => boolean): TypedPipeline<T1> {
        const t = new Transform({
            objectMode: true,
            transform(chunk: any, encoding: string, callback: (error?: (Error | null), data?: any) => void): void {
                try {
                    if (fn(chunk)) {
                        this.push(chunk);
                    }
                    callback();
                } catch (e) {
                    callback(e);
                }
            }
        });

        this._stages.push(t);

        return this;
    }

    public grouped(size: number): TypedPipeline<T1[]> {
        const t = new GroupedTransformer(size);
        this._stages.push(t);
        return this as any as TypedPipeline<T1[]>;
    }

    public throttle(ms: number): TypedPipeline<T1> {
        return this.mapAsync(async (t1: T1) => {
            await new Promise((resolve) => setTimeout(resolve, ms));
            return t1;
        });
    }

    public async foreach(fn: (t1: T1) => void): Promise<void> {
        const w = new Writable({
            objectMode: true,
            write(chunk: any, encoding: string, callback: (error?: (Error | null)) => void): void {
                try {
                    fn(chunk);
                    callback();
                } catch (e) {
                    callback(e);
                }
            },
        });

        return promisify(pipeline)([...this._stages, w]);
    }

    public async reduce<T2>(fn: (r: T2, t1: T1) => T2, o: T2): Promise<T2> {
        let res = o;

        const w = new Writable({
            objectMode: true,
            write(chunk: any, encoding: string, callback: (error?: (Error | null)) => void): void {
                try {
                    res = fn(res, chunk);
                    callback();
                } catch (e) {
                    callback(e);
                }
            }
        });

        await promisify(pipeline)([...this._stages, w]);
        return res;
    }

    public async toArray(): Promise<Array<T1>> {
        const fn = (r: Array<T1>, t1: T1) => {
            r.push(t1);
            return r;
        };
        return this.reduce(fn, []);
    }

    public toReadable(cb: (err: (NodeJS.ErrnoException | null)) => void): Readable {
        const pass = new PassThrough();
        pipeline([...this._stages, pass], cb);
        return pass;
    }

}
