var  _ = require('underscore'),  //note: requires underscore
    constants = require('constants'),
    exprparser = require('./exprparser');

function Expr(){

    var self = this;

    this.__init = function(){
        this._parser = new exprparser.Parser();
        this._parservars = {};
    };

    this.setVariable = function(variable, value){
        self._parservars[variable+ ""] =  value;
    };
    this.evaluate = function(expr, variables){

        if (variables && !_.isArray(variables)){
            variables = [variables];
            variables.forEach(function(itm){
                self._parservars[itm.name + ""] = itm.value;
            });
        }
        var res = self._parser.parse(expr).evaluate(self._parservars);
        return res;

    };
    this.parseVariables = function(expr){
        var vars =  expr.match(new RegExp("\\"+constants.expression.VARIABLE_DELIMITER+"\\w+", "g"));
        return vars ? vars.filter(function(item, i, self){
            return self.indexOf(item);   //remove duplicates
        }) : [];
    };
    this.reset = function(){
       self._parservars = {};
    };


    //helper for number checking (credit to
    ///http://stackoverflow.com/questions/18082/validate-decimal-numbers-in-javascript-isnumeric )
    this._isNumeric = function( obj ) {
        return !_.isArray( obj ) && obj - parseFloat( obj ) >= 0;
    };

    this.__init();

}

exports.Expr = Expr;