/**
 * Created by ken on 21/03/14.
 */
/**
 * nodes.js
 * Created by k
 */

var list = require('./dllist.js');
var memory = require('./memory.js');
var expr = require('./expr.js'),
    constants = require('./constants.js'),
    utils = require('./reteutils.js'),
    _ = require("underscore");

/* -------------- Node Types --------------- */
var NodeTypes = {
    ROOTNODE: "ROOTNODE",
    KINDNODE: "KindNode",
    CONSTANTNODE: "ConstantNode",
    ALPHATESTNODE: "AlphaTestNode",
    BETATESTNODE: "BetaTestNode",
    ALPHAMEMORY: "AlphaMemory",
    BETANODE: "BetaNode",
    BETAMEMORY: "BetaMemory",
    NEGATIONNODE: "NegationNode",

    ORNODE: "ORNode",

    TERMINALNODE: "TerminalNode"

};

function JoinNodeTest(slot1, arg2CondNo, slot2, isEqual, testType){
    this.firstArgSlot = slot1;
    this.secondConditionNo = arg2CondNo;
    this.secondArgSlot = slot2;
    this.isEqualityTest = isEqual || false;
    this.testType = testType || constants.groupConditionTypes.AND;

    this.toString = function() {
        var str = "";
        if (_.isArray(this.secondArgSlot)){
            str += this.secondArgSlot.forEach(function(argSlot){
               return argSlot.slot.toString();
            });
        } else {
            str = this.secondArgSlot.slot.toString();
        }
      return str + (this.isEqualityTest? "=" : "!=") +
          (this.firstArgSlot ||"n/a") + "[" + this.secondConditionNo +"] ";
    };
}

function ExpressionTest(variable, slot, levelsUp, expression){
    this._variable = variable;
    this.slotToTest = slot;
    this.levelsUp = levelsUp;
    this.expression = expression;

    this.variable = function(){
        //var re =  new RegExp("\\"+constants.VARIABLE_DELIMITER+"\\w+", "g");
        return this._variable.replace(constants.expression.VARIABLE_DELIMITER, constants.expression.INTERNAL_VARIABLE_DELIMITER);
    };
    this.toString = function() {
        return this.expression + " [var: "+ this._variable + ", " + this.levelsUp +"] ";
    };
}

