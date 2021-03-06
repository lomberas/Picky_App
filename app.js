var express = require('express');
var bodyParser = require('body-parser');
var db = require('./models');
var app = express();
var request = require('request');
var session = require('express-session');
var methodOverride = require('method-override');

//  required for yelp request
var yelp = require("yelp").createClient({
  consumer_key: process.env.YELP_CONSUMER_KEY, 
  consumer_secret: process.env.YELP_CONSUMER_SECRET,
  token: process.env.YELP_TOKEN,
  token_secret: process.env.YELP_TOKEN_SECRET
});


app.set('view engine', 'ejs');


app.use(session({
  secret: 'super secret',
  resave: false,
  save: {
  	uninitialize: true
  }
 })); 

//middleware to store cookies
app.use('/', function(req,res,next) { 
	req.login = function(user) {
		req.session.userId = user.id;
	};
	req.currentUser = function() {
		return db.User.find(req.session.userId)
				.then(function(dbUser) {
					req.user = dbUser;
					return dbUser;
				});
	};
	req.logout = function() {
		req.session.userId = null;
		req.user = null;
	}
	next();
});

app.use(methodOverride('_method'))

app.use(bodyParser.urlencoded({extended: true}));

app.use(express.static('public'));




// Let's add some routes

// render to the index.ejs file
app.get('/', function(req, res) {
   	var user = req.session.userId;
   	  res.render('index.ejs', {user:user}); // We use res.render to display an EJS file instead of res.send() 
});

// Here we add User routes together
// First route is for the user to log in
app.get('/login', function(req, res){
	req.currentUser().then(function(user){
		if (user) {
			res.redirect('users/profile');
		} else {
			res.render("users/login");

		}
	});
});


// User to Sign up route
app.get('/signup', function(req, res) {
	res.render('users/signup');
});

// post to login 
app.post('/login', function(req,res) {
	var email = req.body.email;
	var password = req.body.password;
	  db.User.find({ where: { email: email}})
	  .then(function(user) {
	  	req.login(user);
	  	  res.redirect('/profile');
	  });
});

// Posts to User database
app.post('/signup', function(req, res) {
	var email = req.body.email;
	var password =  req.body.password;
	  db.User.createSecure(email,password)
		.then(function(user) {
			req.login(user);
			res.redirect('/profile');
		});
});

// Here is a route to logout the user, it requires the _methodoverride and logout call
app.delete('/logout', function(req, res){
	req.logout();
	res.redirect('/login');
});


// route to user profile
app.get('/profile', function(req, res){
	req.currentUser().then(function(user){
		if (user) {
			db.Favorite.all({where: {UserId: user.id}})
			  .then(function(restaurants){
			  	console.log("\n\n\n\n\nHELLO", restaurants);
				  res.render('users/profile', {ejsUser: user, idk: restaurants});
			});
		  } else {
			res.redirect('/login');
		}
	});
});

app.get('/users/profile', function(res, res){
	res.render('users/profile');
});




//Routes for search page including Yelp API
app.get('/search', function(req, res) {
	console.log(req.query);
	var food = req.query.food;
	var city = req.query.city;
	if (!food || !city) {
		res.render('site/search', {results: [], food: false});
		  console.log("This is the food " + food);
	} else {

		yelp.search({term: food, location: city}, function(error, data) {
	  		console.log("This is an error " + error);
	  		console.log("This is our data " + data);
	  	      res.render('site/search', {results: data.businesses, food: food});
	    });
	} 
	return(food);  
 	

});

// this route directs the user to profile once logged in
app.post('/favorites', function(req,res){
	var dish = req.body.dish;
	var restaurant = req.body.restaurant;
	
	    req.currentUser().then(function(dbUser){
		  if (dbUser) {
			db.Favorite.create({dish: dish, restaurant: restaurant, UserId: req.session.userId})
              .then(function(){
                  res.redirect("/profile");
        })
			dbUser.addToFavs(dish,restaurant).then(function(resTaus){
				res.redirect('/profile');
			});
		} else {
			res.redirect('/login');
		}
	});
});


app.listen(process.env.PORT || 3000);
 

