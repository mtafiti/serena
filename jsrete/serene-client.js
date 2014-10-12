/*
 serena-client.js - client library for the serena engine
 Author: Kennedy Kambona
 Copyright 2014
 */

(function(exports){


    var SOCKET_EVENTS = {
        REGISTER_RULE: "register_rule",
        ASSERT_FACT: "assert_fact",
        MODIFY_FACT: "modify_fact",
        REMOVE_RULE: "remove_rule",
        REMOVE_FACT: "remove_fact",
        RULE_ACTIVATED: "rule_activated",
        SET_CLIENT_NAME: "set_client_name",
        SOCKET_IO_CONNECTED: "connect",

        SET_CLIENT_GROUP: "set_client_group",
        GET_GROUP_INFO: "get_group_info",
        GROUP_RULE_ACTIVATED: "group_rule_activated",
        PUBLIC_RULE_ACTIVATED: "public_rule_activated"
    };
    var CONSTANTS = {
        WEBSOCKET_LIB: "/socket.io/socket.io.js",
        EXPRESSION_CONDITION_SLOT_ALIAS: "$test",
        VARIABLE_DELIMITER : "?"
    };

    exports.SerenaClient = function(server, opts , ackCallback){

        var self = this;

        this.init = function(serverip, opts){
            self.serverIp = serverip;
            self.clientGroup = opts.group || '';
            self.clientName = opts.name || '';

            self.rules = {};

            //load socket.io
            self._log("Loading file: '" + CONSTANTS.WEBSOCKET_LIB + "'... ");
            self._loadFile(CONSTANTS.WEBSOCKET_LIB, function(){
                self.serversocket = io.connect(self.serverIp, opts.config || {});
                self.serversocket.on("connect", function(msg){
                    if (typeof ackCallback === "function"){
                        ackCallback.call(null, true, msg);
                    }
                });
                self.setupClientSocketConnections(self.clientName, self.clientGroup);
            });
        };

        this.setupClientSocketConnections = function(client, group){


            //client id can be socket id for now
            this.serversocket.on(SOCKET_EVENTS.SOCKET_IO_CONNECTED, function(){
                self.clientId = self.serversocket.socket.sessionid;
                //set client name
                //self.setClientName(client);
                self.setClientGroup(client, group);
            });

            this.serversocket.on(SOCKET_EVENTS.RULE_ACTIVATED, function(rulename, facts){
                self._logInfo("Fired rule: " + rulename);
                self._logDir(facts);
                //private rule activated
                self.ruleFired.call(self, SOCKET_EVENTS.RULE_ACTIVATED, rulename, facts);
            });

            //group rule activations
            this.serversocket.on(SOCKET_EVENTS.GROUP_RULE_ACTIVATED, function(rulename, facts){
                self._logInfo("Fired GROUP rule: " + rulename);
                self._logDir(facts);

                if (self.clientGroup){
                    self.ruleFired.call(self, SOCKET_EVENTS.GROUP_RULE_ACTIVATED, rulename, facts);
                }
            });

            //group rule activations
            this.serversocket.on(SOCKET_EVENTS.PUBLIC_RULE_ACTIVATED, function(rulename, facts){
                self._logInfo("Fired PUBLIC rule: " + rulename);
                self._logDir(facts);

                self.ruleFired.call(self, SOCKET_EVENTS.PUBLIC_RULE_ACTIVATED, rulename, facts);
            });


        };

        //use set clientgroup instead, also sets client name
        this.setClientName = function(name, cb){
            if (!self.serversocket){
                console.err("[SereneClient] Error: Server connection not available..");
                return;
            }

           self.serversocket.emit(SOCKET_EVENTS.SET_CLIENT_NAME, name, function(err, msg){
               if (err) { return;}
               self._logInfo(msg);
               if (cb){ cb(msg); }
            });
        };

        this.setClientGroup = function(client, group, cb){
            if (!self.serversocket){
                console.err("[SereneClient] Error: Server connection not available..");
                return;
            }

            self.serversocket.emit(SOCKET_EVENTS.SET_CLIENT_GROUP, client, group, function(err, msg){
                if (err) { return;}
                self._logInfo(msg);
                if (cb){ cb(msg); }
            });
        };


        this.registerRule = function(rule, cb, cbscope, ack){
            if (!self.serversocket){
                console.err("[SereneClient] Error: Server connection not available..");
                return;
            }
            self.serversocket.emit(SOCKET_EVENTS.REGISTER_RULE, rule, self.clientName, function(err, msg){
                if (err) { self._logErr("A problem occured when registering the rule ' "
                    + rule.rulename + " '. Details: " + msg);

                    if (typeof ack === "function"){
                        ack.call(null, "Error", msg);
                    }
                    return;
                }

                self._log("Registered for rule '"+ rule.rulename + "'. Details: " + msg);
                //acknowledge we registred the rule
                if (typeof ack === "function"){
                    ack.call(null, null, msg);
                }
            });

            self._addEventHandler(rule.rulename, cb, cbscope);
        };

        //client must provide this cb to react to group rules
        this.onGroupRuleActivation = function(cb, cbscope){
            if (!self.serversocket){
                console.error("[SereneClient] Error: Server connection not available..");
                return;
            }
            self._addEventHandler(SOCKET_EVENTS.GROUP_RULE_ACTIVATED, cb, cbscope || null);
        };

        //client must provide this cb to react to public rules
        this.onPublicRuleActivation = function(cb, cbscope){
            if (!self.serversocket){
                console.error("[SereneClient] Error: Server connection not available..");
                return;
            }
            self._addEventHandler(SOCKET_EVENTS.PUBLIC_RULE_ACTIVATED, cb, cbscope || null);
        };


        this.unregisterRule = function(rulename){
            //note: TODO
            self.serversocket.emit(SOCKET_EVENTS.REMOVE_RULE, rulename, function(err, msg){
                if (err) { self._logErr("A problem occured when deleting the rule ' "
                    + rulename + " '. Details: " + msg);
                    return;
                }

                self._log("Removed rule '"+ rulename + "'. Details: " + msg);
            });

        };

        this.assertFact = function(fact, ack){
            var facts = this._isArray(fact) ? fact : [fact];
            self.serversocket.emit(SOCKET_EVENTS.ASSERT_FACT, facts, self.clientName,  function(err, msg){
                if (err) { self._logErr("A problem occurred when asserting the fact(s). '. Details: " + msg);
                    return;
                }
                var ackMsg = "Asserted  '"+ facts.length + "' facts.";
                self._log(ackMsg);

                if (typeof ack === "function"){
                    ack.call(null, ackMsg);
                }
            });

        };


        this.ruleFired = function(scope, name, data){
            var event;

            switch (scope){
                case SOCKET_EVENTS.GROUP_RULE_ACTIVATED:
                case SOCKET_EVENTS.PUBLIC_RULE_ACTIVATED:

                    event = this._getEventHandler(scope);
                    event.cb.call(event.scope, name, data); //event.scope is scope of cb

                    break;

                default:
                    //trigger event
                    self._callEventHandler(name, data);
                    break;
            }
        };


        this.getRete = function(cb){
            this.serversocket.emit("get_network", function(err, network){
                if (err) {
                    self._logErr("Could not read the rete network. Details:");
                    self._logDir(err);
                    return;
                }
                self._logInfo("Loaded rete network.. ");
                //self._logDir(network);
                cb(network)
            });
        };

        //also resets the facts. returns bool
        this.resetNetwork = function(cb){
            this.serversocket.emit('reset_network', function(err, res){
                if (err) {
                    self._logErr("Error when resetting network. " + err);
                    cb(false);
                }

                self._logInfo(res.text);
                cb(true);
            });
        };

        //get server facts (can filter by type)
        this.getServerFacts = function(type, cb){
            this.serversocket.emit("get_facts", type || null , function(err, result){
                if (err) {
                    self._logErr("Could not read the facts from serene engine. Details:");
                    self._logDir(err);
                    return;
                }
                self._logInfo("Collected "+ result.length + " facts from server enigne");
                cb(result)
            });
        };

        //admin function - get group info
        this.getGroupInfo = function(group, cb){
            this.serversocket.emit(SOCKET_EVENTS.GET_GROUP_INFO, group, function(err, result){
                if (err) {
                    self._logErr("Could not read the group info from engine. Details:");
                    self._logDir(err);
                    return;
                }
                self._logInfo("Collected group info from server engine");
                cb(result)
            });
        };

        // expression condition building helpers - TODO
        this.buildExpressionJson = function(expr){
            var res = {name: CONSTANTS.EXPRESSION_CONDITION_SLOT_ALIAS };
            res[""+CONSTANTS.EXPRESSION_CONDITION_SLOT_ALIAS] = expr;
            return res;
        };
        // -------------- used internally ---------------
        this._addEventHandler = function(eventName, eventCallback, callbackScope){
            //add cb -  make sure key is string
            this.rules[eventName + ""] = {name: eventName, cb: eventCallback, scope: callbackScope || null};
            return true;
        };
        this._callEventHandler = function(eventName, args){
            var event = self.rules[eventName];
            if (!event){
                self._logErr("Event of name '" + eventName + "' not found");
                return false;
            }

            if (!event.cb || typeof event.cb !== "function") {
                self._logErr("Event of name '" + eventName + "' does not have a callback function");
                return false;
            }

            //call the cb
            event.cb.call(event.scope, args);
            return true;
        };
        this._getEventHandler = function(eventName){
            var event = self.rules[eventName];
            if (!event){
                self._logErr("Event of name '" + eventName + "' not found");
                return false;
            }

            if (!event.cb || typeof event.cb !== "function") {
                self._logErr("Event of name '" + eventName + "' does not have a callback function");
                return false;
            }
            return event;
        };
        this._removeEventHandler = function(eventName){
            return delete self.rules[eventName];
        };

        this._loadFile = function(file, next){
            //need to get socket.io file and load it, dynamically.
                var script = document.createElement('script');
                script.setAttribute('src', file);
                if ("undefined" == typeof io) {
                    script.onreadystatechange = script.onload = function() {
                        self._log("Loaded file successfully. ");
                        next();
                    };
                } else{
                    next(); }
                document.getElementsByTagName('head')[0].appendChild(script);
        };

        //utilities

        this._isArray = Array.isArray || function(obj) {
            return toString.call(obj) == '[object Array]';
        };
        //logging
        this._log = function(msg){
            console.log("[SereneClient]: " + msg);
        };
        this._logErr = function(msg){
            console.error("[SereneClient] Error: " + msg);
        };
        this._logInfo = function(msg){
            console.info("[SereneClient] Info: " + msg);
        };
        this._logDir = function(obj){
            console.dir(obj);
        };

        //call init
        this.init(server, opts);
    };

})(this.serena = {});