import {Transform} from "stream";

export class GroupedTransformer<T1> extends Transform {

    private _buff: T1[];
    private readonly size: number;

    constructor(size: number) {
        super({ objectMode: true });
        this._buff = [];
        this.size =  size;
    }

    _transform(chunk: T1, encoding: string, callback: (error?: (Error | null), data?: any) => void): void {
        try {
            this._buff.push(chunk);

            if (this._buff.length >= this.size) {
                this.push(this._buff.splice(0));
            }

            callback();
        } catch (e) {
            callback(e);
        }
    }

    _flush(callback: (error?: (Error | null), data?: any) => void): void {
        if (this._buff.length !== 0) {
            this.push(this._buff.splice(0));
        }
        callback();
    }
}
