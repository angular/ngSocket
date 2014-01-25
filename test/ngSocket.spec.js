describe('ngSocket', function () {
  var $compile, $rootScope, $controller, $httpBackend, $filter, $window,
    ngSocket, WSMock, localMocks = {};

  beforeEach(module('ngSocket'));

  beforeEach(inject(function (_$compile_, _$rootScope_, _$controller_, _$httpBackend_, _$filter_, _$window_, _ngWebSocket_) {
    $compile = _$compile_;
    $rootScope = _$rootScope_;
    $controller = _$controller_;
    $httpBackend = _$httpBackend_;
    $filter = _$filter_;
    $window = _$window_;
    ngWebSocket = _ngWebSocket_;

    localMocks.sendMock = function () {};

    $window.WebSocket = WSMock = function (url) {
      this.send = localMocks.sendMock;
    };
  }));


  afterEach(function () {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  });


  describe('ngWebSocket', function () {
    it('should attempt connecting to a socket if provided a valid URL', function () {
      var spy = spyOn($window, 'WebSocket');
      var url = 'ws://foo/bar';
      var ws = ngWebSocket(url);
      expect(spy).toHaveBeenCalledWith(url);
    });


    it('should return an object containing a reference to the WebSocket instance', function () {
      expect(ngWebSocket('ws://foo/bar').socket instanceof $window.WebSocket).toBe(true);
    });


    it('should complain if not given a valid url', function () {
      expect(function () {ngWebSocket('%foobar/baz');}).
        toThrow(new Error('Invalid url provided'));
    });


    it('should have a separate sendQueue for each instance', function () {
      var ws1 = ngWebSocket('ws://foo');
      var ws2 = ngWebSocket('ws://bar');
      ws1.send('baz');
      expect(ws1.sendQueue.length).toBe(1);
      expect(ws2.sendQueue.length).toBe(0);
    });


    describe('.onOpen()', function () {
      it('should add the passed in function to the onOpenCallbacks array', function () {
        var cb = function () {};
        var ws = ngWebSocket('ws://foo');
        ws.onOpen(cb);
        expect(ws.onOpenCallbacks[0]).toBe(cb);
      });
    });


    describe('.send()', function () {
      var ws;

      beforeEach(function () {
        ws = ngWebSocket('ws://foo/bar');
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
      var fn, ws;

      beforeEach(function () {
        fn = function () {};
        ws = ngWebSocket('ws://foo');
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
        var mock = {spyable: function () {}}
        var spy = spyOn(mock, 'spyable');
        ws.onMessage(mock.spyable, 'foo');
        ws._onMessageHandler({data: 'bar'});
        expect(spy).not.toHaveBeenCalled();
        ws._onMessageHandler({data: 'foo'});
        expect(spy).toHaveBeenCalled();
      });


      it('should accept an optional RegEx pattern as the second argument', function () {
        ws.onMessage(fn, /baz/);
      });


      it('should only call callback if message matches pattern', function () {
        var mock = {spyable: function () {}}
        var spy = spyOn(mock, 'spyable');
        ws.onMessage(mock.spyable, /baz[0-9]{2}/);
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
      it('should call fireQueue to flush any queued send() calls', function () {
        var ws = ngWebSocket('ws://foo');
        var spy = spyOn(ws, 'fireQueue');
        ws._onOpenHandler.call(ws);
        expect(spy).toHaveBeenCalled();
      });


      it('should call the passed-in function when a socket first connects', function () {
        var ws = ngWebSocket('ws://foo');
        var spy = spyOn({cb: function () {}}, 'cb');

        ws.onOpenCallbacks.push(spy);
        ws._onOpenHandler.call(ws);
        expect(spy).toHaveBeenCalled();
      });


      it('should call the passed-in function when a socket re-connects', function () {
        var ws = ngWebSocket('ws://foo');
        var spy = spyOn({cb: function () {}}, 'cb');
        ws.onOpenCallbacks.push(spy);
        ws._onOpenHandler.call(ws);
        ws._onOpenHandler.call(ws);
        expect(spy.callCount).toBe(2);
      });


      it('should call multiple callbacks when connecting', function () {
        var ws = ngWebSocket('ws://foo');
        var spy1 = spyOn({cb: function () {}}, 'cb');
        var spy2 = spyOn({cb: function () {}}, 'cb');

        ws.onOpenCallbacks.push(spy1);
        ws.onOpenCallbacks.push(spy2);
        ws._onOpenHandler.call(ws);
        expect(spy1).toHaveBeenCalled();
        expect(spy2).toHaveBeenCalled();
      });
    });


    describe('.fireQueue()', function () {
      var ws, sendSpy;

      beforeEach(function () {
        sendSpy = spyOn(localMocks, 'sendMock');
        ws = ngWebSocket('ws://foo/bar');
      });


      it('should not affect the queue if the readyState is not 1', function () {
        var data = {message: 'Hello'};
        ws.readyState = 0;
        ws.send(data);
        expect(ws.sendQueue.length).toBe(1);
        ws.fireQueue();
        expect(ws.sendQueue.length).toBe(1);
      });


      it('should call send for every item in the queue if readyState is 1', function () {
        var data = {message: 'Hello'};
        ws.sendQueue.unshift(data);
        ws.sendQueue.unshift(data);
        ws.sendQueue.unshift(data);
        ws.socket.readyState = 1;

        expect(sendSpy.callCount).toBe(0);
        expect(ws.sendQueue.length).toBe(3);

        ws.fireQueue();
        expect(ws.sendQueue.length).toBe(0);
        expect(sendSpy.callCount).toBe(3);
      });


      it('should stringify an object when sending to socket', function () {
        var data = {message: 'Send me'};
        ws.socket.readyState = 1;

        ws.sendQueue.unshift(data);
        ws.fireQueue();
        expect(sendSpy).toHaveBeenCalledWith('{"message":"Send me"}');
      });
    });
  });
});
