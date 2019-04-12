/*
    Author: Jonathan Pardo-Cano
    Date: 1.25.19
    FileName: authenticator.js
*/

var OAuth = require('oauth').OAuth;  // importing the authentication module
var config = require('./config.json'); // Loads in standard configurations such as port and tokens 

// adding in new properties to the OAuth object in order according to documentation to gain access
var oauth = new OAuth(
    config.request_token_url,
    config.access_token_url,
    config.consumer_key,
    config.consumer_secret,
    config.oauth_version,
    config.oauth_callback,
    config.oauth_signature
);

var twitterCredentials = {
    oauth_token: "",
    oauth_token_secret: "",
    access_token: "",
    access_token_secret: "",
    twitter_id: ""
    
};

// an object to export the function that can be called by the index.js
module.exports = {
    getCredentials: function() {
        return twitterCredentials;
    },
    clearCredentials: function () {
    twitterCredentials.oauth_token = "";
    twitterCredentials.oauth_token_secret = "";
    twitterCredentials.access_token = "";
    twitterCredentials.access_token_secret = "";
    twitterCredentials.twitter_id = "";
    },
    get: function(url,access_token, access_token_secret,callback) {
        oauth.get.call(oauth, url, access_token, access_token_secret, callback);
    },
    post: function(url,access_token, access_token_secret, body, callback) {
        oauth.post.call(oauth, url,access_token, access_token_secret, body, callback);
    },
    redirecToTwitterLoginPage: function(req, res){
        oauth.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results){ //uses the credentials from the oauth object we constructed
           if (error) {
                console.log(error);    
                res.send("Authentication failed!");
           } 
           else {
               twitterCredentials.oauth_token = oauth_token;
               twitterCredentials.oauth_token_secret = oauth_token_secret;
                res.redirect(config.authorize_url + '?oauth_token=' + oauth_token); // redirects to the authorize url which allows us to allow the connection to twitter
           }
        });
    },
    authenticator: function(req, res, callback) {
        if (!(twitterCredentials.oauth_token && twitterCredentials.oauth_token_secret && req.query.oauth_verifier)) {
            return callback("Request does not have all required keys");
        }
        // runs to get the access token using credentials if there is an error it returns it through the callback
        oauth.getOAuthAccessToken(twitterCredentials.oauth_token, twitterCredentials.oauth_token_secret, req.query.oauth_verifier, function(error, oauth_access_token, oauth_access_token_secret, results){
            if (error){
                return callback(error);
            }
            // using the OAuth tokens it goes to twitter to test the credentials if successful it pulls account data parsing it into readable JSON 
           oauth.get('https://api.twitter.com/1.1/account/verify_credentials.json', oauth_access_token, oauth_access_token_secret, function(error, data) {
                    if (error) {
                        console.log(error);
                        return callback(error);
                    } 
                    data = JSON.parse(data);
                    twitterCredentials.access_token =  oauth_access_token;
                    twitterCredentials.access_token_secret =  oauth_access_token_secret;
                    twitterCredentials.twitter_id = data.id_str;
//                    console.log(twitterCredentials);
                    callback();
             }); 
        });
    }
}