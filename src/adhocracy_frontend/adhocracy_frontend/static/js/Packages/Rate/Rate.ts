import AdhConfig = require("../Config/Config");
import AdhPreliminaryNames = require("../PreliminaryNames/PreliminaryNames");
import AdhHttp = require("../Http/Http");
import AdhPermissions = require("../Permissions/Permissions");
import AdhResource = require("../../Resources");
import AdhUser = require("../User/User");

import ResourcesBase = require("../../ResourcesBase");

import RIRate = require("../../Resources_/adhocracy_core/resources/rate/IRate");
import RIRateVersion = require("../../Resources_/adhocracy_core/resources/rate/IRateVersion");
// import SICanRate = require("../../Resources_/adhocracy_core/sheets/rate/ICanRate");
// import SIRate = require("../../Resources_/adhocracy_core/sheets/rate/IRate");
// import SIRateable = require("../../Resources_/adhocracy_core/sheets/rate/IRateable");
import SIPool = require("../../Resources_/adhocracy_core/sheets/pool/IPool");
import SIUserBasic = require("../../Resources_/adhocracy_core/sheets/principal/IUserBasic");

var pkgLocation = "/Rate";


/**
 *
 *
 * Motivation and UI
 * ~~~~~~~~~~~~~~~~~
 *
 * The UI should show the rating button as follows::
 *
 *     Count:  Pros  Cons  Neutrals
 *      +13    14    1     118
 *
 * The words "Props", "Cons", Neutrals" are buttons.  If the user clicks
 * on any one, it becomes active, and all other buttons become inactive.
 * Initially, all buttons are inactive.
 *
 * The current design: Once any of the buttons is activated, the rating
 * cannot be taken back.  The user can only click on "neutral" if she
 * wants to change her mind about having an opinion.
 *
 * The final design: if an active button is clicked, it becomes inactive,
 * and the rating object will be deleted.  (FIXME: This requires a
 * deletion semantics, which should also become a section in this
 * document.)
 *
 */


export interface IRateScope extends ng.IScope {
    refersTo : string;
    postPoolPath : string;
    rates : {
        pro : number;
        contra : number;
        neutral : number;
    };
    thisUsersRate : RIRateVersion;
    allRateResources : RIRateVersion[];
    auditTrail : { subject: string; rate: number }[];
    auditTrailVisible : boolean;
    isActive : (value : number) => boolean;
    isActiveClass : (value : number) => string;  // css class name if RateValue is active, or "" otherwise.
    toggleShowDetails() : void;
    cast(value : number) : void;
    assureUserRateExists() : ng.IPromise<void>;
    postUpdate() : ng.IPromise<void>;
    optionsPostPool : AdhHttp.IOptions;
    ready : boolean;
}


// (this type is over-restrictive in that T is used for both the
// rate, the subject, and the target.  luckily, subtype-polymorphism
// is too cool to complain about it here.  :-)
export interface IRateAdapter<T extends AdhResource.Content<any>> {
    create(settings : any) : T;
    createItem(settings : any) : any;
    derive(oldVersion : T, settings : any) : T;
    isRate(resource : T) : boolean;
    isRateable(resource : T) : boolean;
    rateablePostPoolPath(resource : T) : string;
    subject(resource : T) : string;
    subject(resource : T, value : string) : T;
    object(resource : T) : string;
    object(resource : T, value : string) : T;
    rate(resource : T) : number;
    rate(resource : T, value : number) : T;
    creator(resource : T) : string;
    creationDate(resource : T) : string;
    modificationDate(resource : T) : string;
}


/**
 * initialise rates
 */
export var resetRates = ($scope : IRateScope) : void => {
    $scope.rates = {
        pro: 0,
        contra: 0,
        neutral: 0
    };

    delete $scope.thisUsersRate;
};


/**
 * Take the rateable in $scope.refersTo and collect all ratings that
 * rate this resource from its post pool.  Promise an array of latest
 * rating versions.
 *
 * FIXME: make better use of the query filter api.
 */
export var fetchAllRates = (
    adapter : IRateAdapter<any>,
    $scope : IRateScope,
    $q : ng.IQService,
    adhHttp : AdhHttp.Service<any>
) : ng.IPromise<RIRateVersion[]> => {
    return adhHttp
        .get($scope.refersTo).then((rateable : ResourcesBase.Resource) => {
            $scope.postPoolPath = adapter.rateablePostPoolPath(rateable);
            return $scope.postPoolPath;
        })
        .then((postPoolPath) => adhHttp.get(postPoolPath, {
            content_type: "adhocracy_core.resources.rate.IRate"
        }))
        .then((postPool) => {
            var ratePromises : ng.IPromise<ResourcesBase.Resource>[] =
                postPool.data[SIPool.nick].elements
                    .map((path : string, index : number) =>
                        adhHttp
                           .getNewestVersionPathNoFork(path)
                           .then((path) => adhHttp.get(path)));

            var hasMatchingRefersTo = (rate) =>
                adapter.object(rate) === $scope.refersTo;

            return $q.all(ratePromises)
                .then((rates) => _.filter(rates, hasMatchingRefersTo));
        });
};


/**
 * Update state from server: Fetch post pool, query it for all
 * rates, and store and render them.  If a rate of the current
 * user exists, store and render that separately.
 */