/* creates a beta node with test */
function BetaNode(amem, parent, tests) {

    this.children = new list.LinkedList();
    this.parent = parent;

    this.alphaMemory = amem;
    this.tests = tests || null;

    this.kind = NodeTypes.BETANODE;

    var self = this;    //maintain scope. see http://bit.ly/1bKR36Q

    this.nodeid = "BN" + utils.randomId();

    this.addChild = function(child){
        if (!this.children){
            this.children = new list.LinkedList();
        }
        this.children.append(child);
    };

    this.addTest = function(test){
        if (!this.tests){
            this.tests = new list.LinkedList();
        }
      this.tests.append(test);
    };

    this.testsEqualTo = function(tests){
        // we check if the tests fields are same
        var result = false;
        result = (this.tests == null) ||    /* note the nully test */
                this.tests.all(function(nodeTest){
                    return tests.some(function(theTest){
                        return nodeTest.firstArgSlot.equalsTo(theTest.firstArgSlot) &&
                            nodeTest.secondArgSlot.slot.equalsTo(theTest.secondArgSlot.slot) &&
                            nodeTest.secondConditionNo === theTest.secondConditionNo &&
                            nodeTest.isEqualityTest === theTest.isEqualityTest;

                    })
                });
        return result;
    };

    this.leftReceive = function (token) {
        //check if left memory has the fact
        this.alphaMemory.facts.each(function(alphaMemoryItem){
            if (self._leftTestsPassed(token, alphaMemoryItem.fact)){
                self.children.each(function(child){
                    child.leftReceive(token, alphaMemoryItem.fact);
                });
            }
        });

    };

    this._leftTestsPassed = function(token, fact){
        if (token.parent === null){
            return false;
        }
        var testsPassed = self.tests && self.tests.all(function(test){
            return self._performTest(test, token, fact);
        });

        //tests passed (or this node has no tests - meaning its the top node)
        return testsPassed || (!self.tests);
    };

    this._performTest = function(test, token, fact){
        var arg1 = fact.getSlot(test.firstArgSlot.type());
        //get the nth cond
        var count = test.secondConditionNo;
        var fact2 = token.fact;
        while (count-- > 0){
            fact2 = token.parent.fact;
        }
        //no such fact, test failed
        if (!fact2){
            return false;
        }

        //get the arguments to test from the fact
        var passed = false;
        var secondArgSlots = test.secondArgSlot;
        if (!_.isArray(secondArgSlots)){
            secondArgSlots = [secondArgSlots];
        }

        if (test.testType === constants.groupConditionTypes.OR){
            passed = secondArgSlots.some(function(secondArg){
                var arg2 = fact2.getSlot(secondArg.slot.type());
                return test.isEqualityTest ?
                    arg1.value() === arg2.value() :
                    utils.inequalityCheck(arg1.value(),arg2.value());  //inequality
            });
        } else {
            //normal condition..
            passed = secondArgSlots.every(function(secondArg){
                var arg2 = fact2.getSlot(secondArg.slot.type());
                return test.isEqualityTest ?
                    arg1.value() === arg2.value() :
                    utils.inequalityCheck(arg1.value(), arg2.value());  //inequality
            });

        }

        return passed;
    };

    this.rightReceive = function (fact) {
        //check if left memory has the amItem
        this.parent.items.each(function(token){
            //if (token.parent !== null){
                var testsPassed = false;
                if (self.tests){
                    testsPassed = _rightTestsPassed(fact, token);
                }
                //check if all tests passed
                if (!self.tests || testsPassed === true){    //pass if no tests?
                    self.children.each(function(child){
                        //todo: check if its the null type?
                        child.leftReceive(token, fact);
                    });
                }
            //}
        });

        //todo: refactor (same as lefttestspassed)
        function _rightTestsPassed(fact, token) {
            if (token.parent === null){
                return false;
            }
            return self.tests.all(function (test) {
                return self._performTest(test, token, fact);
            });

        }
    };

    this.deleteItem = function(token){
        //can clone it before deleting
        var tokenClone = _.clone(token);

        if (this.items.removeNode(token)){
            if (this.events['onDeleteToken']){
                //sanitize the token?
                this.events['onDeleteToken'].call(self, tokenClone);
            }
        }
    };

    this.deleteNode = function(){

        this.alphaMemory.children.removeNode(this);
        if (!this.alphaMemory.children || this.alphaMemory.children.size() === 0){
            this.alphaMemory.deleteNode();  //todo
        }

        this.parent.children.removeNode(this);
        if (!this.parent.children || this.parent.children.size() === 0){
            this.parent.deleteNode();
            //this = null; ??
        }
    };

    this.asJSON = function(){
        var childrenJson = [];
        this.children.each(function(child){
            console.log("node: " + self.nodeid + ". child: " + child.nodeid + ". test: " + (self.tests? self.tests.head().toString() : "notests"));
            childrenJson.push(child.asJSON());
        });

        var testsString = "";
        if (this.tests) {
            this.tests.each(function(test){
             testsString += test.toString();
            });
        }

        return {
            type: this  .kind,
            id: this.nodeid,
            text: testsString || "n/a",
            parent: this.parent.nodeid,
            rightParent: this.alphaMemory.nodeid,
            children: childrenJson
        };
    };
}

/*
-----------------------------------------------------------
 */
