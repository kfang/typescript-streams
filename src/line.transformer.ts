import {Transform} from "stream";

export class LineTransformer extends Transform {

    private _buff: string;

    constructor() {
        super({ objectMode: true });
        this._buff = ""
    }

    _transform(chunk: any, encoding: string, callback: (error?: (Error | null), data?: any) => void): void {
        try {
            const partial = this._buff + chunk.toString();
            const lines = partial.split(/\r?\n/);

            if (lines.length > 0) {
                this._buff = lines.splice(lines.length - 1, 1)[0];
                lines.forEach((line) => this.push(line));
            }

            callback();
        } catch (e) {
            callback(e);
        }
    }

    _flush(callback: (error?: (Error | null), data?: any) => void): void {
        if (this._buff !== "") {
            this.push(this._buff);
            this._buff = "";
        }
        callback();
    }
}