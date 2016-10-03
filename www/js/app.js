angular.module('underscore', [])
    .factory('_', function () {
        return window._; // assumes underscore has already been loaded on the page
    })
;

angular.module('ionic-wordpress', [
    'ionic',
    'ionic-wordpress.directives',
    'ionic-wordpress.controllers',
    'ionic-wordpress.services',
    'ionic-wordpress.config',
    'ionic-wordpress.filters',
    'underscore'
])

    .run(function ($ionicPlatform) {
        $ionicPlatform.ready(function () {
            // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
            // for form inputs)
            if (window.cordova && window.cordova.plugins.Keyboard) {
                cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
                cordova.plugins.Keyboard.disableScroll(true);

            }
            if (window.StatusBar) {
                // org.apache.cordova.statusbar required
                StatusBar.styleDefault();
            }
        });
    })

    .config(function ($stateProvider, $urlRouterProvider) {
        $stateProvider

            .state('app', {
                url: '/app',
                abstract: true,
                templateUrl: 'templates/menu.html',
                controller: 'AppCtrl'
            })

            .state('app.posts', {
                url: '/posts',
                views: {
                    'menuContent': {
                        templateUrl: 'templates/posts.html',
                        controller: 'PostsCtrl'
                    }
                }
            })

            .state('app.post', {
                url: "/post/:postId",
                views: {
                    'menuContent': {
                        templateUrl: "templates/post.html",
                        controller: 'PostCtrl'
                    }
                },
                resolve: {
                    post_data: function (PostService, $ionicLoading, $stateParams) {
                        $ionicLoading.show({
                            template: 'Loading post ...'
                        });

                        var postId = $stateParams.postId;
                        return PostService.getPost(postId);
                    }
                }
            })
            ;
        // if none of the above states are matched, use this as the fallback
        $urlRouterProvider.otherwise('/app/posts');
    });
