/// <reference path="../../../lib/DefinitelyTyped/jasmine/jasmine.d.ts"/>

import Util = require("./Util");

export var register = () => {
    describe("Util", () => {
        describe("cutArray", () => {
            it("removes single items", () => {
                expect(Util.cutArray([1, 2, 3, 4], 0)).toEqual([2, 3, 4]);
                expect(Util.cutArray([1, 2, 3, 4], 1)).toEqual([1, 3, 4]);
                expect(Util.cutArray([1, 2, 3, 4], -1)).toEqual([1, 2, 3]);
                expect(Util.cutArray([1, 2, 3, 4], -2)).toEqual([1, 2, 4]);
            });
            it("removes single items if 'from' and 'to' are equal", () => {
                expect(Util.cutArray([1, 2, 3, 4], 0, 0)).toEqual([2, 3, 4]);
                expect(Util.cutArray([1, 2, 3, 4], 1, 1)).toEqual([1, 3, 4]);
                expect(Util.cutArray([1, 2, 3, 4], -1, -1)).toEqual([1, 2, 3]);
                expect(Util.cutArray([1, 2, 3, 4], -2, -2)).toEqual([1, 2, 4]);
            });
            it("removes ranges", () => {
                expect(Util.cutArray([1, 2, 3, 4], 0, -1)).toEqual([]);
                expect(Util.cutArray([1, 2, 3, 4], 0, 3)).toEqual([]);
                expect(Util.cutArray([1, 2, 3, 4], 1, 3)).toEqual([1]);
                expect(Util.cutArray([1, 2, 3, 4], 0, 2)).toEqual([4]);
                expect(Util.cutArray([1, 2, 3, 4], 1, -2)).toEqual([1, 4]);
                expect(Util.cutArray([1, 2, 3, 4], -3, -2)).toEqual([1, 4]);
            });
        });

        describe("isArrayMember", () => {
            var isArrayMember = Util.isArrayMember;

            it("finds nothing in empty array.", () => {
                expect(isArrayMember(0, [])).toBe(false);
            });
            it("finds array members if they are present at pos [0].", () => {
                expect(isArrayMember("wef", ["wef", null, 3])).toBe(true);
            });
            it("finds array members if they are present at pos [end].", () => {
                expect(isArrayMember("wef", [null, "wef"])).toBe(true);
            });
            it("finds array members if they are present in between.", () => {
                expect(isArrayMember("wef", [true, "wef", null, 3])).toBe(true);
            });
            it("does not find array members if they are not present.", () => {
                expect(isArrayMember("wef", ["woff", null, 3])).toBe(false);
            });
            it("works on other base types.", () => {
                expect(isArrayMember(true, [true])).toBe(true);
                expect(isArrayMember(false, [true])).toBe(false);
                expect(isArrayMember(1, [1])).toBe(true);
                expect(isArrayMember(0, [1])).toBe(false);
            });
            it("works on null.", () => {
                expect(isArrayMember(null, [null])).toBe(true);
                expect(isArrayMember(null, [3])).toBe(false);
            });
            it("null is not member of ['null'].", () => {
                expect(isArrayMember(null, ["null"])).toBe(false);
            });
            it("returns false for array properties that are not array items (such as length)", () => {
                expect(Util.isArrayMember("length", ["hay", "stack"])).toBe(false);
                expect(Util.isArrayMember(0, ["hay", "stack"])).toBe(false);
            });
        });

        describe("deepcp", () => {
            var samples = [
                null,
                1,
                "test",
                [1, 2, "test"],
                {
                    foo: 1,
                    bar: 2,
                    point: {
                        x: 0,
                        y: 0
                    }
                },
                [null],  // (interesting because it breaks webdriver
                         // array transport through executeJS)
                {"a": 3, "b": null, "c": [null]}
            ];

            it("outputs something that equals input", () => {
                samples.forEach((ob) => {
                    expect(Util.deepcp(ob)).toEqual(ob);
                });
            });
            it("outputs an object that shares no members with the input object", () => {
                var input: {point: {x: number}} = <any>(samples[4]);
                var output = Util.deepcp(input);
                output.point.x = 1;
                expect(input.point.x).not.toBe(1);
            });
            it("does not support copying functions", () => {
                expect(() => Util.deepcp(() => null)).toThrow();
            });
        });

        describe("deepoverwrite", () => {
            it("copies all properties of source to target", () => {
                var source = {
                    foo: 2,
                    bar: 3
                };
                var _target = {
                    foo: 1,
                    baz: 4
                };
                Util.deepoverwrite(source, _target);
                expect(_target.foo).toBe(2);
                expect((<any>_target).bar).toBe(3);
                expect(_target.baz).toBeUndefined();
            });
            it("crashes if either argument is not an object", () => {
                expect(() => Util.deepoverwrite({}, 1)).toThrow();
                expect(() => Util.deepoverwrite({}, "test")).toThrow();
                expect(() => Util.deepoverwrite({}, [])).toThrow();
                expect(() => Util.deepoverwrite(1, {})).toThrow();
                expect(() => Util.deepoverwrite("test", {})).toThrow();
                expect(() => Util.deepoverwrite([], {})).toThrow();
            });
        });

        describe("deepeq", () => {
            var samples = [
                null,
                1,
                "test",
                [1, 2, "test"],
                {
                    foo: 1,
                    bar: 2,
                    point: {
                        x: 0,
                        y: 0
                    }
                }
            ];

            it("reports an object to be equal to itself", () => {
                samples.forEach((ob) => {
                    expect(Util.deepeq(ob, ob)).toBe(true);
                });
            });
            it("reports an object to not be equal to something completely different", () => {
                samples.forEach((ob) => {
                    expect(Util.deepeq(ob, "completelyDifferent")).toBe(false);
                });
            });
            it("returns true for equal objects that are not identical", () => {
                var a = {
                    point: {
                        x: 0,
                        y: 1
                    },
                    foo: "bar"
                };
                var b = {
                    point: {
                        x: 0,
                        y: 1
                    },
                    foo: "bar"
                };
                expect(Util.deepeq(a, b)).toBe(true);
            });
            it("returns false for similar objects with differing values", () => {
                var a = {
                    point: {
                        x: 0,
                        y: 1
                    },
                    foo: "bar"
                };
                var b = {
                    point: {
                        x: 0,
                        y: 2
                    },
                    foo: "bar"
                };
                expect(Util.deepeq(a, b)).toBe(false);
            });
            it("returns false for similar objects with missing keys", () => {
                var a = {
                    point: {
                        x: 0,
                        y: 1
                    },
                    foo: "bar"
                };
                var b = {
                    point: {
                        x: 0,
                    },
                    foo: "bar"
                };
                expect(Util.deepeq(a, b)).toBe(false);
            });
            it("returns false for similar objects with additional keys", () => {
                var a = {
                    point: {
                        x: 0,
                        y: 1
                    },
                    foo: "bar"
                };
                var b = {
                    point: {
                        x: 0,
                        y: 1,
                        z: 1
                    },
                    foo: "bar"
                };
                expect(Util.deepeq(a, b)).toBe(false);
            });
        });

        describe("trickle", () => {
            xit("calls function on every arg in array exactly once within the given timeout.", () => {
                expect(false).toBe(true);

                // there is a timeout mock object in jasmine, but any
                // test of this function would mostly test that it is
                // implemented *in a specific* way, which sais nothing
                // about whether it is implemented *correctly*.
                //
                // `trickle` is a beautiful example of the claim that
                // test coverage is not everything.
            });
        });

        describe("parentPath", () => {
            it("returns '/foo' for '/foo/bar'", () => {
                expect(Util.parentPath("/foo/bar")).toBe("/foo");
            });
            it("returns '' for '/'", () => {
                expect(Util.parentPath("/")).toBe("");
            });
        });

        describe("normalizeName", () => {
            it("returns 'foo_bar' for 'Foo Bar'", () => {
                expect(Util.normalizeName("Foo Bar")).toBe("foo_bar");
            });
            it("is idempotent", () => {
                ["asdkj", "#!8 sajd ksalkjad\n", "foo bar", "Foo Bar", "foo_bar"].forEach((s) => {
                    var normalized = Util.normalizeName(s);
                    expect(Util.normalizeName(normalized)).toBe(normalized);
                });
            });
        });

        describe("formatString", () => {
            it("formats a string", () => {
                expect(Util.formatString("Hello {0} from {1}", "World", "Bernd")).toBe("Hello World from Bernd");
            });
            it("does not replace {n} if there is no n-th parameter", () => {
                expect(Util.formatString("Hello {0} from {1}", "World")).toBe("Hello World from {1}");
            });
        });

        describe("escapeNgExp", () => {
            it("wraps the input in single quotes and escapes any single quotes already in there", () => {
                expect(Util.escapeNgExp("You, me & 'the thing'")).toBe("'You, me & \\'the thing\\''");
            });
        });
    });
};