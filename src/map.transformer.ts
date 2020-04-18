import {Transform} from "stream";

export class MapTransformer<T1, T2> extends Transform {

    private readonly fn: (t1: T1) => T2;

    constructor(fn: (t: T1) => T2) {
        super({ objectMode: true });
        this.fn = fn;
    }

    _write(chunk: T1, encoding: string, callback: (error?: (Error | null)) => void): void {
        try {
            const res = this.fn(chunk);
            this.push(res);
            callback();
        } catch (e) {
            callback(e);
        }
    }

}

export class AsyncMapTransformer<T1, T2> extends Transform {

    private readonly fn: (t1: T1) => Promise<T2>;

    constructor(fn: (t: T1) => Promise<T2>) {
        super({ objectMode: true });
        this.fn = fn;
    }

    async _write(chunk: T1, encoding: string, callback: (error?: (Error | null)) => void): Promise<void> {
        try {
            const res = await this.fn(chunk);
            this.push(res);
            callback();
        } catch (e) {
            callback(e);
        }
    }
}