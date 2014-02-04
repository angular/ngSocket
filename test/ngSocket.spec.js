describe('ngSocket', function () {
  describe('ngWebSocketBackend', function () {
    var $window, ngSocket, WSMock, localMocks = {};

    beforeEach(module('ngSocket'));

    beforeEach(inject(function (_$window_, _ngWebSocket_, _ngWebSocketBackend_) {
      $window = _$window_;
      ngWebSocket = _ngWebSocket_;
      ngWebSocketBackend = _ngWebSocketBackend_;

      localMocks.sendMock = function () {};
      localMocks.closeMock = function () {};

      $window.WebSocket = WSMock = function (url) {
        this.send = localMocks.sendMock;
        this.close = localMocks.closeMock;
      };
    }));


    it('should complain if not given a valid url', function () {
      expect(function () {ngWebSocketBackend.createWebSocketBackend('%foobar/baz');}).
        toThrow(new Error('Invalid url provided'));
    });
  });


  describe('ngWebSocket', function () {
    var $window, ngSocket, WSMock, localMocks = {};

    beforeEach(module('ngSocket', 'ngSocketMock'));

    beforeEach(inject(function (_$window_, _ngWebSocket_, _ngWebSocketBackend_) {
      $window = _$window_;
      ngWebSocket = _ngWebSocket_;
      ngWebSocketBackend = _ngWebSocketBackend_;
    }));

    afterEach(function () {
      ngWebSocketBackend.verifyNoOutstandingRequest();
      ngWebSocketBackend.verifyNoOutstandingExpectation();
    });


    it('should accept a wss url', function () {
      var url = 'wss://foo/secure';
      ngWebSocketBackend.expectConnect(url);
      var ws = ngWebSocket(url);
      ngWebSocketBackend.flush();
    });


    it('should return an object containing a reference to the WebSocket instance', function () {
      var url = 'ws://reference';
      ngWebSocketBackend.expectConnect(url);
      expect(typeof ngWebSocket(url).socket.send).toBe('function');
      ngWebSocketBackend.flush();
    });


    it('should have a separate sendQueue for each instance', function () {
      var url1 = 'ws://foo/one';
      var url2 = 'ws://foo/two';
      ngWebSocketBackend.expectConnect(url1);
      var ws1 = ngWebSocket(url1);
      ngWebSocketBackend.expectConnect(url2);
      var ws2 = ngWebSocket(url2);
      ws1.send('baz');
      expect(ws1.sendQueue.length).toBe(1);
      expect(ws2.sendQueue.length).toBe(0);
      ngWebSocketBackend.flush();
    });


    describe('._connect()', function () {
      var url, ws;
      beforeEach(function () {
        url = 'ws://foo/bar';
        ngWebSocketBackend.expectConnect(url);
        ws = ngWebSocket(url);
      });


      it('should attempt connecting to a socket if provided a valid URL', function () {
        ws.socket = null;
        ngWebSocketBackend.expectConnect(url);
        ws._connect();
        ngWebSocketBackend.flush();
      });


      it('should not connect if a socket has a readyState of 1', function () {
        ws.socket.readyState = 1;
        ws._connect();
        ngWebSocketBackend.flush();
      });


      it('should force reconnect if force parameter is true', function () {
        ws.socket.readyState = 1;
        ngWebSocketBackend.expectConnect(url);
        ws._connect(true);
        ngWebSocketBackend.flush();
      });


      it('should attach handlers to socket event attributes', function () {
        expect(typeof ws.socket.onopen).toBe('function');
        expect(typeof ws.socket.onmessage).toBe('function');
        expect(typeof ws.socket.onclose).toBe('function');
        ngWebSocketBackend.flush();
      });
    });


    describe('.close()', function () {
      var url, ws;
      beforeEach(function () {
        url = 'ws://foo';
        ngWebSocketBackend.expectConnect(url);
        ws = ngWebSocket(url);
        ngWebSocketBackend.flush();
      });


      it('should call close on the underlying socket', function () {
        ngWebSocketBackend.expectClose();
        ws.close();
        ngWebSocketBackend.flush();
      });


      it('should not call close if the bufferedAmount is greater than 0', function () {
        ws.socket.bufferedAmount = 5;
        ws.close();
        ngWebSocketBackend.flush();
      });


      it('should accept a force param to close the socket even if bufferedAmount is greater than 0', function () {
        ngWebSocketBackend.expectClose();
        ws.socket.bufferedAmount = 5;
        ws.close(true);
        ngWebSocketBackend.flush();
      });
    });


    describe('._onCloseHandler', function () {
      it('should call .reconnect if the CloseEvent indicates a non-intentional close', function () {
        var url = 'ws://foo/onclose';
        ngWebSocketBackend.expectConnect(url);
        var ws = ngWebSocket(url);
        var spy = spyOn(ws, 'reconnect');
        ws._onCloseHandler({statusCode: 5000});
        expect(spy).toHaveBeenCalled();
        ngWebSocketBackend.flush();
      });
    });


    describe('.onOpen()', function () {
      it('should add the passed in function to the onOpenCallbacks array', function () {
        var cb = function () {};
        var url = 'ws://foo';
        ngWebSocketBackend.expectConnect(url);
        var ws = ngWebSocket(url);
        ws.onOpen(cb);
        expect(ws.onOpenCallbacks[0]).toBe(cb);
        ngWebSocketBackend.flush();
      });
    });


    describe('.send()', function () {
      var url, ws;

      beforeEach(function () {
        url = 'ws://foo/bar';
        ngWebSocketBackend.expectConnect(url);
        ws = ngWebSocket(url);
        ngWebSocketBackend.flush();
      });


      it('should queue change if the "onopen" event has not yet occurred', function () {
        var data = {message: 'Send me'};
        ws.send(data);
        expect(ws.sendQueue.length).toBe(1);
        expect(ws.sendQueue[0]).toBe(data);
      });


      it('should accept a string as data', function () {
        var data = 'I am a string';
        ws.send(data);
        expect(ws.sendQueue[0]).toBe(data);
      });


      it('should call fireQueue immediately', function () {
        var spy = spyOn(ws, 'fireQueue');
        ws.send('send me');
        expect(spy).toHaveBeenCalled();
      });
    });


    describe('.onMessage()', function () {
      var fn, url, ws;

      beforeEach(function () {
        url = 'ws://foo';
        fn = function () {};
        ngWebSocketBackend.expectConnect(url);
        ws = ngWebSocket(url);
        ngWebSocketBackend.flush();
      });


      it('should add the callback to a queue', function () {
        ws.onMessage(fn);
        expect(ws.onMessageCallbacks[0].fn).toBe(fn);
      });


      it('should complain if not given a function', function () {
        expect(function () {ws.onMessage('lol');}).toThrow(new Error('Callback must be a function'));
      });


      it('should accept an optional string as the second argument', function () {
        ws.onMessage(fn, 'foo');
      });


      it('should only call callback if message matches string exactly', function () {
        var spy = jasmine.createSpy();
        ws.onMessage(spy, 'foo');
        ws._onMessageHandler({data: 'bar'});
        expect(spy).not.toHaveBeenCalled();
        ws._onMessageHandler({data: 'foo'});
        expect(spy).toHaveBeenCalled();
      });


      it('should accept an optional RegEx pattern as the second argument', function () {
        ws.onMessage(fn, /baz/);
      });


      it('should only call callback if message matches pattern', function () {

        var spy = jasmine.createSpy();
        ws.onMessage(spy, /baz[0-9]{2}/);
        ws._onMessageHandler({data: 'bar'});
        expect(spy).not.toHaveBeenCalled();
        ws._onMessageHandler({data: 'baz21'});
        expect(spy).toHaveBeenCalled();
      });


      it('should complain if the second argument is anything but RegEx or string', function () {
        expect(function () {ws.onMessage(fn, 5)}).toThrow(new Error('Pattern must be a string or regular expression'))
      });
    });


    describe('._onOpenHandler()', function () {
      var url, ws;

      beforeEach(function () {
        url = 'ws://foo';
        ngWebSocketBackend.expectConnect(url);
        ws = ngWebSocket(url);
        ngWebSocketBackend.flush();
      });

      it('should call fireQueue to flush any queued send() calls', function () {
        var spy = spyOn(ws, 'fireQueue');
        ws._onOpenHandler.call(ws);
        expect(spy).toHaveBeenCalled();
      });


      it('should call the passed-in function when a socket first connects', function () {
        var spy = jasmine.createSpy();
        ws.onOpenCallbacks.push(spy);
        ws._onOpenHandler.call(ws);
        expect(spy).toHaveBeenCalled();
      });


      it('should call the passed-in function when a socket re-connects', function () {
        var spy = jasmine.createSpy();
        ws.onOpenCallbacks.push(spy);
        ws._onOpenHandler.call(ws);
        ws._onOpenHandler.call(ws);
        expect(spy.callCount).toBe(2);
      });


      it('should call multiple callbacks when connecting', function () {
        var spy1 = jasmine.createSpy();
        var spy2 = jasmine.createSpy();
        ws.onOpenCallbacks.push(spy1);
        ws.onOpenCallbacks.push(spy2);
        ws._onOpenHandler.call(ws);
        expect(spy1).toHaveBeenCalled();
        expect(spy2).toHaveBeenCalled();
      });
    });


    describe('.fireQueue()', function () {
      var ws;

      beforeEach(function () {
        var url = 'ws://foo/bar';
        ngWebSocketBackend.expectConnect(url);
        ws = ngWebSocket(url);
        ngWebSocketBackend.flush();
      });


      it('should not affect the queue if the readyState is not 1', function () {
        var data = {message: 'Hello'};
        ws.socket.readyState = 0;
        ws.send(data);
        expect(ws.sendQueue.length).toBe(1);
        ws.fireQueue();
        expect(ws.sendQueue.length).toBe(1);
      });


      it('should call send for every item in the queue if readyState is 1', function () {
        var data = {message: 'Hello'};
        var stringified = JSON.stringify(data);
        ngWebSocketBackend.expectSend(stringified);
        ws.sendQueue.unshift(data);
        ngWebSocketBackend.expectSend(stringified);
        ws.sendQueue.unshift(data);
        ngWebSocketBackend.expectSend(stringified);
        ws.sendQueue.unshift(data);
        ws.socket.readyState = 1;

        expect(ws.sendQueue.length).toBe(3);
        ws.fireQueue();
        expect(ws.sendQueue.length).toBe(0);
        ngWebSocketBackend.flush();
      });


      it('should stringify an object when sending to socket', function () {
        var data = {message: 'Send me'};
        var stringified = JSON.stringify(data);
        ws.socket.readyState = 1;
        ngWebSocketBackend.expectSend(stringified);
        ws.sendQueue.unshift(data);
        ws.fireQueue();
        ngWebSocketBackend.flush();
      });
    });


    describe('.readyState', function () {
      var url, ws;

      beforeEach(function () {
        url = 'ws://foo';
        ngWebSocketBackend.expectConnect(url);
        ws = ngWebSocket(url);
        ngWebSocketBackend.flush();
      });


      it('should provide the readyState of the underlying socket', function () {
        ws.socket.readyState = 1;
        expect(ws.readyState).toBe(1);
      });


      it('should complain if I try to set the readyState', function () {
        expect(function () {ws.readyState = 5}).toThrow(new Error('The readyState property is read-only'));
      });


      it('should return a proprietary readyState if lib is in a special state', function () {
        ws.socket.readyState = 1;
        ws._internalConnectionState = 5;
        expect(ws.readyState).toBe(5);
      });
    });


    describe('._readyStateConstants', function () {
      var url, ws;

      beforeEach(function () {
        url = 'ws://foo';
        ngWebSocketBackend.expectConnect(url);
        ws = ngWebSocket(url);
        ngWebSocketBackend.flush();
      });

      it('should contain the basic readyState constants for WebSocket', function () {
        var constants = ws._readyStateConstants;
        expect(constants.CONNECTING).toBe(0);
        expect(constants.OPEN).toBe(1);
        expect(constants.CLOSING).toBe(2);
        expect(constants.CLOSED).toBe(3);
      });


      it('should provide custom constants to represent lib state', function () {
        var constants = ws._readyStateConstants;
        expect(constants.RECONNECT_ABORTED).toBe(4);
      });


      it('should ignore attempts at changing constants', function () {
        ws._readyStateConstants.CONNECTING = 'foo';
        expect(ws._readyStateConstants.CONNECTING).toBe(0);
      });
    });


    describe('._reconnectableStatusCodes', function () {
      it('should contain status codes that warrant re-establishing a connection', function () {
        var url = 'ws://foo';
        ngWebSocketBackend.expectConnect(url);
        var ws = ngWebSocket(url);
        expect(ws._reconnectableStatusCodes.length).toBe(1);
        expect(ws._reconnectableStatusCodes).toEqual([5000])
        ngWebSocketBackend.flush();
      });


    })
  });
});
