
//var expect = require('chai').expect;
var util = require('util');

var rete = require('../jsrete/retescript'); //will make a package later
var rule = require('../jsrete/rule');
var memory = require('../jsrete/memory');


// Create a new test suite
describe("OR Tests", function() {

    it("creating rule with only OR test node", function(done){

        var rs = new rete.ReteScript();
        var fired, unfired;

        var ruleAsJson = {
            rulename: "rule_table_window_with_capacity_3_or_5_test",
            conditions: [
                {type: "or",
                 conditions: [
                    { type: "table", name: "?n" , location: "window", capacity: 3},
                    { type: "table", name: "?n" , location: "window", capacity: 5}
                 ]
                }
            ]
        };

        var tnode = rs.registerRule(ruleAsJson, function(result){
            done();
        });

        //assert
        var fact1 = {type: "table", name: "table1", location: "window", capacity: 10, status: "free"};
        var fact2 = {type: "table", name: "table1", location: "window", capacity: 3, status: "free"};

        rs.assertFact(fact1);
        rs.assertFact(fact2);

    });

    it("creating rule with condition and OR test node", function(done){

        var rs = new rete.ReteScript();
        var fired, unfired;

        var ruleAsJson = {
            rulename: "rule_table_window_with_capacity_3_or_5_with_one_condition",
            conditions: [
                { type: "table", name: "?m", location: "window"},
                {type: "or",
                    conditions: [
                        { type: "table", name: "?n" , capacity: 3},
                        { type: "table", name: "?n" , capacity: 5}
                    ]
                }
            ]
        };

        var tnode = rs.registerRule(ruleAsJson, function(result){
            done();
        });

        //assert
        var fact1 = {type: "table", name: "table1", location: "window", capacity: 3, status: "free"};
        var fact2 = {type: "table", name: "table2", location: "window", capacity: 3, status: "free"};

        rs.assertFact(fact1);
        rs.assertFact(fact2);

    });


    it("creating rule with nested ORs", function(done){

        var rs = new rete.ReteScript();
        var fired, unfired;

        var ruleAsJson = {
            rulename: "rule_window_table_free_or_(_3_or_5_)",
            conditions: [
                { type: "table", name: "?n", location: "window"},
                { type: "or",
                    conditions: [
                        { type: "table", name: "?n" , status: "free"},
                        { type: "or",
                            conditions: [
                                { type: "table", name: "?n" , capacity: 3},
                                { type: "table", name: "?n" , capacity: 5}
                            ]
                        }
                    ]
                }
            ]
        };

        var tnode = rs.registerRule(ruleAsJson, function(result){
            done();
        });

        //assert
        var fact1 = {type: "table", name: "table1", location: "window", capacity: 3, status: "free"};
        rs.assertFact(fact1);
    });
});