/*
//var expect = require('chai').expect;
var util = require('util');

var rete = require('../jsrete/retescript'); //will make a package later
var rule = require('../jsrete/rule');
var memory = require('../jsrete/memory');


// Create a new test suite
describe("Negation Tests", function() {


    it("creating rule with negation", function(done){

        var rs = new rete.ReteScript();
        var fired, unfired;
        //create a rule
        var ruleAsJson = {
            rulename: "rule_window_table_not_reserved_or_occupied_(will_fire_then_unfire)",
            conditions: [
                {name: "table",
                    slots: [
                        {condslot: "name", condval: "x", isvar: true},
                        {condslot: "location", condval: "window", isvar: false}
                    ]
                },
                {name: "table",
                    sign: "not",
                    slots: [
                        {condslot: "name",condval: "x", isvar: true},
                        {condslot: "status",condval: "reserved", isvar: false}
                    ]
                },
                {name: "table",
                    sign: "not",
                    slots: [
                        {condslot: "name",condval: "x", isvar: true},
                        {condslot: "status",condval: "occupied", isvar: false}
                    ]
                }
            ]
        };

        var tnode = rs.registerRule(ruleAsJson, function(result){
            fired = true;
        });
        tnode.addEvent('onDeleteToken', function(token){
            console.log(">> Deleted a token that was fired.");
            console.log(util.inspect(token.asJSON(), showHidden=false, depth=10, colorize=true));
            unfired = true;
            if (fired && unfired){
                done();
            }
        });

        //assert a fact
        var fact = {
            type: 'table',
            slots: [
                {type: "name", val: 'table1'},
                {type: "location", val: 'window'},
                {type: "status", val: 'occupied'}
            ]
        };
        //assert a fact
        var fact2 = {
            type: 'table',
            slots: [
                {type: "name", val: 'table2'},
                {type: "location", val: 'window'},
                {type: "status", val: 'free'}
            ]
        };

        var result = rs.assertFact(fact);
        var result2 = rs.assertFact(fact2);

        //log network
        //console.log("--- the network ---");
        //console.log(util.inspect(rs.networkAsJSON(), showHidden=false, depth=10, colorize=true));
    });


    it("test_if_negation_rule_will_fire_after_asserts", function(done){

        //to cont........................
        var rs = new rete.ReteScript();
        var fired = false;

        var ruleAsJson = {
            rulename: "RuleNoFreeTableInMiddle",
            conditions: [
                {name: "table",
                    sign: 'not',
                    slots: [
                        {condslot: "location", condval: "middle", isvar: false},
                        {condslot: "status",condval: "free", isvar: false}
                    ]
                },
                {name: "reservation-request",
                    slots: [
                        {condslot: "location",condval: "middle", isvar: false},
                        {condslot: "status",condval: "s", isvar: true}
                    ]
                }
            ]
        };

        //assert a fact
        var fact = {
            type: 'table',
            slots: [
                {type: "location", val: 'window'},
                {type: "status", val: 'free'}
            ]
        };
        //assert a fact
        var fact2 = {
            type: 'reservation-request',
            slots: [
                {type: "location", val: 'middle'},
                {type: "status", val: 'free'}
            ]
        };

        var result = rs.assertFact(fact);
        var result2 = rs.assertFact(fact2);

        var tnode = rs.registerRule(ruleAsJson, function(result){
            fired = true;
            done();
        });

    });

});
    */