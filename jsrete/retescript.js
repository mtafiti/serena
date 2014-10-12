var jsrete = require('./rete'),
    rule = require('./rule'),
    facts = require('./factbase'),
    rules = require('./rulebase'),
    memory = require('./memory'),
    reteutils = require('./reteutils'),
    constants = require('./constants'),
    _ = require("underscore");
function ReteScript(app){

    this.socketEvents = {
        REGISTER_RULE: "register_rule",
        ASSERT_FACT: "assert_fact",
        MODIFY_FACT: "modify_fact",
        REMOVE_RULE: "remove_rule",
        REMOVE_FACT: "remove_fact",
        RULE_ACTIVATED: "rule_activated"
    };

    var self = this;

    this._server = {};
    this.groups = {};

    this.theFactBase = new facts.FactBase();
    this.theRuleBase = new rules.RuleBase();

    //init the engine
    this.reteEngine = new jsrete.ReteNetwork(this.theFactBase, this.theRuleBase);

    this.init = function(app) {
        if (!app){
            return; //only testing, no server
        }
        this._server = app;

        // when a client websocket connects to server..
        this.server().io.sockets.on('connection', function(socket){

            self.setupSocketConnections(socket);
        });
    };
    this.server = function(){
        return this._server;
    };
    /*
    { type: "table" ,
      slots: [

      ]
    }
     */
    this.assertFact = function(factsAsJson){

        if (!reteutils.isArray(factsAsJson)){
            factsAsJson = [factsAsJson];
        }

        for (i=0; i < factsAsJson.length; i++){
            var factJson = factsAsJson[i];

            var fact = new memory.Fact(factJson.type);
            this.constructFactSlotsFromJson(fact, factJson);

            this.addFactToFactBase(fact);
        }
    };

    //todo: modify fact
    this.modifyFact = function(factJson){
        var fact = new memory.Fact(factJson.type);

        var slots = factJson['slots'];
        for(i=0; i < slots.length; i++){
            var slot = slots[i];
            fact.addSlot(slot.type, slot.val);
        }
        if (this.theFactBase.removeFact(fact)){
            this.theFactBase.assertFact(fact);
        }
    };

    //register rule from rule definition in json
    this.registerRule = function(ruleJson, cb){
       var myrule = new rule.Rule(ruleJson.rulename);

        this.constructRuleBodyFromJson(myrule, ruleJson, cb);

        //add rule, return terminal node
        return this.addRuleToRuleBase(myrule);
    };


    this.assertFacts = function(facts){
        if (!reteutils.isArray(facts)){
            facts = [facts];
        }
        facts.forEach(function(fact){
            self.assertFact(fact);
        });
    };

    this.networkAsJSON = function(){
        if (!this.reteEngine){
            var res = {error: "Rete network not initialized"};
            console.log(res.error);

            return res;
        }
        return this.reteEngine.asJSON();
    };

    this.resetNetwork = function(){
        this.theFactBase.reset();
        this.theRuleBase.reset();
        this.reteEngine.reset(this.theFactBase, this.theRuleBase);

        return {text: "Reset the rete network successful"};
    };


    //utility functions
    this.constructRuleBodyFromJson = function(myrule, ruleJson, cb){

        createLHS(myrule, ruleJson);
        createRHS(myrule, function(facts, rule){ //add action cb
            /*var res = [];
            facts.forEach(function(fact){
                res.push(fact.asJSON());
            });*/
            var res = facts.map(function(bind){
                console.log("> Fact..");
                console.log(bind.asJSON());
                //formatting
                var temp = _.omit(bind.asJSON(), ['id','sign']);   //todo: enumerate..
                var slots = temp.slots;
                slots = _.reduce(slots, function(obj, item){
                        var o = {}; o[item.type] = item.value;
                        return _.defaults(obj, o); },
                    {});
                return _.chain(temp).defaults(slots).omit(['slots','stime']).value();
            });
            if (typeof cb === "function"){
                cb(myrule.asJSON(), res);
            }
        });
        return myrule;
    };
    this.addRuleToRuleBase = function(rule){
        return this.theRuleBase.addRule(rule);
    };

    this.constructFactSlotsFromJson = function(fact, factJson){

        //defaults
        factJson = _.defaults(factJson, {sign: memory.SIGNS.POSITIVE});

        //add slots, omit properties
        var slots = _.chain(factJson).omit(['type', 'sign'])
            .map(function(value, key){
                fact.addSlot(key, value)})
           .value();

        return fact;
    };
    this.addFactToFactBase = function(fact){
        return this.theFactBase.assertFact(fact);
    };


    /*
     * --------- Setup socket connections --------------
     */

    //server socket connections
    this.setupSocketConnections = function(socket) {

        self.registerRuleCallback =  function(ruleJson, cb){
            console.dir("Asserting rule..");
            self.registerRule(ruleJson, function(rule, facts){
                socket.emit(self.socketEvents.RULE_ACTIVATED, rule.name, facts);

            });
            cb(null, "rule " + ruleJson.name + "  registered successfully..");
        };

        self.assertFactCallback = function(data, cb){
            console.dir("asserting facts..");

            self.assertFact(data);

            cb(null, "Facts asserted successfully.");
        };

        // socket events
        socket.on(self.socketEvents.REGISTER_RULE, self.registerRuleCallback);

        socket.on(self.socketEvents.ASSERT_FACT, self.assertFactCallback);

        socket.on(self.socketEvents.MODIFY_FACT, function(data, cb){
            console.dir("modify fact called..");

            cb({error: "not implemented"});
        });

        socket.on('get_network', function(cb){
            console.dir("retrieving network as json..");
            var res = self.networkAsJSON();
            if (res.error){ cb(res.error.message, {}); return;}
            cb(null, res);
        });
        socket.on('reset_network', function(cb){
            console.dir("resetting network..");
            var res = self.resetNetwork();
            if (res.error){ cb(res.error.message, {}); return;}
            cb(null, res);
        });

        socket.on('get_facts', function(type, cb){
            var res = self.theFactBase.getFacts(type);
            cb(null, res);
        });
        //test broadcast message
        socket.on('broadcast_msg', function(msg){
            console.dir("boradcasting.. "+msg);
             self.expressApp.io.sockets.emit('broadcast_msgs', msg);
        });
        //test broadcast message
        socket.on('echo', function(msg){
            console.dir("echo.. "+msg);
            socket.emit('echo', msg);
        });
    };

    //call init
    this.init(app);

}

