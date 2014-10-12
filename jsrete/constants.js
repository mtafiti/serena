var expression = {
    EXPRESSION_CONDITION_TYPE: "expr",
    EXPRESSION_CONDITION_SLOT: "$expr", //the one used in a condition json slot internally
    EXPRESSION_CONDITION_TYPE_ALIAS: "$test",   //the one used in a condition json
    VARIABLE_DELIMITER : "?",
    INTERNAL_VARIABLE_DELIMITER: "__"
};

var groupConditionTypes = {
    AND: "and",
    OR: "or",
    NEGATIVE: "not"
};

var reservedConditionTypes = {
    TYPE: "type",
    SIGN: "sign"
};

exports.expression = expression;
exports.groupConditionTypes = groupConditionTypes;
exports.reservedConditionTypes = reservedConditionTypes;