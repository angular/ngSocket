# ngSocket [![Build Status](https://travis-ci.org/angular/ngSocket.png)](https://travis-ci.org/angular/ngSocket)

## Status: In-Development

An AngularJS 1.x service for connecting applications to servers with WebSocket support.

## Usage

bower install ngSocket

```javascript
.controller('SomeController', function (ngSocket) {
  //Open a WebSocket connection
  var ws = ngSocket('ws://foo/bar');

  //Can call before socket has opened
  ws.send({foo: 'bar'});
});
```

## API

### Factory: `ngSocket` (in module `ngSocket`)

returns instance of NGWebSocket

### Methods

name        | arguments                                              | description
------------|--------------------------------------------------------|------------
ngSocket <br>_constructor_ | url:String                              | Creates and opens a [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) instance. `var ws = ngSocket('ws://foo');`
send        | data:String,Object returns                             | Adds data to a queue, and attempts to send if socket is ready. Accepts string or object, and will stringify objects before sending to socket.
onMessage   | callback:Function <br>options{filter:String,RegExp, autoApply:Boolean=true, fromJson:Boolean=false} | Register a callback to be fired on every message received from the websocket, or optionally just when the message's `data` property matches the filter provided in the options object. Each message handled will safely call `$rootScope.$digest()` unless `autoApply` is set to `false in the options. Callback gets called with a [MessageEvent](https://developer.mozilla.org/en-US/docs/Web/API/MessageEvent?redirectlocale=en-US&redirectslug=WebSockets%2FWebSockets_reference%2FMessageEvent) object or if fromJson is set with the unserialized object.
onOpen      | callback:Function                                      | Function to be executed each time a socket connection is opened for this instance.
close       | force:Boolean:_optional_                               | Close the underlying socket, as long as no data is still being sent from the client. Optionally force close, even if data is still being sent, by passing `true` as the `force` parameter. To check if data is being sent, read the value of `socket.bufferedAmount`.

### Properties
name               | type             | description
-------------------|------------------|------------
socket             | window.WebSocket | [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) instance.
sendQueue          | Array<function>  | Queue of `send` calls to be made on socket when socket is able to receive data. List is populated by calls to the `send` method, but this array can be spliced if data needs to be manually removed before it's been sent to a socket. Data is removed from the array after it's been sent to the socket.
onOpenCallbacks    | Array<function>  | List of callbacks to be executed when the socket is opened, initially or on re-connection after broken connection. Callbacks should be added to this list through the `onOpen` method.
onMessageCallbacks | Array<function>  | List of callbacks to be executed when a message is received from the socket. Callbacks should be added via the `onMessage` method.
readyState         | Number:readonly  | Returns either the readyState value from the underlying WebSocket instance, or a proprietary value representing the internal state of the lib, e.g. if the lib is in a state of re-connecting.

### CancelablePromise

This type is returned from the `send()` instance method of ngSocket, inherits from [$q.defer().promise](https://docs.angularjs.org/api/ng/service/$q).

### Methods

name        | arguments                                              | description
------------|--------------------------------------------------------|------------
cancel      | | Alias to `deferred.reject()`, allows preventing an unsent message from being sent to socket for any arbitrary reason.
then        | resolve:Function, reject:Function | Resolves when message has been passed to socket, presuming the socket has a `readyState` of 1. Rejects if the socket is hopelessly disconnected now or in the future (i.e. the library is no longer attempting to reconnect). All messages are immediately rejected when the library has determined that re-establishing a connection is unlikely.


### Service: `ngSocketBackend` (in module `ngSocketMock`)

Similar to [`httpBackend`](http://docs.angularjs.org/api/ngMock.$httpBackend) mock in AngularJS's `ngMock` module

### Methods

name                           | arguments  | description
-------------------------------|------------|-----------------------------------
flush                          |            | Executes all pending requests
expectConnect                  | url:String | Specify the url of an expected WebSocket connection
expectClose                    |            | Expect "close" to be called on the WebSocket
expectSend                     | msg:String | Expectation of send to be called, with required message
verifyNoOutstandingExpectation |            | Makes sure all expectations have been satisfied, should be called in afterEach
verifyNoOutstandingRequest     |            | Makes sure no requests are pending, should be called in afterEach

## Logical Questions

 * *Q.*: What if the browser doesn't support WebSockets?
 * *A.*: This module will not help; it does not have a fallback story for browsers that do not support WebSockets.

## Development

```shell
$ npm install
$ bower install
```

### Unit Tests
`$ npm test` Starts karma and watches files for changes

### Manual Tests

In the project root directory:

`$ node test-server` Starts a sample web socket server to send/receive messages
`$ ./node_modules/.bin http-server` - Basic http server to seve a static file
Open localhost:8081/test-app.html and watch browser console and node console to see messages passing

### Distribute
`$ ./dist.sh` For now just copies `src/ngSocket.js` to `dist/` (bower is configured to ignore src/ and test, plus pretty much everything else)

## TODO
 * Automatic re-connection when connection lost
 * Add `onerror` to allow applications to respond to socket errors in their own ways
 * Consider support for ArrayBuffer and Blob datatypes
 * Add `protocols` parameter to constructor

## License
[Apache 2.0](https://github.com/angular/ngSocket/blob/master/LICENSE)
