import * as AdhEmbedModule from "../../Embed/Module";
import * as AdhResourceAreaModule from "../../ResourceArea/Module";
import * as AdhTopLevelStateModule from "../../TopLevelState/Module";

import * as AdhMeinberlinAlexanderplatzWorkbenchModule from "../Alexanderplatz/Workbench/Module";
import * as AdhMeinberlinBuergerhaushaltWorkbenchModule from "../Buergerhaushalt/Workbench/Module";
import * as AdhMeinberlinKiezkasseWorkbenchModule from "../Kiezkasse/Workbench/Module";

import * as AdhEmbed from "../../Embed/Embed";
import * as AdhResourceArea from "../../ResourceArea/ResourceArea";

import * as AdhMeinberlinAlexanderplatzWorkbench from "../Alexanderplatz/Workbench/Workbench";
import * as AdhMeinberlinBuergerhaushaltWorkbench from "../Buergerhaushalt/Workbench/Workbench";
import * as AdhMeinberlinKiezkasseWorkbench from "../Kiezkasse/Workbench/Workbench";

import RIAlexanderplatzProcess from "../../../Resources_/adhocracy_meinberlin/resources/alexanderplatz/IProcess";
import RIBuergerhaushaltProcess from "../../../Resources_/adhocracy_meinberlin/resources/burgerhaushalt/IProcess";
import RIKiezkasseProcess from "../../../Resources_/adhocracy_meinberlin/resources/kiezkassen/IProcess";

import * as AdhMeinberlinDe from "./MeinberlinDe";


export var moduleName = "adhMeinberlinAlexanderplatzContext";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhEmbedModule.moduleName,
            AdhMeinberlinAlexanderplatzWorkbenchModule.moduleName,
            AdhMeinberlinBuergerhaushaltWorkbenchModule.moduleName,
            AdhMeinberlinKiezkasseWorkbenchModule.moduleName,
            AdhResourceAreaModule.moduleName,
            AdhTopLevelStateModule.moduleName
        ])
        .config(["adhEmbedProvider", (adhEmbedProvider: AdhEmbed.Provider) => {
            adhEmbedProvider.registerContext("mein.berlin.de");
        }])
        .config(["adhResourceAreaProvider", (adhResourceAreaProvider: AdhResourceArea.Provider) => {
            adhResourceAreaProvider
                .template("mein.berlin.de", ["adhConfig", "$templateRequest", AdhMeinberlinDe.areaTemplate]);
            AdhMeinberlinAlexanderplatzWorkbench.registerRoutes(
                RIAlexanderplatzProcess.content_type, "mein.berlin.de")(adhResourceAreaProvider);
            AdhMeinberlinBuergerhaushaltWorkbench.registerRoutes(
                RIBuergerhaushaltProcess.content_type, "mein.berlin.de")(adhResourceAreaProvider);
            AdhMeinberlinKiezkasseWorkbench.registerRoutes(
                RIKiezkasseProcess.content_type, "mein.berlin.de")(adhResourceAreaProvider);
        }])
        .directive("adhMeinberlinDeHeader", ["adhConfig", "adhTopLevelState", AdhMeinberlinDe.headerDirective]);
};