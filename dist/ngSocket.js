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
        this._connect();
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

      NGWebSocket.prototype.send = function (data) {
        this.sendQueue.push(data);
        this.fireQueue();
      };

      return function (url) {
        return new NGWebSocket(url);
      };
    }]);
