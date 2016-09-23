/// <reference path="../../../../lib2/types/angular.d.ts"/>

import * as _ from "lodash";


export function deepPluck(base, keys : string[]) : any {
    "use strict";
    return _.reduce(keys, (obj, key) => {
        if (typeof obj === "undefined") {
            return obj;
        } else {
            return obj[key];
        }
    }, base);
}


/**
 * Remove last hierarchy level from path. If given path has a trailing slash,
 * the returned path will also have a trailing slash.
 */
export function parentPath(path : string) : string {
    "use strict";

    var result;
    var root = "";

    if (typeof path === "undefined") {
        return undefined;
    }
    if (path.substr(0, 4) === "http") {
        var match = path.match("(https?://[^/]*)(/?.*)");
        root = match[1];
        path = match[2];
    }
    if (path[path.length - 1] === "/") {
        result = path.substring(0, path.lastIndexOf("/", path.length - 2) + 1);
    } else {
        result = path.substring(0, path.lastIndexOf("/"));
    }

    if (result === "") {
        result = "/";
    }

    return root + result;
};


/**
 * Convert a any string to a valid name
 */
export function normalizeName(name: string) : string {
    "use strict";

    // FIXME: This does work well for german.
    // For languages with non-ascii character sets (diacritics,
    // cyrillic, chinese, ...) this will almost certainly return "".

    return name
        // common non-ascii chars
        .replace("ä", "ae")
        .replace("Ä", "Ae")
        .replace("ö", "oe")
        .replace("Ö", "Oe")
        .replace("ü", "ue")
        .replace("Ü", "Ue")
        .replace("ß", "ss")
        // whitespace
        .replace(/\s/, "_")
        // everything else
        .replace(/[^a-zA-Z0-9_\-.]/g, "");
}

/**
 * format strings
 *
 * Example:
 *   > formatString("Hello {0} from {1}", "World", "Bernd")
 *   "Hello World from Bernd"
 *
 * http://stackoverflow.com/questions/610406/4673436#4673436
 */
export function formatString(format : string, ...args : string[]) {
    "use strict";

    return format.replace(/{(\d+)}/g, function(match, number) {
        return (typeof args[number] !== "undefined") ? args[number] : match;
    });
}


export interface IVertex<vertexType> {
    content : vertexType;
    incoming : string[];
    outgoing : string[];
    done : Boolean;
};


/**
 * Data structure which contains a DAG in a structure that is easy to work with.
 */
export interface IDag<vertexType> {
    [key : string] : IVertex<vertexType>;
}


/**
 * Sort a given IDag<any> topologically and return the sorted content items.
 *
 * This function has some assumptions which fit the current only use case:
 *
 * - It currently destroys the edges of the Dag.
 */
export function sortDagTopologically(dag : IDag<any>, sources : string[]) : any[] {
    "use strict";

    // getNext pops any possible candidate from
    // the DAG by modifying the dag object
    var getNext = (dag) => {
        var next = sources.pop();

        _.forEach((<IVertex<any>>dag[next]).outgoing, (key) => {
            // dag[key].incoming.deleteItem(next)
            dag[key].incoming.splice(_.indexOf(dag[key].incoming, next), 1);
            if (_.isEmpty(dag[key].incoming)) {
                sources.push(key);
            }
        });

        return next;
    };

    var sorted = [];

    while (!_.isEmpty(sources)) {
        var next = getNext(dag);
        sorted.push(dag[next].content);
        dag[next].done = true;
    }

    if (!_.every(dag, "done")) {
        throw "cycle detected";
    }

    return sorted;
}


/**
 * Very much like $q.all().
 *
 * The only real difference is that it skips rejected promises instead of rejecting the whole result.
 */
export var qFilter = (promises : angular.IPromise<any>[], $q : angular.IQService) : angular.IPromise<any[]> => {
    // unique marker
    var empty = new Object();

    var count = promises.length;
    var results = [];

    var deferred = $q.defer();

    if (count === 0) {
        deferred.resolve(results);
    } else {
        _.forEach(promises, (promise : angular.IPromise<any>, i : number) => {
            results.push(empty);

            promise
                .then((result) => results[i] = result)
                .finally(() => {
                    count -= 1;
                    if (count === 0) {
                        results = results.filter((e) => e !== empty);
                        deferred.resolve(results);
                    }
                });
        });
    }

    return deferred.promise;
};


/**
 * Apply-like functionality for constructors.
 *
 * https://stackoverflow.com/questions/1606797/
 */
export var construct = (constructor, args) => {
    var F = function() : void {
        constructor.apply(this, args);
    };
    F.prototype = constructor.prototype;
    return new F();
};
