var retescript = require('./retescript'),
    rule = require('./rule'),
    facts = require('./factbase'),
    rules = require('./rulebase'),
    memory = require('./memory'),
    reteutils = require('./reteutils'),
    nodes = require('./nodes'),
    util = require('util'),
    _ = require("underscore");

    moment = require('moment');
    moment().format();

var scopes = {
    SUPER: "super",
    PUBLIC: "public",
    PRIVATE: "private",
    GROUP: "group",
    DEFAULT_RULE_SCOPE: "private",
    DEFAULT_FACT_SCOPE: "private"
};
var constants = {
    SERENE_CLIENT_URL : '/serene/client.js',
    SERENE_CLIENT_FILE: __dirname + '/serene-client.js'
};

var oldRuleConstructor = rule.Rule,
    oldFactConstructor = memory.Fact;

function Serene(){

    var self = this;

    this.addRule = null;
    this.createOrReuseBetaNode = null;

    this.initMetaLayer = function(rs){
        this.retescript = rs;

        this.clientManager = new SereneClientManager(rs);

        this.oldCreateOrReuseBetaNode = this.retescript.reteEngine.createOrReuseBetaNode;
        this.oldCreateOrReuseExpressionTestNode = this.retescript.reteEngine.createOrReuseExpressionTestNode;
        this.oldCreateOrReuseNegativeBetaNode= this.retescript.reteEngine.createOrReuseNegativeBetaNode;

        this.oldSetupSocketConnections = this.retescript.setupSocketConnections;


        /* When a new client connects... */
        this.retescript.setupSocketConnections = function(socket, io) {
            var start;
            //call old fn
            self.oldSetupSocketConnections.call(self.retescript,socket, io);

            //de-register some events
            socket.removeListener(rs.socketEvents.REGISTER_RULE, self.retescript.registerRuleCallback);
            socket.removeListener(rs.socketEvents.ASSERT_FACT, self.retescript.assertFactCallback);

            //overwrite by registering new events
            self.retescript.registerRuleCallback = function(ruleJson, ruleOwner, rulecb){

                //console.dir(ruleJson);
                self.retescript.registerRule(ruleJson, ruleOwner, function(ruleObj, facts){

                    //get rule
                    var rule = self.retescript.theRuleBase.getRule(ruleObj.name);
                    self.clientManager.fireScopedRule(rule, facts);

                    console.log("Time taken: " +  moment(new Date()).diff(start, 'milliseconds', true) +
                        ". Memory: " + util.inspect(process.memoryUsage()));
                });
                rulecb(null, "rule " + ruleJson.rulename + "  registered successfully..");
            };

            self.retescript.assertFactCallback =  function(factData, factOwner, factcb){
                console.dir("asserting facts..");
                start = moment(new Date());
                self.retescript.assertFact(factData, factOwner);

                console.log("Factbase: "+ factData.length +". Time taken: " +  moment(new Date()).diff(start, 'milliseconds', true) +
                    ". Memory: " + util.inspect(process.memoryUsage()));

                factcb(null, "Facts asserted successfully.");

            };

            socket.on(rs.socketEvents.ASSERT_FACT, self.retescript.assertFactCallback);
            socket.on(rs.socketEvents.REGISTER_RULE, self.retescript.registerRuleCallback);

            //also when client is added
            self.clientManager.registerNewSocket(socket);
        };

        //overwrite register rule
        this.retescript.registerRule = function(ruleJson, ruleOwner,  rulecb){
            //console.log(util.inspect(ruleJson, showHidden=false, depth=3, colorize=true));
            var myrule = new rule.Rule(ruleJson.rulename, ruleOwner, ruleJson.scope);

            self.retescript.constructRuleBodyFromJson.call(self.retescript,myrule, ruleJson, rulecb);

            //add rule, return terminal node
            self.retescript.addRuleToRuleBase.call(self.retescript, myrule);
        };


        //intercept assert fact event, overwrite with new
        self.retescript.assertFact =  function(factsAsJson, factOwner){
            for (var i=0; i < factsAsJson.length; i++){
                var factJson = factsAsJson[i];

                var myfact = new memory.Fact(factJson.type, factOwner, factJson.scope);

                //call fn, add id
                self.retescript.constructFactSlotsFromJson.call(self.retescript, myfact, factJson);

                self.retescript.addFactToFactBase.call(self.retescript, myfact);
            }

        };


        // -------- create/reuse node functions ------------

        //replace create or reuse node with scoped meta version
        this.retescript.reteEngine.createOrReuseBetaNode = function(currNode, aMem, tests){

            var theNode;

            theNode = _scopedBetaNode(currNode, aMem, tests);

            return theNode;

            function _scopedBetaNode(parent, mem, thetests){
                var child;

                //if tests are super, attach to any node scope type
                if (thetests &&
                    thetests.head().condition.meta.scope === scopes.SUPER){

                    child = parent.children.some(function(node){
                        if (node.kind === nodes.NodeTypes.BETANODE
                            && node.alphaMemory === mem
                            && node.testsEqualTo(thetests)
                            ){
                            return node;
                        }
                        return null;
                    });

                }

                //if tests are public then only attach to public node
                if (!thetests ||
                     thetests.head().condition.meta.scope === scopes.PUBLIC){

                     child = parent.children.some(function(node){
                        if (node.kind === nodes.NodeTypes.BETANODE
                            && node.alphaMemory === mem
                            && node.testsEqualTo(thetests)
                            && node.meta.scope === scopes.PUBLIC){
                            return node;
                        }
                        return null;
                    });

                }

                //if tests is group scoped then attach to public node, or
                // group node who is in same group as rule creator
                if (thetests &&
                    thetests.head().condition.meta.scope === scopes.GROUP){
                    //the node has to be private and owned by someone in group
                    child = parent.children.some(function(node){
                        if (node.kind === nodes.NodeTypes.BETANODE
                            && node.alphaMemory === mem
                            && node.testsEqualTo(thetests)
                            && ((node.meta.scope === scopes.GROUP
                                    && self.clientManager.areClientsInSameGroup(node.meta.owner, thetests.head().condition.meta.owner))
                                 || (node.meta.scope === scopes.PUBLIC))    //gives group nodes preference?
                            )

                            {
                            return node;
                        }
                        return null;
                    });

                }

                //if tests are private scoped then attach only to private node that is rule creators
                if (thetests &&
                    thetests.head().condition.meta.scope === scopes.PRIVATE){
                    //the node has to be private and owned by this client
                    child = parent.children.some(function(node){
                        if (node.kind === nodes.NodeTypes.BETANODE
                            && node.alphaMemory === mem
                            && node.testsEqualTo(thetests)
                            && node.meta.scope === scopes.PRIVATE
                            && node.meta.owner === thetests.head().condition.meta.owner){
                            return node;
                        }
                        return null;
                    });

                }

                // no existing node, create new one
                if (!child) {
                    child = _createNewScopedBetaNode(mem,parent, thetests);
                }

                return child;

                function _createNewScopedBetaNode(m, p, ts ) {
                    //m - memory, p - parent, ts - tests
                    var newNode;
                    newNode = new nodes.BetaNode(m, p, ts);

                    //add meta info. note: all conditions have same scope
                    newNode.meta = {
                        owner: ts ? ts.head().condition.meta.owner : scopes.PUBLIC,
                        scope: ts ? ts.head().condition.meta.scope : scopes.PUBLIC //top beta nodes are public
                    };

                    //add scope also to json call for visualizing - note: add before adding as child (??)
                    var oldAsJson = newNode.asJSON;
                    newNode.asJSON = function() {
                        var result = oldAsJson.apply(newNode, arguments);
                        //add scoping, owner info
                        result.owner = newNode.meta.owner;
                        result.scope = newNode.meta.scope;

                        return result;
                    };

                    var oldPerformTest = newNode._performTest;
                    // scoped tests for this node. if private only test public or own facts
                    if (newNode.meta.scope === scopes.PUBLIC){


                        newNode._performTest =  function(test, token, fact){
                            //check if token's fact or fact is private
                            if (token.fact.meta.scope === scopes.PRIVATE ||
                                fact.meta.scope === scopes.PRIVATE){
                                //the fact is private, so no join
                                return false;
                            }
                            //owise proceed with the join test
                            return oldPerformTest.call(newNode, test, token, fact);
                        };
                    }

                    // node is group scope
                    if (newNode.meta.scope === scopes.GROUP){

                        newNode._performTest =  function(test, token, fact){
                            //check if token's fact or fact is private
                            if (token.fact.meta.scope === scopes.PRIVATE
                                && !self.clientManager.areClientsInSameGroup(token.fact.meta.owner, newNode.meta.owner) ){
                                //the tokens fact and node not in same group, no join test
                                return false;
                            }

                            if (fact.meta.scope === scopes.PRIVATE
                                && !self.clientManager.areClientsInSameGroup(fact.meta.owner, newNode.meta.owner) ){
                                return false;
                            }
                            //proceed with the join test
                            return oldPerformTest.call(newNode, test, token, fact);
                        };
                    }

                    // scoped tests for this node. if private only test public or own facts
                    if (newNode.meta.scope === scopes.PRIVATE){

                        newNode._performTest =  function(test, token, fact){
                            //check if token's fact or fact is private
                            if (token.fact.meta.scope === scopes.PRIVATE &&
                                token.fact.meta.owner !== newNode.meta.owner){
                                //the tokens fact does not belong to this node, no join test
                                return false;
                            }

                            if (fact.meta.scope === scopes.PRIVATE &&
                                fact.meta.owner !== newNode.meta.owner){
                                //the fact does not belong to this node, no join test
                                return false;
                            }
                            //proceed with the join test
                            return oldPerformTest.call(newNode, test, token, fact);
                        };
                    }

                    newNode.parent.addChild(newNode);
                    newNode.alphaMemory.addChild(newNode);

                    return newNode;
                }

            }
        };

        //replace create or reuse node with scoped meta version
        this.retescript.reteEngine.createOrReuseExpressionTestNode = function(currNode, cond, tests){

            var theNode;

            theNode = _scopedTestNode(currNode, cond, tests);

            return theNode;

            function _scopedTestNode(parent, condition, thetests){
                    //
                var child;

                //if tests are super, attach to any scoped node
                if (thetests &&
                    condition.meta.scope === scopes.SUPER){

                    child = parent.children.some(function(node){
                        if (node.kind === nodes.NodeTypes.BETATESTNODE
                            && node.testsEqualTo(tests)){
                            return node;
                        }
                        return null;
                    });

                }

                //if tests are public then find node as usual
                if (!thetests ||
                    condition.meta.scope === scopes.PUBLIC){

                    child = parent.children.some(function(node){
                        if (node.kind === nodes.NodeTypes.BETATESTNODE//todo: create alphatest (test.isjoin)
                            && node.meta.scope === scopes.PUBLIC
                            && node.testsEqualTo(tests)){
                            return node;
                        }
                        return null;
                    });

                }

                //if group
                if (thetests &&
                    condition.meta.scope === scopes.GROUP){
                    child = parent.children.some(function(node){
                        if (node.kind === nodes.NodeTypes.BETATESTNODE
                            && node.testsEqualTo(thetests)
                            && node.meta.scope === scopes.GROUP
                            && self.clientManager.areClientsInSameGroup(condition.meta.owner, node.meta.owner)){
                            return node;
                        }
                        return null;
                    });

                }

                //if private, only allow own tests
                if (thetests &&
                    condition.meta.scope === scopes.PRIVATE){
                    //the node has to be private and owned by this client
                    child = parent.children.some(function(node){
                        if (node.kind === nodes.NodeTypes.BETATESTNODE
                            && node.testsEqualTo(thetests)
                            && node.meta.scope === scopes.PRIVATE
                            && node.meta.owner === condition.meta.owner){
                            return node;
                        }
                        return null;
                    });

                }

                // no existing node, create new one
                if (!child) {
                    child = _createNewScopedTestNode(parent, condition, thetests);
                }

                return child;

            }

            function _createNewScopedTestNode(p, c, ts ) {
                //p - parent, c - condition, ts - tests
                var newNode;
                newNode = new nodes.BetaTestNode(p, c, ts);

                //add meta info. note: all conditions have same scope
                newNode.meta = {
                    owner: ts ? c.meta.owner : scopes.PUBLIC,
                    scope: ts ? c.meta.scope : scopes.DEFAULT_RULE_SCOPE
                };

                //add scope also to json call for visualizing
                var oldAsJson = newNode.asJSON;
                newNode.asJSON = function() {
                    var result = oldAsJson.apply(newNode, arguments);
                    //add scoping, owner info
                    result.owner = newNode.meta.owner;
                    result.scope = newNode.meta.scope;

                    return result;
                };

                var oldPerformExpressionTest = newNode._performExpressionTest;

                // scoped expression tests for this node. only test public facts if public
                if (newNode.meta.scope === scopes.PUBLIC){

                    newNode._performExpressionTest = function(test, token){
                        //check if token's fact is private
                        if (token.fact.meta.scope === scopes.PRIVATE){
                            return false;
                        }

                        //proceed with the expression test
                        return oldPerformExpressionTest.call(newNode, test,  token);
s                    };
                }

                // scoped expression tests for this node. if private only test public or own facts
                if (newNode.meta.scope === scopes.GROUP){

                    newNode._performExpressionTest = function(test, token){
                        //check if token's fact is private
                        if (token.fact.meta.scope === scopes.PRIVATE &&
                            !self.clientManager.areClientsInSameGroup(token.fact.meta.owner,newNode.meta.owner)){
                            //the fact does not belong to this node, no join test
                            return false;
                        }

                        //proceed with the expression test
                        return oldPerformExpressionTest.call(newNode, test,  token);
                    };
                }

                // scoped expression tests for this node. if private only test public or own facts
                if (newNode.meta.scope === scopes.PRIVATE){

                    newNode._performExpressionTest = function(test, token){
                        //check if token's fact is private
                        if (token.fact.meta.scope === scopes.PRIVATE &&
                            token.fact.meta.owner !== newNode.meta.owner){
                            //the fact does not belong to this node, no join test
                            return false;
                        }

                        //proceed with the expression test
                        return oldPerformExpressionTest.call(newNode, test,  token);
                    };
                }

                newNode.parent.addChild(newNode);

                return newNode;
            }
        };


        //replace create or reuse node with scoped version
        this.retescript.reteEngine.createOrReuseNegativeBetaNode = function(currNode, aMem, tests){

            var theNode;

            theNode = _scopedNegationNode(currNode, aMem, tests);

            //add meta info
            theNode.meta = {
                owner: tests ? tests.head().condition.meta.owner : scopes.DEFAULT_RULE_SCOPE,  //all conditions have same scope
                scope: tests? tests.head().condition.meta.scope  : scopes.DEFAULT_RULE_SCOPE
            };

            //for testing, etc
            var oldAsJson = theNode.asJSON;
            theNode.asJSON = function() {
                var result = oldAsJson.apply(theNode, arguments);
                //add scoping, owner info
                result.owner = theNode.meta.owner;
                result.scope = theNode.meta.scope;

                return result;
            };

            return theNode;

            function _scopedNegationNode(parent, mem, thetests){

                var child;
                if (thetests &&
                    condition.meta.scope === scopes.SUPER){

                    child = parent.children.some(function(node){
                        if (node.kind === nodes.NodeTypes.NEGATIONNODE
                            && node.alphaMemory === mem
                            && node.testsEqualTo(tests)){
                            return node;
                        }
                        return null;
                    });

                }

                if (!thetests ||
                    condition.meta.scope === scopes.PUBLIC){

                    child = parent.children.some(function(node){
                        if (node.kind === nodes.NodeTypes.NEGATIONNODE
                            && node.alphaMemory === mem
                            && node.testsEqualTo(tests)
                            && node.meta.scope === nodes.NodeTypes.PUBLIC){
                            return node;
                        }
                        return null;
                    });

                }

                //if tests are for a GROUP node
                if (thetests &&
                    condition.meta.scope === scopes.GROUP){
                    //the node has to be private and owned by this client
                    child = parent.children.some(function(node){
                        if (node.kind === nodes.NodeTypes.NEGATIONNODE
                            && node.alphaMemory === mem
                            && node.testsEqualTo(thetests)
                            && node.meta.scope === scopes.GROUP
                            && self.clientManager.areClientsInSameGroup(node.meta.owner,condition.meta.owner)){
                            return node;
                        }
                        return null;
                    });

                }

                //if tests are private find this client's test node
                if (thetests &&
                    condition.meta.scope === scopes.PRIVATE){
                    //the node has to be private and owned by this client
                    child = parent.children.some(function(node){
                        if (node.kind === nodes.NodeTypes.NEGATIONNODE
                            && node.alphaMemory === mem
                            && node.testsEqualTo(thetests)
                            && node.meta.scope === scopes.PRIVATE
                            && node.meta.owner === condition.meta.owner){
                            return node;
                        }
                        return null;
                    });

                }

                // no existing node, create new one
                if (!child) {
                    child = _createNewScopedNegationNode(currNode, aMem, tests);
                }

                return child;
            }

            function _createNewScopedNegationNode(p, m, ts ) {
                //p - parent, m - alpha mem, ts - tests
                var newNode;
                newNode = new nodes.NegativeBetaNode(p, m, ts);

                //add meta info. note: all conditions have same scope
                newNode.meta = {
                    owner: ts ? ts.head().condition.meta.owner : scopes.PUBLIC,
                    scope: ts ?  ts.head().condition.meta.scope : scopes.DEFAULT_RULE_SCOPE
                };

                //add scope also to json call for visualizing
                var oldAsJson = newNode.asJSON;
                newNode.asJSON = function() {
                    var result = oldAsJson.apply(newNode, arguments);
                    //add scoping, owner info
                    result.owner = newNode.meta.owner;
                    result.scope = newNode.meta.scope;

                    return result;
                };



                //TODO: negation with scoping!!
                var oldPerformTest = newNode.__performNegationTest;
                // scoped tests for this node. if private only test public or own facts
                if (newNode.meta.scope === scopes.PUBLIC){

                    newNode.__performNegationTest =  function(test, token, fact){
                        //check if token's fact or fact is private
                        if (token.fact.meta.scope === scopes.PRIVATE ||
                            fact.meta.scope === scopes.PRIVATE){
                            //the fact is private, so no join
                            return false;
                        }
                        //owise proceed with the join test
                        return oldPerformTest.call(newNode, test, token, fact);
                    };
                }

                // node is group scope
                if (newNode.meta.scope === scopes.GROUP){

                    newNode.__performNegationTest =  function(test, token, fact){
                        //check if token's fact or fact is private
                        if (token.fact.meta.scope === scopes.PRIVATE
                            && !self.clientManager.inSameGroup(token.fact.meta.owner, newNode.meta.owner) ){
                            //the tokens fact and node not in same group, no join test
                            return false;
                        }

                        if (fact.meta.scope === scopes.PRIVATE
                            && !self.clientManager.inSameGroup(fact.meta.owner, newNode.meta.owner) ){
                            return false;
                        }
                        //proceed with the join test
                        return oldPerformTest.call(newNode, test, token, fact);
                    };
                }

                // scoped tests for this node. if private only test public or own facts
                if (newNode.meta.scope === scopes.PRIVATE){

                    newNode.__performNegationTest =  function(test, token, fact){
                        //check if token's fact or fact is private
                        if (token.fact.meta.scope === scopes.PRIVATE &&
                            token.fact.meta.owner !== newNode.meta.owner){
                            //the tokens fact does not belong to this node, no join test
                            return false;
                        }

                        if (fact.meta.scope === scopes.PRIVATE &&
                            fact.meta.owner !== newNode.meta.owner){
                            //the fact does not belong to this node, no join test
                            return false;
                        }
                        //proceed with the join test
                        return oldPerformTest.call(newNode, test, token, fact);
                    };
                }

                newNode.parent.addChild(newNode);
                newNode.alphaMemory.addChild(newNode);

                //need to update it
                newNode.update();

                return newNode;
            }

        };


        //setup serving the client file
        self.retescript.server().get(constants.SERENE_CLIENT_URL, function(req, res){
            res.sendfile(constants.SERENE_CLIENT_FILE);
        });
    };

}


