const User = require('../models/userSchema.js');
const Restaurant = require('../models/restaurantSchema.js');
const Review = require('../models/reviewSchema.js');
const app = require("../app.js");

const helper = {
  
	// Fetches the 403 page
	get403Page: async function (req, resp) {
		resp.status(403).render("error-403", {
		  title: "Forbidden",
		  layout: "index",
		  clientType: helper.isLoggedIn(req)
		})
	  },

	  // Fetches the 404 page
	  get404Page: async function (req, resp) {
		resp.status(404).render("error-404", {
		  title: "Page not found",
		  layout: "index",
		  clientType: helper.isLoggedIn(req)
		})
	  },



	getUserFromData: async function(key, val, fn) {
		let search = {};
		search[key] = val;
		User.findOne(search).then(function(res) {
			if (fn != null) {
				fn(res);
			}
			return res;
		})
		.catch((error) => {
			// throw up
			throw(error);
		});
	},

	getAllUsers: function(fn) {
		User.find({}).then(function(res) {
			fn(res);
		})
		.catch((error) => {
			// throw up
			throw(error);
		});
	},

	
	getAllRestaurants: function(fn) {
		Restaurant.find({}).then(function(res) {
			fn(res);
		})
		.catch((error) => {
			// throw up
			throw(error);
		});
	},


	isLoggedIn: function(req) {
		return (req.session.userId != undefined) 
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

	getAllReviews: async function(resId, fn) {
		Review.find({restaurantAcc: resId})
		.populate("userAcc")
		.then(fn)
		.catch((error) => {
			// throw up
			throw(error);
		})
	},

	getAllReviewsBy: async function(userId, fn) {
		Review.find({userAcc: userId}).then(fn)
		.catch((error) => {
			// throw up
			throw(error);
		})
	},

	formatTime: function(h, m) {
		let meridian = (h >= 12) ? "PM" : "AM";
		if (h > 12) {h -= 12};
		if (h < 10) { h = `0${h}` };
		if (m < 10) { m = `0${m}` };
		return `${h}:${m} ${meridian}`;
	},

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
	}

}

module.exports = helper;