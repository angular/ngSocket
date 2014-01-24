angular.module('dpdCollection', []).
  service('dpdCollectionStore', function () {
    this.collectionCache = {};

    this.get = function (path) {
      path = this.sanitizePath(path);
      return this.collectionCache[path];
    };

    this.set = function (path, collection) {
      if (!angular.isArray(collection)) {
        throw new Error('collection must be an array');
      }

      path = this.sanitizePath(path);
      this.collectionCache[path] = collection;
    };

    this.sanitizePath = function (path) {
      return path.indexOf('/') === 0 ? path.slice(1) : path;
    };
  }).
  controller('CollectionComponentCtrl',
      ['$scope', '$http', 'dpdCollectionStore', function ($scope, $http, dpdCollectionStore) {
        this.onGetCollection = function (coll) {
          dpdCollectionStore.set($scope.collectionPath, coll);
          $scope.collection = dpdCollectionStore.get(
              $scope.collectionPath);
        };

        this.onGetCollectionError = function (coll, err) {
          $scope.fetchError = 'Could not fetch collection';
        };

        this.query = function () {
          if ($scope.collectionPath) {
            var params = $scope.collectionQuery?
              '?' + encodeURI(JSON.stringify($scope.collectionQuery)) :
              '';
            $http({
              method: 'GET',
              url: $scope.collectionPath + params
            }).
            success(this.onGetCollection).
            error(this.onGetCollectionError);
          }
        };

        this.getReadable = function (prop) {
          if (prop.path) {
            return {path: prop.path}
          }
          else {
            return prop;
          }
        }
  }]).
  filter('readable', ['$filter', function ($filter) {
    return function (arr, exp) {

      if (arr && exp && exp.path) {
        if (typeof arr !== 'object') {
          try {
            var parsed = JSON.parse(arr);
            return parsed[exp.path]
          }
          catch (e) {
            //continuing
          }
        }
        else {
          return arr[exp.path];
        }
      }

      switch ((exp && exp.type) || exp) {
        case 'datetime':
          return $filter('date')(arr, 'yyyy-MM-dd h:mm a');
          break;
        case undefined:
          if (angular.isObject(arr)) {
            return '...';
          }
          else {
            return arr;
          }
          break;
        default:
          return arr;
      }
    };
  }]).
  directive('dpdCollection', ['$parse', function ($parse) {
    return {
      restrict: 'E',
      templateUrl: 'collection-component.html',
      controller: 'CollectionComponentCtrl',
      controllerAs: 'collectionCtrl',
      link: function (scope, element, attrs, ctrl) {
        scope.properties = $parse(attrs.collectionProperties)(scope);
        scope.collectionPath = $parse(attrs.collectionPath)(scope);
        scope.collectionQuery = $parse(attrs.collectionQuery)(scope);

        ctrl.query();
      }
    };
  }]);
