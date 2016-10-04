import * as AdhDebateWorkbenchModule from "../../Core/DebateWorkbench/Module";
import * as AdhNamesModule from "../../Core/Names/Modules";

import * as AdhDebateWorkbench from "../../Core/DebateWorkbench/DebateWorkbench";
import * as AdhNames from "../../Core/Names/Names";
import * as AdhProcess from "../../Core/Process/Process";

import RIEuthCollaborativeTextProcess from "../../../Resources_/adhocracy_euth/resources/collaborative_text/IProcess";
import RIEuthCollaborativeTextPrivateProcess from "../../../Resources_/adhocracy_euth/resources/collaborative_text/IPrivateProcess";

export var moduleName = "adhEuthCollaberativeTextediting";


export var register = (angular) => {
    AdhDebateWorkbenchModule.register(angular);

    angular
        .module(moduleName, [
            AdhDebateWorkbenchModule.moduleName,
            AdhNamesModule.moduleName
        ])
        .config(["adhProcessProvider", (adhProcessProvider: AdhProcess.Provider) => {
            adhProcessProvider.templates[RIEuthCollaborativeTextProcess.content_type] =
                "<adh-debate-workbench></adh-debate-workbench>";
            adhProcessProvider.templates[RIEuthCollaborativeTextPrivateProcess.content_type] =
                "<adh-debate-workbench></adh-debate-workbench>";
        }])
        .config(["adhResourceAreaProvider", AdhDebateWorkbench.registerRoutes(RIEuthCollaborativeTextProcess)])
        .config(["adhResourceAreaProvider", AdhDebateWorkbench.registerRoutes(RIEuthCollaborativeTextPrivateProcess)])
        .config(["adhNamesProvider", (adhNamesProvider : AdhNames.Provider) => {
            adhNamesProvider.names[RIEuthCollaborativeTextProcess.content_type] = "TR__RESOURCE_COLLABORATIVE_TEXT_EDITING";
            adhNamesProvider.names[RIEuthCollaborativeTextPrivateProcess.content_type] = "TR__RESOURCE_COLLABORATIVE_TEXT_EDITING";
        }]);
};