function ConstantTestNode(fieldToTest, equalTo, slot, outputMemory){

    var self = this;

    this.__init = function(){
        this.fieldToTest = fieldToTest || "no-test";  //can be "variable", "value", "no-test"
        this.equalTo = equalTo || "";
        this.slotToTest = slot;
        this.outputMemory = outputMemory || null;   //the node's alpha mem (or not)
        this.children = [];

        this.kind = NodeTypes.CONSTANTNODE;
        this.nodeid = "CN" + Math.random().toString(36).substr(2, 5);  //random id
    };

    this.addChild = function(child){
        this.children.push(child);
    };
    //activation for this node
    this.receive = function(elm){
        if (this.fieldToTest !== "no-test") {
            var toTestSlot = elm.getSlot(this.slotToTest);
            //ideally, the fact should have the slot that we want in this node
            //if not, then stop it here
            if (!toTestSlot){
                console.log("slot '" + this.slotToTest + "' not found on fact " + elm.toString());
                return;
            }
            var toTestValue = toTestSlot.value();
            //test if value follows condiiton
            if (this.fieldToTest === "value"){
                if (toTestValue !== this.equalTo){
                    return;
                }
            }
            if (this.fieldToTest === "variable"){   //if we are a variable slot then only check the slot if same
                //totestslot can NEVER be a variable
                if ( toTestSlot.type() !== this.slotToTest){
                    return;
                }
            }
        }
        if (this.outputMemory !== null){
            //add to this nodes alpha mem (if it has one)
            this.outputMemory.receive(elm);
        }
        //send to children, test passed
        this.children.forEach(function(child){
            child.receive(elm);
        });
    };

    this.deleteItem = function(token){
        //can clone it before deleting
        var tokenClone = _.clone(token);

        if (this.items.removeNode(token)){
            if (this.events['onDeleteToken']){
                //sanitize the token?
                this.events['onDeleteToken'].call(self, tokenClone);
            }
        }
    };

    this.deleteNode = function(){
        this.parent.children.removeNode(this);
        if (!this.parent.children || this.parent.children.size() === 0){
            this.parent.deleteNode();
            //this = null; ??
        }
    };

    this.asJSON = function(){
        var childrenJson = [];
        this.children.forEach(function(child){
            childrenJson.push(child.asJSON());
        });
        //add alphanode as child also????
        if (this.outputMemory){
            childrenJson.push(this.outputMemory.asJSON());
        }

        return {
            type: this.kind,
            text: this.slotToTest + "=" + (this.equalTo || "") + "("+this.fieldToTest.substring(0,3)+")",
            id: this.nodeid,
            parent: this.parent  ? this.parent.nodeid : null,
            outputMemory: this.outputMemory ? this.outputMemory.asJSON() : null,
            children: childrenJson
        };
    };

    this.__init();
}

//special test node for expresions
function AlphaTestNode(parent, outputMemory, condition, pastconditions){

    this.__init = function(){
        this.parent = parent;
        this.children = new list.LinkedList();
        this.kind = NodeTypes.ALPHATESTNODE;
        this.outputMemory = outputMemory || null;

        this._condition = condition;
        this.expression = this._condition.expression() || null;
        this.pastconditions = pastconditions || null;
        this.tests = [];
        this.evaluator = new expr.Expr();

        this.__generateTests();
    }();

    this.addChild = function(child){
        this.children.append(child);
    };

    this.__generateTests = function(){

        var vars = this.__getVariablesFromExpression();
        var conditions = [];

        // go through past conditions to see if its a join
        for (var i = 0; i < vars.length; ++i){
            var temp = vars[i];
            var res = (function(thevariable){
                    var idx = 0, theslot;
                    //check if it needs a join node before it
                    this.pastconditions.somerev(function(cond){
                        idx = idx + 1;
                        if(cond.isPositive()){    //only positive conditions to check for bindings
                            var slots = cond.getSlotsWithVariables(thevariable);
                            if (slots && slots[0]){
                                theslot = slots[0];
                                conditions.push(cond);
                                return true;    //break
                            }
                        }
                        return false;
                    });

                    return theslot ? {join: true, slot: theslot, index: idx} : null;
                })(temp);

            if (res){
                this.tests.push({variable: temp, slot: res.slot, count: res.index});
            }
        }
        var arr = conditions.filter(function(c, i, self){
            return self.indexOf(c);
        });
        if (arr.length > 1){
            this.isJoin = true; // this is a beta test node
        }
    };

    this.__getVariablesFromExpression = function (){

        if (!this.expression){
            return null;
        }
        var vars = this.evaluator.parseVariables(this.expression);

        return vars ? vars.filter(function(item, i, self){
            return self.indexOf(item);   //remove duplicates
        }) : null;
    };

    this.receive = function(fact){
        if (this.isJoin){
            console.err("Error: Called rightReceive on a BetaTest Node..");
            return;
        }
        //just substitute the vars and run the test
        var passed = _testsPassed(fact);

        if ((passed && this.condition().isPositive()) || (!passed && this.condition().isNegative())){
            self.children.each(function(child){
                this.outputMemory.receive(fact);
            });
        }

        function _testsPassed(theFact){
            if (theFact === null){
                return false;
            }
            var bindings = [], testsPassed = false;
            this.tests.forEach(function(test){
                //{variable: vars[i], slot: slot, count: index}

                var slot = fact.getSlot(test.slot.type());
                bindings.push({cond: test, slot: slot});
            });
            //set the variable values in the expressions
            var binding;
            for (var i=0; i < bindings.length; i++){
                binding = bindings[i];
                //set them in expression interpreter
                this.evaluator.setVariable(binding.cond.variable(), binding.slot.value());
            }
            //now evaluate to see if tests pass
            testsPassed = this.evaluator.evaluate(this.expression);
            //may need to clear the evaluator
            this.evaluator.reset();

            return testsPassed === true;
        }
    };

    this.deleteNode = function(){

        this.parent.children.removeNode(this);
        if (!this.parent.children || this.parent.children.size() === 0){
            this.parent.deleteNode();
            //this = null; ??
        }
    };

    this.conditionEqualTo = function(cond){
        return this.condition().isEqualTo(cond);
    };

    //getters/setters
    this.condition = function(){
       return this._condition;
    };

}