/*
 * ---------------- Interceptor functions for main engine's structures ----------------
 */

rule.Rule = function(rulename, clientId, scope){

    var newRule = new (Function.prototype.bind.call(oldRuleConstructor, null, rulename));

    _addMetaInfoToRule(newRule);

    function _addMetaInfoToRule(therule){

        var metaInfo = {
            owner: clientId,
            scope : scope || scopes.DEFAULT_RULE_SCOPE
        };
        therule.meta = metaInfo;

        // add to rhs and lhs
        therule.lhs.meta = metaInfo;
        therule.rhs.meta = metaInfo;

        // add meta info to conditions
        var oldAddCondition = therule.lhs.addCondition;
        therule.lhs.addCondition = function(){
            var condition = arguments[0];
            condition.meta = metaInfo;
            //also add meta info to sub condtions
            if (condition.isCompoundCondition()){
               annotateSubconditions(condition, metaInfo);
            }
            //call old method
            oldAddCondition.apply(therule.lhs,arguments);

        };

    }

    //rule.lhs and rhs have the meta info now
    return newRule;
};

memory.Fact = function(facttype, clientId, factscope){

    var newFact = new (Function.prototype.bind.call(oldFactConstructor, null, facttype));

    _addMetaInfoToFact(newFact);

    // the fact has the meta info now
    return newFact;

    function _addMetaInfoToFact(thefact){

        var scope = factscope ?  factscope : scopes.DEFAULT_FACT_SCOPE;   //default: private
        var metaInfo = {
            owner: clientId,
            scope : scope
        };
        thefact.meta = metaInfo;


        //override also the asJSON method
        var oldAsJson = thefact.asJSON;
        thefact.asJSON = function() {
            var result = oldAsJson.apply(thefact, arguments);
            //add scoping, owner info
            result.owner = thefact.meta.owner;
            result.scope = thefact.meta.scope;

            return result;
        };

        return thefact;
    }
};


