
Serena is a middleware targeted for real-time web applications. It consists of a Node.js package and the client library.

## Installation

You can clone this project and include it in your node.js project. Current dependencies: express.js, socket.io. Serena can also work with most node.js app frameworks.
We intend to soon register it in the npm registry, which will automatically add dependencies.

## Initialization

Start the inference engine and its scoping mechanism at the server: 

```js
var rete = require("engine");
var app = express();

//start engine
var eng = new rete.ReteScript(app);

//add scoping
new Serena().init(eng);
```

Clients then connect to the engine by referencing the client library in a html page and initializing the connection: 
```js
var sereneClient = new SereneClient("host","login", "group");
```

## API Reference

```js
sereneClient.addRule(rule, function(data){ 
  //rule fired..
});
```
More extensive API reference coming soon..

## Tests

Rudimentary tests written in mocha and expect.js are in the tests folder


## License

MIT licence.
