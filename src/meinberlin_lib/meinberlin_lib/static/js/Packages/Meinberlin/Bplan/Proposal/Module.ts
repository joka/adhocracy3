import * as AdhAngularHelpersModule from "../../../AngularHelpers/Module";
import * as AdhEmbedModule from "../../../Embed/Module";
import * as AdhHttpModule from "../../../Http/Module";
import * as AdhPreliminaryNamesModule from "../../../PreliminaryNames/Module";
import * as AdhResourceAreaModule from "../../../ResourceArea/Module";

import * as AdhEmbed from "../../../Embed/Embed";

import * as Proposal from "./Proposal";


export var moduleName = "adhMeinBplanProposal";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhAngularHelpersModule.moduleName,
            AdhEmbedModule.moduleName,
            AdhHttpModule.moduleName,
            AdhPreliminaryNamesModule.moduleName,
            AdhResourceAreaModule.moduleName
        ])
        .config(["adhEmbedProvider", (adhEmbedProvider: AdhEmbed.Provider) => {
            adhEmbedProvider.registerDirective("meinberlin-bplan-proposal-embed", ["mein-berlin-bplaene-proposal-embed"]);
        }])
        .directive("adhMeinberlinBplanProposalCreate", [
            "adhConfig", "adhHttp", "adhPreliminaryNames", "adhShowError", "adhSubmitIfValid", Proposal.createDirective])
        .directive("adhMeinberlinBplanProposalEmbed", ["adhConfig", "adhHttp", Proposal.embedDirective]);
};
