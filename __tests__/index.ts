import {TypedPipeline} from "../src";

describe("TypedSource", () => {

    it("should return lines", async () => {
        const arr = await TypedPipeline
            .fromFile(`${__dirname}/__fixtures__/test01.txt`)
            .lines()
            .map((line) => line.replace("line", "foobar"))
            .filter((line) => line !== "foobar0")
            .toArray();

        expect(arr).toEqual([
            "foobar1",
            "foobar2",
            "foobar3",
            "foobar4",
            "foobar5",
        ]);
    });

    it("should count the lines", async () => {
        let count = 0;

        await TypedPipeline
            .fromFile(`${__dirname}/__fixtures__/test01.txt`)
            .lines()
            .foreach(() => count++);

        expect(count).toEqual(6);
    });

});
