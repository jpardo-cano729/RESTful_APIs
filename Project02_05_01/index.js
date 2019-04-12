/*
    Author: Jonathan Pardo-Cano
    Date: 1.17.19
    FileName: index.js
*/

// loading in all of the resources and dependencies into our code
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var authenticator = require('./authenticator.js');
var config = require('./config.json'); // Loads in standard configurations such as port and tokens 
var url = require('url');
var querystring = require('querystring');
var async = require('async');
var storage = require('./storage.js');
storage.connect();

app.use(require('cookie-parser')()); // loads in the cookie-parser which returns a function which then becomes a function all 

app.use(bodyParser.json());

app.set('view engine', 'ejs');

setInterval(function() {
    if (storage.connected()) {
        console.log('Clearing MongoDB cache.');
        storage.deleteFriends();
    }
},1000 * 60 * 5);

app.use(express.static(__dirname + '/public'));

//app.get('/', function(req, res) {
//    res.send("<h3>Hello, World!</h3>");  // the response being sent back through the object
//});

app.get('/auth/twitter', authenticator.redirecToTwitterLoginPage); // function will be called from the authenticator.js

app.get(url.parse(config.oauth_callback).path, function(req, res) {
    authenticator.authenticator(req,res, function(err) {
        if (err) {
            res.redirect('/login');
        }
        else {
            res.redirect('/');
        }
    });
});

app.get('/tweet',function(req,res){
   var credentials = authenticator.getCredentials(); // calling the credentials passed on and testing that they have actual credentials
    if (!credentials.access_token || !credentials.access_token_secret) {
        res.sendStatus(401);
    }
    var url = 'https://api.twitter.com/1.1/statuses/update.json'; // calling the post method to post a tweet according to parameters
    authenticator.post(url,credentials.access_token, credentials.access_token_secret, 
        {
            status: "This is a tweet from Node.js"
        }, function(error, data){
        if (error){
            return res.status(400).send(error);
        }
        res.send("Tweet successful");
    });
});

app.get('/search', function(req,res) {
    var credentials = authenticator.getCredentials();
    if (!credentials.access_token || !credentials.access_token_secret) { // traps user from using this route from search without access tokens
        return res.sendStatus(401);
    }
    var url = 'https://api.twitter.com/1.1/search/tweets.json';
    var query = querystring.stringify({ q: "Bill Nye"});
    url += '?' + query;
    authenticator.get(url,credentials.access_token, credentials.access_token_secret, 
        function (error, data){
            if (error) {
                return res.status(418).send(error)
            }
        res.send(data);
    });
});

app.get('/friends', function (req,res){
    var credentials = authenticator.getCredentials();
    if (!credentials.access_token || !credentials.access_token_secret) { // traps user from using this route from search without access tokens
        return res.sendStatus(401);
    }
    var url = 'https://api.twitter.com/1.1/friends/list.json';
    if (req.query.cursor){
        url += '?' + querystring.stringify({
            cursor:req.query.cursor
        });
    }
    authenticator.get(url,credentials.access_token, credentials.access_token_secret, 
        function (error, data){
            if (error) {
                return res.status(418).send(error)
            }
        res.send(data);
    });
});

// root directory will redirect user to the login page if not crdentials are provided and then user is to authorize twitter
app.get('/', function (req, res) {
    var credentials = authenticator.getCredentials();
    if (!credentials.access_token || !credentials.access_token_secret){
        return res.redirect('/login');
    }
    console.log(credentials.twitter_id);
    if (!storage.connected()) {
        console.log("Loading friends from twitter");
        renderMainPageFromTwitter(req, res); 
    }
    console.log('Loading data from MongoDB');
    storage.getfriends(credentials.twitter_id, function(err, friends) {
        if(err) {
            return res.status(500).send(err);
        }
        if(friends.length > 0) {
            console.log("Friends successfully loaded from MongoDB")
            friends.sort(function(a, b) {
                return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
            });
            res.render('index', { friends: friends});
        }
        else {
            console.log('Loading friends from twitter');
            renderMainPageFromTwitter(req,res);
        }
    })
});
    

