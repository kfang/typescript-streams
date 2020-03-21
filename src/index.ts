import {pipeline, Readable, Transform, Writable} from "stream";
import fs, {PathLike} from "fs";
import {promisify} from "util";
import {LineTransformer} from "./line.transformer";

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

    private readonly _stages: Array<Readable | Writable>;

    private constructor(source: Readable) {
        this._stages = [source];
    }

    public lines(): TypedPipeline<string> {
        const t = new LineTransformer();
        this._stages.push(t);
        return (this as any as TypedPipeline<string>);
    }

    public map<T2>(fn: (t1: T1) => T2): TypedPipeline<T2> {
        const t = new Transform({
            objectMode: true,
            transform(chunk: T1, encoding: string, callback: (error?: (Error | null), data?: any) => void): void {
                try {
                    this.push(fn(chunk));
                    callback();
                } catch (e) {
                    callback(e);
                }
            },
        });

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

        this._stages.push(w);

        return promisify(pipeline)(this._stages);
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

        this._stages.push(w);
        await promisify(pipeline)(this._stages);
        return  res;
    }

    public async toArray(): Promise<Array<T1>> {
        const fn = (r: Array<T1>, t1: T1) => {
            r.push(t1);
            return r;
        };
        return this.reduce(fn, []);
    }

}
