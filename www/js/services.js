angular.module('ionic-wordpress.services', [])

    // WP POSTS RELATED FUNCTIONS
    .service('PostService', function ($rootScope, $http, $q, WORDPRESS_API_URL, AuthService) {

        this.getRecentPosts = function (page) {
            var deferred = $q.defer();

            $http.jsonp(WORDPRESS_API_URL +
                'get_recent_posts/' +
                '?page=' + page +
                '&insecure=cool' +
                '&callback=JSON_CALLBACK')
                .success(function (data) {
                    deferred.resolve(data);
                })
                .error(function (data) {
                    deferred.reject(data);
                });

            return deferred.promise;
        };

        this.getUserGravatar = function (userId) {
            var deferred = $q.defer();

            $http.jsonp(WORDPRESS_API_URL + 'user/get_avatar/' +
                '?user_id=' + userId +
                '&type=full' +
                '&insecure=cool' +
                '&callback=JSON_CALLBACK')
                .success(function (data) {
                    var avatar = '';
                    if(data.status == 'ok') {
                        var avatar_aux = data.avatar.replace("http:", "");
                        avatar = 'http:' + avatar_aux;
                    }

                    deferred.resolve(avatar);
                })
                .error(function (data) {
                    deferred.reject(data);
                });

            return deferred.promise;
        };

        this.getPost = function (postId) {
            var deferred = $q.defer();

            $http.jsonp(WORDPRESS_API_URL + 'get_post/' +
                '?post_id=' + postId +
                '&insecure=cool' +
                '&callback=JSON_CALLBACK')
                .success(function (data) {
                    deferred.resolve(data);
                })
                .error(function (data) {
                    deferred.reject(data);
                });

            return deferred.promise;
        };

        this.submitComment = function (postId, content) {
            var deferred = $q.defer(),
                user = AuthService.getUser();

            $http.jsonp(WORDPRESS_API_URL + 'user/post_comment/' +
                '?post_id=' + postId +
                '&cookie=' + user.cookie +
                '&comment_status=1' +
                '&content=' + content +
                '&insecure=cool' +
                '&callback=JSON_CALLBACK')
                .success(function (data) {
                    deferred.resolve(data);
                })
                .error(function (data) {
                    deferred.reject(data);
                });

            return deferred.promise;
        };

        this.shortenPosts = function (posts) {
            //we will shorten the post
            //define the max length (characters) of your post content
            var maxLength = 600;
            return _.map(posts, function (post) {
                if (post.content.length > maxLength) {
                    //trim the string to the maximum length
                    var trimmedString = post.content.substr(0, maxLength);
                    //re-trim if we are in the middle of a word
                    trimmedString = trimmedString.substr(0, Math.min(trimmedString.length, trimmedString.lastIndexOf("</p>")));
                    post.content = trimmedString;
                }
                return post;
            });
        };
    })

    // WP AUTHENTICATION RELATED FUNCTIONS
    .service('AuthService', function ($rootScope, $http, $q, WORDPRESS_API_URL) {

        this.validateAuth = function (user) {
            var deferred = $q.defer();
            $http.jsonp(WORDPRESS_API_URL +
                'user/validate_auth_cookie/' +
                '?cookie=' + user.cookie +
                '&insecure=cool' +
                '&callback=JSON_CALLBACK')
                .success(function (data) {
                    deferred.resolve(data);
                })
                .error(function (data) {
                    deferred.reject(data);
                });

            return deferred.promise;
        };

        this.doLogin = function (user) {
            var deferred = $q.defer(),
                nonce_dfd = $q.defer(),
                authService = this;

            authService.requestNonce("user", "generate_auth_cookie")
                .then(function (nonce) {
                    nonce_dfd.resolve(nonce);
                });

            nonce_dfd.promise.then(function (nonce) {
                //now that we have the nonce, ask for the new cookie
                authService.generateAuthCookie(user.username, user.password, nonce)
                    .then(function (data) {
                        if (data.status == "error") {
                            // return error message
                            deferred.reject(data.error);
                        } else {
                            //recieve and store the user's cookie in the local storage
                            var user = {
                                cookie: data.cookie,
                                data: data.user,
                                user_id: data.user.id
                            };

                            authService.saveUser(user);

                            //getavatar in full size
                            authService.updateUserAvatar().then(function () {
                                deferred.resolve(user);
                            });
                        }
                    });
            });
            return deferred.promise;
        };

        this.doRegister = function (user) {
            var deferred = $q.defer(),
                nonce_dfd = $q.defer(),
                authService = this;

            authService.requestNonce("user", "register")
                .then(function (nonce) {
                    nonce_dfd.resolve(nonce);
                });

            nonce_dfd.promise.then(function (nonce) {
                authService.registerUser(user.username, user.email,
                    user.displayName, user.password, nonce)
                    .then(function (data) {
                        if (data.status == "error") {
                            // return error message
                            deferred.reject(data.error);
                        } else {
                            // in order to get all user data we need to call this function
                            // because the register does not provide user data
                            authService.doLogin(user).then(function () {
                                deferred.resolve(user);
                            });
                        }
                    });
            });

            return deferred.promise;
        };

        this.requestNonce = function (controller, method) {
            var deferred = $q.defer();

            $http.jsonp(WORDPRESS_API_URL + 'get_nonce/' +
                '?controller=' + controller +
                '&method=' + method +
                '&insecure=cool' +
                '&callback=JSON_CALLBACK')
                .success(function (data) {
                    deferred.resolve(data.nonce);
                })
                .error(function (data, err) {
                    if (data && data.nonce) {
                        deferred.reject(data.nonce);
                    } else {
                        deferred.reject(err);
                    }

                });
            return deferred.promise;
        };

        this.doForgotPassword = function (username) {
            var deferred = $q.defer();
            $http.jsonp(WORDPRESS_API_URL + 'user/retrieve_password/' +
                '?user_login=' + username +
                '&insecure=cool' +
                '&callback=JSON_CALLBACK')
                .success(function (data) {
                    deferred.resolve(data);
                })
                .error(function (data) {
                    deferred.reject(data);
                });
            return deferred.promise;
        };

        this.generateAuthCookie = function (username, password, nonce) {
            var deferred = $q.defer();
            $http.jsonp(WORDPRESS_API_URL + 'user/generate_auth_cookie/' +
                '?username=' + username +
                '&password=' + password +
                '&insecure=cool' +
                '&nonce=' + nonce +
                '&callback=JSON_CALLBACK')
                .success(function (data) {
                    deferred.resolve(data);
                })
                .error(function (data) {
                    deferred.reject(data);
                });
            return deferred.promise;
        };

        this.saveUser = function (user) {
            window.localStorage.ionWordpress_user = JSON.stringify(user);
        };

        this.getUser = function () {

            var data = (window.localStorage.ionWordpress_user) ? JSON.parse(window.localStorage.ionWordpress_user).data : null,
                cookie = (window.localStorage.ionWordpress_user) ? JSON.parse(window.localStorage.ionWordpress_user).cookie : null;

            return {
                avatar: JSON.parse(window.localStorage.ionWordpress_user_avatar || null),
                data: data,
                cookie: cookie
            };
        };

        this.registerUser = function (username, email, displayName, password, nonce) {
            var deferred = $q.defer();
            $http.jsonp(WORDPRESS_API_URL + 'user/register/' +
                '?username=' + username +
                '&email=' + email +
                '&display_name=' + displayName +
                '&user_pass=' + password +
                '&nonce=' + nonce +
                '&insecure=cool' +
                '&callback=JSON_CALLBACK')
                .success(function (data) {
                    deferred.resolve(data);
                })
                .error(function (data) {
                    deferred.reject(data);
                });
            return deferred.promise;
        };

        this.userIsLoggedIn = function () {
            var deferred = $q.defer();

            var user = JSON.parse(window.localStorage.ionWordpress_user || null);
            if (user !== null && user.cookie !== null) {
                this.validateAuth(user).then(function (data) {
                    deferred.resolve(data.valid);
                });
            }
            else {
                deferred.resolve(false);
            }
            return deferred.promise;
        };

        this.logOut = function () {
            //empty user data

            window.localStorage.ionWordpress_user = null;
            window.localStorage.ionWordpress_user_avatar = null;
            // window.localStorage.ionWordpress_bookmarks = null;
        };

        //update user avatar from WP
        this.updateUserAvatar = function () {
            var avatar_dfd = $q.defer(),
                authService = this,
                user = JSON.parse(window.localStorage.ionWordpress_user || null);

            $http.jsonp(WORDPRESS_API_URL + 'user/get_avatar/' +
                '?user_id=' + user.user_id +
                '&insecure=cool' +
                '&type=full' +
                '&callback=JSON_CALLBACK')
                .success(function (data) {

                    var avatar_aux = data.avatar.replace("http:", "");
                    var avatar = 'http:' + avatar_aux;

                    window.localStorage.ionWordpress_user_avatar = JSON.stringify(avatar);

                    avatar_dfd.resolve(avatar);
                })
                .error(function (err) {
                    avatar_dfd.reject(err);
                });

            return avatar_dfd.promise;
        };
    })
;
