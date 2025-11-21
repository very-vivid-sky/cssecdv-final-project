const express = require('express');
const helper = require("./controllerHelper");
const reviewController = require("./reviewController.js");
const Restaurant = require('../models/restaurantSchema.js');
const User = require('../models/userSchema.js');
var userId = "65f05288fe85e01b514bbdab";

async function getUserFromReviews(revData) {
    /*
    let reviews = [];
    for (let rev of revData) {
        let user = await helper.getUserFromData("_id", rev.userAcc);
        if (user != undefined) {
            reviews.push({
                username: user.userName,
                img: user.userPicture,
                rating: rev.rating,
                date: "",
                comment: rev.reviewBody,
                helpful: rev.helpful,
                nothelpful: rev.nothelpful,
            })
        }
    }
    return reviews;
    */
    return reviews;
}

const restaurantController = {

    formatRestaurant: function(item) {
        return {
            _id: item._id.valueOf(),
            name: item.name,
            bannerPhoto: item.bannerPhoto,
            rating: item.rating,
            ratingStars: helper.generateStarHTML(item.rating),
        };
    },

    getAll: async function (req, resp) {
        Restaurant.find({}).then(function (resto) {
            console.log('Restaurants Found');
            let data = new Array();
            for (let item of resto) {
                data.push(restaurantController.formatRestaurant(item));
            }

            return resp.status(200).render('restaurants', {
                layout: 'index',
                title: "Restaurants",
                restaurants: data,
                clientType: helper.isLoggedIn(req),
            });
        }).catch((error) => {
            console.log(error);
            resp.status(500).send({ message: error.message });
        });
    },

    getById: async function (req, resp) {
        let resId = req.params.id;
        
        // getById also catches sort requests
        // if server gets a sort request, put them to sortReviews()
        // which is more appropriate for the job
        if (req.params.sort) {
            return reviewController.sortReviews(req, resp)
        }

        // get restaurant
        helper.getRestaurant(resId, function(resto) {
            // get reviews
            helper.getAllReviews(resId, function(revData) {
                // get average of reviews
                let ave = 0;
                for (let r of revData) { ave += r.rating; }
                ave /= revData.length;
                ave = ave.toFixed(2);
                if (ave != resto.rating) {
                    Restaurant.updateOne({_id: resId}, {$set: {"rating": ave}})
                }
                
                // render page
                return resp.status(200).render('restaurant', {
                    layout: 'index',
                    title: resto.name,
                    name: resto.name,
                    address: resto.address,
                    number: resto.number,
                    openingTime: helper.formatTime(resto.openingTime.h, resto.openingTime.m),
                    closingTime: helper.formatTime(resto.closingTime.h, resto.closingTime.m),
                    images: resto.images,
                    clientType: helper.isLoggedIn(req),
                    // function generates reviews in object form compatible with handlebars
                    reviews: reviewController.getSortedReviews("helpful-first", revData, req.session.userId, resto.estOwner),
                    rating: ave,
                    restaurantAcc: resId,
                    userAcc:  req.session.userId,
                });
            })
        })
    },
    
    getSearchPage: async function(req, resp) {
        resp.render("search", {
            title: "Search",
            layout: "index",
            clientType: helper.isLoggedIn(req)
        }) 
    },

    searchRestaurants: function(req, resp) {
        let toSearch = req.params.query;
        let query = {
            "name": { $regex: toSearch, $options: "i" }
        }
        Restaurant.find(query).then(function (resto) {
            let data = [];
            // add all restaurants to arr, formatted as objects for hbs
            for (let r of resto) {
                data.push(restaurantController.formatRestaurant(r));
            }

            // then render and respond
            return resp.status(200).render("partials/resto-list", {
                restaurants: data,
            });
        })
    }


    /*
    createRestaurant: async function (req, resp) {
        try {
            if (
                !req.body.name ||
                !req.body.address ||
                !req.body.contactNumber ||
                !req.body.openingHour ||
                !req.body.closingHour ||
                !req.body.openingMin ||
                !req.body.closingMin ||
                !req.body.images ||
                !req.body.bannerPhoto

            ) {
                return resp.status(400).send({
                    message: 'Send all required fields',
                });
            }
            const newRestaurant = {
                name: req.body.name,
                address: req.body.address,
                contactNumber: req.body.contactNumber,
                totalReviews: req.body.totalReviews,
                rating: req.body.rating,
                openingHour: req.body.openingHour,
                closingHour: req.body.closingHour,
                openingMin: req.body.openingMin,
                closingMin: req.body.closingMin,
                images: req.body.images,
                bannerPhoto: req.body.bannerPhoto
            };
            const resto = await Restaurant.create(newRestaurant);
            return resp.status(201).send(resto);
        } catch (error) {
            console.log(error);
            resp.status(500).send({ message: error.message });
        }
    },


    editRes: async function (req, resp) {
        const { id } = req.params;
        try {
            if (
                !req.body.name ||
                !req.body.address ||
                !req.body.contactNumber ||
                !req.body.openingHour ||
                !req.body.closingHour ||
                !req.body.openingMin ||
                !req.body.closingMin ||
                !req.body.images
            ) {
                return resp.status(400).send({
                    message: 'Send all required fields',
                });
            }

            const resto = await await Restaurant.findByIdAndUpdate(id, req.body);

            if (!resto) {
                return resp.status(404).json({ message: 'Book nada' });
            }

            return resp.status(200).send({ message: 'Restaurant updated!' })
        } catch (error) {
            console.log(error);
            resp.status(500).send({ message: error.message });
        }
    }*/
}

module.exports = restaurantController;