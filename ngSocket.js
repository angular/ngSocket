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

        this.socket.onopen = function () {
          this.onOpened.apply(this, arguments);
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