//special test node for expresions
function BetaTestNode(parent, condition, tests){

    var self = this;

    this.__init = function(){
        this.nodeid = "BTN" + utils.randomId();
        this.parent = parent;
        this.children = new list.LinkedList();
        this.kind = NodeTypes.BETATESTNODE;

        this._condition = condition;

        var exprSlot = this._condition.getCondSlot(constants.expression.EXPRESSION_CONDITION_SLOT);
        this._expression = exprSlot ? exprSlot.value() : null;

        this.tests = tests || null;
        this.evaluator = new expr.Expr();

        this.__exprRE = new RegExp("\\"+constants.expression.VARIABLE_DELIMITER+"(\\w+)", "g");
    };

    this.addChild = function(child){
        this.children.append(child);
    };


    this.leftReceive = function(token){
        var passed = _testsPassed(token);

        if ((passed && this.condition().isPositive()) || (!passed && this.condition().isNegative())){
            self.children.each(function(child){
                child.leftReceiveToken(token);
            });
        }

        function _testsPassed(theToken){
            //ignore the null-token
            if (!theToken.parent){
                return false;
            }

            var bindings = [], testsPassed = false;

            bindings = self.tests.expr.map(function(test){
                return self._performExpressionTest(test, theToken);
            });

            //set the variable values in the expressions
            var binding;
            for (var i=0; i < bindings.length; i++){
                binding = bindings[i];
                if (!binding){  //a binding doesn't exist, evaluator will throw error. just return false
                    return false;
                }
                //set them in expression interpreter
                self.evaluator.setVariable(binding.cond.variable(), binding.slot.value());
            }
            //now evaluate to see if tests pass
            testsPassed = self.evaluator.evaluate(self.expression());
            //may need to clear the evaluator
            self.evaluator.reset();

            return testsPassed === true;
        }
    };

    this._performExpressionTest = function(test, token){
        //{variable: vars[i], slot: slot, count: index}
        var currentToken = token, fact, count = test.levelsUp;
        while (count-- > 0){
            fact = currentToken.fact;
            currentToken = token.parent;
        }

        var slot = fact.getSlot(test.slotToTest.type());
        return {cond: test, slot: slot};
    };

    this.rightReceive = function(){
        console.error("RS Error: Called right receive on a BetaTest Node.");
    };

    this.update = function(){
        if (this.parent.kind === NodeTypes.BETAMEMORY){
            if (this.parent.items){
                this.parent.items.each(function(token){
                    self.leftReceive(token);
                });
            }
        }
        //todo: AMEM may need an update?
    };

    this.deleteNode = function(){

        this.parent.children.removeNode(this);
        if (!this.parent.children || this.parent.children.size() === 0){
            this.parent.deleteNode();
            //this = null; ??
        }
    };

    this.testsEqualTo = function(tests){
        // we check if the tests fields are same
        var result = false;
        result = this.tests &&
                 this.tests.expr.every(function(nodeTest){   //this.tests.expr an array
                    return tests.expr.some(function(theTest){
                        return (nodeTest.variable() === theTest.variable()) &&
                            nodeTest.expression.replace(/\s+/g, '') === theTest.expression.replace(/\s+/g, '')
                    });
                });
        return result;
    };

    //getters/setters
    this.condition = function(){
        return this._condition;
    };
    this.expression = function(){

        var exp = this._expression;
        exp = exp.replace(this.__exprRE, constants.expression.INTERNAL_VARIABLE_DELIMITER+'$1');

        return exp;
    };

    this.asJSON = function(){
        var childrenJson = [];
        this.children.each(function(child){
            console.log("node: " + self.nodeid + ". child: " + child.nodeid + ". expr: " +self.expression());
            childrenJson.push(child.asJSON());
        });

        return {
            type: this.kind,
            text: this._expression,
            id: this.nodeid,
            parent: this.parent  ? this.parent.nodeid : null,
            children: childrenJson
        };
    };

    //call init
    this.__init();
}

