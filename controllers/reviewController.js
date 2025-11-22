const express = require('express');
const helper = require("./controllerHelper");
const Restaurant = require('../models/restaurantSchema.js');
const User = require('../models/userSchema.js');
const Review = require('../models/reviewSchema.js');
var userId = "65f05288fe85e01b514bbdab";

const reviewController = {
    createReview_post: async (req, resp) => {
        try {
            let resId = req.params.id;
            console.log("THE RESTO IS "+resId);
            let uploadedImgs = [];

            /*
            //images uploaded by the user
            if(req.files){
                let uploadedImgs = new Array();
                
                req.files.forEach(function(files,index,arr){
                    path =  ("/uploads/" + files.filename).toString();
                    uploadedImgs.push({
                        path
                    });
                });

                
                review.save();    
            }else{
                let review = new Review({
                    userAcc: req.body.userAcc,
                    reviewBody: req.body.reviewBody,
                    restaurantAcc: req.body.restaurantAcc,
                    rating: req.body.rating,
                });
                review.save(); 
            }
            */

            // create review
            let review = new Review({
                userAcc: req.session.userId,
                reviewBody: req.body.review,
                restaurantAcc: resId,
                rating: req.body.rating,
                images: uploadedImgs,
            });
            review.save(); // save

            resp.redirect(req.get("Referrer") || "/");
        } catch (error) {
            console.log(error);
            resp.status(500).send({ message: error.message });
        }
       
    },

    sortReviews: function(req, resp) {
        let sortBy = req.params.sort;
        let resId = req.params.id;
        let userId = req.session.userId;

        // get restaurant details for ownerId
        helper.getRestaurant({"_id": resId}, function(resto) {
            let ownerId = resto.estOwner;
            // then get all relevant reviews
            helper.getAllReviews(resId, function(revData) {
                // finally get formatted data...
                let reviews = reviewController.getSortedReviews(sortBy, revData, userId, ownerId);
                return resp.status(200).render("partials/resto-review", {
                    reviews: reviews
                })
            })
        })
    },

    formatReview: function(r, currId, ownerId) {
        let action = [
            { "text": "Edit", id: "edit" },
            { "text": "Reply", id: "ownerreply" },
            { "text": "Edit reply", id: "owneredit" },
        ]

        if (ownerId != undefined) {
            ownerId = ownerId.toString();
        }
        if (currId != undefined) {
            currId = currId.toString();
        }

        // set action
        if (ownerId == currId && r.establishmentResponse.body != null) {
            action = action[2];
        } else if (ownerId == currId) {
            action = action[1];
        } else if (currId == r.userAcc._id.toString()) {
            action = action[0];
        } else {
            action = undefined;
        }

        // return the review as an object
        let rev = {
            id: r._id,
            username: r.userAcc.userName,
            userId: r.userAcc._id,
            img: helper.getPfp(r.userAcc.userPicture),

            rating: r.rating,
            date: helper.formatDateTime(r.createdAt),
            comment: r.reviewBody,
            helpful: r.helpful,
            nothelpful: r.nothelpful,
            createdAt: r.createdAt,
            
            images: r.images,
            //hasImages: hasImages,
            //uploadedimages: uploadedImgs,
            establishmentResponse: r.establishmentResponse.body,

            actionBtn: action,
        }
        return rev;
    },

    // sorts reviews
    getSortedReviews: function (sortedBy, revData, loggedInId, ownerId) {
        let reviews = [];

        // fail fast
        if (typeof sortedBy == "undefined") {
            sortedBy == "helpful-first";
        } else if (!(["helpful-first", "newest-first", "oldest-first", "positive-first", "negative-first"].includes(sortedBy))) {
            throw `Unknown review sort type: ${sortedBy}`
        }

        for (let r of revData) {
            // for each review do stuff
            reviews.push(reviewController.formatReview(r, loggedInId, ownerId));
        }

        // for all cases: sort by newest first
        reviews.sort((a, b) => helper.compareDates(b.createdAt, a.createdAt) );
        // then helpful ratio
        reviews.sort((a, b) => (b.helpful - b.nothelpful) - (a.helpful - a.nothelpful));

        // sort for other cases
        switch(sortedBy) {
            case "oldest-first":
                reviews.sort((a, b) => helper.compareDates(a.createdAt, b.createdAt) )
                break;
            case "newest-first":
                reviews.sort((a, b) => helper.compareDates(b.createdAt, a.createdAt) )
                break;
            case "positive-first":
                reviews.sort((a, b) => b.rating - a.rating);
                break;
            case "negative-first":
                reviews.sort((a, b) => a.rating - b.rating);
                break;
        }

        return reviews;
    },


};


module.exports = reviewController;