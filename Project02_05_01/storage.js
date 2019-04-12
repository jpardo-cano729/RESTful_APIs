/*
    Author: Jonathan Pardo
    Date: 2.11.19
    FileName: storage.js
*/

// MongoCliet is a class which we will build object from
var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
// the connecting we will use to connec to the database
var url = 'mongodb://localhost:27017';
// database we will be using to store data
var dbName = 'twitter_notes';
var database;

// exports the module out to the file that is requiring it in
module.exports = {
    // connects to the apporopiate MongoDB database
    connect: function() {
        MongoClient.connect(url, function(err, client) {
            if(err) {
               return console.log("Error: ", err); 
            }
            database = client.db(dbName);
            console.log('Connected to database: ' + dbName);
        });
    },
    // verifies if the db connected
    connected: function() {
        return typeof database != 'undefined';
    },
    // inserts in the collection of friends from the database 
    insertFriends: function(friends) {
        database.collection('friends').insert(friends, function (err) {
            if (err) {
                console.log("Cannot insert friends into database");
            }
        });
    },
    getfriends: function(userId, callback) {
        var cursor = database.collection('friends').find({
            for_user: userId
        });
        cursor.toArray(callback);
    },
    deleteFriends: function() {
        database.collection('friends').remove(({}), function(err) {
            if(err) {
                console.log("Cannot remove friends from database.");
            }
        });
    },
    // function retreives the notes from the database and sorts them out accordingly to their friend counterpart
    getNotes: function (ownerid, friendid, callback) {
        var cursor = database.collection('notes').find({
            owner_id: ownerid,
            friend_id: friendid
        });
        cursor.toArray(function (err, notes) {
            if (err) {
                return callback(err);
            }
            callback(null, notes.map(function (note) {
                return {
                    _id: note._id,
                    content: note.content
                }
            }))
        })
    },
    // once the note is written out the function will log it to the database
    insertNote: function(ownerid, friendid, content, callback) {
        database.collection('notes').insert({
            owner_id: ownerid,
            friend_id: friendid,
            content: content
        }, function(err, result) {
            if (err) {
                return callback(err, result);
            }
            callback(null, {
               _id: result.ops[0]._id,
               content: result.ops[0].content
            });
        });
    }, 
    // function grabds the database to update the note so it will log it in correctly 
    updateNote: function(noteId, ownerId, content, callback) {
        database.collection('notes').updateOne({
            _id: new ObjectID(noteId),
            owner_id: ownerId
        }, {
            $set: { content: content}
        },
        function(err, result) {
            if (err) {
                return callback(err);
            }
            database.collection('notes').findOne({
                _id: new ObjectID(noteId)
            },
            callback);
        });
    },
    // function grabs the database to locate the note to delete it accordingly
    deleteNote: function(noteId, ownerId, callback) {
        database.collection('notes').deleteOne({
            _id: new ObjectID(noteId),
            owner_id: ownerId
        }, callback);
    },
    insertTweets: function(tweets, name){
        database.collection('tweets').insert({
            name: name,
            tweets:tweets
        }, function (err) {
            if (err) {
                console.log("Cannot insert Tweets into database");
            }
        });
    },
    storeRetweets: function(tweetId, createdDate, retweeted) {
        database.collection('retweets').insert({
            tweet_id: tweetId,
            created_date: createdDate,
            retweeted: retweeted
            , function(err){
                if(err) {
                    console.log("Unable to store retweet data");
                }
            }
        })
    },
    checkRetweet: function(tweetId) {
        tweet = database.collection('retweets').find({
            tweet_id: tweetId
        })
        console.log(tweet);
    }
//    checkId: function(userId, tweets ,callback) {
//        var cursor = database.collection('tweets').findOne({
//        });
//        callback(cursor);
//    }
}