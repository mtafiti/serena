
//var expect = require('chai').expect;
var util = require('util');

var rete = require('../jsrete/retescript'); //will make a package later
var rule = require('../jsrete/rule');
var memory = require('../jsrete/memory');


// Create a new test suite
describe("Expression Tests", function() {


    /* it("creating rule with simple 1-condition test node", function(done){

        var rs = new rete.ReteScript();
        var fired, unfired;

        var ruleAsJson = {
            rulename: "rule_table_window_with_capacity_3_to_5_test",
            conditions: [
                {name: "table",
                    slots: [
                        {condslot: "name", condval: "n", isvar: true},
                        {condslot: "next-to", condval: "window", isvar: false},
                        {condslot: "capacity", condval: "c", isvar: true}
                    ]
                },
                {name: "$expr",
                    slots:[
                        {condslot: "$expr", condval: "(?c >= 3) && (?c <= 5 ) " }
                    ]
                }
            ]
        };

        var count = 0;

        var tnode = rs.registerRule(ruleAsJson, function(result){
            count++;
            if (count === 3){
                done();
            }
        });

        //assert
        var fact1 = {
            type: 'table',
            slots: [
                {type: "name", val: 'table2'},
                {type: "next-to", val: 'window'},
                {type: "status", val: 'free'},
                {type: "capacity", val: '1'}
            ]
        };
        var fact2 = {
            type: 'table',
            slots: [
                {type: "name", val: 'table2'},
                {type: "next-to", val: 'window'},
                {type: "status", val: 'free'},
                {type: "capacity", val: '2'}
            ]
        };
        var fact3 = {
            type: 'table',
            slots: [
                {type: "name", val: 'table2'},
                {type: "next-to", val: 'window'},
                {type: "status", val: 'free'},
                {type: "capacity", val: '3'}
            ]
        };
        var fact4 = {
            type: 'table',
            slots: [
                {type: "name", val: 'table3'},
                {type: "next-to", val: 'window'},
                {type: "status", val: 'free'},
                {type: "capacity", val: '4'}
            ]
        };
        var fact5 = {
            type: 'table',
            slots: [
                {type: "name", val: 'table3'},
                {type: "next-to", val: 'window'},
                {type: "status", val: 'free'},
                {type: "capacity", val: '5'}
            ]
        };

        rs.assertFact(fact1);
        rs.assertFact(fact2);
        rs.assertFact(fact3);
        rs.assertFact(fact4);
        rs.assertFact(fact5);

    });
    */

    /*
    it("creating rule with simple multi-condition test node", function(done){

        var rs = new rete.ReteScript();
        var fired, unfired;

        var ruleAsJson = {
            rulename: "rule_table_window_with_capacity_3_to_5_test",
            conditions: [
                { type: "table", name: "?n" , location: "window", capacity: "?c1"},
                { type: "table", name: "?m" , location: "window", capacity: "?c2"},
                { type: "$expr", expr: "(?c1 >= 3) && (?c1 <= 5 ) || ((?c2 <= 10 ) && (?c2 >= 8 ))  " }
            ]
        };

        var count = 0;

        var tnode = rs.registerRule(ruleAsJson, function(result){
            count++;
            if (count > 2){
                done(error);
            }
            if (count === 2){
                done();
            }
        });

        //assert
        var fact1 = {type: "table", name: "table1", location: "window", capacity: 1, status: "free"};
        var fact2 = {type: "table", name: "table2", location: "window", capacity: 3, status: "free"};
        var fact3 = {type: "table", name: "table1", location: "window", capacity: 5, status: "free"};
        var fact4 = {type: "table", name: "table2", location: "window", capacity: 8, status: "free"};
        var fact5 = {type: "table", name: "table1", location: "window", capacity: 15, status: "free"};

        rs.assertFact(fact1);
        rs.assertFact(fact2);
        //rs.assertFact(fact3);
        //rs.assertFact(fact4);
        //rs.assertFact(fact5);

    });

     {
     rulename: "rule_2_window_tables_free_and_(_more_than_5_)",
     scope: "group",
     conditions: [
     { type: "table", location: "window", name: "?n" , capacity: "?c1", status: "free"},
     { type: "table", location: "window", name: "?m" , capacity: "?c2", status: "free"},
     { type: "expr", expr: "(?c1 + ?c2) >= 5" }
     ]
     }

    */
});