angular.module('ionic-wordpress.filters', [])
    .filter('rawHtml', ['$sce', function ($sce) {
        return function (val) {
            return $sce.trustAsHtml(val);
        };
    }])
;
