angular.module('ionic-wordpress.controllers', [])
    .controller('AppCtrl', function ($scope, $ionicModal, $ionicLoading, $timeout, AuthService) {

        // With the new view caching in Ionic, Controllers are only called
        // when they are recreated or on app start, instead of every page change.
        // To listen for when this page is active (for example, to refresh data),
        // listen for the $ionicView.enter event:
        //$scope.$on('$ionicView.enter', function(e) {
        //});

        // Form data for the login modal
        $scope.loginData = {};

        // Create the login modal that we will use later
        $ionicModal.fromTemplateUrl('templates/login.html', {
            scope: $scope
        }).then(function (modal) {
            $scope.modal = modal;
        });

        // Triggered in the login modal to close it
        $scope.closeLogin = function () {
            $scope.modal.hide();
        };

        // Open the login modal
        $scope.login = function () {
            $scope.modal.show();
        };

        // Perform the login action when the user submits the login form
        $scope.doLogin = function () {
            $ionicLoading.show({
                template: 'Logging in...'
            });

            var user = {
                username: $scope.loginData.username,
                password: $scope.loginData.password
            };

            AuthService.doLogin(user)
                .then(function() {
                    //success
                    $state.go('app.posts');

                    $ionicLoading.hide();
                    // Simulate a login delay. Remove this and replace with your login
                    // code if using a login system
                    $timeout(function () {
                        $scope.closeLogin();
                    }, 1000);
                }, function (err) {
                    //err
                    $scope.error = err;
                    $ionicLoading.hide();
                });
        };
    })

    // GET RECENT POSTS
    .controller('PostsCtrl', function ($scope, $rootScope, $state, $ionicLoading, PostService) {
        $scope.posts = [];
        $scope.page = 1;
        $scope.totalPages = 1;

        $scope.doRefresh = function () {
            $ionicLoading.show({
                template: 'Loading posts...'
            });

            //Always bring me the latest posts => page=1
            PostService.getRecentPosts(1)
                .then(function (data) {
                    $scope.totalPages = data.pages;
                    $scope.posts = PostService.shortenPosts(data.posts);

                    $ionicLoading.hide();
                    $scope.$broadcast('scroll.refreshComplete');
                });
        };

        $scope.loadMoreData = function () {
            $scope.page += 1;

            PostService.getRecentPosts($scope.page)
                .then(function (data) {
                    //We will update this value in every request because new posts can be created
                    $scope.totalPages = data.pages;
                    var new_posts = PostService.shortenPosts(data.posts);
                    $scope.posts = $scope.posts.concat(new_posts);

                    $scope.$broadcast('scroll.infiniteScrollComplete');
                });
        };

        $scope.moreDataCanBeLoaded = function () {
            return $scope.totalPages > $scope.page;
        };

        $scope.doRefresh();
    })

    .controller('PostCtrl', function ($scope, post_data, $ionicLoading, PostService, AuthService, $ionicScrollDelegate) {
        $scope.post = post_data.post;
        $scope.comments = _.map(post_data.post.comments, function (comment) {
            if (comment.author) {
                PostService.getUserGravatar(comment.author.id)
                    .then(function (avatar) {
                        comment.user_gravatar = avatar;
                    });
                return comment;
            } else {
                return comment;
            }
        });
        $ionicLoading.hide();

        $scope.sharePost = function (link) {
            window.plugins.socialsharing.share('Check this post here: ', null, null, link);
        };

        $scope.addComment = function () {
            AuthService.userIsLoggedIn().then(function (response) {
                if (response === true) {
                    $ionicLoading.show({
                        template: 'Submiting comment...'
                    });

                    PostService.submitComment($scope.post.id, $scope.new_comment)
                        .then(function (data) {
                            if (data.status == "ok") {
                                var user = AuthService.getUser();

                                var comment = {
                                    author: {name: user.data.username},
                                    content: $scope.new_comment,
                                    date: Date.now(),
                                    user_gravatar: user.avatar,
                                    id: data.comment_id
                                };
                                $scope.comments.push(comment);
                                $scope.new_comment = "";
                                $scope.new_comment_id = data.comment_id;
                                $ionicLoading.hide();
                                // Scroll to new post
                                $ionicScrollDelegate.scrollBottom(true);
                            }
                        });
                } else {
                    $scope.login();
                }
            });
        };
    })
;
