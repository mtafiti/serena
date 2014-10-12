/**
 * Created by ken.
 * mingo rete. unfinished.
 */
var nodes = require('./nodes.js');
var list = require('./dllist.js'),
    utils = require('./reteutils.js');

var SIGNS = {
    POSITIVE: 'positive',
    NEGATIVE: 'negative'
};


/* representation of a token to be passed around. data is an object with 'type' and 'value' attributes */
function Slot(type, value){
    /* modifiers */
    this._type = type;
    this._value = value;

    this.type = function (){
        return this._type;
    };
    this.value = function (){
        return this._value;
    };
    this.toString = function (){
        return ' slot: ' + this.type() + ' value:' + this.value();
    };
    this.asJSON = function(){
        return {
            type: this.type(),
            value: this.value()
        };
    };
}
Slot.prototype.equal = function(type, value){
    return this.type === type && this.value === value;
};


function Fact(type, sign){
    this.factId = "F" + utils.randomId();

    this.type = type;
    this.slots = {};

    //for deletion, keep tokens where this fact is contained
    this.alphaMemoryItems = new list.LinkedList();
    this.tokenList = new list.LinkedList();

    //optional
    this.sign = sign || SIGNS.POSITIVE;

    //negated results for easy removal
    this.negativeJoins = new list.LinkedList();

    //delete
    this.removeFact = function(){
        this.alphaMemoryItems.each(function(alphaMemoryItem){
            alphaMemoryItem.alphaMemory.facts.removeNode(alphaMemoryItem);   //check!
        });

        //empty the facts amem list
        //this.alphaMemoryItems = null;

        while (this.tokenList && this.tokenList !== null){
            var headToken = this.tokenList.head;
            this.deleteTokenAndChildren(headToken, this.tokenList);
            //delete this token
            this.tokenList.removeNode(headToken);
        }

        this.negativeJoins.each(function(negativeJoin){
            negativeJoin.parentToken.joinResults.removeNode(negativeJoin);  //todo: check this
            if (negativeJoin.parentToken.joinResults){  //do we need to check size == 0 also?
                //negation node has now fired beacuse of the deletion
                negativeJoin.parentToken.node.children.each(function(child){
                   child.leftReceive(negativeJoin.parentToken, null);
                });
            }
            //negativeJoin = null;
        });
    };

    //TODO: test
    this.deleteTokenAndChildren = function(token, tokenNodeList){
        while (token.children){
            var headToken = token.children.head;
            this.deleteTokenAndChildren(headToken, token.children);
        }
        //remove the node in which token is
        token.node.deleteItem(token);
        if(token.fact){
            token.fact.tokenList.removeNode(token);
        }
        token.parent.children.removeNode(token);
        //for negation token
        if(token.node.kind === nodes.NodeTypes.NEGATIONNODE){
            token.joinResults.each(function(joinResult){
                joinResult.fact.negativeJoins.removeNode(joinResult);
            });
            token.joinResults = null;
            //token = null;
        }
        //remove this token..
        tokenNodeList.removeNode(token);
    };

    this.getSign = function (){
        return this.sign;
    };
    this.addSlot = function(slotType, slotValue){
        var slot = new Slot(slotType, slotValue);
        this.slots[slotType] = slot;
        return slot;
    };
    this.getSlot = function(slotType){
        if (this.slots.hasOwnProperty(slotType) && typeof this.slots[slotType] !== "function") {
            return this.slots[slotType];
        }
        return null;
    };
    this.getSlots = function(){
        var slots = [];
        for (var key in this.slots) {
            if (this.slots.hasOwnProperty(key) && typeof this.slots[key] !== "function") {
                slots.push(this.slots[key]);
            }
        }
        return slots;
    };

    this.toString = function (){
        var str = 'fact: ' + this.type.toLowerCase();
        str += this.getSlots().map(function(slot){
            return slot.toString();
        });

        return str;
    };

    this.asJSON = function(){
       return {
           id: this.factId,
           type: this.type,
           slots: this.getSlots().map(function(slot){
                return slot.asJSON();
           })
       }
    };

}