/*  manages the clients - helpful for reconnections and retrieving sessions */
function SereneClientManager(rs) {
    var self= this;

    this.retescript = rs;
    this.oldAddRule = this.retescript.theRuleBase.addRule;
    this.oldRemoveRule = this.retescript.theRuleBase.removeRule;

    this.constants = {
        SET_CLIENT_NAME: 'set_client_name',
        SET_CLIENT_GROUP: 'set_client_group',
        GET_GROUP_INFO: 'get_group_info',
        GROUP_RULE_ACTIVATED: "group_rule_activated",
        PUBLIC_RULE_ACTIVATED: "public_rule_activated",
        RULE_ACTIVATED: "rule_activated"
    };

    this.clientsInfo = {};

    this.addClient = function(client, socket){
        var clientHash = this.clientsInfo[client + ""];
        if (!clientHash){
            clientHash = this.clientsInfo[client + ""] = {rules: {}, group: ""};
            console.log("SereneClientManager: Added client: " + client + ". Socket: " + socket.id);
        }
        clientHash["socket"] = socket;
    };


    this.addRuleForClient = function(client, rule){
        var clientHash = this.clientsInfo[client + ""];
        if (!clientHash){
            console.error("SereneClientManager: Could not find client: " + client);
            return;
        }
        clientHash["rules"][rule.name] = rule;

        console.log("SereneClientManager: Stored rule " + rule.name + " for client " + client);
    };
    this.removeRuleForClient = function(client, rulename){
        var clientHash = this.clientsInfo[client + ""];
        if (!clientHash){
            console.error("SereneClientManager: Could not find client: " + client);
            return;
        }
        delete clientHash["rules"][rulename];

        console.log("SereneClientManager: Removed rule " + rulename + " for client " + client);
    };

    this.getRulesForClient = function(client){
        var clientHash = this.clientsInfo[client + ""];
        if (!clientHash){
            return null;
        }
        return clientHash["rules"];
    };

    //add or modify client's group
    this.addClientToGroup = function(client, groupName, socket){
        if (!client) {
            return false;
        }
        var clientHash = this.clientsInfo[client + ""];
        if (!clientHash){
            clientHash = this.clientsInfo[client + ""] = {rules: {}, group: groupName || ""};
            console.log("SereneClientManager: Added client: " + client + " to group: " + groupName || "");
        } else {
            clientHash["group"] = groupName || "";
        }
        clientHash["socket"] = socket || null;
        return true;
    };
    //add or modify client's group
    this.getGroupInfo = function(groupName){

        var result = _.chain( this.clientsInfo)
            .map(function(v, k) { return {client: k, group: v.group}; })
            .groupBy("group")
            .value();

        if (groupName) {
            result = result[groupName];
        }
        return result;

    };

    //are these clients in same group?
    this.areClientsInSameGroup = function(clientIdsArray){
        //make ids to be true array
        if (!_.isArray(clientIdsArray)){
            clientIdsArray = _.toArray(arguments);
        }
        var groupId = this.clientsInfo[clientIdsArray[0]];

        var result = _.chain(clientIdsArray)
            .rest()
            .every(function(clientId){
                var clientHash = self.clientsInfo[clientId + ""];
                return clientHash.group === groupId;    //note: returns true if no groups
            });

        return result;
    };

    //get clients group
    this.getClientGroup = function(clientId){
        var clientHash = this.clientsInfo[clientId + ""];
        return clientHash ? clientHash.group : false;
    };


    //add connect/disconnect events for client
    this.registerNewSocket = function (socket){
        socket.on(this.constants.SET_CLIENT_NAME, function(name, cb){
            self.addClient(name, socket);
            cb(null,"Added client successfully: " + name);
        });
        socket.on(this.constants.SET_CLIENT_GROUP, function(name, group, cb){
            if (self.addClientToGroup(name, group, socket)){
                cb(null,"Added client '"+ name +"' to group: " + group);
            } else {
                cb(true, "Could not add client '" + name + "' to group: " + group);
            }
        });
        socket.on(this.constants.GET_GROUP_INFO, function(group, cb){
            var info = self.getGroupInfo(group);
                cb(null, info);
        });
    };

    //overwrite rulebase events, store the client info
    this.retescript.theRuleBase.addRule = function(rule){
        //add rule also to client manager
        self.addRuleForClient(rule.meta.owner, rule);

        return self.oldAddRule.call(self.retescript.theRuleBase, rule);
    };

    this.retescript.theRuleBase.removeRule = function(client, rulename){
        //add rule also to client manager
        self.removeRuleForClient(client, rulename);

        return self.oldRemoveRule.call(self.retescript.theRuleBase, rulename);
    };

    //invoke public rule
    this.fireScopedRule = function(rule, facts){

        var ruleGroup = self.clientsInfo[rule.meta.owner].group;
        var sockets;

        switch (rule.meta.scope) {
            case scopes.PUBLIC:
                sockets = self._getAllClientSockets();
                _.each(sockets, function(socket){
                     socket.emit(self.constants.PUBLIC_RULE_ACTIVATED, rule.name, facts);
                });
                break;

            case scopes.GROUP:
                sockets = self._getClientSockets(ruleGroup);
                _.each(sockets, function(socket){
                    socket.emit(self.constants.GROUP_RULE_ACTIVATED, rule.name, facts);
                });
                break;

            default:
                sockets = self._getClientSocket(rule.meta.owner);
                sockets.emit(self.constants.RULE_ACTIVATED, rule.name, facts);
                break;
        }
    };

    this._getClientSocket = function(clientName){
        var clientHash = self.clientsInfo[clientName + ""]

            if (clientHash){
                return clientHash.socket;
            }
        return null;
    };
    this._getClientSockets = function(groupName){
        var sockets = _.map(this.clientsInfo, function(info, clientid){
            if (groupName){
                return info.group === groupName ? info.socket : null;
            } else {
                return info.socket;
            }
        });
        return _.compact(sockets);
    };

    this._getAllClientSockets = function(){
        var sockets = _.map(this.clientsInfo, function(info, clientid){
            return info.socket;
        });
        return _.compact(sockets);
    };
}

//add metainfo to subconditions of a compound condition
function annotateSubconditions(condition, metaInfo){
    condition.getSubConditions().each(function(subcond){
        if (subcond.isCompoundCondition()){
            annotateSubconditions(subcond, metaInfo);
        }
        subcond.meta = metaInfo;
    });
}

exports.Serene = Serene;