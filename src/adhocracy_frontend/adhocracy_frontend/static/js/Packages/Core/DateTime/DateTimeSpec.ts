/// <reference path="../../../../lib2/types/jasmine.d.ts"/>

import * as AdhDateTime from "./DateTime";

export var register = () => {
    describe("DateTime", () => {
        describe("createDirective", () => {
            var dtMock;
            var configMock;
            var momentMock;
            var $intervalMock;
            var scopeMock;
            var directive;

            beforeEach(() => {
                dtMock = jasmine.createSpyObj("dt", ["format", "fromNow"]);
                configMock = <any>{locale: "de"};
                momentMock = jasmine.createSpy("moment")
                    .and.returnValue(dtMock);
                momentMock.locale = jasmine.createSpy("moment.locale");

                $intervalMock = jasmine.createSpy("$interval");

                scopeMock = jasmine.createSpyObj("scope", ["$watch"]);
                scopeMock.datetime = "1970-01-01T00:00:00.000Z";

                directive = AdhDateTime.createDirective(configMock, momentMock, $intervalMock);
            });

            it("uses moment.js to parse the input", () => {
                directive.link(scopeMock);
                scopeMock.$watch.calls.mostRecent().args[1](scopeMock.datetime);
                expect(momentMock).toHaveBeenCalledWith("1970-01-01T00:00:00.000Z");
            });

            it("saves the formatted datetime in scope.datetimeString", () => {
                dtMock.format.and.returnValue("formatted");
                directive.link(scopeMock);
                scopeMock.$watch.calls.mostRecent().args[1](scopeMock.datetime);
                expect(dtMock.format).toHaveBeenCalled();
                expect(scopeMock.datetimeString).toBe("formatted");
            });

            it("saves user-friendly relative datetime in scope.text", () => {
                dtMock.fromNow.and.returnValue("fromNow");
                directive.link(scopeMock);
                scopeMock.$watch.calls.mostRecent().args[1](scopeMock.datetime);
                expect(dtMock.fromNow).toHaveBeenCalled();
                expect(scopeMock.text).toBe("fromNow");
            });

            it("updates scope.text every 5 seconds", () => {
                directive.link(scopeMock);
                scopeMock.$watch.calls.mostRecent().args[1](scopeMock.datetime);
                expect($intervalMock).toHaveBeenCalled();
                var fn = $intervalMock.calls.mostRecent().args[0];
                var delay = $intervalMock.calls.mostRecent().args[1];

                expect(dtMock.fromNow.calls.count()).toBe(1);
                fn();
                expect(dtMock.fromNow.calls.count()).toBe(2);

                expect(delay).toBe(5000);
            });

            it("uses scope.format to format the datetime if provided", () => {
                var format = "format";
                var result = "result";
                scopeMock.format = format;
                dtMock.format.and.returnValue(result);
                directive.link(scopeMock);
                scopeMock.$watch.calls.mostRecent().args[1](scopeMock.datetime);
                expect(dtMock.format).toHaveBeenCalledWith(format);
                expect(scopeMock.text).toBe(result);
            });

            it("sets moment locale", () => {
                directive.link(scopeMock);
                expect(momentMock.locale).toHaveBeenCalledWith(configMock.locale);
            });
        });
    });
};
