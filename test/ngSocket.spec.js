describe('ngSocket', function () {
  describe('ngSocketBackend', function () {
    var $window, ngSocket, WSMock, localMocks = {}, ngSocketBackend;

    beforeEach(module('ngSocket'));

    beforeEach(inject(function (_$window_, _ngSocket_, _ngSocketBackend_) {
      $window = _$window_;
      ngSocket = _ngSocket_;
      ngSocketBackend = _ngSocketBackend_;

      localMocks.sendMock = function () {};
      localMocks.closeMock = function () {};

      $window.WebSocket = WSMock = function (url) {
        this.send = localMocks.sendMock;
        this.close = localMocks.closeMock;
      };
    }));


    it('should complain if not given a valid url', function () {
      expect(function () {ngSocketBackend.createWebSocketBackend('%foobar/baz');}).
        toThrow(new Error('Invalid url provided'));
    });
  });


  describe('ngSocket', function () {
    var $window, ngSocket, WSMock, localMocks = {}, ngSocketBackend;

    beforeEach(module('ngSocket', 'ngSocketMock'));

    beforeEach(inject(function (_$window_, _ngSocket_, _ngSocketBackend_) {
      $window = _$window_;
      ngSocket = _ngSocket_;
      ngSocketBackend = _ngSocketBackend_;
    }));

    afterEach(function () {
      ngSocketBackend.verifyNoOutstandingRequest();
      ngSocketBackend.verifyNoOutstandingExpectation();
    });


    it('should accept a wss url', function () {
      var url = 'wss://foo/secure';
      ngSocketBackend.expectConnect(url);
      var ws = ngSocket(url);
      ngSocketBackend.flush();
    });


    it('should return an object containing a reference to the WebSocket instance', function () {
      var url = 'ws://reference';
      ngSocketBackend.expectConnect(url);
      expect(typeof ngSocket(url).socket.send).toBe('function');
      ngSocketBackend.flush();
    });


    it('should have a separate sendQueue for each instance', function () {
      var url1 = 'ws://foo/one';
      var url2 = 'ws://foo/two';
      ngSocketBackend.expectConnect(url1);
      var ws1 = ngSocket(url1);
      ngSocketBackend.expectConnect(url2);
      var ws2 = ngSocket(url2);
      ws1.send('baz');
      expect(ws1.sendQueue.length).toBe(1);
      expect(ws2.sendQueue.length).toBe(0);
      ngSocketBackend.flush();
    });


    describe('._connect()', function () {
      var url, ws;
      beforeEach(function () {
        url = 'ws://foo/bar';
        ngSocketBackend.expectConnect(url);
        ws = ngSocket(url);
      });


      it('should attempt connecting to a socket if provided a valid URL', function () {
        ws.socket = null;
        ws._connect();
        ngSocketBackend.flush();
      });


      it('should not connect if a socket has a readyState of 1', function () {
        ws.socket.readyState = 1;
        ws._connect();
        ngSocketBackend.flush();
      });


      it('should force reconnect if force parameter is true', function () {
        ws.socket.readyState = 1;
        ngSocketBackend.expectConnect(url);
        ws._connect(true);
        ngSocketBackend.flush();
      });


      it('should attach handlers to socket event attributes', function () {
        expect(typeof ws.socket.onopen).toBe('function');
        expect(typeof ws.socket.onmessage).toBe('function');
        expect(typeof ws.socket.onerror).toBe('function');
        expect(typeof ws.socket.onclose).toBe('function');
        ngSocketBackend.flush();
      });
    });


    describe('.close()', function () {
      var url, ws;
      beforeEach(function () {
        url = 'ws://foo';
        ngSocketBackend.expectConnect(url);
        ws = ngSocket(url);
        ngSocketBackend.flush();
      });


      it('should call close on the underlying socket', function () {
        ngSocketBackend.expectClose();
        ws.close();
        ngSocketBackend.flush();
      });


      it('should not call close if the bufferedAmount is greater than 0', function () {
        ws.socket.bufferedAmount = 5;
        ws.close();
        ngSocketBackend.flush();
      });


      it('should accept a force param to close the socket even if bufferedAmount is greater than 0', function () {
        ngSocketBackend.expectClose();
        ws.socket.bufferedAmount = 5;
        ws.close(true);
        ngSocketBackend.flush();
      });
    });


    describe('._onCloseHandler', function () {
      it('should call .reconnect if the CloseEvent indicates a non-intentional close', function () {
        var url = 'ws://foo/onclose';
        ngSocketBackend.expectConnect(url);
        var ws = ngSocket(url);
        var spy = spyOn(ws, 'reconnect');
        ws._onCloseHandler({statusCode: 5000});
        expect(spy).toHaveBeenCalled();
        ngSocketBackend.flush();
      });
    });


    describe('.onOpen()', function () {
      it('should add the passed in function to the onOpenCallbacks array', function () {
        var cb = function () {};
        var url = 'ws://foo';
        ngSocketBackend.expectConnect(url);
        var ws = ngSocket(url);
        ws.onOpen(cb);
        expect(ws.onOpenCallbacks[0]).toBe(cb);
        ngSocketBackend.flush();
      });
    });


    describe('.send()', function () {
      var url, ws;

      beforeEach(function () {
        url = 'ws://foo/bar';
        ngSocketBackend.expectConnect(url);
        ws = ngSocket(url);
      });

      afterEach(function() {
        ngSocketBackend.flush();
      });


      it('should queue change if the "onopen" event has not yet occurred', function () {
        var data = {message: 'Send me'};
        ws.send(data);
        expect(ws.sendQueue.length).toBe(1);
        expect(ws.sendQueue[0].message).toBe(data);
      });


      it('should accept a string as data', function () {
        var data = 'I am a string';
        ws.send(data);
        expect(ws.sendQueue[0].message).toBe(data);
      });


      it('should call fireQueue immediately', function () {
        var spy = spyOn(ws, 'fireQueue');
        ws.send('send me');
        expect(spy).toHaveBeenCalled();
      });


      it('should return a promise', function() {
        expect(typeof ws.send('promise?').then).toBe('function');
      });


      it('should return a cancelable promise', function() {
        expect(typeof ws.send('promise?').cancel).toBe('function');
      });


      it('should return reject a cancelled send with reason if provided', inject(function($rootScope) {
        var reason = 'bad data';
        var spy = jasmine.createSpy('reject');
        ws.send('foo').then(null, spy).cancel(reason);
        $rootScope.$digest();
        expect(spy).toHaveBeenCalledWith('bad data');
      }));


      it('should remove the request from the queue when calling cancel', function() {
        ws.sendQueue = ['bar','baz'];
        var sent = ws.send('foo');
        expect(ws.sendQueue[2].message).toBe('foo');
        sent.cancel();
        expect(ws.sendQueue.length).toBe(2);
        expect(ws.sendQueue.indexOf('foo')).toBe(-1);
      });


      it('should reject the promise when readyState is 4', inject(function($rootScope) {
        var spy = jasmine.createSpy('reject');
        ws._internalConnectionState = 4;
        ws.send('hello').then(null, spy);
        expect(ws.sendQueue.length).toBe(0);
        $rootScope.$digest();
        expect(spy).toHaveBeenCalledWith('Socket connection has been closed');
      }));
    });


    describe('._setInternalState()', function() {
      it('should change the private _internalConnectionState property', function() {
        var ws = ngSocket('ws://foo');
        ngSocketBackend.flush();
        ws._setInternalState(4);
        expect(ws._internalConnectionState).toBe(4);
      });


      it('should only allow integer values from 0-4', function() {
        var ws = ngSocket('ws://foo');
        ngSocketBackend.flush();
        ws._internalConnectionState = 4;
        expect(function() {
          ws._setInternalState(5);
        }).toThrow('state must be an integer between 0 and 4, got: 5');
        expect(ws._internalConnectionState).toBe(4);
      });


      it('should cancel everything inside the sendQueue if the state is 4', inject(function($q) {
        var ws = ngSocket('ws://foo');
        var deferred = $q.defer();
        var spy = spyOn(deferred, 'reject');
        ngSocketBackend.flush();
        ws.sendQueue.push({
          deferred: deferred,
        });
        ws._setInternalState(4);
        expect(spy).toHaveBeenCalled();
      }));
    });


    describe('.onMessage()', function () {
      var fn, url, ws;

      beforeEach(function () {
        url = 'ws://foo';
        fn = function () {};
        ngSocketBackend.expectConnect(url);
        ws = ngSocket(url);
      });


      afterEach(function() {
        ngSocketBackend.flush();
      });


      it('should add the callback to a queue', function () {
        ws.onMessage(fn);
        expect(ws.onMessageCallbacks[0].fn).toBe(fn);
      });


      it('should complain if not given a function', function () {
        expect(function () {ws.onMessage('lol');}).toThrow(new Error('Callback must be a function'));
      });


      it('should accept an options argument as the second argument', function () {
        ws.onMessage(fn, {filter: 'foo'});
      });


      it('should accept an optional RegEx pattern as the filter', function () {
        ws.onMessage(fn, {filter: /baz/});
      });


      it('should complain if the filter option is anything but RegEx or string', function () {
        expect(function () {ws.onMessage(fn, {filter: 5})}).
          toThrow(new Error('Pattern must be a string or regular expression'))
      });


      it('should set the autoApply property to true if undefined in options object', function() {
        ws.onMessage(angular.noop);
        expect(ws.onMessageCallbacks[0].autoApply).toBe(true);
      });


      it('should set the autoApply property to false if specified in options object', function() {
        ws.onMessage(angular.noop, {autoApply: false});
        expect(ws.onMessageCallbacks[0].autoApply).toBe(false);
      });
    });


    describe('._onMessageHandler()', function() {
      var fn, url, ws;

      beforeEach(function () {
        url = 'ws://foo';
        fn = function () {};
        ngSocketBackend.expectConnect(url);
        ws = ngSocket(url);
      });

      afterEach(function() {
        ngSocketBackend.flush();
      });


      it('should call callback if message matches filter pattern', function () {
        var spy = jasmine.createSpy('onResolve');
        ws.onMessageCallbacks.push({fn: spy, pattern: /baz[0-9]{2}/});
        ws._onMessageHandler({data: 'bar'});
        expect(spy).not.toHaveBeenCalled();
        ws._onMessageHandler({data: 'baz21'});
        expect(spy).toHaveBeenCalled();
      });


      it('should only call callback if message matches filter string exactly', function () {
        var spy = jasmine.createSpy('onResolve');
        ws.onMessageCallbacks.push({fn: spy, pattern: 'foo'});
        ws._onMessageHandler({data: 'bar'});
        expect(spy).not.toHaveBeenCalled();
        ws._onMessageHandler({data: 'foo'});
        expect(spy).toHaveBeenCalled();
      });


      it('should call $rootScope.$digest() if autoApply is set to true', inject(function($rootScope) {
        var digest = spyOn($rootScope, '$digest');
        ws.onMessageCallbacks.push({fn: angular.noop, autoApply: true});
        ws._onMessageHandler({data: 'Hello'});
        expect(digest).toHaveBeenCalled();
      }));


      it('should not call $rootScope.$digest() if autoApply is set to false', inject(function($rootScope) {
        var digest = spyOn($rootScope, '$digest');
        ws.onMessageCallbacks.push({fn: angular.noop, autoApply: false});
        ws._onMessageHandler({data: 'Hello'});
        expect(digest).not.toHaveBeenCalled();
      }));


      it('should not call $rootScope.$digest() if a digest is already in progress', inject(function($rootScope){
        $rootScope.$$phase = '$digest';
        var digest = spyOn($rootScope, '$digest');
        ws.onMessageCallbacks.push({fn: angular.noop, autoApply: true});
        ws._onMessageHandler({data: 'Hello'});
        expect(digest).not.toHaveBeenCalled();
      }));
    });


    describe('._onOpenHandler()', function () {
      var url, ws;

      beforeEach(function () {
        url = 'ws://foo';
        ngSocketBackend.expectConnect(url);
        ws = ngSocket(url);
        ngSocketBackend.flush();
      });

      it('should call fireQueue to flush any queued send() calls', function () {
        var spy = spyOn(ws, 'fireQueue');
        ws._onOpenHandler.call(ws);
        expect(spy).toHaveBeenCalled();
      });


      it('should call the passed-in function when a socket first connects', function () {
        var spy = jasmine.createSpy('callback');
        ws.onOpenCallbacks.push(spy);
        ws._onOpenHandler.call(ws);
        expect(spy).toHaveBeenCalled();
      });


      it('should call the passed-in function when a socket re-connects', function () {
        var spy = jasmine.createSpy('callback');
        ws.onOpenCallbacks.push(spy);
        ws._onOpenHandler.call(ws);
        ws._onOpenHandler.call(ws);
        expect(spy.callCount).toBe(2);
      });


      it('should call multiple callbacks when connecting', function () {
        var spy1 = jasmine.createSpy('callback1');
        var spy2 = jasmine.createSpy('callback2');
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
        ngSocketBackend.expectConnect(url);
        ws = ngSocket(url);
        ngSocketBackend.flush();
      });


      it('should not affect the queue if the readyState is not 1', function () {
        var data = {message: 'Hello', deferred: {resolve: angular.noop}};
        ws.socket.readyState = 0;
        ws.send(data);
        expect(ws.sendQueue.length).toBe(1);
        ws.fireQueue();
        expect(ws.sendQueue.length).toBe(1);
      });


      it('should call send for every item in the queue if readyState is 1', function () {
        var data = {message: 'Hello', deferred: {resolve: angular.noop}};
        var stringified = JSON.stringify(data);
        ngSocketBackend.expectSend(stringified);
        ws.sendQueue.unshift(data);
        ngSocketBackend.expectSend(stringified);
        ws.sendQueue.unshift(data);
        ngSocketBackend.expectSend(stringified);
        ws.sendQueue.unshift(data);
        ws.socket.readyState = 1;

        expect(ws.sendQueue.length).toBe(3);
        ws.fireQueue();
        expect(ws.sendQueue.length).toBe(0);
        ngSocketBackend.flush();
      });


      it('should stringify an object when sending to socket', function () {
        var data = {message: 'Send me', deferred: {resolve: angular.noop}};
        var stringified = JSON.stringify(data);
        ws.socket.readyState = 1;
        ngSocketBackend.expectSend(stringified);
        ws.sendQueue.unshift(data);
        ws.fireQueue();
        ngSocketBackend.flush();
      });


      it('should resolve the deferred when it has been sent to the underlying socket', inject(function($q, $rootScope) {
        var message = 'Send me';
        var deferred = $q.defer();
        var spy = jasmine.createSpy('resolve');
        deferred.promise.then(spy);
        var data = {deferred: deferred, message: message};
        ws.socket.readyState = 1;
        ngSocketBackend.expectSend(message);
        ws.sendQueue.unshift(data);
        ws.fireQueue();
        $rootScope.$digest();
        ngSocketBackend.flush();
        expect(spy).toHaveBeenCalled();
      }));
    });


    describe('.readyState', function () {
      var url, ws;

      beforeEach(function () {
        url = 'ws://foo';
        ngSocketBackend.expectConnect(url);
        ws = ngSocket(url);
        ngSocketBackend.flush();
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
        ngSocketBackend.expectConnect(url);
        ws = ngSocket(url);
        ngSocketBackend.flush();
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
        ngSocketBackend.expectConnect(url);
        var ws = ngSocket(url);
        expect(ws._reconnectableStatusCodes.length).toBe(1);
        expect(ws._reconnectableStatusCodes).toEqual([5000])
        ngSocketBackend.flush();
      });


    });


    describe('ngWebSocket', function() {
      it('should alias ngSocket', inject(function(ngWebSocket) {
        expect(ngWebSocket).toBe(ngSocket);
      }));
    });


    describe('ngWebSocketBackend', function() {
      it('should alias ngSocketBackend', inject(function(ngWebSocketBackend) {
        expect(ngWebSocketBackend).toBe(ngSocketBackend);
      }));
    });


    describe('.onError()', function () {
      it('should add the passed in function to the onErrorCallbacks array', function () {
        var cb = function () {};
        var url = 'ws://foo';
        ngSocketBackend.expectConnect(url);
        var ws = ngSocket(url);
        ws.onError(cb);
        expect(ws.onErrorCallbacks[0]).toBe(cb);
        ngSocketBackend.flush();
      });
    });


    describe('._onErrorHandler()', function () {
      var url, ws;

      beforeEach(function () {
        url = 'ws://foo';
        ngSocketBackend.expectConnect(url);
        ws = ngSocket(url);
        ngSocketBackend.flush();
      });

      it('should call the passed-in function when an error occurs', function () {
        var spy = jasmine.createSpy('callback');
        ws.onErrorCallbacks.push(spy);
        ws._onErrorHandler.call(ws, new Error());
        expect(spy).toHaveBeenCalled();
      });


      it('should call multiple callbacks when connecting', function () {
        var spy1 = jasmine.createSpy('callback1');
        var spy2 = jasmine.createSpy('callback2');
        ws.onErrorCallbacks.push(spy1);
        ws.onErrorCallbacks.push(spy2);
        ws._onErrorHandler.call(ws);
        expect(spy1).toHaveBeenCalled();
        expect(spy2).toHaveBeenCalled();
      });
    });
  });
});
