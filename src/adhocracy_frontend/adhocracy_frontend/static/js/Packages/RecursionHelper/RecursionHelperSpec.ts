/// <reference path="../../../lib/DefinitelyTyped/jasmine/jasmine.d.ts"/>

import AdhRecursionHelper = require("./RecursionHelper");

export var register = () => {
    describe("RecursionHelper", () => {
        xit("dummy", () => {
            expect(AdhRecursionHelper).toBeDefined();
        });
    });
};