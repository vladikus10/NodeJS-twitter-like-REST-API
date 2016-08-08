
var pg = require('pg');
var restify = require('restify');
var fs = require('fs');



var server = restify.createServer();
server.use(restify.queryParser()); 
server.use(restify.bodyParser());  


server.use(function logger(req,res,next) {
  console.log(new Date(),req.method,req.url);
  next();
});
server.use(restify.CORS());
server.use(restify.fullResponse());

// Find users
server.post('/findUsers', function(req,res,next){
	var seacrhResult = [];
	var SQLquery = " ";
	pg.connect(process.env.HEROKU_POSTGRESQL_BLACK_URL, function(err, client, done){
		if (err) throw err;
  		console.log('Connected to postgres! Getting schemas...');
		client.query("SELECT * FROM users WHERE LOWER(username) LIKE LOWER('%" + req.body.message + "%')", function(err, result){
			if (err) throw err;
			searchResult = result.rows;
			for (index = 0; index < searchResult.length; ++index){
			SQLquery += "SELECT users.username, (SELECT COUNT(tweets.userid) FROM tweets WHERE tweets.userid = '" + searchResult[index].username + "') AS tweetsnum, (SELECT COUNT(followers.followerid) FROM followers WHERE followers.followerid = '" + searchResult[index].username + "') AS followersnum, (SELECT COUNT(followers.userid) FROM followers WHERE followers.userid = '" + searchResult[index].username + "') AS followingNum FROM users WHERE users.username = '" + searchResult[index].username + "' ";
			if(searchResult.length - 1 != index)
				SQLquery += "UNION ALL ";
			};
			client.query(SQLquery, function(err, result){
				if (err) throw err;
				done();
				res.send(result.rows);
				next();
			});
		});
	});
});
// Find tweets
server.post('/findTweets', function(req,res,next){
	pg.connect(process.env.HEROKU_POSTGRESQL_BLACK_URL, function(err, client, done){
		if (err) throw err;
		var message = req.body.message;
		var splitMessage = message.split(' ');
		var words=[];
		var hashTags=[];
		var usernames=[];
		var SQLquery = " ";
		for (index = 0; index < splitMessage.length; ++index){
			if(splitMessage[index].indexOf('#') == 0)
				hashTags.push(splitMessage[index]);
			else if(splitMessage[index].indexOf('@') == 0)
				usernames.push(splitMessage[index].substr(1));
			else
				words.push(splitMessage[index]);
		};
		for (index = 0; index < usernames.length; ++index){
			SQLquery += "LOWER(userid) = LOWER('" + usernames[index] + "') ";
			if(usernames.length - 1 != index)
				SQLquery += "OR ";
		};
		if(usernames.length > 0 && (hashTags.length> 0 || words.length > 0))
			SQLquery += "AND "
		for (index = 0; index < hashTags.length; ++index){
			SQLquery += "LOWER(message) LIKE LOWER('%" + hashTags[index] + "%') ";
			if(hashTags.length - 1 != index)
				SQLquery += "OR ";
		};
		if(hashTags.length> 0 && words.length > 0)
			SQLquery += "AND "
		for (index = 0; index < words.length; ++index){
			SQLquery += "LOWER(message) LIKE LOWER('%" + words[index] + "%') AND LOWER(message) NOT LIKE LOWER('%#" + words[index] + "%') ";
			if(words.length - 1 != index)
				SQLquery += "OR ";
		};
  		console.log('Connected to postgres! Getting schemas...');
		client.query('SELECT * FROM tweets WHERE' + SQLquery, function(err, result){
			done();
			//res.send(SQLquery);
			res.send(result.rows);
			next();
		});
	});
});
// Get list of use followers
server.get('/getFollowers', function(req,res,next){
	pg.connect(process.env.HEROKU_POSTGRESQL_BLACK_URL, function(err, client, done){
		if (err) throw err;
  		console.log('Connected to postgres! Getting schemas...');
		client.query("SELECT followerid FROM followers WHERE userid = '" + req.query.userID + "'", function(err, result){
			done();
			res.send(result.rows);
			next();
		});
	});
});
//Login function, uses body parameters to send data as JSON
server.post('/login', function(req,res,next){
	pg.connect(process.env.HEROKU_POSTGRESQL_BLACK_URL, function(err, client, done){
		if (err) throw err;
  		console.log('Connected to postgres! Getting schemas...');
		client.query("SELECT * FROM users WHERE username = '" + req.body.username + "' AND password = '" + req.body.password +"'", function(err, result){
			done();
			if(result.rows.length == 1)	res.send("1");
			else res.send("0");
			next();
		});
	});
});
// Function for registration
server.post('/register', function(req, res, next){
	pg.connect(process.env.HEROKU_POSTGRESQL_BLACK_URL, function(err, client, done){
		if (err) throw err;
		client.query("INSERT INTO users(username, password) VALUES ('" + req.body.username + "', '" + req.body.password + "')", function(err, result){
			done();		
			if(err == null)
			{
				console.log("New user added with name: " + req.body.username + "and password: " + req.body.password);
				res.send("1");
			}
			else
			{
				console.log(err);
				res.send("0");	
			}
					
			next();
		});
	});
});
//Retrieve tweets of a specific user   /getTweets?userID=someuser
server.get('/getTweets', function(req,res,next){
	pg.connect(process.env.HEROKU_POSTGRESQL_BLACK_URL, function(err, client, done){
		if (err) throw err;
  		console.log('Connected to postgres! Getting schemas...');
		client.query("SELECT DISTINCT tweets.id, tweets.userid, tweets.message, tweets.posttime, tweets.favs FROM tweets, followers, users WHERE tweets.userid = followers.followerid AND followers.userid = '" + req.query.userID + "' OR tweets.userid = '" + req.query.userID + "' ORDER BY tweets.posttime DESC", function(err, result){
			done();
			res.send(result.rows);
			next();
		});
	});
});
//Retrieve users of a specific user   /getUsers?userID=someuser
server.get('/getUsers', function(req,res,next){
	var seacrhResult = [];
	var SQLquery = " ";
	pg.connect(process.env.HEROKU_POSTGRESQL_BLACK_URL, function(err, client, done){
		if (err) throw err;
  		console.log('Connected to postgres! Getting schemas...');
		client.query("SELECT * FROM followers WHERE userid = '" + req.query.userID + "'", function(err, result){
			if (err) throw err;
			searchResult = result.rows;
			for (index = 0; index < searchResult.length; ++index){
			SQLquery += "SELECT users.username, (SELECT COUNT(tweets.userid) FROM tweets WHERE tweets.userid = '" + searchResult[index].followerid + "') AS tweetsnum, (SELECT COUNT(followers.followerid) FROM followers WHERE followers.followerid = '" + searchResult[index].followerid + "') AS followersnum, (SELECT COUNT(followers.userid) FROM followers WHERE followers.userid = '" + searchResult[index].followerid + "') AS followingNum FROM users WHERE users.username = '" + searchResult[index].followerid + "' ";
			if(searchResult.length - 1 != index)
				SQLquery += "UNION ALL ";
			};
			client.query(SQLquery, function(err, result){
				if (err) throw err;
				done();
				res.send(result.rows);
				next();
			});
		});
	});
});
//Retrieve all tweets of a user   /getUserTweet?id=userID
server.get('/getUserTweets', function(req,res,next){
	pg.connect(process.env.HEROKU_POSTGRESQL_BLACK_URL, function(err, client, done){
		if (err) throw err;
  		console.log('Connected to postgres! Getting schemas...');
		client.query("SELECT * FROM tweets WHERE userid = '" + req.query.userID + "'", function(err, result){
			done();
			res.send(result.rows);
			next();
		});
	});
});
//Retrieve single tweet   /getTweet?id=tweetID
server.get('/getTweet', function(req,res,next){
	pg.connect(process.env.HEROKU_POSTGRESQL_BLACK_URL, function(err, client, done){
		if (err) throw err;
  		console.log('Connected to postgres! Getting schemas...');
		client.query("SELECT * FROM tweets WHERE id = " + req.query.id, function(err, result){
			done();
			res.send(result.rows);
			next();
		});
	});
});
//Retrieve replies of a tweet /getReplies?id=tweetID
server.get('/getReplies', function(req,res,next){
	pg.connect(process.env.HEROKU_POSTGRESQL_BLACK_URL, function(err, client, done){
		if (err) throw err;
  		console.log('Connected to postgres! Getting schemas...');
		client.query("SELECT DISTINCT replies.id, replies.tweetid, replies.userid, replies.message, replies.posttime FROM replies, tweets WHERE replies.tweetid = " + req.query.id + " ORDER BY replies.posttime ASC", function(err, result){
			done();
			res.send(result.rows);
			next();
		});
	});
});
//Returns number of total tweets of a user   /getTweetsNum?userID=someuser
server.get('/getTweetsNum', function(req,res,next){
	pg.connect(process.env.HEROKU_POSTGRESQL_BLACK_URL, function(err, client, done){
		if (err) throw err;
  		console.log('Connected to postgres! Getting schemas...');
		client.query("SELECT COUNT(userid) AS tweetsNum FROM tweets WHERE userid = '" + req.query.userID + "'", function(err, result){
			done();
			res.send(result.rows);
			next();
		});
	});
});
//Returns the number of followers    /getFollowersNum?userID=someuser
server.get('/getFollowersNum', function(req,res,next){
	pg.connect(process.env.HEROKU_POSTGRESQL_BLACK_URL, function(err, client, done){
		if (err) throw err;
  		console.log('Connected to postgres! Getting schemas...');
		client.query("SELECT COUNT(followerid) AS followersNum FROM followers WHERE followerid = '" + req.query.userID + "'", function(err, result){
			done();
			res.send(result.rows);
			next();
		});
	});
});
//Get the number of users that a specific user follows   /getFollowingNum?userID=someuser
server.get('/getFollowingNum', function(req,res,next){
	pg.connect(process.env.HEROKU_POSTGRESQL_BLACK_URL, function(err, client, done){
		if (err) throw err;
  		console.log('Connected to postgres! Getting schemas...');
		client.query("SELECT COUNT(userid) AS followersNum FROM followers WHERE userid = '" + req.query.userID + "' RETURNING *", function(err, result){
			done();
			res.send(result.rows);
			next();
		});
	});
});
//Add user to followers         /follow/someuser?as=you
server.post('/follow/:user', function(req,res,next){
	pg.connect(process.env.HEROKU_POSTGRESQL_BLACK_URL, function(err, client, done){
		if (err) throw err;
  		console.log('Connected to postgres! Getting schemas...');
		client.query("INSERT INTO followers(userid, followerid) VALUES ('" + req.query.as + "', '" + req.params.user + "') RETURNING followerid", function(err, result){
			done();
			res.send(result.rows);
			next(); 
		});
	});
});
//Unffolow someone        /unfollow/someuser?as=you
server.post('/unfollow/:user', function(req,res,next){
	pg.connect(process.env.HEROKU_POSTGRESQL_BLACK_URL, function(err, client, done){
		if (err) throw err;
  		console.log('Connected to postgres! Getting schemas...');
		client.query("DELETE FROM followers WHERE userid = '" + req.query.as + "' AND followerid = '" + req.params.user + "'", function(err, result){
			done();
			res.send("Unfollowing " + req.params.user);
			next();
		});
	});
});
//Add post to <3    /fav/tweet?as=you
server.post('/fav/:tweet', function(req,res,next){
	pg.connect(process.env.HEROKU_POSTGRESQL_BLACK_URL, function(err, client, done){
		if (err) throw err;
  		console.log('Connected to postgres! Getting schemas...');
		client.query("INSERT INTO favorites(userid, tweetid) VALUES ('" + req.query.as + "', '" + req.params.tweet + "') RETURNING *", function(err, result){
			res.send(result.rows);
			client.query("UPDATE tweets SET favs = favs + 1 WHERE id = '" + req.params.tweet + "'", function(err, result){
				done();
				next();
			});
		});
	});
});
//Remove post from <3    /unfav/tweet?as=you
server.post('/unfav/:tweet', function(req,res,next){
	pg.connect(process.env.HEROKU_POSTGRESQL_BLACK_URL, function(err, client, done){
		if (err) throw err;
  		console.log('Connected to postgres! Getting schemas...');
		client.query("DELETE FROM favorites WHERE userid = '" + req.query.as + "' AND tweetid = '" + req.params.tweet + "'", function(err, result){
			if (err) throw err;
			client.query("UPDATE tweets SET favs = favs - 1 WHERE id = '" + req.params.tweet + "'", function(err, result){
				done();
				res.send("Unfavs");
				next();
			});
		});
	});
});
//Retrieve favorites   /getFavs?userID = username
server.get('/getFavs', function(req,res,next){
	pg.connect(process.env.HEROKU_POSTGRESQL_BLACK_URL, function(err, client, done){
		if (err) throw err;
  		console.log('Connected to postgres! Getting schemas...');
		client.query("SELECT * FROM favorites WHERE userid = '" + req.query.userID + "'", function(err, result){
			done();
			res.send(result.rows);
			next();
		});
	});
});
//Get favorited tweets   /getFavTweets?userID = username
server.get('/getFavTweets', function(req,res,next){
	pg.connect(process.env.HEROKU_POSTGRESQL_BLACK_URL, function(err, client, done){
		if (err) throw err;
  		console.log('Connected to postgres! Getting schemas...');
		client.query("SELECT DISTINCT tweets.id, tweets.userid, tweets.message, tweets.posttime, tweets.favs FROM tweets, favorites, users WHERE tweets.id = favorites.tweetid AND favorites.userid = '" + req.query.userID + "'", function(err, result){
			if (err) throw err;
			done();
			res.send(result.rows);
			next();
		});
	});
});
//Change your password  ,   data is in HTML body with params username, password, newpassword
server.post('/changepsw', function(req,res,next){
	var valid;
	pg.connect(process.env.HEROKU_POSTGRESQL_BLACK_URL, function(err, client, done){
		if (err) throw err;
  		console.log('Connected to postgres! Getting schemas...');
		client.query("UPDATE users SET password = '" + req.body.newpassword + "' WHERE username = '" + req.body.username + "' RETURNING *", function(err, result){
			done();
			res.send(result.rows);
			next();	
		});	
	});
});
//Post a tweet ,  params  username, message
server.post('/tweet', function(req,res,next){
	var clock = new Date();
	var time = clock.getTime();
	console.log("Time = " + time);
	pg.connect(process.env.HEROKU_POSTGRESQL_BLACK_URL, function(err, client, done){
		if (err) throw err;
  		console.log('Connected to postgres! Getting schemas...');
		client.query("INSERT INTO tweets(userid, message, posttime) VALUES ('" + req.body.username + "', '" + req.body.message + "', '" + time + "') RETURNING *", function(err, result){
			if (err) throw err;
			done();
			res.send(result.rows);
			next();
		});
	});
});
//Reply to a tweet ,   params username, message       /reply?tweetid=tweetid
server.post('/reply', function(req,res,next){
	var clock = new Date();
	var time = clock.getTime();	// Connect to the database
	pg.connect(process.env.HEROKU_POSTGRESQL_BLACK_URL, function(err, client, done){
		if (err) throw err;
  		console.log('Connected to postgres! Getting schemas...');
		// Make the query
		client.query("INSERT INTO replies(tweetid, userid, message, posttime) VALUES ('" + req.query.tweetid + "','" + req.body.username + "', '" + req.body.message + "', '" + time + "') RETURNING *", function(err, result){
			if (err) throw err;
			done();
			res.send(result.rows);
			next();
		});
	});
});
//Remove a tweet     /removeTweet?tweetid=tweetid
server.post('/removeTweet', function(req,res,next){
	pg.connect(process.env.HEROKU_POSTGRESQL_BLACK_URL, function(err, client, done){
		if (err) throw err;
  		console.log('Connected to postgres! Getting schemas...');
		client.query("DELETE FROM favorites WHERE tweetid = " + req.query.tweetid, function(err, result){
			client.query("DELETE FROM replies WHERE tweetid = " + req.query.tweetid, function(err, result){
				client.query("DELETE FROM tweets WHERE id = " + req.query.tweetid, function(err, result){
					if (err) throw err;
					done();
					res.send("Tweet Removed");
					next();
				});
			});
		});
	});
});

var port = process.env.PORT || 8080;
server.listen(port, function() {
  console.log('%s listening at %s', server.name, server.url);
});