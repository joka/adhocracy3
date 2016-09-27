/// <reference path="../../../../lib2/types/angular.d.ts"/>
/// <reference path="../../../_all.d.ts"/>

import * as _ from "lodash";

import * as AdhHttp from "../Http/Http";


export var recursionHelper = ($compile) => {
    return {
        /**
         * Manually compiles the element, fixing the recursion loop.
         * @param element
         * @param [link] A post-link function, or an object with function(s) registered via pre and post properties.
         * @returns An object containing the linking functions.
         */
        compile: (element, link) => {
            // Normalize the link parameter
            if (jQuery.isFunction(link)) {
                link = {post: link};
            }

            // Break the recursion loop by removing the contents
            var contents = element.contents().remove();
            var compiledContents;
            return {
                pre: (link && link.pre) ? link.pre : null,
                /**
                 * Compiles and re-adds the contents
                 */
                post: function(scope, element) {
                    // Compile the contents
                    if (!compiledContents) {
                        compiledContents = $compile(contents);
                    }
                    // Re-add the compiled contents to the element
                    compiledContents(scope, (clone) => {
                        element.append(clone);
                    });

                    // Call the post-linking function, if any
                    if (link && link.post) {
                        link.post.apply(null, arguments);
                    }
                }
            };
        }
    };
};


export var numberOrDashFilter = (n) : string => {
    return _.isFinite(n) ? n : "—";
};


/**
 * Recompiles children on every change of `value`. `value` is available in
 * child scope as `key`.
 *
 * Example:
 *
 *     <adh-recompile-on-change data-value="{{proposalPath}}" data-key="path">
 *         <adh-proposal path="{{path}}"></adh-proposal>
 *     </adh-recompile-on-change>
 */
export var recompileOnChange = ($compile : angular.ICompileService) => {
    return {
        restrict: "E",
        compile: (element, link) => {
            if (jQuery.isFunction(link)) {
                link = {post: link};
            }

            var contents = element.contents().remove();
            var compiledContents;

            return {
                pre: (link && link.pre) ? link.pre : null,
                post: function(scope : angular.IScope, element, attrs) {
                    var innerScope : angular.IScope;

                    if (!compiledContents) {
                        compiledContents = $compile(contents);
                    }

                    scope.$watch(() => attrs["value"], (value) => {
                        if (typeof innerScope !== "undefined") {
                            innerScope.$destroy();
                            element.contents().remove();
                        }

                        innerScope = scope.$new();

                        if (typeof attrs["key"] !== "undefined") {
                            innerScope[attrs["key"]] = value;
                        }

                        compiledContents(innerScope, (clone) => {
                            element.append(clone);
                        });
                    });

                    if (link && link.post) {
                        link.post.apply(null, arguments);
                    }
                }
            };
        }
    };
};


/**
 * Like ngIf, but does not remove the directive when
 * the condition switches back to false.
 *
 * NOTE: for simplicity, this can currently only used
 * as a wrapper element (not as attibute).
 */
export var waitForCondition = () => {
    return {
        restrict: "E",
        scope: {
            condition: "="
        },
        transclude: true,
        template: "<ng-transclude data-ng-if=\"wasTrueOnce\"></ng-transclude>",
        link: (scope, element, attrs) => {
            scope.$watch("condition", (value) => {
                if (value) {
                    scope.wasTrueOnce = true;
                }
            });
        }
    };
};


/**
 * Make sure the view value is loaded correctly on input fields
 *
 * Can be used to work around issues with browser autofill.
 *
 * Inspired by https://stackoverflow.com/questions/14965968
 */
export var inputSync = ($timeout : angular.ITimeoutService) => {
    return {
        restrict : "A",
        require: "ngModel",
        link : (scope, element, attrs, ngModel) => {
            $timeout(() => {
                if (ngModel.$viewValue !== element.val()) {
                    ngModel.$setViewValue(element.val());
                }
            }, 500);
        }
    };
};


export var showError = (form : angular.IFormController, field : angular.INgModelController, errorName : string) : boolean => {
    return field.$error[errorName] && (form.$submitted || field.$dirty);
};


/**
 * Wrapper around clickable element that adds a sglclick event.
 *
 * sglclick is triggered on a click event that is not followed
 * by another click or dblclick event within given timeout.
 */
export var singleClickWrapperFactory = ($timeout : angular.ITimeoutService) => {
    return (clickable, timeout : number  = 200) => {
        var clicked = 0;
        var callbacks : Function[] = [];

        var triggerSingleClick = (event) => {
            callbacks.forEach((callback) => callback(event));
        };

        clickable.on("click", (event) => {
            clicked += 1;
            $timeout(() => {
                if (clicked === 1) {
                    triggerSingleClick(event);
                }
                clicked = 0;
            }, timeout);
        });

        clickable.on("dblclick", (event) => {
            clicked = 0;
        });

        return {
            on: (eventName : string, callback : Function) : void => {
                if (eventName === "sglclick") {
                    callbacks.push(callback);
                } else {
                    clickable.on(eventName, callback);
                }
            }
        };
    };
};


/**
 * Return the first element within a form that has an error.
 *
 * Will also search through all subforms.
 * Used to scroll to that element on submit atempt.
 */
export var getFirstFormError = (form, element) => {
    var getErrorControllers = (ctrl) => {
        if (ctrl.hasOwnProperty("$modelValue")) {
            return [ctrl];
        } else {
            var childCtrls = _.flatten(_.values(ctrl.$error));
            return _.flatten(_.map(childCtrls, getErrorControllers));
        }
    };

    var errorControllers = getErrorControllers(form);
    var names = _.uniq(_.map(errorControllers, "$name"));
    var selector = _.map(names, (name) => "[name=\"" + name + "\"]").join(", ");

    return element.find(selector).first();
};

export var submitIfValid = (
    $q : angular.IQService
) => (
    scope : {errors : AdhHttp.IBackendErrorItem[]},
    element,
    form : angular.IFormController,
    submitFn : () => any
) : angular.IPromise<any> => {
    var container = element.parents("[data-du-scroll-container]");

    if (form.$valid) {
        return $q.when(submitFn())
            .then((result) => {
                scope.errors = [];
                return result;
            }, (errors : AdhHttp.IBackendErrorItem[]) => {
                // FIXME this also happens in resourceWidgets. Should not do any harm though.
                scope.errors = errors;

                if (container.length > 0) {
                    container.scrollTopAnimated(0);
                }

                throw errors;
            });
    } else {
        container.scrollToElementAnimated(getFirstFormError(form, element), 20);
        return $q.reject([]);
    }
};