function AlphaMemoryItem(fact, alphaMemory){
    this.fact = fact;
    this.alphaMemory = alphaMemory;

    this.asJSON = function(){
      return this.fact.asJSON()
    };
}

//tokens passed around the beta memories
function Token(parentToken, fact, owner){
    this.parent = parentToken || null;
    this.fact = fact || null;
    this.tokenId = "T" + utils.randomId();

    //same as fact - track for deletion
    this.node = owner;
    this.children = new list.LinkedList();

    //negation
    this.joinResults = new list.LinkedList();

    this.addChild = function(child, append){
        if (append) {
            this.children.append(child);
        }
        else {
            this.children.prepend(child);
        }
    };

    this.deleteChildren = function(){
        if (this.children){
            this.children.each(function(tokenChild){
               tokenChild.deleteChildren();
                //events
                if (tokenChild.node.events['onDeleteToken']){
                    //sanitize the token?
                    tokenChild.node.events['onDeleteToken'].call(tokenChild.node, tokenChild);
                }
               tokenChild.children = null;
            });
        }
    };

    //get all the facts of this token
    this.getFacts = function(){
        var res = [];
        var tk = this;

        while (tk){  //avoid the top-level token
            if (tk.fact && tk.fact.type !== "Dud"){ //also remove the dud fact
                res.push(tk.fact);
            }
            tk = tk.parent;
        }
        return res.reverse();   //reverse to get correct ordering
    };

    this.asJSON = function(){
      var facts = this.getFacts();
      var res = facts.map(function(fact){
         return fact.asJSON();
      });

      return res;
    };

    //add the token to deletion lists
    if (this.parent){
        this.parent.children.prepend(this);
    }
    if (this.fact){
        this.fact.tokenList.prepend(this);
    }
}

// the result of a join
function NegativeJoin(ownerToken, fact){
    this.parentToken = ownerToken;
    this.fact = fact;
}

// ----------------- the nodes ---------------------


