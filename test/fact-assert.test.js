/*
var expect = require('chai').expect;
var rete = require('../jsrete/retescript'); //will make a package later
var rule = require('../jsrete/rule');
var memory = require('../jsrete/memory');

// Create a new test suite
suite("Fact Assertion Tests", function() {


    test("create a new instance", function() {
        var r = new rete.ReteScript();
        expect(r).to.be.ok;
    });

    test("setup a rule (populate network)", function() {
        var rs = new rete.ReteScript();
        var ruleAsJson = {
          name: "RuleWindowLocation",
            conditions: [
                {type: "table",
                    slots: [
                        {condslot: "location",condval: "window", isvar: "false"},
                        {condslot: "status",condval: "free", isvar: "false"}
                    ]
                }
              ]
        };

        var result = rs.registerRule(ruleAsJson, function(result){
            //rule fired..
        });

        expect(result.lhs).to.be.an.instanceOf(rule.LHS);
    });

    test("assert fact after creating rule", function(){
        var rs = new rete.ReteScript();
        //create a rule
        var ruleAsJson = {
            rulename: "RuleWindowLocation",
            conditions: [
                {type: "table",
                    slots: [
                        {condslot: "location",condval: "window", isvar: "false"},
                        {condslot: "status",condval: "free", isvar: "false"}
                    ]
                }
            ]
        };

        rs.registerRule(ruleAsJson, function(result){
            //rule fired..
        });

        //assert a fact
        var fact = {
            type: 'table',
            slots: [
                {type: "location", val: 'window'},
                {type: "status", val: 'occupied'}
            ]
        };

        var result = rs.assertFact(fact);

        expect(result).to.be.an.instanceOf(memory.Fact);
    });


});

*/