/// <reference path="../../../../../lib2/types/lodash.d.ts"/>
/// <reference path="../../../../../lib2/types/moment.d.ts"/>

import * as _ from "lodash";

import * as AdhConfig from "../../../Config/Config";
import * as AdhHttp from "../../../Http/Http";
import * as AdhMovingColumns from "../../../MovingColumns/MovingColumns";
import * as AdhPermissions from "../../../Permissions/Permissions";
import * as AdhProcess from "../../../Process/Process";
import * as AdhUtil from "../../../Util/Util";

import RIBuergerhaushaltProposalVersion from "../../../../Resources_/adhocracy_meinberlin/resources/burgerhaushalt/IProposalVersion";
import RIKiezkasseProposalVersion from "../../../../Resources_/adhocracy_meinberlin/resources/kiezkassen/IProposalVersion";

import * as SIImageReference from "../../../../Resources_/adhocracy_core/sheets/image/IImageReference";
import * as SILocationReference from "../../../../Resources_/adhocracy_core/sheets/geo/ILocationReference";
import * as SIMultiPolygon from "../../../../Resources_/adhocracy_core/sheets/geo/IMultiPolygon";
import * as SIName from "../../../../Resources_/adhocracy_core/sheets/name/IName";
import * as SITitle from "../../../../Resources_/adhocracy_core/sheets/title/ITitle";
import * as SIWorkflow from "../../../../Resources_/adhocracy_core/sheets/workflow/IWorkflowAssignment";

var pkgLocation = "/Meinberlin/IdeaCollection/Process";


export var detailDirective = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service<any>,
    adhPermissions : AdhPermissions.Service
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Detail.html",
        scope: {
            path: "@",
            isBuergerhaushalt: "=?",
            isKiezkasse: "=?"
        },
        require: "^adhMovingColumn",
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            scope.$watch("path", (value : string) => {
                if (value) {
                    adhHttp.get(value).then((resource) => {
                        var sheet = resource.data[SIWorkflow.nick];
                        var stateName = sheet.workflow_state;
                        scope.currentPhase = AdhProcess.getStateData(sheet, stateName);

                        var locationUrl = resource.data[SILocationReference.nick].location;
                        adhHttp.get(locationUrl).then((location) => {
                            var polygon = location.data[SIMultiPolygon.nick].coordinates[0][0];
                            scope.polygon =  polygon;
                        });

                        if (scope.isBuergerhaushalt) {
                            scope.contentType = RIBuergerhaushaltProposalVersion.content_type;
                        } else {
                            scope.contentType = RIKiezkasseProposalVersion.content_type;
                        }
                    });
                }
            });
            adhPermissions.bindScope(scope, () => scope.path);
        }
    };
};


export var editDirective = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service<any>,
    adhShowError,
    adhSubmitIfValid,
    moment
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Edit.html",
        scope: {
            path: "@"
        },
        require: "^adhMovingColumn",
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            var process;
            scope.data = {};
            scope.showError = adhShowError;
            adhHttp.get(scope.path).then((resource) => {
                process = resource;
                scope.data.title = process.data[SITitle.nick].title;

                var sheet = process.data[SIWorkflow.nick];
                _.forEach(["announce", "draft", "participate", "evaluate", "result", "closed"], (stateName : string) => {
                    var data = AdhProcess.getStateData(sheet, stateName);
                    scope.data[stateName + "_description"] = data.description;
                    scope.data[stateName + "_start_date"] = moment(data.start_date).format("YYYY-MM-DD");
                });

                scope.data.currentWorkflowState = process.data[SIWorkflow.nick].workflow_state;
            });
            adhHttp.options(scope.path, {importOptions: false}).then((raw) => {
                // extract available transitions
                scope.data.availableWorkflowStates = AdhUtil.deepPluck(raw, [
                    "data", "PUT", "request_body", "data", SIWorkflow.nick, "workflow_state"]);
            });
            scope.submit = () => {
                return adhSubmitIfValid(scope, element, scope.ideaCollectionProcessForm, () => {
                    process.data[SITitle.nick].title = scope.data.title;
                    process.data[SIName.nick] = undefined;
                    process.data[SIImageReference.nick] = undefined;

                    if (_.includes(scope.data.availableWorkflowStates, scope.data.workflowState)) {
                        process.data[SIWorkflow.nick] = {
                            workflow_state: scope.data.workflowState
                        };
                    } else {
                        process.data[SIWorkflow.nick] = {};
                    }

                    process.data[SIWorkflow.nick].state_data = _.map(
                        ["announce", "draft", "participate", "evaluate", "result", "closed"], (stateName : string) => {
                        return {
                            name: stateName,
                            description: scope.data[stateName + "_description"],
                            start_date: scope.data[stateName + "_start_date"]
                        };
                    });

                    return adhHttp.put(process.path, process);
                });
            };
        }
    };
};