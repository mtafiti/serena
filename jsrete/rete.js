var nodes = require('./nodes.js'),
    memory = require('./memory.js'),
    list = require('./dllist.js'),
    _ = require('underscore'),
    constants = require('./constants.js'),
    reteutil = require('./reteutils.js'),
    rule = require('./rule.js');

function ReteNetwork(factbase, rulebase){

    // to overcome js scoping limitations..
    var self = this;


    this.getJoinsFromCondition = function(condition, pastconditions, lhs){
        var res;
        //get the variables in this condition
        var slotsWithVars = condition.getSlotsWithVariables();

        if (pastconditions && pastconditions.size() > 0){
            for (var i= 0; i < slotsWithVars.length; i++){
                var slot = slotsWithVars[i];
                //no need for joins for OR
                //if (!condition.parentCondition || condition.parentCondition.type() !== constants.groupConditionTypes.OR){
                    //tests for same variables
                    var earlierCondObj = lhs.getEarlierConditionForVar(slot, pastconditions);
                    if (earlierCondObj){
                        var newJoinTest = new nodes.JoinNodeTest(slot, earlierCondObj.condIndex, earlierCondObj.slot, true, earlierCondObj.bindingType);
                        newJoinTest.condition = condition;
                        if (!res){
                            res = new list.LinkedList();
                        }
                        res.append(newJoinTest);
                    }

                    //if not an OR condition, also add tests for different variables in same slot for conditions
                    var slotInequalityTest = lhs.getInequalityTestForSlot(slot, pastconditions);
                    if (slotInequalityTest){
                        newJoinTest = new nodes.JoinNodeTest(slot, slotInequalityTest.condIndex, slotInequalityTest.slot, false, slotInequalityTest.bindingType);
                        newJoinTest.condition = condition;
                        if (!res){
                            res = new list.LinkedList();
                        }
                        res.append(newJoinTest);
                    }

                //}
            }
        }
        return res;
    };

    this.getTestsFromExpression = function(condition, pastconditions){
        if (!condition.isExpressionTest()){
            return null;
        }
        var exprSlot = condition.getCondSlot(constants.expression.EXPRESSION_CONDITION_SLOT);
        var vars = reteutil.parseVariables(exprSlot.value());
        var conds = [], tests = [];

        // go through past conditions to see if its a join
        for (var i = 0; i < vars.length; ++i){
            var temp = vars[i];
            var res = (function
                (thevariable){
                var idx = 0, theslot;
                //check if it needs a join node before it
                pastconditions.somerev(function(cond){
                    if (!cond.isExpressionTest()) {
                        idx = idx + 1;
                        if(cond.isPositive()){    //only positive conditions to check for bindings
                            var slots = cond.getSlotsWithVariables(thevariable.replace(/\?/g,""));
                            if (slots && slots[0]){
                                theslot = slots[0];
                                conds.push(cond);
                                return true;    //break
                            }
                        }
                    }
                    return false;
                });

                return theslot ? {join: true, slot: theslot, index: idx} : null;
            })(temp);

            if (res){
                tests.push(new nodes.ExpressionTest(temp, res.slot, res.index, exprSlot.value()));
            }
        }
        var isJoin = false;

        //see if this is a join test
        var arr = conds.filter(function(c, i, self){
            return self.indexOf(c);
        });
        if (arr.length > 1){
            isJoin = true;
        }

        return {isjoin: isJoin, expr: tests};
    };

    this.createOrReuseKindNode = function (root, type) {
        //use a for loop
        for (var i=0; i < root.children.length; ++i){
            var child = root.children[i];
            if (child.kindTotest === type){
                return child;
            }
        }

        var newKindNode = new nodes.KindNode(type, null);
        //newConstNode.children = null; newConstNode.children = null;
        root.addChild(newKindNode);

        return newKindNode;
    };

    this.createOrReuseAlphaMemory = function(condition){
        var currNode = this.root;
       // var allslots = condition.getAllSlots();
       var allslots = condition.getSlotsWithConstants();   //get rid of var CT (to test)

        //get the kind for condition
         currNode = this.createOrReuseKindNode(currNode, condition.type());

        var i,j;
        //todo: start with VARIABLES for better reuse of more specific tests!!

        for (i= 0; i < allslots.length; i++){
            var slot = allslots[i];
            currNode = this.createOrReuseConstantTestNode(currNode, slot.type(), slot.value(), slot.isVar());
        }

        if (currNode.outputMemory){
            return currNode.outputMemory;
        }

        currNode.outputMemory = new memory.AlphaMemory(currNode);
        //alphaMemory.children = null; alphaMemory.items = null;

        //todo: optimize searching the whole factbase. note this is the update for alphamem
        for (j = 0; j < this.factbase.items.length; j++){
            var fact = this.factbase.items[j];
            if (condition.passesConstantTests(fact)){
                currNode.outputMemory.receive(fact);
            }
        }
        return currNode.outputMemory;
    };

    this.createOrReuseConstantTestNode = function(parent, slotType, slotValue, isVar){
        var slotIsVar = isVar? "variable" : "value";    //todo: hardcoded vals
        //use a for loop
        for (var i=0; i < parent.children.length; ++i){
            var child = parent.children[i];
            //can be optimized - variables can be together with the value ct nodes
            if (child.slotToTest === slotType && child.equalTo === slotValue && child.fieldToTest === slotIsVar){
                return child;
            }
        }

        var newConstNode = new nodes.ConstantTestNode(slotIsVar, slotValue, slotType, null);
        //newConstNode.children = null; newConstNode.children = null;
        parent.addChild(newConstNode);

        return newConstNode;

    };

    this.createOrReuseBetaMemory = function(parent){
        var child = parent.children.some(function(child){
            if (child.kind === nodes.NodeTypes.BETAMEMORY){
                return child;
            }
        });
        if (child) return child;

        var newNode = new memory.BetaMemory(parent);
        newNode.kind = nodes.NodeTypes.BETAMEMORY;
        parent.children.prepend(newNode);
        //newNode.children = null;
        //newNode.items = null;
        newNode.update();
        return newNode;
    };

    this.createOrReuseBetaNode = function(parent, alphaMemory, tests){
        var child = parent.children.some(function(node){
            if (node.kind === nodes.NodeTypes.BETANODE
                && node.alphaMemory === alphaMemory
                && node.testsEqualTo(tests)){
                return node;
            }

            return null;
        });

        if (child) return child;

        var newNode = new nodes.BetaNode(alphaMemory, parent);
        newNode.kind = nodes.NodeTypes.BETANODE;
        newNode.parent.addChild(newNode);
        newNode.tests = tests;
        newNode.alphaMemory.addChild(newNode);  //note to avoid duplicates children come before parent BNs
        return newNode;
    };


    this.createOrReuseNegativeBetaNode = function(parent, alphaMemory, tests){
        var child = parent.children.some(function(node){
            if (node.kind === nodes.NodeTypes.NEGATIONNODE
                && node.alphaMemory === alphaMemory
                && node.testsEqualTo(tests)){
                return node;
            }
            return null;
        });

        if (child) return child;

        var newNode = new nodes.NegativeBetaNode(parent, alphaMemory, tests);
        newNode.parent.addChild(newNode);
        newNode.tests = tests;
        newNode.alphaMemory.addChild(newNode);

        //need to update it
        newNode.update();

        return newNode;
    };

    this.createOrReuseExpressionTestNode = function(currentNode, condition, tests){
        var child = currentNode.children.some(function(node){
            if (node.kind === nodes.NodeTypes.BETATESTNODE//todo: if tests.isjoin, create alphatest
                && node.testsEqualTo(tests)){
                return node;
            }
            return null;
        });

        if (child) return child;

        var newNode;

        //todo:check if alpha, insert under AM of condition
        newNode = new nodes.BetaTestNode(currentNode, condition, tests);

        newNode.parent = currentNode;
        newNode.parent.addChild(newNode);

        return newNode;
    };
    //expects currnode to be a beta node from previous conditions (if none, empty top beta node)
    this.createOrReuseORNode = function (currentNode, orNodeList) {

        //todo: refine or reuse
        var child = currentNode.children.some(function(node){
            if (node.kind === nodes.NodeTypes.ORNODE
                && node.parents === orNodeList){
                return node;
            }
            return null;
        });

        if (child) return child;

        //now create final actual ornode that combines all nodes
        var ornode =  new nodes.OrNode(orNodeList);
        if (orNodeList) {
            orNodeList.each(function(node){
                node.addChild(ornode);
            });
        }

        return ornode;
    };


    this.createNetworkFromConditions = function(currNode, conds, pastconditions, rule){
        var pastconds = pastconditions || null;
        var firstCondition = conds.head();
        //check if it's a group condition
        if (firstCondition.isCompoundCondition()){

            switch (firstCondition.type()){
                case constants.groupConditionTypes.OR : {
                    currNode = self.createORNetworkFromConditions(currNode, firstCondition.getSubConditions(), pastconds, rule);
                    break;
                }
                case constants.groupConditionTypes.AND : {
                    currNode = self.createNetworkFromConditions(currNode, firstCondition.getSubConditions(), pastconds, rule);
                    break;
                }
            }
        } else {
            //can refactor this out by adding: if firstcondition is head in loop
            var tests = this.getJoinsFromCondition(firstCondition, pastconds, rule.lhs);
            var alphaMem = this.createOrReuseAlphaMemory(firstCondition);
            currNode = this.createOrReuseBetaNode(currNode, alphaMem, tests);
        }

        if (!pastconds) {
            pastconds = new list.LinkedList();
        }

        var currentCondition = firstCondition.next;

        while (currentCondition !== null) {

            //check if it's a group condition
            if (currentCondition.isCompoundCondition()){
                pastconds.append(currentCondition.prev);
                if (currNode.kind !== nodes.NodeTypes.BETAMEMORY){
                    //current node could alredy be a BM, if it was an OR node
                    currNode = this.createOrReuseBetaMemory(currNode);
                }
                switch (currentCondition.type()){
                    case constants.groupConditionTypes.OR : {
                        currNode = self.createORNetworkFromConditions(currNode, currentCondition.getSubConditions(), pastconds, rule);
                        break;
                    }
                    case constants.groupConditionTypes.AND : {
                        currNode = self.createNetworkFromConditions(currNode, currentCondition.getSubConditions(), pastconds, rule);
                        break;
                    }
                }
            } else {
                if (!currentCondition.isExpressionTest()){

                    if (currentCondition.isPositive()){
                        if (currNode.kind !== nodes.NodeTypes.BETAMEMORY){
                            //current node could alredy be a BM, if it was an OR node
                            currNode = this.createOrReuseBetaMemory(currNode);
                        }
                        pastconds.append(currentCondition.prev);
                        tests =  this.getJoinsFromCondition(currentCondition, pastconds, rule.lhs);
                        alphaMem = this.createOrReuseAlphaMemory(currentCondition);

                        currNode = this.createOrReuseBetaNode(currNode, alphaMem, tests);

                    }
                    if (currentCondition.isNegative()){
                        pastconds.append(currentCondition.prev);
                        tests =  this.getJoinsFromCondition(currentCondition, pastconds, rule.lhs);
                        alphaMem = this.createOrReuseAlphaMemory(currentCondition);
                        currNode = this.createOrReuseNegativeBetaNode(currNode, alphaMem, tests);
                    }

                }else {
                    pastconds.append(currentCondition.prev);
                    tests = this.getTestsFromExpression(currentCondition, pastconds);
                    currNode = this.createOrReuseBetaMemory(currNode);
                    currNode = this.createOrReuseExpressionTestNode(currNode, currentCondition, tests);
                }
            }
            currentCondition = currentCondition.next;
        }

        return currNode;
    };

    this.createORNetworkFromConditions = function(currentNode, conds, pastconds, rule){

        var orNodeList = new list.LinkedList(),
            orpastconds =  new list.LinkedList(),
            orParentNode = currentNode,
            node;

        if (!pastconds) {
            pastconds = new list.LinkedList();
        }

        var firstCondition = conds.head();
        while (firstCondition) {

            //check if it's a group condition
            if (firstCondition.isCompoundCondition()){

                switch (firstCondition.type()){
                    case constants.groupConditionTypes.OR : {
                        //need to create pastconds for this node
                        var mergedpastconds = _.clone(pastconds).merge(orpastconds);

                        node = self.createORNetworkFromConditions(orParentNode, firstCondition.getSubConditions(), mergedpastconds, rule);
                        //add this node to current orNodeList
                        orNodeList.append(node);
                        break;
                    }
                    case constants.groupConditionTypes.AND : {
                        node = self.createNetworkFromConditions(orParentNode, firstCondition.getSubConditions(), pastconds, rule);
                        //add this node to current orNodeList
                        orNodeList.append(node);
                        break;
                    }
                }
            } else {
                //if we need a binding with earlier conditions
                var tests, alphaMem, betaroot = self.betaRoot;

                if (!firstCondition.isExpressionTest()){

                    if (firstCondition.isPositive()){
                        node = alphaMem = this.createOrReuseAlphaMemory(firstCondition);

                        tests =  this.getJoinsFromCondition(firstCondition, pastconds, rule.lhs);
                        //if there are no tests, then use betaroot as the parent
                        if (!tests){
                           node = this.createOrReuseBetaNode(self.betaRoot, alphaMem, tests);
                        } else {
                            node = this.createOrReuseBetaNode(orParentNode, alphaMem, tests);
                        }

                        node = this.createOrReuseBetaMemory(node);
                        //add to ornode list
                        orNodeList.append(node);
                    }
                    if (firstCondition.isNegative()){
                        alphaMem = this.createOrReuseAlphaMemory(firstCondition);
                        tests =  this.getJoinsFromCondition(firstCondition, pastconds, rule.lhs);
                        node = this.createOrReuseNegativeBetaNode(orParentNode, alphaMem, tests);
                        //add to ornode list
                        orNodeList.append(node);
                    }

                }else {

                    tests = this.getTestsFromExpression(firstCondition, pastconds);
                    node = this.createOrReuseExpressionTestNode(orParentNode, firstCondition, tests);
                    node = this.createOrReuseBetaMemory(node);
                     //add to ornode list
                    orNodeList.append(node);

                }
            }
            orpastconds.append(firstCondition);

            firstCondition = firstCondition.next;
        }

        //create ornode child
        currentNode = this.createOrReuseORNode(orParentNode, orNodeList);

        currentNode = this.createOrReuseBetaMemory(currentNode);

        return currentNode;

    };


    this.addRule = function(rule){
        var conds = rule.getConditions();
        var currNode = this.betaRoot;

        currNode = this.createNetworkFromConditions(currNode, conds, null, rule);

        //build terminal node here
        var termNode;
        if (currNode.kind === nodes.NodeTypes.BETAMEMORY){
            termNode = currNode;
            termNode.nodeid += "-TN";
        } else {
            termNode = new memory.BetaMemory(currNode);
            termNode.nodeid += "-TN";
            termNode.parent.addChild(termNode);
        }

        termNode.addEvent('onLeftReceive', function(facts){
            //no conflict resolution yet
            if (rule.rhs) {
                rule.rhs.executeActions(facts);
            }
        });

        //add rule to terminal node
        rule.terminalNode = termNode;
        //or maybe this is better?
        termNode.rule = rule;

        //store rule details
        this.rules[rule.name+''] = rule;

        //match after adding
        termNode.update();

        return termNode;
    };

    this.removeRule = function(rule){
        rule.terminalNode.clearNode();
    };

    this.addFact = function(fact){
        self.root.receive(fact);
    };


    //init
    this.__init = function(fb, rb){

        this.rules = {};
        this.root = new nodes.ConstantTestNode("no-test");  //todo: ennumerate these values

        this.betaRoot = new memory.BetaMemory(null);

        //references and back-references
        this.factbase = fb; fb.reteNetwork = this;
        this.rulebase = rb; rb.reteNetwork = this;


        //dummy alpha mem item
        var dudFact = new memory.Fact("Dud", null); //initial fact
        var dudAItem = new memory.AlphaMemoryItem(dudFact, null);
        this.betaRoot.leftReceive(null, dudAItem.fact);
    };

    this.reset = function(fb, rb){

        this.__init(fb, rb);

    };

    this.asJSON = function(){
        return this.root.asJSON();
    };


    //call init
    this.__init(factbase, rulebase);

}

exports.ReteNetwork = ReteNetwork;

// possible todos: if a negative condition is the sole condition
