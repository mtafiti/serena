
/*
 * GET home page.
 */

exports.index = function(req, res){
    res.render('index', { title: 'Express' });
};
exports.reserve = function(req, res){
    res.render('reserve', { title: 'Reserve a table' });
};
exports.notifications = function(req, res){
    res.render('notifications', { title: 'Make your notification' });
};
exports.test = function(req, res){
    res.render('test', { title: 'Test page' });
};
exports.demo = function(req, res){
    res.render('demo', { title: 'Demo page' });
};
exports.shoot = function(req, res){
    res.render('shoot/index', { title: 'Shoot' });
};