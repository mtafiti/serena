'use strict';
var assert = require("assert")
var rete = require('../jsrete/retescript'); //will make a package later
var rule = require('../jsrete/rule');
var memory = require('../jsrete/memory');

describe('negation-tests-2', function(){
/*
    it("negation rule dans le phd - rule should fire twice", function(done){

        //to cont........................
        var rs = new rete.ReteScript();
        var ruleAsJson = {
            rulename: "SimpleNegationRuleInPHD",
            conditions: [
                {name: "block",
                    slots: [
                        {condslot: "name", condval: "x", isvar: true},
                        {condslot: "on",condval: "y", isvar: true}
                    ]
                },
                {name: "block",
                    slots: [
                        {condslot: "name",condval: "y", isvar: true},
                        {condslot: "left-of",condval: "z", isvar: true}
                    ]
                },
                {name: "block",
                    sign:"not",
                    slots: [
                        {condslot: "name",condval: "z", isvar: true},
                        {condslot: "color",condval: "red", isvar: false}
                    ]
                }
            ]
        };
        var fireCount = 0;
        //add the rule
        rs.registerRule(ruleAsJson, function(facts){
            fireCount = fireCount + 1;
            if (fireCount === 2){
                done();
            }
          });

        //assert a fact
        var fact = {
            type: 'block',
            slots: [
                {type: "name", val: 'block1'},
                {type: "color", val: 'red'},
                {type: "on", val: 'block2'},
                {type: "left-of", val: null}
            ]
        };
        //assert a fact
        var fact2 = {
            type: 'block',
            slots: [
                {type: "name", val: 'block2'},
                {type: "color", val: 'red'},
                {type: "on", val: null},
                {type: "left-of", val: 'block3'}
            ]
        };
        //assert a fact
        var fact3 = {
            type: 'block',
            slots: [
                {type: "name", val: 'block4'},
                {type: "color", val: 'red'},
                {type: "on", val: null},
                {type: "left-of", val: null}
            ]
        };

        //assert
        var result = rs.assertFact(fact);
        var result2 = rs.assertFact(fact2);
        var result3 = rs.assertFact(fact3);
    });
*/
    /*
    it("test negation for firing and unfiring a rule - should fire a rule then fire another for canceling the first",
      function(done){
        var ruleFired, ruleUnfired;
        //to cont........................
        var rs = new rete.ReteScript();
        var ruleAsJson = {
            rulename: "Simple_negation_rule2",
            conditions: [
                {name: "block",
                    slots: [
                        {condslot: "name", condval: "block1", isvar: false},
                        {condslot: "color", condval: "green", isvar: false},
                        {condslot: "on",condval: "y", isvar: true}
                    ]
                },
                {name: "block",
                    sign: "not",
                    slots: [
                        {condslot: "name",condval: "y", isvar: true},
                        {condslot: "color",condval: "red", isvar: false}
                    ]
                }
            ]
        };

        //add the rule
        var tnode = rs.registerRule(ruleAsJson, function(facts){
            ruleFired = true;
        });

        tnode.addEvent('onDeleteToken', function(token){

            ruleUnfired = true;

            assert(ruleFired && ruleUnfired);
            done();
        });

        //assert a fact
        var fact = {
            type: 'block',
            slots: [
                {type: "name", val: 'block1'},
                {type: "color", val: 'green'},
                {type: "on", val: 'block2'}
            ]
        };
        //assert a fact
        var fact2 = {
            type: 'block',
            slots: [
                {type: "name", val: 'block2'},
                {type: "color", val: 'red'},
                {type: "on", val: 'block3'}
            ]
        };

        //assert
        var result = rs.assertFact(fact);
        var result2 = rs.assertFact(fact2);
    });

*/

});