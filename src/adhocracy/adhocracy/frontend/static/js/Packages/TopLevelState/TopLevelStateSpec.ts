/// <reference path="../../../lib/DefinitelyTyped/jasmine/jasmine.d.ts"/>

import AdhTopLevelState = require("./TopLevelState");


export var register = () => {
    describe("TopLevelState", () => {
        describe("TopLevelState", () => {
            var adhTopLevelState : AdhTopLevelState.TopLevelState;
            var on;
            var off;
            var trigger;

            beforeEach(() => {
                on = jasmine.createSpy("on");
                off = jasmine.createSpy("off");
                trigger = jasmine.createSpy("trigger");

                var eventHandlerMockClass = <any>function() {
                    this.on = on;
                    this.off = off;
                    this.trigger = trigger;
                };

                adhTopLevelState = new AdhTopLevelState.TopLevelState(eventHandlerMockClass);
            });

            it("dispatches calls to setFocus to eventHandler", () => {
                adhTopLevelState.setFocus(1);
                expect(trigger).toHaveBeenCalledWith("setFocus", 1);
            });

            it("dispatches calls to onSetFocus to eventHandler", () => {
                var callback = (column) => undefined;
                adhTopLevelState.onSetFocus(callback);
                expect(on).toHaveBeenCalledWith("setFocus", callback);
            });

            it("dispatches calls to setContent2Url to eventHandler", () => {
                adhTopLevelState.setContent2Url("some/path");
                expect(trigger).toHaveBeenCalledWith("setContent2Url", "some/path");
            });

            it("dispatches calls to onSetContent2Url to eventHandler", () => {
                var callback = (url) => undefined;
                adhTopLevelState.onSetContent2Url(callback);
                expect(on).toHaveBeenCalledWith("setContent2Url", callback);
            });
        });

        describe("MovingColumns", () => {
            var directive;
            var topLevelStateMock;

            beforeEach(() => {
                topLevelStateMock = <any>jasmine.createSpyObj("topLevelStateMock", ["onSetFocus", "onSetContent2Url"]);
                directive = AdhTopLevelState.movingColumns(topLevelStateMock);
            });

            describe("link", () => {
                var scopeMock;
                var elementMock;

                beforeEach(() => {
                    scopeMock = {};
                    elementMock = <any>jasmine.createSpyObj("elementMock", ["addClass", "removeClass"]);

                    var link = directive.link;
                    link(scopeMock, elementMock);
                });

                describe("onSetFocus", () => {
                    var callback;

                    beforeEach(() => {
                        callback = topLevelStateMock.onSetFocus.calls.mostRecent().args[0];
                    });

                    it("adds class 'is-detail' if columns is 2", () => {
                        callback(2);
                        expect(elementMock.addClass).toHaveBeenCalledWith("is-detail");
                    });

                    it("removes class 'is-detail' if columns is less than 2", () => {
                        callback(1);
                        expect(elementMock.removeClass).toHaveBeenCalledWith("is-detail");
                    });
                });

                describe("onSetContent2Url", () => {
                    var callback;

                    beforeEach(() => {
                        callback = topLevelStateMock.onSetContent2Url.calls.mostRecent().args[0];
                    });

                    it("sets content2Url in scope", () => {
                        callback("some/path");
                        expect(scopeMock.content2Url).toBe("some/path");
                    });
                });
            });
        });
    });
};