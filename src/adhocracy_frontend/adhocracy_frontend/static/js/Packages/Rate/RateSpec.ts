/// <reference path="../../../lib/DefinitelyTyped/jasmine/jasmine.d.ts"/>

import q = require("q");

import RIRateVersion = require("../../Resources_/adhocracy_core/resources/rate/IRateVersion");
import SIRate = require("../../Resources_/adhocracy_core/sheets/rate/IRate");
import AdhRate = require("./Rate");
import AdhRateAdapter = require("./Adapter");
import PreliminaryNames = require ("../PreliminaryNames/PreliminaryNames");


export var register = () => {
    describe("Rate", () => {
        var scopeMock;
        var httpMock;
        var userMock;

        var rateableResource;
        var postPoolResource;
        var rateResources;

        beforeEach(() => {
            scopeMock = {
                refersTo: "comment_or_something"
            };

            httpMock = {
                get: () => q.when(),
                getNewestVersionPathNoFork: () => q.when()
            };

            rateResources = [
                {
                    content_type: "adhocracy_core.resources.rate.IRateVersion",
                    path: "r1",
                    data: {
                        "adhocracy_core.sheets.rate.IRate": {
                            subject: "user1",
                            object: "comment_or_something",
                            rate: 1
                        }
                    }
                },
                {
                    content_type: "adhocracy_core.resources.rate.IRateVersion",
                    path: "r2",
                    data: {
                        "adhocracy_core.sheets.rate.IRate": {
                            subject: "user2",
                            object: "comment_or_something",
                            rate: 1
                        }
                    }
                },
                {
                    content_type: "adhocracy_core.resources.rate.IRateVersion",
                    path: "r3",
                    data: {
                        "adhocracy_core.sheets.rate.IRate": {
                            subject: "user3",
                            object: "comment_or_something",
                            rate: 0
                        }
                    }
                },
                {
                    content_type: "adhocracy_core.resources.rate.IRateVersion",
                    path: "r4",
                    data: {
                        "adhocracy_core.sheets.rate.IRate": {
                            subject: "user4",
                            object: "comment_or_something",
                            rate: -1
                        }
                    }
                },
                {
                    content_type: "adhocracy_core.resources.rate.IRateVersion",
                    path: "r5",
                    data: {
                        "adhocracy_core.sheets.rate.IRate": {
                            subject: "user3",
                            object: "something_irrelevant",
                            rate: -1
                        }
                    }
                }
            ];

            postPoolResource = {
                data: {
                    "adhocracy_core.sheets.pool.IPool": {
                        elements: rateResources.map((r) => r.path)
                    }
                }
            };

            rateableResource = {
                data: {
                    "adhocracy_core.sheets.rate.IRateable": {
                        post_pool: "post_pool_path"
                    }
                }
            };

            userMock = {
                userPath: "user3"
            };
        });

        describe("Adapter", () => {
            var adapter : AdhRateAdapter.RateAdapter;
            var rateVersion : RIRateVersion;

            beforeEach(() => {
                adapter = new AdhRateAdapter.RateAdapter();
                rateVersion = new RIRateVersion({ preliminaryNames: new PreliminaryNames() });
                rateVersion.data["adhocracy_core.sheets.rate.IRate"] = new SIRate.Sheet({
                    subject: "sub",
                    object: "obj",
                    rate: 1
                });
            });

            it("rate returns rate correctly", () => {
                expect(adapter.rate(rateVersion)).toEqual(1);
            });

            it("rate sets rate correctly", () => {
                adapter.rate(rateVersion, -1);
                expect(rateVersion.data["adhocracy_core.sheets.rate.IRate"].rate).toEqual(-1);
            });
        });

        describe("resetRates", () => {
            it("clears rates and user rate in scope.", () => {
                scopeMock.rates = {
                    pro: 1,
                    contra: 1,
                    neutral: 1
                };
                scopeMock.thisUsersRate = "notnull";

                AdhRate.resetRates(scopeMock);
                expect(scopeMock.rates.pro).toBe(0);
                expect(scopeMock.rates.contra).toBe(0);
                expect(scopeMock.rates.neutral).toBe(0);
                expect(scopeMock.thisUserRate).toBeUndefined();
            });
        });

        describe("updateRates", () => {
            it("calculates the right totals for pro, contra, neutral and stores them in the scope.", (done) => {
                scopeMock.rates = {
                    pro: 1,
                    contra: 1,
                    neutral: 1
                };
                scopeMock.thisUsersRate = "notnull";

                var httpResponseStack =
                    [rateableResource, postPoolResource]
                    .concat(rateResources)
                    .reverse();
                spyOn(httpMock, "get").and.callFake(() => q.when(httpResponseStack.pop()));

                var adapter = new AdhRateAdapter.RateAdapter();

                AdhRate.updateRates(adapter, scopeMock, q, httpMock, userMock).then(
                    () => {
                        expect(scopeMock.rates.pro).toBe(2);
                        expect(scopeMock.rates.contra).toBe(1);
                        expect(scopeMock.rates.neutral).toBe(1);
                        expect(scopeMock.thisUsersRate.data["adhocracy_core.sheets.rate.IRate"].subject).toBe(userMock.userPath);
                        done();
                    },
                    (msg) => {
                        expect(msg).toBe(false);
                        done();
                    }
                );
            });
        });

        describe("rateController", () => {
            var adapterMock;
            var adhPermissionsMock;
            var adhPreliminaryNamesMock;
            var realUpdateRates;

            beforeEach((done) => {
                adapterMock = jasmine.createSpyObj("adapterMock", ["subject", "object", "rate", "rateablePostPoolPath"]);
                adhPermissionsMock = jasmine.createSpyObj("adhPermissionsMock", ["bindScope"]);

                realUpdateRates = AdhRate.updateRates;
                spyOn(AdhRate, "updateRates").and.returnValue(q.when());

                // only used in untested functions
                adhPreliminaryNamesMock = undefined;

                AdhRate.rateController(adapterMock, scopeMock, q, httpMock, adhPermissionsMock, userMock, adhPreliminaryNamesMock)
                    .then(done, (reason) => {
                        expect(reason).toBe(undefined);
                    });
            });

            afterEach(() => {
                AdhRate.updateRates = realUpdateRates;
            });

            it("sets scope.ready when finished initializing", () => {
                expect(scopeMock.ready).toBe(true);
            });
        });
    });
};