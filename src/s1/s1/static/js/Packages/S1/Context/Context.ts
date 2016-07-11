import * as AdhConfig from "../../Config/Config";
import * as AdhHttp from "../../Http/Http";
import * as AdhPermissions from "../../Permissions/Permissions";
import * as AdhTopLevelState from "../../TopLevelState/TopLevelState";

import RIS1Process from "../../../Resources_/adhocracy_s1/resources/s1/IProcess";
import * as SIWorkflowAssignment from "../../../Resources_/adhocracy_core/sheets/workflow/IWorkflowAssignment";

export var pkgLocation = "/S1/Context";


export var headerDirective = (
    adhConfig : AdhConfig.IService,
    adhPermissions : AdhPermissions.Service,
    adhTopLevelState : AdhTopLevelState.Service
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/header.html",
        link: (scope) => {
            scope.processUrl = adhConfig.custom["s1_process_url"];
            scope.$on("$destroy", adhTopLevelState.bind("meeting", scope));
            adhPermissions.bindScope(scope, () => scope.processUrl, "processOptions");
        }
    };
};


export var stateIndicatorDirective = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service,
    adhTopLevelState : AdhTopLevelState.Service
) => {
    return {
        restrict: "E",
        scope: {
            workflowState: "@",
            meeting: "@"
        },
        templateUrl: adhConfig.pkg_path + pkgLocation + "/StateIndicator.html",
        link: (scope) => {
            scope.$on("$destroy", adhTopLevelState.on("processUrl", (processUrl) => {
                adhHttp.get(processUrl).then((process : RIS1Process) => {
                    scope.workflowState = process.data[SIWorkflowAssignment.nick].workflow_state;
                });
            }));
        }
    };
};


/* Dynamically displays links to the current meeting, to the next meeting (if
 * appropriate) and adds a proposal besides the meeting, in which proposals
 * can currently be added.
 */
export var meetingSelectorDirective = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service,
    adhTopLevelState : AdhTopLevelState.Service
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/MeetingSelector.html",
        scope: {
            processUrl: "@"
        },
        link: (scope) => {
            adhHttp.get(scope.processUrl).then((process : RIS1Process) => {
                scope.workflowState = process.data[SIWorkflowAssignment.nick].workflow_state;
            });
        }
    };
};