function createConditionAndSlots(conditionJson){
    var condition;
    //identify reserved types
    switch (conditionJson.type.toLowerCase()) {
        case constants.expression.EXPRESSION_CONDITION_TYPE_ALIAS:
            condition = new rule.Condition(constants.expression.EXPRESSION_CONDITION_TYPE);
            break;
        case constants.groupConditionTypes.OR:

            condition = new rule.CompoundCondition(constants.groupConditionTypes.OR);
            var subcondition;
            _.each(conditionJson.conditions, function(cond){
                subcondition = createConditionAndSlots(cond);
                condition.appendCondition(subcondition);
            });
            break;
        case constants.groupConditionTypes.AND:

            condition = new rule.CompoundCondition(constants.groupConditionTypes.AND);
            var subcondition;
            _.each(conditionJson.conditions, function(cond){
                subcondition = createConditionAndSlots(cond);
                condition.appendCondition(subcondition);
            });
            break;
        default:
            condition = new rule.Condition(conditionJson.type);
            break;
    }
    //identify negation
    if (conditionJson.sign === "not" || conditionJson.sign === memory.SIGNS.NEGATIVE){
        condition.sign = memory.SIGNS.NEGATIVE;
    }

    //check if compound condition
    if (!condition.isCompoundCondition()){
        //remove already identified types
        var slotsJson = _.omit(conditionJson,[constants.reservedConditionTypes.TYPE,constants.reservedConditionTypes.SIGN]);
        //gather the condition slots
        var condslots = _.map(slotsJson, function(value, key){
            var isvar = false;
            if (reteutils.isString(value) && value.lastIndexOf(constants.expression.VARIABLE_DELIMITER, 0) === 0){
                value = value.replace(constants.expression.VARIABLE_DELIMITER, ""); //for normal condslots, remove ?
                isvar = true;
            }
            var slot;
            if (key === constants.expression.EXPRESSION_CONDITION_TYPE){
                slot = new rule.CondSlot(constants.expression.EXPRESSION_CONDITION_SLOT, value, isvar);
            } else {
                slot =  new rule.CondSlot(key, value, isvar);
            }
            return slot;
        });

        _.each(condslots, function(condslot){
            condition.addConditionSlot(condslot);
        });
    }
    return condition;
}

function createLHS(myrule, lhsJson){
    if (!myrule.lhs){
        myrule.lhs = new rule.LHS();
    }

     _.each(lhsJson.conditions, function(conditionJson){

        var condition = createConditionAndSlots(conditionJson);

        myrule.lhs.addCondition(condition);
    });
    return myrule.lhs;
}

//todo...
function createRHS(thisrule, cb) {
    thisrule.rhs = new rule.RHS();
    thisrule.rhs.addAction(function(binds){
        console.log("RS Engine ===> Rule fired: " + thisrule.name);
        //tdo;
        binds.forEach(function(bind){
            console.log("> Fact..");
            console.log(bind.asJSON());
        });

        cb(binds, thisrule);
    });
}

exports.ReteScript = ReteScript;