/* makes a memory object */
function AlphaMemory(parent){
    this.kind = nodes.NodeTypes.ALPHAMEMORY;

    /* the tokens it holds */
    this.facts = new list.LinkedList();    //can make it hashable, using fact.id
    this.children = new list.LinkedList();   //array for now
    this.parent = parent;   //do we need this?

    var self = this;

    this.nodeid = "AM" + Math.random().toString(36).substr(2, 5);  //random id

    this.addChild =  function(child){
        if (!this.children){
            this.children = new list.LinkedList();
        }
        this.children.prepend(child);   //prepend to avoid duplicate tokens
    };
    /* check if this memory contains a slot. if so return the token as a whole
     */
    this.getFactWithSlotValue = function(slotType, slotValue){
        /* fastest implementation */
        this.facts.each(function(fact){
            if (fact[slotType] === slotValue) {
                return fact;
            }
        });
        return null;
    };

    /* get facts with slot in this mem
     */
    this.getFactsWithSlot = function(slotType){
        var results = [];
        for (var fid in this.facts) {
            if (this.facts.hasOwnProperty(fid)) {
                var theFact = this.facts[factid].getSlot(slotType);
                if (theFact != null){
                    results.push(theFact);
                }
            }
        }
        return results;
    };

    this.receive = function(fact) {
        var aitem = new AlphaMemoryItem(fact, this);

        this.facts.prepend(aitem);

        fact.alphaMemoryItems.prepend(aitem);   //for deletion, tree-based

        this.children.each(function(node){
           node.rightReceive(fact);
        });
    };

    this.deleteNode = function(){

        while (this.facts && this.facts.size() > 0){
                var head = this.facts.head();
                head.fact.deleteTokenAndChildren(head, this.facts);  //can refactor
        }
        head.children.removeNode(head);
        if (!this.parent.children || this.parent.children.size() === 0){
            this.parent.deleteNode();
            //this = null; ??
        }
    };

    this.asJSON = function(){
        var childrenJson = [];
        this.children.each(function(child){
            childrenJson.push(child.asJSON());
        });

        return {
            type: this.kind,
            id: this.nodeid,
            parent: this.parent.nodeid || null,
            children: childrenJson
        };
    };

}
/* makes a beta memory object, represented as key-value pairs */
function BetaMemory(parent){

    this.children = new list.LinkedList();
    this.parent = parent;

    this.items = new list.LinkedList();

    this.kind = nodes.NodeTypes.BETAMEMORY;

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

    /* insert into the memory a new token */
    this.leftReceive = function(token, fact){
        var newToken = new Token(token, fact, this);
        this.items.prepend(newToken);

        this.children.each(function(child){
            child.leftReceive(newToken);    //left activation
        });

        //events
        if (this.events['onLeftReceive']){
            //sanitize the token?
            console.log("Token id: " + newToken.tokenId);
            this.events['onLeftReceive'].call(self, newToken.getFacts());
        }
    };

    /* insert into the memory a new token already constructed with parent */
    this.leftReceiveToken = function(newToken){
        this.items.prepend(newToken);

        this.children.each(function(child){
            child.leftReceive(newToken);    //left activation
        });

        //events
        if (this.events['onLeftReceive']){
            //sanitize the token?
            //output tokenid
            console.log("Token id: " + newToken.tokenId);
            this.events['onLeftReceive'].call(self, newToken.getFacts());
        }
    };

    //update the node with older facts
    this.update = function(){
       if (this.parent){
           if (this.parent.kind === nodes.NodeTypes.BETAMEMORY){
               if (this.parent.items){
                   this.parent.items.each(function(token){
                      self.leftReceive(token);  //todo: what abt the second argument (fact)?
                   });
               }
           }
           if (this.parent.kind === nodes.NodeTypes.BETANODE){
               var originalParentChildren = this.parent.children;
               this.parent.children = new list.LinkedList();
               this.parent.children.prepend(this);
               this.parent.alphaMemory.facts.each(function(alphaItem){
                  self.parent.rightReceive(alphaItem.fact);
               });
               //already mached, restore the children
               this.parent.children = originalParentChildren;
           }
           if (this.parent.kind === nodes.NodeTypes.NEGATIONNODE){
               if (this.parent.items){
                   this.parent.items.each(function(token){
                       if (!token.joinResults || token.joinResults.size() === 0){
                           self.leftReceive(token, null);
                       }
                   });
               }
           }
           if (this.parent.kind === nodes.NodeTypes.BETATESTNODE){
               var children = this.parent.children;
               this.parent.children = new list.LinkedList();
               this.parent.children.prepend(this);
               //just call update
               this.parent.update();

               this.parent.children = children;
           }

           if (this.parent.kind === nodes.NodeTypes.ORNODE){
               var ornodechildren = this.parent.children;
               this.parent.children = new list.LinkedList();
               this.parent.children.prepend(this);
               //just call update
               this.parent.update();

               this.parent.children = ornodechildren;
           }
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

        if (this.type === node.NodeTypes.BETANODE){
            this.alphaMemory.children.removeNode(this);
            if (!this.alphaMemory.children || this.alphaMemory.children.size() === 0){
                this.alphaMemory.delete();  //todo
            }
        } else {
            while (this.items && this.items.size() > 0){
                var head = this.items.head();
                head.data.deleteTokenAndChildren(head, this.items);  //can refactor
            }
            head.children.removeNode(head);
        }

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
            console.log("node: " + self.nodeid + ". child: " + child.nodeid);
            childrenJson.push(child.asJSON());
        });

        return {
            type: this.kind,
            id: this.nodeid,
            parent: this.parent.nodeid || null,
            children: childrenJson
        };
    };
}


exports.BetaMemory = BetaMemory;
exports.AlphaMemory = AlphaMemory;
exports.AlphaMemoryItem = AlphaMemoryItem;
exports.NegativeJoin = NegativeJoin;
exports.Fact = Fact;
exports.Slot = Slot;
exports.Token = Token;
exports.SIGNS = SIGNS;

