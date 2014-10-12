
var rete = require('./rete.js');

function FactBase(){

    this.reteNetwork = null;

    this.items = [];    //to optimize later


    this.assertFact = function(fact){
        //record time
        this.addTimeSlotToFact(fact);

        this.items.push(fact);  //can hash later
        //push to rete
        this.reteNetwork.addFact(fact);

        return fact;
    };

    this.removeFact = function(fact){
        for (var i=0; i < this.items.length; ++i){
            var item = this.items[0];
            if (item === fact){
                fact.removeFact();
                //remove from rete
                this.reteNetwork(fact);
                return;
            }
        }
    };

    //adds a timestamp slot
    this.addTimeSlotToFact = function (fact) {
        if (!fact.getSlot("stime")){
            fact.addSlot("stime", Date.now());
        }
    };

    this.getFacts = function(factd){
        var res = this.items;
        if (factd && factd !== "all"){
            res = this.items.filter(function(item){
                var ret = false;
                if (factd.slots){
                    for (var i = 0; i < factd.slots.length; i++){
                        var slot = item.getSlot(factd.slots[i].type);
                        ret = slot && slot.val === factd.slots[i].val;
                    }
                }
                return ret;
            });
        }
        //another pass = to remove circular refs, use tostring
        res = res.map(function(r){
            return r.asJSON();
        });
        return res;
    };

    this.reset = function(){
       this.items = [];
    };

}
exports.FactBase = FactBase;