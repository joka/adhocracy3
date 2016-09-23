/// <reference path="../../../../lib2/types/jasmine.d.ts"/>

import * as q from "q";
import * as _ from "lodash";
import * as AdhTopLevelState from "./TopLevelState";

export var register = () => {

    describe("TopLevelState", () => {
        describe("Service", () => {
            var adhTopLevelState : AdhTopLevelState.Service;
            var areaInput;
            var eventManagerMockClass;
            var locationMock;
            var rootScopeMock;
            var injectorMock;
            var providerMock;
            var adhTrackingMock;
            var trigger;
            var off;
            var on;

            beforeEach(() => {
                areaInput = {};

                on = jasmine.createSpy("on");
                off = jasmine.createSpy("off");
                trigger = jasmine.createSpy("trigger");
                locationMock = jasmine.createSpyObj("locationMock", ["absUrl", "url", "search", "path", "replace"]);
                rootScopeMock = jasmine.createSpyObj("rootScopeMock", ["$watch"]);

                providerMock = jasmine.createSpyObj("providerMock", ["getArea"]);
                providerMock.getArea.and.callThrough();

                adhTrackingMock = jasmine.createSpyObj("adhTrackingMock", ["trackPageView", "setUserId"]);

                injectorMock = jasmine.createSpyObj("injectorMock", ["invoke"]);
                injectorMock.invoke.and.returnValue(areaInput);

                eventManagerMockClass = <any>function() {
                    this.on = on;
                    this.off = off;
                    this.trigger = trigger;
                };

                adhTopLevelState = <any>new AdhTopLevelState.Service(
                    providerMock, eventManagerMockClass, adhTrackingMock, null,
                    locationMock, rootScopeMock, <any>q, injectorMock, null);

                spyOn(adhTopLevelState, "toLocation");

            });

            describe("location handling", () => {
                var adhTopLevelStateWithPrivates : any;
                var areaMock;

                beforeEach(() => {
                    areaMock = jasmine.createSpyObj("areaMock", ["route", "reverse"]);
                    areaMock._basePath = "/adhocracy";
                    areaMock.prefix = "r";
                    areaMock._data = "";

                    adhTopLevelStateWithPrivates = <any>adhTopLevelState;
                    spyOn(adhTopLevelStateWithPrivates, "getArea").and.returnValue(areaMock);

                    locationMock.url = "/" + areaMock.prefix + areaMock._basePath;
                    locationMock.path.and.callFake(() => {return locationMock.url; });
                    locationMock.search.and.returnValue({});

                });

                describe("getArea", () => {
                    var prefix = "p";

                    beforeEach(() => {
                        adhTopLevelStateWithPrivates.getArea.and.callThrough();
                        adhTopLevelStateWithPrivates.area = areaMock;

                        locationMock.url = "/" + prefix + "/foo/bar";
                    });

                    it("extracts prefix", () => {
                        adhTopLevelStateWithPrivates.getArea();
                        expect(providerMock.getArea).toHaveBeenCalledWith(prefix);
                    });

                    it("returns area with route method", () => {
                        var area = adhTopLevelStateWithPrivates.getArea();
                        expect(area.route).toBeDefined();
                    });

                    it("returns area with reverse method", () => {
                        var area = adhTopLevelStateWithPrivates.getArea();
                        expect(area.reverse).toBeDefined();
                    });

                    describe("returns area with template", () => {
                        var template = {};

                        beforeEach(() => {
                            spyOn(adhTopLevelStateWithPrivates, "$templateRequest");
                            adhTopLevelStateWithPrivates.$templateRequest
                                       .and.returnValue({then: (fn) => fn(template)});
                        });

                        it("while passing template", () => {
                            areaInput.template = template;

                            var newArea = adhTopLevelStateWithPrivates.getArea();
                            expect(newArea.template).toBe(template);
                        });

                        it("while passing templateUrl", () => {
                            areaInput.templateUrl = "/path/to/template";

                            var newArea = adhTopLevelStateWithPrivates.getArea();
                            expect(newArea.template).toBe(template);
                        });
                    });
                });

                describe("toLocation", () => {
                    var searchData = {};
                    var areaPath = "/foo/bar";

                    beforeEach(() => {
                        adhTopLevelStateWithPrivates.data = {mykey : "myValue", mykey2: "myValue2"};
                        areaMock.reverse.and.returnValue({
                            path: areaMock._basePath + areaPath,
                            search: adhTopLevelStateWithPrivates.data
                        });
                        adhTopLevelStateWithPrivates.toLocation.and.callThrough();
                        locationMock.search.and.callFake((key?, value?) => {
                            if (key && value) {
                                searchData[key] = value;
                            };
                            return searchData;
                        });
                    });

                    it("adds parameters to location path", () => {
                        adhTopLevelStateWithPrivates.toLocation();
                        expect(searchData).toEqual(adhTopLevelStateWithPrivates.data);
                    });

                    it("updates parameters in location path", () => {
                        searchData["mykey"] = "oldvalue";

                        adhTopLevelStateWithPrivates.data["mykey"] = "newvalue";
                        adhTopLevelStateWithPrivates.toLocation();

                        expect(searchData["mykey"]).toBe("newvalue");
                    });

                    it("sets location path", () => {
                        adhTopLevelStateWithPrivates.toLocation();

                        var path = locationMock.url + areaPath;
                        expect(locationMock.path).toHaveBeenCalledWith(path);
                    });

                    it("updates parameters in location path", () => {
                        searchData["mykey"] = "oldvalue";

                        adhTopLevelStateWithPrivates.data["mykey"] = "newvalue";
                        adhTopLevelStateWithPrivates.toLocation();

                        expect(searchData["mykey"]).toBe("newvalue");
                    });

                    it("sets location path", () => {
                        adhTopLevelStateWithPrivates.toLocation();

                        var path = locationMock.url + areaPath;
                        expect(locationMock.path).toHaveBeenCalledWith(path);
                   });
                });

                describe("fromLocation", () => {

                    beforeEach(() => {
                        areaMock.route.and.callFake(() => q.when(areaMock._data));
                    });

                    it("skips routing if area.skip is true", (done) => {
                        areaMock.skip = true;
                        adhTopLevelStateWithPrivates.fromLocation().then(() => {
                            expect(areaMock.route).not.toHaveBeenCalled();
                            done();
                        });
                    });

                    it("removes area prefix from path", (done) => {
                        locationMock.url = "/r/adhocracy";
                        adhTopLevelStateWithPrivates.fromLocation().then(() => {
                            var path = "/adhocracy";
                            var search = {};
                            expect(areaMock.route).toHaveBeenCalledWith(path, search);
                            done();
                        });
                    });

                    it("does not remove non-area prefixes from path", (done) => {
                        locationMock.url = "/foo/adhocracy";
                        adhTopLevelStateWithPrivates.fromLocation().then(() => {
                            var path = "/foo/adhocracy";
                            var search = {};
                            expect(areaMock.route).toHaveBeenCalledWith(path, search);
                            done();
                        });
                    });

                    it("adds parameters to TopLevelState", (done) => {
                        var data = { mykey: "myvalue"};
                        areaMock._data = data;

                        _.forOwn(data, (value, key) => {
                            expect(adhTopLevelStateWithPrivates.data[key]).toBeUndefined();
                        });

                        adhTopLevelStateWithPrivates.fromLocation().then(() => {
                            _.forOwn(data, (value, key) => {
                                expect(adhTopLevelStateWithPrivates.data[key]).toBe(data[key]);
                            });
                            done();
                        });
                    });

                    it("removes parameters from TopLevelState", (done) => {
                        var data = {};
                        areaMock._data = data;

                        adhTopLevelStateWithPrivates.data = {mykey: "myvalue"};
                        var old = _.clone(adhTopLevelStateWithPrivates.data);

                        adhTopLevelStateWithPrivates.fromLocation().then(() => {
                            _.forOwn(old, (value, key) => {
                                expect(adhTopLevelStateWithPrivates.data[key]).toBeUndefined();

                            });
                            done();
                        });
                    });

                    it("updates parameters in TopLevelState", (done) => {
                        adhTopLevelStateWithPrivates.data = {mykey: "otherValue"};
                        var data = { mykey: "myvalue"};
                        areaMock._data = data;

                        _.forOwn(data, (value, key) => {
                            expect(adhTopLevelStateWithPrivates.data[key]).not.toEqual(value);
                        });

                        adhTopLevelStateWithPrivates.fromLocation().then(() => {
                            _.forOwn(data, (value, key) => {
                                expect(adhTopLevelStateWithPrivates.data[key]).toBe(data[key]);
                            });
                            done();
                        });
                   });
                });
            });

            it("dispatches calls to set() to eventManager", () => {
                adhTopLevelState.set("content2Url", "some/path");
                expect(trigger).toHaveBeenCalledWith("content2Url", "some/path");
            });

            it("dispatches calls to on() to eventManager", () => {
                var callback = (url) => undefined;
                adhTopLevelState.on("content2Url", callback);
                expect(on).toHaveBeenCalledWith("content2Url", callback);
            });

            describe("cameFrom", () => {
                it("getCameFrom reads what setCameFrom wrote", () => {
                    var msg : string;
                    msg = "wefoidsut";
                    adhTopLevelState.setCameFrom(msg);
                    expect(adhTopLevelState.getCameFrom()).toBe(msg);
                    msg = ".3587";
                    adhTopLevelState.setCameFrom(msg);
                    expect(adhTopLevelState.getCameFrom()).toBe(msg);
                    expect(adhTopLevelState.getCameFrom()).toBe(msg);
                });

                it("before first setCameFrom, getCameFrom reads 'undefined'", () => {
                    expect(typeof adhTopLevelState.getCameFrom()).toBe("undefined");
                });

                it("clearCameFrom clears the stored value", () => {
                    var msg : string;
                    msg = "wefoidsut";
                    adhTopLevelState.setCameFrom(msg);
                    adhTopLevelState.clearCameFrom();
                    expect(adhTopLevelState.getCameFrom()).not.toBeDefined();
                });

                describe("goToCameFrom", () => {
                    it("redirects to cameFrom if cameFrom is set and default is not", () => {
                        adhTopLevelState.setCameFrom("foo");
                        adhTopLevelState.goToCameFrom("/");
                        expect(locationMock.url).toHaveBeenCalledWith("foo");
                    });

                    it("redirects to cameFrom if both cameFrom and default are set", () => {
                        adhTopLevelState.setCameFrom("foo");
                        adhTopLevelState.goToCameFrom("bar");
                        expect(locationMock.url).toHaveBeenCalledWith("foo");
                    });

                    it("redirects to default if default is set but cameFrom not", () => {
                        adhTopLevelState.goToCameFrom("bar");
                        expect(locationMock.url).toHaveBeenCalledWith("bar");
                    });
                });
            });
        });
    });
};
