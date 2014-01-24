angular.module('ngSocket', []).
  factory('ngWebSocket', ['$rootScope', '$window', '$q',
    function ($rootScope, $window, $q) {
      var NGWebSocket = function (url) {
        var match = /ws?:\/\//.exec(url);

        if (!match) {
          throw new Error('Invalid url provided');
        }

        this.deferred = $q.defer();
        this.promise = this.deferred.promise;
        this.socket = new $window.WebSocket(url);
        this.sendQueue = [];
        this.onMessageCallbacks = [];

        this.socket.onopen = function () {
          this.onOpened.apply(this, arguments);
        }.bind(this);

        this.socket.onmessage = function () {
          this._onmessage.apply(this, arguments);
        }.bind(this);
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

      NGWebSocket.prototype._onmessage = function (message) {
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

      NGWebSocket.prototype.onOpened = function () {
        $rootScope.$apply(function () {
          this.deferred.resolve();
          this.fireQueue.call(this);
        }.bind(this));
      };

      NGWebSocket.prototype.send = function (data) {
        this.sendQueue.push(data);
        this.fireQueue();
      };

      return function (url) {
        return new NGWebSocket(url);
      };
    }]);