//------------------------------------------------------------
function KindNode(fieldToTest, outputMemory){
    this.kindTotest = fieldToTest || "no-test";
    this.outputMemory = outputMemory || null ; //has no outputMem
    this.children = [];

    this.kind = NodeTypes.KINDNODE;

    this.nodeid = "KN" + Math.random().toString(36).substr(2, 5);  //random id

    var self = this;

    this.addChild = function(child){
        this.children.push(child);
    };
    //activation for this node
    this.receive = function(elm){
        if (this.kindTotest !== "no-test") {
            var toTestSlot = elm.type;
            //test if value follows condiiton
            if (this.kindTotest !== toTestSlot){
               return;
            }
        }
        if (this.outputMemory !== null){
            //add to this nodes alpha mem (if it has one)
            this.outputMemory.receive(elm);
        }
        //send to children, test passed
        if (this.children){
            this.children.forEach(function(child){
                child.receive(elm);
            });
        }
    };

    this.asJSON = function(){
        var childrenJson = [];
        this.children.forEach(function(child){
            childrenJson.push(child.asJSON());
        });

        if (this.outputMemory){
            childrenJson.push(this.outputMemory.asJSON());
        }

        return {
            type: this.kind,
            text: this.kindTotest,
            id: this.nodeid,
            parent: this.parent  ? this.parent.nodeid : null,
            outputMemory: this.outputMemory ? this.outputMemory.asJSON() : null,
            children: childrenJson
        };
    };
    this.deleteItem = function(token){
        //can clone it before deleting
        var tokenClone = _.clone(token);

        if (this.items.removeNode(token)){
            if (this.events['onDeleteToken']){
                //sanitize the token?
                this.events['onDeleteToken'].call(self, tokenClone);
            }
        }
    };
    this.deleteNode = function(){

        this.parent.children.removeNode(this);
        if (!this.parent.children || this.parent.children.size() === 0){
            this.parent.deleteNode();
            //this = null; ??
        }
    };

}


