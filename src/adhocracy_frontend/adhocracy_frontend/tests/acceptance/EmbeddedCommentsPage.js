"use strict";

var shared = require("./shared.js");


var EmbeddedCommentsPage = function(referer) {
    this.referer = referer;
    this.poolPath = shared.restUrl + 'adhocracy/';
    this.url = "/embed/create-or-show-comment-listing"
        + "?key=" + referer + "&pool-path=" + this.poolPath;

    this.listing = element(by.css(".listing"));
    this.listingCreateForm = this.listing.element(by.css(".listing-create-form"));
    this.commentInput = this.listingCreateForm.element(by.model("data.content"));
    this.submitButton = this.listingCreateForm.element(by.css("input[type=\"submit\"]"));

    this.get = function() {
        browser.get(this.url);
        return this;
    };

    this.createComment = function(content) {
        this.commentInput.sendKeys(content);
        this.submitButton.click();
        // FIXME: Return created comment
        return this.listing.element(by.tagName("adh-comment-resource"));

        /*
        return all.reduce(function(acc, elem) {
            return protractor.promise.all(
                acc.getAttribute("data-path"),
                elem.getAttribute("data-path")
            ).then(function(paths) {
                return (path[0] > path[1] ? acc : elem);
            })
        });*/
    };

    this.getReplyLink = function(comment) {
        return comment.element(by.css(".icon-reply"));
    };

    this.getEditLink = function(comment) {
        return comment.element(by.css("[data-ng-click='edit()']"));
    };

    this.createReply = function(parent, content) {
        this.getReplyLink(parent).click();
        parent.element(by.model("data.content")).sendKeys(content);
        parent.element(by.css("input[type=\"submit\"]")).click();
        return parent.element(by.css('.comment-children .comment'));
    };

    this.editComment = function(comment, keys) {
        this.getEditLink(comment).click();
        var textarea = comment.element(by.model("data.content"));
        textarea.sendKeys.apply(textarea, keys);
        comment.element(by.css("[data-ng-click='submit()']")).click();
        return comment;
    };

    this.getCommentText = function(comment) {
        return comment.element(by.css(".comment-content")).getText();
    };

    this.getCommentAuthor = function(comment) {
        return comment.element(by.css("adh-user-meta a")).getText();
    };

    this.getRateWidget = function(comment) {
        return comment.element(by.tagName("adh-rate"));
    };
};

module.exports = EmbeddedCommentsPage;