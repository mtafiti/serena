/**
 * Created by ken on 16/04/14.
 */
var constants = require('./constants');

var isArray = function(val){
    return ('isArray' in Array) ?
        Array.isArray(val) :
        (function (value) {
            return Object.prototype.toString.call(value) === '[object Array]';
        })(val)
};

var isString = function(val){
  return (typeof val == 'string' || val instanceof String);
};

var parseVariables = function(expr){
    var vars =  expr.match(new RegExp("\\"+constants.expression.VARIABLE_DELIMITER+"\\w+", "g"));
    return vars ? vars.filter(function(item, i, self){
        return self.indexOf(item) === i;   //remove duplicates
    }) : [];
};

//see http://www.devthought.com/2012/01/18/an-object-is-not-a-hash/
function has (obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
}

var randomId = function(){
    return Math.random().toString(36).substr(2, 5);  //random id
};

//to avoid duplicate activations with transitive matches
function inequalityCheck(val1, val2){
    //originally: val1 !== val2
    return typeof val1 === 'string' && typeof val2 === 'string' ?
         val1 > val2
        :
         val1 != val2;

}


exports.isArray = isArray;
exports.isString = isString;
exports.parseVariables = parseVariables;
exports.randomId = randomId;
exports.has = has;
exports.inequalityCheck = inequalityCheck;