export var updateRates = (
    adapter : IRateAdapter<any>,
    $scope : IRateScope,
    $q : ng.IQService,
    adhHttp : AdhHttp.Service<any>,
    adhUser : AdhUser.User
) : ng.IPromise<void> => {

    var addToRateCount = ($scope : IRateScope, rate : number, delta : number) : void => {
        switch (rate) {
            case 1: {
                $scope.rates.pro += delta;
                break;
            }
            case -1: {
                $scope.rates.contra += delta;
                break;
            }
            case 0: {
                $scope.rates.neutral += delta;
                break;
            }
            default: {
                throw "unknown rate value: " + rate.toString();
            }
        }
    };

    var updateAuditTrail = (rates : RIRateVersion[]) : ng.IPromise<void> => {
        var auditTrailPromises : ng.IPromise<{ subject : string; rate : number }>[] = rates.map((rate) =>
            adhHttp.get(adapter.subject(rate)).then((user) => {
                return {
                    subject: user.data[SIUserBasic.nick].name,  // (use adapter for user, too?)
                    rate: adapter.rate(rate)
                };
            }));

        return $q.all(auditTrailPromises).then((auditTrail) => {
            $scope.auditTrail = auditTrail;
        });
    };

    return fetchAllRates(adapter, $scope, $q, adhHttp)
        .then((rates : RIRateVersion[]) => {
            resetRates($scope);
            $scope.allRateResources = rates;

            if ($scope.auditTrailVisible) {
                updateAuditTrail(rates);
            }

            _.forOwn(rates, (rate) => {
                addToRateCount($scope, adapter.rate(rate), 1);
                if (adapter.subject(rate) === adhUser.userPath) {
                    $scope.thisUsersRate = rate;
                }
            });
        });
};


/**
 * controller for rate widget.  promises a void in order to notify
 * the unit test suite that it is done setting up its state.  (the
 * widget will ignore this promise.)
 */
export var rateController = (
    adapter : IRateAdapter<any>,
    $scope : IRateScope,
    $q : ng.IQService,
    adhHttp : AdhHttp.Service<any>,
    adhPermissions : AdhPermissions.Service,
    adhUser : AdhUser.User,
    adhPreliminaryNames : AdhPreliminaryNames
) : ng.IPromise<void> => {

    $scope.isActive = (rate : number) : boolean =>
        typeof $scope.thisUsersRate !== "undefined" &&
            rate === adapter.rate($scope.thisUsersRate);

    $scope.isActiveClass = (rate : number) : string =>
        $scope.isActive(rate) ? "is-rate-button-active" : "";

    $scope.toggleShowDetails = () => {
        if ($scope.auditTrailVisible) {
            $scope.auditTrailVisible = false;
            delete $scope.auditTrail;
        } else {
            $scope.auditTrailVisible = true;
            updateRates(adapter, $scope, $q, adhHttp, adhUser);
        }
    };

    $scope.cast = (rate : number) : void => {
        if (!$scope.optionsPostPool.POST) {
            // if POST is not allowed on the Rateable's post_pool,
            // rating silently refuses to work.
            return;
        }

        if ($scope.isActive(rate)) {
            // click on active button to un-rate

            /*

              (the current implementation does not allow withdrawing
              of rates, so if you click on "pro" twice in a row, the
              second time will have no effect.  the work-around is for
              the user to rate something "neutral".  a proper fixed
              will be provided later.)

              adapter.rate($scope.thisUsersRate, <any>false);
              $scope.postUpdate();

            */
        } else {
            // click on inactive button to (re-)rate
            $scope.assureUserRateExists()
                .then(() => {
                    adapter.rate($scope.thisUsersRate, rate);
                    $scope.postUpdate();
                });
        }
    };

    $scope.assureUserRateExists = () : ng.IPromise<void> => {
        if (typeof $scope.thisUsersRate !== "undefined") {
            return $q.when();
        } else {
            return adhHttp
                .withTransaction((transaction) : ng.IPromise<void> => {
                    var item : AdhHttp.ITransactionResult =
                        transaction.post($scope.postPoolPath, new RIRate({ preliminaryNames: adhPreliminaryNames }));
                    var version : AdhHttp.ITransactionResult =
                        transaction.get(item.first_version_path);

                    return transaction.commit()
                        .then((responses) : void => {
                            $scope.thisUsersRate = <RIRateVersion>responses[version.index];
                            adapter.subject($scope.thisUsersRate, adhUser.userPath);
                            adapter.object($scope.thisUsersRate, $scope.refersTo);
                            return;
                        });
                });
        }
    };

    $scope.postUpdate = () : ng.IPromise<void> => {
        if (typeof $scope.thisUsersRate === "undefined") {
            throw "internal error?!";
        } else {
            return adhHttp
                .postNewVersionNoFork($scope.thisUsersRate.path, $scope.thisUsersRate)
                .then((response : { value: RIRate }) => {
                    return updateRates(adapter, $scope, $q, adhHttp, adhUser);
                });
        }
    };

    resetRates($scope);
    return updateRates(adapter, $scope, $q, adhHttp, adhUser)
        .then(() => {
            adhPermissions.bindScope($scope, $scope.postPoolPath, "optionsPostPool");
            $scope.ready = true;
        });
};


export var createDirective = (
    adapter : IRateAdapter<any>,
    adhConfig : AdhConfig.Type
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Rate.html",
        scope: {
            refersTo: "@",
            postPoolSheet : "@",
            postPoolField : "@"
        },
        controller:
            ["$scope", "$q", "adhHttp", "adhPermissions", "adhUser", "adhPreliminaryNames",
                ($scope, $q, adhHttp, adhPermissions, adhUser, adhPreliminaryNames) =>
                    rateController(adapter, $scope, $q, adhHttp, adhPermissions, adhUser, adhPreliminaryNames)]
    };
};