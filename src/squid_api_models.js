(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD.
        define(['Backbone', '_', 'squid_api'], factory);
    } else {
        factory(root.Backbone, _, root.squid_api);
    }
}(this, function (Backbone, _, squid_api) {

    // setup squid_api.model

    squid_api.model.BaseModel = Backbone.Model.extend({

        addParameter: function (name, value) {
            if ((typeof value !== 'undefined') && (value !== null)) {
                if (!this.parameters) {
                    this.parameters = [];
                }
                this.parameters.push({"name": name, "value": value});
            }
        },

        getParameter: function (name) {
            var i = 0, param;
            if (this.parameters) {
                while (i < this.parameters.length) {
                    param = this.parameters[i];
                    if (param.name == name) {
                        return param.value;
                    }
                    i++;
                }
            }
            return null;
        },


        setParameter: function (name, value) {
            var index = null;
            if (!this.parameters) {
                this.parameters = [];
            }
            for (var i = 0; i < this.parameters.length; i++) {
                if (this.parameters[i].name === name) {
                    index = i;
                    break;
                }
            }
            if (index !== null) {
                if ((typeof value === 'undefined') || (value === null)) {
                    // unset
                    this.parameters.splice(index, 1);
                } else {
                    // set
                    this.parameters[index].value = value;
                }
            } else {
                this.parameters.push({"name": name, "value": value});
            }
        },

        initialize: function (attributes, options) {
            if (options) {
                this.parameters = options.parameters;
                this.statusModel = options.statusModel;
            }
        },

        constructor: function () {
            // Define some attributes off of the prototype chain
            this.parameters = [];
            this.statusModel = null;

            // Call the original constructor
            Backbone.Model.apply(this, arguments);
        },

        idAttribute: "oid",

        getOid : function(idName) {
            var oid;
            if (this.get("id")) {
                oid = this.get("id")[idName];
                if (!oid) {
                    oid = this.get("oid");
                }
            } else {
                oid = this.get("oid");
            }
            if (!oid) {
                oid = "";
            }
            return oid;
        },

        baseRoot: function () {
            return squid_api.apiURL;
        },
        urlRoot: function () {
            return this.baseRoot();
        },
        url: function () {
            var url = this.urlRoot();
            if (!this.hasParam("timeout")) {
                if (typeof this.timeoutMillis === 'undefined') {
                    this.setParameter("timeout", squid_api.timeoutMillis);
                } else {
                    if (this.timeoutMillis !== null) {
                        this.setParameter("timeout", this.timeoutMillis());
                    }
                }
            }
            if (!this.hasParam("access_token")) {
                this.setParameter("access_token", squid_api.model.login.get("accessToken"));
            }
            // add parameters
            if (this.parameters) {
                for (var i = 0; i < this.parameters.length; i++) {
                    var param = this.parameters[i];
                    if (param.value !== null) {
                        url = this.addParam(url, param.name, param.value);
                    }
                }
            }
            return url;
        },
        error: null,
        hasParam: function (name) {
            var hasParam = false, i = 0;
            if (this.parameters) {
                while (i < this.parameters.length && (!hasParam)) {
                    var param = this.parameters[i];
                    if (param.name == name) {
                        hasParam = true;
                    }
                    i++;
                }
            }

            return hasParam;
        },
        addParam: function (url, name, value) {
            if (value) {
                var delim;
                if (url.indexOf("?") < 0) {
                    delim = "?";
                } else {
                    delim = "&";
                }
                url += delim + name + "=" + encodeURIComponent(value);
            }
            return url;
        },

        optionsFilter: function (options) {
            // success
            var success, me = this;
            if (!options) {
                options = {success: null, error: null};
            } else {
                success = options.success;
            }
            options.success = function (model, response, options) {
                if (me.statusModel) {
                    me.statusModel.pullTask(model);
                }
                // normal behavior
                if (success) {
                    success.call(this, model, response, options);
                }
            };

            var error;
            error = options.error;
            options.error = function (model, response, options) {
                if (me.statusModel) {
                    me.statusModel.set("error", response);
                    me.statusModel.pullTask(model);
                }
                if (!response.status) {
                    squid_api.model.status.set("error", {"message": "Unable to reach API Services"});
                }
                if (error) {
                    // normal behavior
                    error.call(this.model, response, options);
                }
            };
            return options;
        },

        /*
         * Overriding fetch to handle token expiration
         */
        fetch: function (options) {
            if (this.statusModel) {
                this.statusModel.pushTask(this);
            }
            return Backbone.Model.prototype.fetch.call(this, this.optionsFilter(options));
        },

        /*
         * Overriding save to handle token expiration
         */
        save: function (attributes, options) {
            if (this.statusModel) {
                this.statusModel.pushTask(this);
            }
            return Backbone.Model.prototype.save.call(this, attributes, this.optionsFilter(options));
        }

    });

    squid_api.model.BaseCollection = Backbone.Collection.extend({
        parentId: null,
        fetched : false,
        error: null,
        parameters: [],
        deferredMap : {},

        addParameter: function (name, value) {
            this.parameters.push({"name": name, "value": value});
        },

        initialize: function (model, options) {
            if (options) {
                this.parentId = options.parentId;
                this.parameters = options.parameters;
            }
        },
        baseRoot: function () {
            return squid_api.apiURL;
        },
        urlRoot: function () {
            return this.baseRoot();
        },

        url: function () {
            var url = this.urlRoot();
            if (typeof this.timeoutMillis === 'undefined') {
                url = this.addParam(url, "timeout", squid_api.timeoutMillis);
            } else {
                if (this.timeoutMillis !== null) {
                    url = this.addParam(url, "timeout", this.timeoutMillis());
                }
            }
            url = this.addParam(url, "access_token", squid_api.model.login.get("accessToken"));
            // add parameters
            if (this.parameters) {
                for (var i = 0; i < this.parameters.length; i++) {
                    var param = this.parameters[i];
                    url = this.addParam(url, param.name, param.value);
                }
            }
            return url;
        },
        addParam: function (url, name, value) {
            if (value) {
                var delim;
                if (url.indexOf("?") < 0) {
                    delim = "?";
                } else {
                    delim = "&";
                }
                url += delim + name + "=" + value;
            }
            return url;
        },

        /**
         * Getter for a Model or a Collection of Models.
         * This method will perform a fetch only if the requested object is not in the object cache.
         * @param oid if set, will return a Model with the corresponding oid.
         * @param forceRefresh if set and true : object in cache will be fetched
         * @return a Promise
         */
        load : function(oid, forceRefresh) {
            // the deferred key must be unique for the object we're fetching
            var deferredKey = oid || "_all";
            var deferredKeyPrefix = this.urlRoot();
            deferredKey = deferredKeyPrefix+"_"+deferredKey;
            var deferred = this.deferredMap[deferredKey];
            // check if not already executing
            if (deferred && (deferred.state() === "pending")) {
                // return existing pending deferred
            } else {
                // create a new deferred
                deferred = $.Deferred();
                this.deferredMap[deferredKey] = deferred;
                var me = this;
                if (oid) {
                    // check if already existing
                    var model = this.findWhere({"oid" : oid});
                    if (model && (forceRefresh !== true)) {
                        // return existing
                        deferred.resolve(model);
                    } else {
                        // fetch collection to get the model
                        this.load().done( function(collection) {
                            model = collection.findWhere({"oid" : oid});
                            if (model) {
                                deferred.resolve(model);
                            } else {
                                deferred.reject("object not found");
                            }
                        }).fail(function(error) {
                            squid_api.model.status.set("error", error);
                            deferred.reject(error);
                        });
                    }
                } else {
                    if (this.fetched) {
                        deferred.resolve(this);
                    } else {
                        // fetch collection
                        console.log("fetching "+deferredKey);
                        this.fetch().done( function() {
                            me.fetched = true;
                            deferred.resolve(me);
                        }).fail(function(error) {
                            squid_api.model.status.set("error", error);
                            deferred.reject(error);
                        });
                    }
                }
            }
            return deferred.promise();
        }
    });

    squid_api.model.TokenModel = squid_api.model.BaseModel.extend({
        urlRoot: function () {
            return this.baseRoot() + "/tokeninfo";
        }
    });

    squid_api.model.LoginModel = squid_api.model.BaseModel.extend({

        accessToken: null,

        login: null,

        resetPassword: null,

        urlRoot: function () {
            return this.baseRoot() + "/user";
        },

        /**
         * Logout the current user
         */
        logout: function () {
            var me = this;
            // set the access token and refresh data
            var request = $.ajax({
                type: "GET",
                url: squid_api.apiURL + "/logout?access_token=" + this.get("accessToken"),
                dataType: 'json',
                contentType: 'application/json'
            });

            request.done(function (jsonData) {
                squid_api.utils.clearLogin();
            });

            request.fail(function (jqXHR, textStatus, errorThrown) {
                squid_api.model.status.set("message", "logout failed");
                squid_api.model.status.set("error", "error");
            });
        }

    });

    squid_api.model.login = new squid_api.model.LoginModel();

    // user model
    squid_api.model.UserModel = squid_api.model.BaseModel.extend({

        accessToken: null,

        login: null,

        email: null,

        groups: null,

        objectType: "User",

        password: null,

        wsName: null,

        error: "",

        url: function () {
            return this.baseRoot() + this.wsName + "?access_token=" + this.accessToken; // get user
        }

    });
    squid_api.model.userModel = new squid_api.model.UserModel();


    // Status Model
    squid_api.model.StatusModel = squid_api.model.BaseModel.extend({
        STATUS_RUNNING: "RUNNING",
        STATUS_DONE: "DONE",
        runningTasks: [],
        pushTask: function (task) {
            this.runningTasks.push(task);
            console.log("running tasks count : " + this.runningTasks.length);
            Backbone.Model.prototype.set.call(this, "status", this.STATUS_RUNNING);
        },
        pullTask: function (task) {
            var i = this.runningTasks.indexOf(task);
            if (i != -1) {
                this.runningTasks.splice(i, 1);
            }
            console.log("running tasks count : " + this.runningTasks.length);
            if (this.runningTasks.length === 0) {
                Backbone.Model.prototype.set.call(this, "status", this.STATUS_DONE);
            }
        }
    });
    squid_api.model.status = new squid_api.model.StatusModel({
        status: null,
        error: null,
        message: null,
        project: null,
        domain: null
    });

    /*
     * --- API Meta-Model objects Mapping to Backbone Models---
     */

    squid_api.model.CustomerInfoModel = squid_api.model.BaseModel.extend({
        urlRoot: function () {
            return this.baseRoot() + "/";
        }
    });

    squid_api.model.ClientModel = squid_api.model.BaseModel.extend({
        urlRoot: function () {
            return this.baseRoot() + "/clients/" + this.getOid("clientId");
        }
    });

    squid_api.model.StateModel = squid_api.model.BaseModel.extend({
        urlRoot: function () {
            return this.baseRoot() + "/states/" + this.getOid("stateId");
        }
    });

    squid_api.model.ShortcutModel = squid_api.model.BaseModel.extend({
        urlRoot: function () {
            return this.baseRoot() + "/shortcuts/" + this.getOid("shortcutId");
        }
    });

    squid_api.model.ShortcutCollection = squid_api.model.BaseCollection.extend({
        model: squid_api.model.ShortcutModel,
        urlRoot: function () {
            return this.baseRoot() + "/shortcuts";
        }
    });


    squid_api.model.InternalanalysisjobModel = squid_api.model.BaseModel.extend({
        urlRoot: function () {
            return this.baseRoot() + "/internalanalysisjobs/";
        }
    });

    squid_api.model.InternalanalysisjobCollection = squid_api.model.BaseCollection.extend({
        model: squid_api.model.InternalanalysisjobModel,
        urlRoot: function () {
            return this.baseRoot() + "/internalanalysisjobs";
        }
    });

    squid_api.model.ProjectModel = squid_api.model.BaseModel.extend({
        urlRoot: function () {
            return this.baseRoot() + "/projects/" + this.getOid("projectId");
        }
    });

    squid_api.model.ProjectCollection = squid_api.model.BaseCollection.extend({
        model: squid_api.model.ProjectModel,
        urlRoot: function () {
            return this.baseRoot() + "/projects";
        }
    });

    squid_api.model.UserModel = squid_api.model.BaseModel.extend({
        urlRoot: function () {
            return this.baseRoot() + "/users/" + this.getOid("userId");
        }
    });

    squid_api.model.GroupCollection = squid_api.model.BaseModel.extend({
        urlRoot: function () {
            return this.baseRoot() + "/usergroups";
        }
    });

    squid_api.model.UserCollection = squid_api.model.BaseCollection.extend({
        model: squid_api.model.UserModel,
        urlRoot: function () {
            return this.baseRoot() + "/users";
        }
    });

    squid_api.model.DomainModel = squid_api.model.BaseModel.extend({
        urlRoot: function () {
            return squid_api.model.ProjectModel.prototype.urlRoot.apply(this, arguments) + "/domains/" + this.getOid("domainId");
        }
    });

    squid_api.model.DomainCollection = squid_api.model.BaseCollection.extend({
        model: squid_api.model.DomainModel,
        urlRoot: function () {
            return this.parent.urlRoot() + "/domains";
        }
    });

    squid_api.model.RelationModel = squid_api.model.BaseModel.extend({
        urlRoot: function () {
            return squid_api.model.ProjectModel.prototype.urlRoot.apply(this, arguments) + "/relations/" + this.getOid("relationId");
        }
    });

    squid_api.model.RelationCollection = squid_api.model.BaseCollection.extend({
        model: squid_api.model.RelationModel,
        urlRoot: function () {
            return this.parent.urlRoot() + "/relations";
        }
    });

    squid_api.model.DimensionModel = squid_api.model.BaseModel.extend({
        urlRoot: function () {
            return squid_api.model.DomainModel.prototype.urlRoot.apply(this, arguments) + "/dimensions/" + this.getOid("dimensionId");
        }
    });

    squid_api.model.DimensionCollection = squid_api.model.BaseCollection.extend({
        model: squid_api.model.DimensionModel,
        urlRoot: function () {
            return this.parent.urlRoot() + "/dimensions";
        }
    });

    squid_api.model.MetricModel = squid_api.model.BaseModel.extend({
        urlRoot: function () {
            return squid_api.model.DomainModel.prototype.urlRoot.apply(this, arguments) + "/metrics/" + this.getOid("metricId");
        }
    });

    squid_api.model.MetricCollection = squid_api.model.BaseCollection.extend({
        model: squid_api.model.MetricModel,
        urlRoot: function () {
            return this.parent.urlRoot() + "/metrics";
        }
    });

    squid_api.model.BookmarkModel = squid_api.model.BaseModel.extend({
        urlRoot: function() {
            return squid_api.model.ProjectModel.prototype.urlRoot.apply(this, arguments) + "/bookmarks/" + this.getOid("bookmarkId");
        }
    });

    squid_api.model.BookmarkCollection = squid_api.model.BaseCollection.extend({
        model : squid_api.model.BookmarkModel,
        urlRoot: function() {
            return this.parent.urlRoot() + "/bookmarks";
        }
    });

    // declare nested models after Model and Collections as there are cyclic dependencies

    squid_api.model.CustomerInfoModel.prototype.relations = {
        "projects" : squid_api.model.ProjectCollection,
        "users" : squid_api.model.UserCollection,
        "usergroups" : squid_api.model.GroupCollection,
        "shortcuts" : squid_api.model.ShortcutCollection
    };

    squid_api.model.ProjectModel.prototype.relations = {
        "domains" : squid_api.model.DomainCollection,
        "relations" : squid_api.model.RelationCollection,
        "bookmarks" : squid_api.model.BookmarkCollection
    };

    squid_api.model.DomainModel.prototype.relations = {
        "dimensions" : squid_api.model.DimensionCollection,
        "metrics" : squid_api.model.MetricCollection
    };

    /**
     * Backbone collection enhancement to perform a save() on all models of a collection.
     * This method will trigger a "sync" event on the collection when all done.
     * @return a Promise which is resolved once all save operations are done.
     */
    Backbone.Collection.prototype.saveAll = function (models) {
        var dfd = new $.Deferred();
        var me = this;
        // create array of deferreds to save
        var deferreds = [];
        for (var i = 0; i < models.length; i++) {
            if (models[i].hasChanged()) {
                deferreds.push(models[i].save());
            }
        }

        // resolve promise once all models have been saved
        $.when.apply($, deferreds).done(function (models) {
            me.trigger("sync");
            dfd.resolve(models);
        });

        return dfd.promise();
    };
    
    return squid_api;
}));
