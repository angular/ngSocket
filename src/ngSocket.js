angular.module('ngSocket', []).
  factory('ngWebSocket', ['$window',
    function ($window) {
      var NGWebSocket = function (url) {
        var match = /wss?:\/\//.exec(url);

        if (!match) {
          throw new Error('Invalid url provided');
        }

        this.url = url;
        this.$window = $window;
        this.sendQueue = [];
        this.onOpenCallbacks = [];
        this.onMessageCallbacks = [];
        Object.freeze(this._readyStateConstants);

        this._connect();
      };

      NGWebSocket.prototype._readyStateConstants = {
        CONNECTING: 0,
        OPEN: 1,
        CLOSING: 2,
        CLOSED: 3,
        RECONNECT_ABORTED: 4
      };

      NGWebSocket.prototype.close = function (force) {
        if (force || !this.socket.bufferedAmount) {
          this.socket.close();
        }
      };

      NGWebSocket.prototype._connect = function (force) {
        if (force || !this.socket || this.socket.readyState !== 1) {
          this.socket = new this.$window.WebSocket(this.url);
          this.socket.onopen = this._onOpenHandler.bind(this);
          this.socket.onmessage = this._onMessageHandler.bind(this);
          this.socket.onclose = this._onCloseHandler.bind(this);
        }
      };

      NGWebSocket.prototype.fireQueue = function () {
        while (
            this.sendQueue.length &&
            this.socket.readyState === 1) {
          var data = this.sendQueue.shift();

          this.socket.send(typeof data === 'string'?
            data :
            JSON.stringify(data));
        }
      };

      NGWebSocket.prototype.notifyOpenCallbacks = function () {
        for (var i = 0; i < this.onOpenCallbacks.length; i++) {
          this.onOpenCallbacks[i].call(this);
        }
      };

      /*
        Public API
      */
      NGWebSocket.prototype.onMessage = function (callback, pattern) {
        if (typeof callback !== 'function') {
          throw new Error('Callback must be a function');
        }

        if (typeof pattern !== 'undefined' && typeof pattern !== 'string' && !(pattern instanceof RegExp)) {
          throw new Error('Pattern must be a string or regular expression');
        }

        this.onMessageCallbacks.push({fn: callback, pattern: pattern});
      };

      NGWebSocket.prototype._onMessageHandler = function (message) {
        var pattern;
        for (var i = 0; i < this.onMessageCallbacks.length; i++) {
          pattern = this.onMessageCallbacks[i].pattern;
          if (pattern) {
            if (typeof pattern === 'string' && message.data === pattern) {
              this.onMessageCallbacks[i].fn.call(this, message);
            }
            else if (pattern instanceof RegExp && pattern.exec(message.data)) {
              this.onMessageCallbacks[i].fn.call(this, message);
            }
          }
          else {
            this.onMessageCallbacks[i].fn.call(this, message);
          }

        }
      };

      NGWebSocket.prototype.onOpen = function (cb) {
        this.onOpenCallbacks.push(cb);
      };

      NGWebSocket.prototype._onOpenHandler = function () {
        this.notifyOpenCallbacks();
        this.fireQueue();
      };

      NGWebSocket.prototype._onCloseHandler = function (event) {
        if (this._reconnectableStatusCodes.indexOf(event.statusCode) > -1) {
          this.reconnect();
        }
      };

      NGWebSocket.prototype.send = function (data) {
        this.sendQueue.push(data);
        this.fireQueue();
      };

      NGWebSocket.prototype.__defineGetter__('readyState', function () {
        return this._internalConnectionState || this.socket.readyState;
      });

      NGWebSocket.prototype.__defineSetter__('readyState', function (input) {
        throw new Error('The readyState property is read-only');
      });

      return function (url) {
        return new NGWebSocket(url);
      };
    }]);
