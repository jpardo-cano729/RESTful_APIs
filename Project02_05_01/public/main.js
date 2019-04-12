/*
    Author: Jonathan Pardo-Cano
    Date: 2.19.19
    FileName: main.js
*/

(function () { 
    var selectedUserId;
	var selectedTweetId;
    var cache = {};
    
    function startup() {
         var friends = document.getElementsByClassName('friend');
        // loops through all of the friends and add a click event to each of them
         for (var i = 0; i < friends.length; i++) {
			 friends[i].addEventListener('click', function () {
				selectedUserId = this.getAttribute('uid');
				console.log("selectedUserId: " + selectedUserId);
//				getTweet(selectedUserId)
			});
             friends[i].addEventListener('click', function () {
                 for (var j = 0; j < friends.length; j++) {
                     // resets the class name from the active selected user
                     friends[j].className = 'friend';
                 }
                 this.className += ' active';
                 selectedUserId = this.getAttribute('uid');
                 var notes = getNotes(selectedUserId, function(notes) {
                     var docFragment = document.createDocumentFragment();
                     var notesElements = createNoteElements(notes);
                     notesElements.forEach(function(element) {
                        docFragment.appendChild(element); 
                     });
                     var newNoteButton = createAddNoteButton();
                     docFragment.appendChild(newNoteButton);
                     document.getElementById('notes').innerHTML = "";
                     document.getElementById('notes').appendChild(docFragment);
                     console.log(notes);
                 });
                 console.log("Twitter ID: ", selectedUserId);
             });
         }
 }
	// function is meant to check all the tweets on load with a database to set up for a style change
//    function checkRetweets() {
//        var retweet = document.getElementsByClassName('retweet');
//        for (var i = 0; i < retweet.length; k++) {
//			 retweet[i].addEventListener('load', function () {
//				selectedTweetId = retweet[i].getAttribute('tid');
//				storage.checkRetweet(selectedTweetId);
//			});
//    }
    
    function createNoteElements(notes) {
        return notes.map(function(note) {
            var element = document.createElement('li');
            element.className = "note";
            element.setAttribute('contenteditable', true);
            element.textContent = note.content;
            element.addEventListener('blur', function() {
               note.content = this.textContent; 
                console.log('blur event');
                if (note.content == "") {
                    if (note._id) {
                       deleteNote(selectedUserId, note, function() {
                          document.getElementById('notes').removeChild(element); 
                       });
                    }
                    else {
                        document.getElementById('notes').removeChild(element);
                    }
                }
                else if (!note._id) {
                    postNewNote(selectedUserId, {content:this.textContent}, function(newNote) {
                        note._id = newNote._id;
                    });
                }
                else {
                    putNote(selectedUserId, note, function() {
                        
                    });
                }
            });
            element.addEventListener('keydown', function(e) {
                if (e.keyCode == 13) {
                    e.preventDefault();
                    if (element.nextSibling.className == 'add-note') {
                        element.nextSibling.click();
                    }
                    else {
                        element.nextSibling.focus();
                    }
                }
            });
            return element;
        });  
    }
    
    // when a new note is added the next button is also added to add another note
    function createAddNoteButton() {
        var element = document.createElement('li');
        element.className = 'add-note';
        element.textContent = "Add a new note ...";
        element.addEventListener('click', function() {
           var noteElement = createNoteElements([{}])[0];
            document.getElementById('notes').insertBefore(noteElement, this);
            noteElement.focus();
        });
        return element;
    }
    
    
    
    // gets the notes that are associated to the friend through the database
    function getNotes(userId, callback) {
        if (cache[userId]) {
            return callback(cache[userId]);
        }
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
            if (xhttp.readyState == 4 && xhttp.status == 200) {
                var notes = JSON.parse(xhttp.responseText || []);
                cache[userId] = notes;
                callback(notes);
            }
        }
        xhttp.open('GET', "/friends/" + encodeURIComponent(userId) + "/notes", true);
        xhttp.send();
    }
    
    //posts the note into the respective friend column through http 
    function postNewNote(userId, note, callback) {
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
           if (xhttp.readyState == 4  && xhttp.status == 200) {
                var serverNote = JSON.parse(xhttp.responseText || {});   
               cache[userId].push(serverNote);
               callback(serverNote);
            }
        }
        xhttp.open('POST', "/friends/" + encodeURIComponent(userId) + "/notes", true);
        xhttp.setRequestHeader("Content-Type", 'application/json;charset=UTF-8');
        xhttp.send(JSON.stringify(note));
    }
    
    // function will update the databse with the new content within a note 
    function putNote(userId, note, callback) {
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
            if (xhttp.readyState == 4 && xhttp.status == 200) {
                var serverNote = JSON.parse(xhttp.responseText || {});
                callback(serverNote);
            }
        }
        xhttp.open('PUT', "/friends/" + encodeURIComponent(userId) + "/notes/" + encodeURIComponent(note._id), true);
        xhttp.setRequestHeader("Content-Type", 'application/json;charset=UTF-8');
        xhttp.send(JSON.stringify(note));
    }
    // function will update the cache according to which note no longer has content within it and the database
    function deleteNote(userId, note, callback) {
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
            if (xhttp.readyState == 4 && xhttp.status == 200) {
                cache[userId] = cache[userId].filter(function(localNote) {
                    return localNote._id != note._id;
                });
                callback();
            }
        }
        xhttp.open('DELETE', "/friends/" + encodeURIComponent(userId) + "/notes/" + encodeURIComponent(note._id), true);
        xhttp.send();
    }
    
    // loads startup when the core page is loaded 
    document.addEventListener("DOMContentLoaded", startup, false);
})();

