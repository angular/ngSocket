# ngSocket

## Status: In-Development

A promise-based AngularJS service for connecting applications to servers with WebSocket support.

## Usage

bower install ngSocket

```javascript
.controller('SomeCtrl', function (ngWebSocket) {
  //Open a WebSocket connection
  var ws = nwWebSocket('ws://foo/bar');

  //Can call before socket has opened
  ws.send({foo: 'bar'});
});
```

## API

*Factory:ngWebSocket*
returns instance of private NGWebSocket constructor

### Properties:

 * `deferred`
 * `promise` promise to be resolved on `open` event of socket.
 * `socket` ([WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) instance)
 * `sendQueue` array of `send` calls to be made on socket when socket is able to receive data


### Public Methods:

 * `ngWebSocket(url)` (constructor) Creates and opens a [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) instance
 * `send(data(string|object))` Adds data to a queue, and attempts to send if socket is ready. Accepts string or object, and will stringify objects before sending to socket.


## Logical Questions

 * *Q.*: What if the browser doesn't support WebSockets?
 * *A.*: This module will not help; it does not have a fallback story for browsers that do not support WebSockets.

## TODO

 * Add support for close method
 * Automatic re-connection when connection lost
 * Consider support for ArrayBuffer and Blob datatypes
 * Add `on` method to alias `socket.onmessage`
 * Add `onerror` to allow applications to respond to socket errors in their own ways
 * Expand on the built-in `readyState` constants to include implementation-specific states (like "Re-connecting")
