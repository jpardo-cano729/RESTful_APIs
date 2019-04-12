/*
    Author: Jonathan Pardo-Cano
    Date: 2.19.19
    FileName: main.js
*/

(function () { 
	var selectedTweetId
    var cache = {};
    function startUp() {
		  console.log("reached");
        // loops through all of the friends and add a click event to each of them
         for (var i = 0; i < retweet.length; i++) {
			 tweets[i].addEventListener('click', function () {
				selectedTweetId = this.getAttribute('tid');
				console.log("selectedTweetId: " + selectedTweetId);
				retweet(selectedTweetId)
			});
 }
    
    
    
	
    
    // loads startup when the core page is loaded 
    document.addEventListener("DOMContentLoaded", startUp, false);
})();

