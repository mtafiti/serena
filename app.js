
/**
 * Module dependencies.
 */

var express = require('express.io');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');

var rete = require('./jsrete/retescript');
var serene = require('./jsrete/serene');

var app = express();

//hold rs
var rs, sn;

app.configure(function(){

    // all environments
    app.set('port', process.env.PORT || 3000);
    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'ejs');
    app.use(express.favicon());

    app.use(express.json());
    app.use(express.urlencoded());
    app.use(express.methodOverride());
    app.use(express.cookieParser('rete4vhaat#vu9b+)$h@6&^$$l+g68l!^v(*^6lsi!w&s$01h^yt9*rete'));
    app.use(express.session({secret: 'serene is pretty nice'}));

    app.use(express.static(path.join(__dirname, 'public')));
    app.use(express.logger('dev')); //below static, disable logging

    app.use(app.router);    //but allow for routes

});

app.configure('development', function(){
    // development only
      app.use(express.errorHandler());
});

app.get('/', routes.index);
app.get('/home', routes.index);
app.get('/reserve', routes.reserve);
app.get('/notifications', routes.notifications);
app.get('/test', routes.test);
app.get('/demo', routes.demo);
app.get('/shoot', routes.shoot);

app.get('/users', user.list);

//init server
app.http()
    .io()
    .listen(app.get('port'), function(){

    console.log('Serene server listening on port ' + app.get('port'));
});

//socket.io
app.io.set('log level', 1); //show all messages == 10

//start rete network
rs = new rete.ReteScript(app);
//add metalayer
sn = new serene.Serene().initMetaLayer(rs);