function renderMainPageFromTwitter(req, res) {
    var credentials = authenticator.getCredentials();
    async.waterfall([
        // get friends ids
       function(callback) {
           // -1 is where the cursor starts
           var cursor = -1;
           var ids = [];
//           console.log("ids.length: " + ids.length);
           async.whilst(function() {
                return cursor != 0;
           }, function(callback) {
                var url = 'https://api.twitter.com/1.1/friends/ids.json';
               url += '?' + querystring.stringify({ user_id: credentials.twitter_id, cursor: cursor });
               authenticator.get(url, credentials.access_token, credentials.access_token_secret, function(error, data) {
                   if (error) {
                       return res.sendStatus(401).send(error);
                   }
                   // gets the data returned and parses it to readable JSON
                   data = JSON.parse(data);
                   cursor = data.next_cursor_str;
                   ids = ids.concat(data.ids);
//                   console.log("ids.length: " + ids.length);
                   callback();
               });
               
           },
           function (error) {
//               console.log("last callback");
               if (error) {
                   return res.status(500).send(error);
               }
//               console.log(ids);
               callback(null, ids);
           });
       },
        // lookup friends data
        function(ids, callback) {
           // return statement to go through the friends id data call 
            var getHundredIds = function(i) {
                return ids.slice(100*i, Math.min(ids.length, 100*(i+1)));
            }
            var requestsNeeded = Math.ceil(ids.length/100);
            // the amount of times the requests by the hundreds need to be 
            async.times(requestsNeeded, function(n, next) {
                var url = "https://api.twitter.com/1.1/users/lookup.json";
                url += "?" + querystring.stringify({ user_id: getHundredIds(n).join(',')});
                authenticator.get(url, credentials.access_token, credentials.access_token_secret,
                function(error, data) {
                    if (error) {
                        return res.status(400).send(error);
                    }
                    var friends = JSON.parse(data);
//                    console.log("n: " , n , friends);
                    next(null, friends);
                }); 

            },
                function(error, friends) {
                // reduce will take multi dimensional array and makes them one dimensional array
                friends = friends.reduce(function(previousValue, currentValue, currentIndex, array) {
                    return previousValue.concat(currentValue);
                }, []);
                friends.sort(function(a, b) {
                    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
                });
                friends = friends.map(function(friend) {
                    return { 
                        twitter_id: friend.id_str,
                        for_user: credentials.twitter_id,
                        name: friend.name,
                        screen_name: friend.screen_name,
                        location: friend.location,
                        profile_image_url: friend.profile_image_url
                    }
                });
                res.render('index', { friends: friends });
                 if (storage.connected()) {
                    storage.insertFriends(friends);
                }
//                console.log('friends.length: ',friends.length);
            });
        }
    ]);
//    res.sendStatus(200);
}

// appi will get the last 25 tweets of the selected user and sorts out the retreived tweets and in the view pages 
app.get('/friends/:uid/tweets/:count', function (req, res) {
    var url = 'https://api.twitter.com/1.1/statuses/user_timeline.json'
    var credentials = authenticator.getCredentials();
    url += "?" + querystring.stringify({user_id:req.params.uid, count: req.params.count, exclude_replies: true, include_rts: false,tweet_mode: "extended"});
    authenticator.get(url, credentials.access_token, credentials.access_token_secret,
    function(error, data) {
        if (error) {
            return res.status(400).send(error);
        }
        var tweets = JSON.parse(data);
        tweets = tweets.map(function(tweets) {
                    return { 
                        id: tweets.id_str,
                        created_at: tweets.created_at,
                        for_user: credentials.twitter_id,
                        name: tweets.user.name,
                        screen_name: tweets.user.screen_name,
                        location: tweets.user.location,
                        profile_image_url: tweets.user.profile_image_url,
                        text: tweets.full_text,
						truncated: false
                    }
                }); 
            res.render('tweets', {tweets: tweets}); 
    });
});

