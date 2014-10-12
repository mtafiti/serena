
var rete = require('./rete.js');

function RuleBase(retenetwork){


    this.__init = function() {
        this.reteNetwork = null;

        this.items = {};
    };


    this.addRule = function(rule){
        //can add metadata here
        //.addMetaDataToRule(fact);

        //add to rulebase
        this.items[rule.name] = rule;

        //send to rete - note: may immediately fire
        var terminalNode = this.reteNetwork.addRule(rule);

        return terminalNode;
    };

    this.removeRule = function(rulename){
        if (this.items[rulename]){
            this.reteNetwork.removeRule(rulename);
            //may need notifications???
            delete this.items[rulename];
        }
    };

    this.getRule = function(rulename){
        if (this.items[rulename]){
            return this.items[rulename];
        }
        return null;
    };

    this.reset = function(){
        this.items = {};
    };

    this.__init();

}
exports.RuleBase = RuleBase;