/* makes a negated join */
function NegativeBetaNode(parent, amem, tests){

    this.kind = NodeTypes.NEGATIONNODE;

    this.parent = parent;

    this.alphaMemory = amem;

    this.children = new list.LinkedList();
    this.items = new list.LinkedList();

    this.tests = tests || null;

    //events
    this.events = {};

    this.nodeid = "BM" + Math.random().toString(36).substr(2, 5);  //random id

    var self = this;

    this.addChild = function(child){
        this.children.prepend(child);
    };

    this.addItem = function(item){
        this.items.append(item);
    };

    this.testsEqualTo = function(tests){
      // we check if the tests fields are same
      var result = false;
        result = !this.tests || this.tests.all(function(nodeTest){
           return tests.some(function(theTest){
               return  nodeTest.firstArgSlot.equalsTo(theTest.firstArgSlot) &&
                   nodeTest.secondArgSlot.equalsTo(theTest.secondArgSlot) &&
                   nodeTest.secondConditionNo === theTest.secondConditionNo;

           });
        });
        return result;
    };

    /* insert into the memory a new token */
    this.leftReceive = function(token, fact){    //add the fact - must have factid?
        var newToken = new memory.Token(token, fact, this);
        this.items.prepend(newToken);

        newToken.joinResults = null;

        //check if left memory has the fact
        this.alphaMemory.facts.each(function(alphaMemoryItem){
           if (_leftTestsPassed(alphaMemoryItem, newToken)){
               var joinResult = new memory.NegativeJoin(newToken, alphaMemoryItem.fact);
               //check if null, initialize
               if (!newToken.joinResults) {
                   newToken.joinResults = new list.LinkedList();
               }
               newToken.joinResults.prepend(joinResult);
               alphaMemoryItem.fact.negativeJoins.prepend(joinResult);

           }
        });

        if (!newToken.joinResults){
            self.children.each(function(child){
                child.leftReceive(newToken, null); //null coz no matches
            });
        }

        function _leftTestsPassed(alphaMemoryItem, tokenToTest){
            var testsPassed = false;

            if (self.tests){
                testsPassed = self.tests.all(function(test){
                    if (tokenToTest.parent !== null){ //exclude the null token
                        return self.__performNegationTest(test, tokenToTest, alphaMemoryItem.fact);
                    }
                    return false; //?
                });
            }

            //tests passed (or this node has no tests)
            return !self.tests || testsPassed === true;
        }

    };
    this.__performNegationTest = function(test, token, fact) {
        var arg1 = fact.getSlot(test.firstArgSlot.type());
        //get the nth cond
        var count = test.secondConditionNo;
        var tokenToTest = token;
        while (count-- > 0){
            tokenToTest = tokenToTest.parent;    //TODO: need to find parent of token
        }
        //get its arg
        var arg2 = tokenToTest.fact.getSlot(test.secondArgSlot.type());
        //compare - if vars are different then accept
        //else if values are same
        return test.isEqualityTest ?  arg1.value() === arg2.value() :
                                      arg1.value() !== arg2.value();
    };
    this.rightReceive = function (fact) {
        //check if left memory has the amItem
        if (!this.items){
            return;
        }
        this.items.each(function(token){
            var testsPassed = false;
            if (self.tests){
                testsPassed = _rightTestsPassed(fact, token);
                if (testsPassed) {
                    //has now become invalid due to new join result,
                    //making the not to be true. delete children tokens
                    if (!token.joinResults || token.joinResults.size() === 0){
                        token.deleteChildren();
                        var newJoinResult = new memory.NegativeJoin(token, fact);
                        if (!token.joinResults){
                            token.joinResults = new list.LinkedList();
                        }
                        token.joinResults.prepend(newJoinResult);
                        fact.negativeJoins.prepend(newJoinResult);
                    }
                }
                //note if tests did not pass it means nothing.. the fact and the token
                //did not join and the fact shouldnt be added to join results. if the token was
                //empty it stays empty
            }
        });
        function _rightTestsPassed(fact, token) {
            return self.tests.all(function (test) {
                return self.__performNegationTest( test, token, fact);
            });

        }
    };

    //update the node with older facts
    this.update = function(){
        if (this.parent){
            if (this.parent.kind === NodeTypes.BETAMEMORY){
                if (this.parent.items){
                    this.parent.items.each(function(token){
                        self.leftReceive(token);  //todo: what abt the second argument (fact)?
                    });
                }
            }
            if (this.parent.kind === NodeTypes.BETANODE){
                var originalParentChildren = this.parent.children;
                this.parent.children = new list.LinkedList();
                this.parent.children.prepend(this);
                this.parent.alphaMemory.facts.each(function(alphaItem){
                    self.parent.rightReceive(alphaItem.fact);
                });
                //already matched, restore the children
                this.parent.children = originalParentChildren;
            }
            if (this.parent.kind === NodeTypes.NEGATIONNODE){
                if (this.parent.items){
                    this.parent.items.each(function(token){
                        if (!token.joinResults || token.joinResults.size() === 0){
                            self.leftReceive(token, null);
                        }
                    });
                }
            }
            if (this.parent.kind === NodeTypes.BETATESTNODE){
                var children = this.parent.children;
                this.parent.children = new list.LinkedList();
                this.parent.children.prepend(this);
                //just call update
                this.parent.update();

                this.parent.children = children;
            }
        }
    };

    this.deleteNode = function(){
        //for negation node
        while (this.items && this.items.size() > 0){
            var headToken = this.items.head();
            headToken.deleteTokenAndChildren(headToken, this.items);  //can refactor
        }
        headToken.children.removeNode(headToken);

        this.alphaMemory.children.removeNode(this);
        if (!this.alphaMemory.children || this.alphaMemory.children.size() === 0){
            this.alphaMemory.deleteNode();  //todo
        }

        this.parent.children.removeNode(this);
        if (!this.parent.children || this.parent.children.size() === 0){
                this.parent.deleteNode();
                //this = null; ??
        }
    };

    //events
    this.addEvent = function(type, fn){
        this.events[type] = fn;
    };

    this.asJSON = function(){
        var childrenJson = [];
        this.children.each(function(child){
            childrenJson.push(child.asJSON());
        });

        var testsString = "";
        if (this.tests) {
            this.tests.each(function(test){
                testsString += test.toString();
            });
        }

        return {
            type: this.kind,
            id: this.nodeid,
            text: testsString || "(no-test)",
            parent: this.parent.nodeid,
            rightParent: this.alphaMemory.nodeid,
            children: childrenJson
        };
    };
}