app.post('/tweets/retweet/:tid', function(req, res) {
    var credentials = authenticator.getCredentials();
    var url = 'https://api.twitter.com/1.1/statuses/retweet/';
    url += req.params.tid + '.json';
    authenticator.post(url, credentials.access_token, credentials.access_token_secret, {},
    function(error, data) {
        if (error) {
            return res.status(400).send(error);
        }
        // retweet data is stored in a array to use the .map method to sort the data for checking if the tweet has been retweeted already
        var retweet = [JSON.parse(data)];
        retweet = retweet.map(function(retweet) {
            return { 
                id: retweet.id_str,
                created_at: retweet.created_at,
                retweeted: retweet.retweeted
            }
        });
        console.log(retweet);
//        stores the tweet id to prep the tweet to have a style change for when the page refreshes
        if(storage.connected()) {
            storage.storeRetweets(retweet[0].id, retweet[0].created_at, retweet[0].retweeted);
        }    
        res.redirect('back');
    });
})

app.get('/login', function (req, res) {
    if(storage.connected()) {
        console.log('Deleting friends collection on logout.');
        storage.deleteFriends();
    }
    // with render it is using the view engine and the view engine we provided is the ejs 
    res.render('login');
});

app.get('/logout', function (req, res) {
    authenticator.clearCredentials();
    if(storage.connected()) {
        console.log('Deleting friends collection on logout.');
        storage.deleteFriends();
    }
    res.redirect('login');
});

function ensuredLoggedIn(req, res, next) {
    var credentials = authenticator.getCredentials();
    if (!credentials.access_token || !credentials.access_token_secret || !credentials.twitter_id) {
        return res.sendStatus(401);
    }
    res.cookie('twitter_id', credentials.twitter_id, {
        httponly: true
    });
    next();
}

// calls the getNotes function from the storage.js file 
app.get('/friends/:uid/notes', ensuredLoggedIn, function (req, res, next) {
//	console.log("get notes");
    var credentials = authenticator.getCredentials();
    storage.getNotes(credentials.twitter_id, req.params.uid, function (err, notes) {
        if (err) {
            return res.status(500).send(err);
        }
        res.send(notes);
    });
    if (!credentials.access_token || !credentials.access_token_secret || !credentials.twitter_id) {
        return res.sendStatus(401);
    }
    console.log(req.cookies);
//    return res.sendStatus(200);
});

app.post('/friends/:uid/notes', ensuredLoggedIn, function(req, res, next) {
    storage.insertNote(req.cookies.twitter_id, req.params.uid, req.body.content, function(err, note) {
        if (err) {
            return res.status(500).send(err);
        }
        res.send(note);
    });
});

// locator for the note that is receiving an update to it
app.put('/friends/:uid/notes/:noteid', ensuredLoggedIn,function(req, res) {
    console.log('app.put()', req.cookies);
    var noteId = req.params.noteid;
    storage.updateNote(noteId, req.cookies.twitter_id, req.body.content, function(err, note) {
        if (err) {
            return res.status(500).send(err);
        }
        res.send({
            _id: note._id,
            content: note.content
        });
    });
});

// the locator for the note that will be deleted 
app.delete('/friends/:uid/notes/:noteid', ensuredLoggedIn, function(req, res) {
    console.log('app.delete()', req.cookies);
    var noteId = req.params.noteid;
    storage.deleteNote(noteId, req.cookies.twitter_id, function(err, note){
        if (err) {
            return res.status(500).send(err);
        }
        res.sendStatus(200);
    });
});

app.listen(config.port, function() {
   console.log("Server listening on localhost:%s", config.port); 
   console.log("OAuth callback:%s", url.parse(config.oauth_callback).hostname + url.parse(config.oauth_callback).path); 
});