
var list = require('./dllist.js');
var memory = require('./memory.js');
var constants = require('./constants.js');



/* representation of a token to be passed around. data is an object with 'type' and 'value' attributes */
function CondSlot(type, value, isVariable){
    /* modifiers */

    this._type = type;
    this._value = value;
    this._isVar = isVariable || false;

    this.type = function (){
        return this._type;
    };
    this.value = function (){
        return this._value;
    };
    this.isVar = function(){
        return this._isVar;
    };
    this.equalsTo = function(anotherSlot){
        return this.type() === anotherSlot.type() &&
            this.value() === anotherSlot.value() &&
            this.isVar() === anotherSlot.isVar();
    }
    this.toString = function (){
        return  this.type() + ':' + this.value() +  (this.isVar() ? "(var)" : "(val)");
    };
    this.asJSON = function(){
        return {
            type: this.type(),
            value: this.value(),
            isvar: this.isVar()
        };
    };
}

function Condition(type){
    this._type = type;
    this.conditionSlots = new list.LinkedList();

    this.sign = memory.SIGNS.POSITIVE;

    this.addConditionSlot = function(cond){
        this.conditionSlots.append(cond);
    };

    this.type = function(){
        return this._type;
    };

    this.getCondSlot = function(slotType){
        return this.conditionSlots.some(function(condSlot){
            if (condSlot.type() === slotType){
                return condSlot;
            }
        });
    };
    this.getSlotsWithVariables = function(val, levelsUp){
        var slots = [];
        this.conditionSlots.each(function(conditionSlot){
            if (conditionSlot.isVar()){
               if (typeof val === "undefined" || conditionSlot.value() === val) {
                   slots.push(conditionSlot);
               }
            }

        });
        return slots;
    };


    this.getSlotsWithConstants = function(){
        var slots = [];
        this.conditionSlots.each(function(conditionSlot){
            if (!conditionSlot.isVar())
                slots.push(conditionSlot);

        });
        return slots;
    };

    this.getAllSlots = function(){
        var slots = [];
        this.conditionSlots.each(function(conditionSlot){
            slots.push(conditionSlot);
        });
        return slots;
    };

    this.passesConstantTests = function(fact){
        var constSlots = this.getSlotsWithConstants();
        for (var i=0; i < constSlots.length; i++){
            var constSlot = constSlots[i];
            var factSlot = fact.getSlot(constSlot.type());

            if (factSlot.value() !== constSlot.value()){
                return false;
            }
        }

        return true;

    };
    this.isPositive = function(){
        return this.sign === memory.SIGNS.POSITIVE;
    };
    this.isNegative = function(){
        return this.sign === memory.SIGNS.NEGATIVE;
    };
    this.isExpressionTest = function(){
        return this.type() === constants.expression.EXPRESSION_CONDITION_TYPE;
    };
    this.isCompoundCondition = function(){
        return false;
    };
    this.isEqualTo = function(anotherCondition){
        return this === anotherCondition;
    };

    this.asJSON = function(){
        var res = [];
        this.conditionSlots.each(function(cslot){
            res.push(cslot.asJSON());
        });
        return {
            sign: this.sign,
            type: this.type(),
            condslots: res
        };
    };
}

//todo: a group of conditions
function CompoundCondition(type){
    var self = this;

    this._type = type || constants.groupConditionTypes.AND;
    this.conditions = new list.LinkedList();
    this.sign = memory.SIGNS.POSITIVE;

    this.type = function(){
        return this._type;
    };
    /*
     * add a condition, or another group condition
     */
    this.prependCondition = function(condition){
        this.conditions.prepend(condition);
        condition.parentCondition = this;
    };
    this.appendCondition = function(condition){
        this.conditions.append(condition);
        condition.parentCondition = this;
    };


    this.getSubConditions = function(){
        return this.conditions;
    };
    this.getCondSlot = function(slotType){
        return this.conditionSlots.some(function(condSlot){
            if (condSlot.type() === slotType){
                return condSlot;
            }
        });
    };

    this.isPositive = function(){
        return this.sign === memory.SIGNS.POSITIVE;
    };
    this.isNegative = function(){
        return this.sign === memory.SIGNS.NEGATIVE;
    };
    this.isExpressionTest = function(){
        return this.type() === constants.expression.EXPRESSION_CONDITION_TYPE;
    };
    this.isCompoundCondition = function(){
        return true;
    };

    this.getSlotsWithVariables = function(variableToSearch, baseIndex){
        var res = [];
        this.conditions.somerev(function(condition, levelsUp){
            //if it is an or condition, just we only need to go a level up for all its conditions

            var slots;
            if (!condition.isCompoundCondition()){
                slots = condition.getSlotsWithVariables(variableToSearch);
                if (slots && slots[0]){
                    if (self.type === constants.groupConditionTypes.OR){
                        res.push({slot: slots[0], index: baseIndex + 1, type: condition.type()});
                    }else {
                        res.push({slot: slots[0], index: baseIndex + levelsUp, type: condition.type()});
                    }
                }
            } else {
                slots = condition.getSlotsWithVariables(variableToSearch, baseIndex + levelsUp);
                if (slots){
                    slots.forEach(function(slot){
                        res.push({slot: slot, index: slot.index, type: condition.type()});
                    });
                }
            }
        });
        return res;
    };
    this.getInequalitySlots = function(slotToSearch, baseIndex){
        var res = [];
        this.conditions.somerev(function(condition, levelsUp){
            //if it is an or condition, just we only need to go a level up for all its conditions

            var slot;
            if (!condition.isCompoundCondition()){
                slot = condition.getCondSlot(slotToSearch.type());
                if (slot &&  slot.isVar() && slot.value() !== slotToSearch.value()){
                    if (self.type === constants.groupConditionTypes.OR){
                        res.push({slot: slot, index: baseIndex + 1, type: condition.type()});
                    }else {
                        res.push({slot: slot, index: baseIndex + levelsUp, type: condition.type()});
                    }
                }
            } else {
                slot = condition.getInequalitySlots(slotToSearch, baseIndex + levelsUp);
                if (slots){
                    slots.forEach(function(slot){
                        res.push({slot: slot, index: slot.index, type: condition.type()});
                    });
                }
            }
        });
        return res;
    };

    this.isEqualTo = function(anotherCondition){
        return this.conditions.all(function(condition){
           return condition.isEqualTo(anotherCondition);
        })
    };

    this.asJSON = function(){
        var results = [];
        this.conditions.each(function(condition){
            results.push(condition.asJSON());
        });

        return {
            type: this.type(),
            sign: this.sign,
            conditions: results
        };
    };

}

