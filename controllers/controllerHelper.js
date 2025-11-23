const User = require('../models/userSchema.js');
const Restaurant = require('../models/restaurantSchema.js');
const Review = require('../models/reviewSchema.js');
const app = require("../app.js");
const bcrypt = require('bcryptjs');

const helper = {
	
	// checks if the user is logged in
	isLoggedIn: function(req) {
		return (req.session.userId != undefined) 
	},

    // function to validate access
    validateAccess: async function (minRole, req, fn) {
        // quickfail - if this pops up this is a issue with the newly written code
        if (!["guest", "user", "manager", "admin"].includes(minRole)) {
            throw `Invalid role written in validateAccess(): "${minRole}"`;
            fn((minRole == "guest"), undefined);
            return;
        }

        // get user id for later
        // if invalid, assume we are a guest and compare as that
        let userId = req.session.userId;
        let isValid = false;
        // if it /is/ undefined, assume that we are accessing as guest
        if (userId == undefined) {
            isValid = (minRole == "guest");
            fn(isValid, undefined);
            return;
        } else {
            helper.getUserFromData("_id", userId, function(user) {
                // blocking if user doesn't even exist!
                // fail safe - access as guest
                if (user == undefined || user == null) {
                    isValid = (minRole == "guest", undefined);
                } else {
                    switch(minRole) {
                        case "guest": isValid = true; break;
                        case "user": isValid = ["user", "manager", "admin"].includes(user.clientType); break;
                        case "manager": isValid = ["manager"].includes(user.clientType); break;
                        case "admin": isValid = ["admin"].includes(user.clientType); break;
                    };
                }
        
                // now run the function
                fn(isValid, user);
                return;
            })
        }
    },

	// Fetches the generic error page (doesn't leak status info)
	getErrorPage: async function (req, resp, statusCode = 403) {
		resp.status(statusCode).render("error", {
		  title: "Error",
		  layout: "index",
		  clientType: helper.getClientType(req)
		})
	  },

	// Backward compatibility aliases
	get403Page: async function (req, resp) {
		return helper.getErrorPage(req, resp, 403);
	},

	get404Page: async function (req, resp) {
		return helper.getErrorPage(req, resp, 404);
	},


	// gets a user by searching for an entry in the Users db
	// with a matching key-value pair
	getUserFromData: async function(key, val, fn) {
		let search = {};
		search[key] = val;
		let res = undefined;
		/*
		await User.findOne(search).then(async function(res) {
			if (fn != null) {
				fn(res);
			}
			return res;
		})
		.catch((error) => {
			// throw up
			throw(error);
		});
		*/
		await User.findOne(search).then(async function(found) {
			if (fn != null) { await fn(found) }
			res = found;
		})
		return res;
	},

	// gets a list of all users as an object, then runs function fn()
	getAllUsers: function(fn) {
		User.find({}).then(function(res) {
			fn(res);
		})
		.catch((error) => {
			// throw up
			throw(error);
		});
	},

	// gets a list of all restaurants as an object, then runs function fn()
	getAllRestaurants: function(fn) {
		Restaurant.find({}).then(function(res) {
			fn(res);
		})
		.catch((error) => {
			// throw up
			throw(error);
		});
	},

	// gets a restaurant as an object by searching for its id, then runs function fn()
	getClientType: function(req) {
    	if (!req.session.userId) return "guest";

    	return req.session.role; 
	},

	getRestaurant: async function(resId, fn) {
		Restaurant.findOne({_id: resId}).then(function(res) {
			if (res != undefined) {
				fn(res);
			} else {
				console.log("Error here");
			}
		})
		.catch((error) => {
			// throw up
			throw(error);
		})
	},

	// gets a list of all reviews from a restaurant as an object, then runs function fn()
	getAllReviews: async function(resId, fn) {
		Review.find({restaurantAcc: resId})
		.populate("userAcc")
		.then(fn)
		.catch((error) => {
			// throw up
			throw(error);
		})
	},

	// gets a list of all restaurants by a user, then runs function fn()
	getAllReviewsBy: async function(userId, fn) {
		Review.find({userAcc: userId}).then(fn)
		.catch((error) => {
			// throw up
			throw(error);
		})
	},

	// formats time for display in the website
	formatTime: function(h, m) {
		let meridian = (h >= 12) ? "PM" : "AM";
		if (h > 12) {h -= 12};
		if (h < 10) { h = `0${h}` };
		if (m < 10) { m = `0${m}` };
		return `${h}:${m} ${meridian}`;
	},

	// generates a star display given a float between 0 and 5
	generateStarHTML: function(s) {
		// fail fast, fail now
		if (s < 0 || s > 5) { throw `Invalid star rating ${s}` }
		
		let res = "";
		for (let i = 0.0; i < 5; i += 1) {
			let comp = i-s+1;
			if (comp >= 0.6) {			// empty star
				res += `<i class="bi bi-star"></i>`
			} else if (comp >= 0.3) {	// half star
				res += `<i class="bi bi-star-half star-rated-filled"></i>`
			} else {					// full star
				res += `<i class="bi bi-star-fill star-rated-filled"></i>`
			}
		}
		return res;
	},

	getPfp(user) {
		let res = "/images/user.png";
		if (user != undefined) {
			let img = user.userPicture;
			if (!(img == null || res == "")) {
				res = img;
			}
		}
		return res;
	},

	compareDates(a, b) {
		if (a == b) { return 0; }
		else { return (a < b) ? -1 : 1 }
	},

	formatDateTime(d) {
		return `${d.toDateString()}, ${helper.formatTime(d.getHours(), d.getMinutes())}`
	},

}

module.exports = helper;