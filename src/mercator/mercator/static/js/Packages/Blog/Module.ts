import * as AdhEmbedModule from "../Core/Embed/Module";
import * as AdhHttpModule from "../Core/Http/Module";
import * as AdhImageModule from "../Core/Image/Module";
import * as AdhListingModule from "../Core/Listing/Module";
import * as AdhMarkdownModule from "../Core/Markdown/Module";
import * as AdhPermissionsModule from "../Core/Permissions/Module";
import * as AdhPreliminaryNamesModule from "../Core/PreliminaryNames/Module";

import * as AdhEmbed from "../Core/Embed/Embed";
import * as AdhResourceArea from "../Core/ResourceArea/ResourceArea";

import * as Blog from "./Blog";

import RIDocumentVersion from "../../Resources_/adhocracy_core/resources/document/IDocumentVersion";


export var moduleName = "adhBlog";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhEmbedModule.moduleName,
            AdhHttpModule.moduleName,
            AdhImageModule.moduleName,
            AdhListingModule.moduleName,
            AdhMarkdownModule.moduleName,
            AdhPermissionsModule.moduleName,
            AdhPreliminaryNamesModule.moduleName
        ])
        .config(["adhEmbedProvider", (adhEmbedProvider: AdhEmbed.Provider) => {
            adhEmbedProvider
                .registerDirective("blog-post")
                .registerDirective("blog-post-create")
                .registerDirective("blog");
        }])
        .config(["adhResourceAreaProvider", (adhResourceAreaProvider : AdhResourceArea.Provider) => {
            adhResourceAreaProvider.names[RIDocumentVersion.content_type] = "TR__DOCUMENTS";
        }])
        .directive("adhBlogPost", [
            "$q",
            "$window",
            "adhConfig",
            "adhHttp",
            "adhPermissions",
            "adhPreliminaryNames",
            "adhShowError",
            "adhSubmitIfValid",
            "adhUploadImage",
            "$translate",
            Blog.detailDirective])
        .directive("adhBlog", ["adhConfig", Blog.listingDirective])
        .directive("adhBlogPostCreate", [
            "adhConfig", "adhHttp", "adhPreliminaryNames", "adhShowError", "adhSubmitIfValid", "adhUploadImage", Blog.createDirective]);
};