function Rule(name){
    this.ruleId = "R" + Math.random().toString(36).substr(2, 5);

    this.name = name;
    this.lhs = new LHS();
    this.rhs = new RHS();

    //maybe store its production node?
    this.terminalNode = null;

    this.addTerminalNode = function(node){
      this.terminalNode = node;
    };

    this.getConditions = function(){
        return this.lhs.conditions;
    };

    this.asJSON = function(){
      return {
          name: this.name,
          lhs: this.lhs.asJSON()
          //rhs: this.rhs.asJSON()
      };
    };
}

function LHS(){
    this.conditions = new list.LinkedList();

    this.addCondition = function(condition){
        //add -ve conditions to the end of the list
        //they need to be bound
        if (condition.isNegative()){
            this.conditions.append(condition);
        }
        if (condition.isPositive()){
            //fix: prepend before negations
            var cond = this.conditions.tail();
            var index = this.conditions.size();

            while (cond && cond.isNegative()){
                cond = cond.prev;
                index--;
            }
            this.conditions.insertAt(index, condition);
        }

    };
    // earlier conds need to be ordered as in original rule..
    this.getEarlierConditionForVar = function(slot, earlierConds){
        var condSlotType = slot.type(), varToSearch = slot.value();

        var slotCond, index, result = null;
        if (earlierConds){
            earlierConds.somerev(function(earlierCond, idx){
                var slots;
                if(earlierCond.isPositive()){    //only positive conditions to check for bindings,
                                                //also ignore OR conditions
                    if (!earlierCond.isCompoundCondition()){
                        //also get different slots with same variables
                        slots = earlierCond.getSlotsWithVariables(varToSearch);
                         //nb: support for many same variables in one condition is not there
                        if (slots && slots[0]){
                            var slot = {slot: slots[0], index: idx, type: earlierCond.type()};
                            result = {slot: slot, condIndex: idx, bindingType: earlierCond.type()};
                            return true;    //break
                        }
                    } else {
                        slots = earlierCond.getSlotsWithVariables(varToSearch, idx);
                        if (slots && slots.length > 0){
                              //save each slot binding form compound condition
                            result = {slot: slots, condIndex: idx, bindingType: earlierCond.type()};
                            return true;    //break
                        }
                    }
                }
                return false;
            });
        }
        return result;
    };

    this.getInequalityTestForSlot = function (varslot, pastconditions){
       var slotval = varslot.value();
       var slottype = varslot.type();
       var slotToTest, indexOfConditionToTest, result = null;
       pastconditions.somerev(function(cond, idx){

           if (!cond.isCompoundCondition()){
               //get same slot
                var sameSlot = cond.getCondSlot(slottype);
                //if its a variable,
               if (sameSlot && sameSlot.isVar()){
                   //check if vars are different, it means an inequality test
                   if (sameSlot.value() !== slotval){
                       var slot = {slot: sameSlot, index: idx, type: cond.type()};

                       result = {slot: slot, condIndex: idx, bindingType: cond.type()};
                       return true;
                   }
               }
           } else {
               //only for non-or conditions

               var slots = cond.getInequalitySlots(varslot, idx);
               if (slots && slots.length > 0){
                   //save each slot binding form compound condition
                   result = {slot: slots, condIndex: idx, bindingType: cond.type()};
                   return true;    //break
               }
           }
           return false;
        });
       return result;
    };

    this.asJSON = function(){
        var res = [];
        this.conditions.each(function(condition){
            res.push(condition.asJSON());
        });
        return res;
    }
}

function RHS(){
    this.actions = [];
    this.addAction = function(action){
        if (typeof action === "function"){
            this.actions.push(action);
        }
    };

    this.executeActions = function(bindings){
        this.actions.forEach(function(action){
            action(bindings);
        });
    };
    //todo - functions asJSON?
    this.asJSON = function(){
      return {
          actions: this.actions.toString()
      }
    };
}

exports.Rule = Rule;
exports.RHS = RHS;
exports.LHS = LHS;
exports.Condition = Condition;
exports.CondSlot = CondSlot;
exports.CompoundCondition = CompoundCondition;