//special test node for expressions - is asymetrical
function OrNode(parents){

    var self = this;

    this.__init = function(){
        this.nodeid = "ORN" + utils.randomId();
        this.parents = parents || new list.LinkedList();
        this.children = new list.LinkedList();
        this.kind = NodeTypes.ORNODE;

        this.conditions = new list.LinkedList();
    };

    this.addChild = function(child){
        this.children.append(child);
    };
    this.addParent = function(parent){
        this.parents.append(parent);
    };

    this.leftReceive = function(token){

        var passed = _testsPassed(token);

        if (passed){
            self.children.each(function(child){
                child.leftReceiveToken(token);
            });
        }

        function _testsPassed(theToken){
            //or node passes if token and parent is not null
            return self.__performOrTests(theToken);

        }
    };

    this.leftReceiveToken = function(token){

        var passed = _testsPassed(token);

        if (passed){
            self.children.each(function(child){
                child.leftReceiveToken(token);
            });
        }

        function _testsPassed(theToken){
            //or node passes if token and parent is not null
            return self.__performOrTests(theToken);

        }
    };

    this.__performOrTests = function(theToken){
        return theToken && theToken.parent;
    };

    this.deleteNode = function(){

        if (this.parents){
            var node = this.parents.head();
            while (node !== null){
                node.children.removeNode(this);
                if (!node.children || node.children.size() === 0){
                    node.deleteNode();
                    //this = null; ??
                }

                node = node.next;
            }
        }
    };

    this.testsEqualTo = function(otherOr){
        return false; //todo: reuse of OR
    };

    //getters/setters
    this.condition = function(){
        return this._condition;
    };

    this.update = function(){
        if (this.parents){

            var node = this.parents.head();

            while (node !== null){
                if (node.kind === NodeTypes.BETAMEMORY){
                    if (node.items){
                        node.items.each(function(token){
                            self.leftReceive(token);  //todo: what abt the second argument (fact)?
                        });
                    }
                }
                if (node.kind === NodeTypes.BETANODE){
                    var originalParentChildren = node.children;
                    node.children = new list.LinkedList();
                    node.children.prepend(this);
                    node.alphaMemory.facts.each(function(alphaItem){
                        self.parent.rightReceive(alphaItem.fact);
                    });
                    //already matched, restore the children
                    node.children = originalParentChildren;
                }
                if (node.kind === NodeTypes.NEGATIONNODE){
                    if (node.items){
                        node.items.each(function(token){
                            if (!token.joinResults || token.joinResults.size() === 0){
                                self.leftReceive(token, null);
                            }
                        });
                    }
                }
                if (node.kind === NodeTypes.BETATESTNODE){
                    var children = node.children;
                    node.children = new list.LinkedList();
                    node.children.prepend(this);
                    //just call update
                    node.update();

                    node.children = children;
                }
                if (node.kind === NodeTypes.ORNODE){
                    var ornodechildren = node.children;
                    node.children = new list.LinkedList();
                    node.children.prepend(this);
                    //just call update
                    node.update();

                    node.children = ornodechildren;
                }
                node = node.next;
            }
        }
    };
    this.asJSON = function(){
        var childrenJson = [];
        this.children.each(function(child){
            childrenJson.push(child.asJSON());
        });

        var parentsJson = [];
        this.parents && this.parents.each(function(parent){
            parentsJson.push(parent.nodeid);
        });
        return {
            type: this.kind,
            text: "||",
            id: this.nodeid,
            parent: parentsJson || null,
            children: childrenJson
        };
    };

    //call init
    this.__init();
}

exports.BetaNode = BetaNode;
exports.BetaTestNode = BetaTestNode;
exports.AlphaTestNode = AlphaTestNode;
exports.ExpressionTest = ExpressionTest;
exports.JoinNodeTest = JoinNodeTest;
exports.ConstantTestNode = ConstantTestNode;
exports.KindNode = KindNode;
exports.NegativeBetaNode = NegativeBetaNode;
exports.OrNode = OrNode;
exports.NodeTypes = NodeTypes;