const express = require('express');
const helper = require("./controllerHelper");
const Restaurant = require('../models/restaurantSchema.js');
const User = require('../models/userSchema.js');
const Review = require('../models/reviewSchema.js');
const auditLogger = require('../middleware/auditLogger.js');
const bcrypt = require('bcryptjs');
var userId = "65f05288fe85e01b514bbdab";

const reviewController = {
    createReview_post: async (req, resp) => {
        try {
            // validate access first
            helper.validateAccess("user", req, function (isValid, user) {
                if (!isValid) {
                    // deny request; audit and respond
                    try { auditLogger.logAccessDenied(req.session && req.session.userId ? req.session.userId : 'ANONYMOUS', 'Review', null, req.auditContext?.ipAddress || req.ip, req.auditContext?.userAgent || req.get && req.get('user-agent'), 'NOT_LOGGED_IN'); } catch(e) { console.error('Audit error', e); }
                    return resp.status(403).send({ message: "Cannot write a review as an unregistered user" });
                } else {
                    let resId = req.params.id
                    helper.getRestaurant(resId, function(resto) {
                        // if user is a manager here
                        if (resto.estOwner == user._id) {
                            // deny request; audit and respond
                            try { auditLogger.logAccessDenied(req.session && req.session.userId ? req.session.userId : 'ANONYMOUS', 'Review', resId, req.auditContext?.ipAddress || req.ip, req.auditContext?.userAgent || req.get && req.get('user-agent'), 'MANAGER_CANNOT_REVIEW_OWN'); } catch(e) { console.error('Audit error', e); }
                            return resp.status(403).send({ message: "Cannot write a review as the manager of this establishment" });
                        }

                        // write and publish review

                        let review = new Review({
                            userAcc: user._id,
                            reviewBody: req.body.review,
                            restaurantAcc: resto._id,
                            rating: req.body.rating,
                            images: [],
                        })
                        review.save();
                        resp.redirect(req.get("Referrer") || "/");
                    })
                }
            })
        } catch(error) {
            return resp.status(500).send({ message: error.message });
        }


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
       
    },

    sortReviews: function(req, resp) {
        let sortBy = req.params.sort;
        let resId = req.params.id;
        let userId = req.session.userId;
        let role = req.session.role;

        // get restaurant details for ownerId
        helper.getRestaurant({"_id": resId}, function(resto) {
            let ownerId = resto.estOwner;
            // then get all relevant reviews
            helper.getAllReviews(resId, function(revData) {
                // finally get formatted data...
                let reviews = reviewController.getSortedReviews(sortBy, revData, userId, ownerId, role);
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
            flagged: r.flagged || false,
            flaggedBy: r.flaggedBy,
            flaggedAt: r.flaggedAt,
            flagReason: r.flagReason
        }
        return rev;
    },

    // sorts reviews
    getSortedReviews: function (sortedBy, revData, loggedInId, ownerId, role) {
        let reviews = [];

        // fail fast
        if (typeof sortedBy == "undefined") {
            sortedBy == "helpful-first";
        } else if (!(["helpful-first", "newest-first", "oldest-first", "positive-first", "negative-first"].includes(sortedBy))) {
            throw `Unknown review sort type: ${sortedBy}`
        }

        for (let r of revData) {
            // skip flagged reviews for non-managers
            if (r.flagged && !(role === 'manager' || role === 'admin')) {
                continue;
            }
            // for each review do stuff
            const formatted = reviewController.formatReview(r, loggedInId, ownerId);
            // include whether the current viewer can flag/manage
            formatted.canFlag = (role === 'manager' || role === 'admin');
            reviews.push(formatted);
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

    // Manager endpoints
    // Flag a review for manager review
    flagReview: async function(req, resp) {
        try {
            const reviewId = req.params.id;
            const reason = req.body.reason || null;
            const managerId = req.session.userId;

            const review = await Review.findById(reviewId);
            if (!review) return resp.status(404).json({ message: 'Review not found' });

            review.flagged = true;
            review.flaggedBy = managerId;
            review.flaggedAt = new Date();
            review.flagReason = reason;

            await review.save();
            // audit log
            try {
                await auditLogger.logAuditEvent('FLAG_REVIEW', 'success', {
                    userId: managerId,
                    resource: 'Review',
                    resourceId: reviewId,
                    ipAddress: req.auditContext?.ipAddress || 'UNKNOWN',
                    userAgent: req.auditContext?.userAgent || 'UNKNOWN',
                    details: { reason }
                });
            } catch (e) { console.error('Audit log error', e); }

            return resp.status(200).json({ message: 'Review flagged for manager review' });
        } catch (error) {
            console.error('Error flagging review:', error);
            return resp.status(500).json({ message: 'Error flagging review' });
        }
    },

    // View all flagged reviews (manager dashboard)
    getFlaggedReviews: async function(req, resp) {
        try {
            // only managers reach here via middleware
            const flagged = await Review.find({ flagged: true })
                .populate('userAcc')
                .populate('restaurantAcc')
                .populate('flaggedBy')
                .exec();

            const data = flagged.map(r => ({
                id: r._id.toString(),
                username: r.userAcc ? r.userAcc.userName : 'Unknown',
                userId: r.userAcc ? r.userAcc._id.toString() : null,
                restaurantId: r.restaurantAcc ? r.restaurantAcc._id.toString() : null,
                restaurantName: r.restaurantAcc ? r.restaurantAcc.name : 'Unknown',
                rating: r.rating,
                comment: r.reviewBody,
                flaggedAt: r.flaggedAt ? helper.formatDateTime(r.flaggedAt) : null,
                flaggedBy: r.flaggedBy ? (r.flaggedBy.userName || String(r.flaggedBy)) : null,
                flagReason: r.flagReason
            }));

            return resp.render('manager-flagged', {
                layout: 'index',
                title: 'Flagged Reviews',
                clientType: helper.getClientType(req),
                reviews: data
            });
        } catch (error) {
            console.error('Error getting flagged reviews:', error);
            return resp.status(500).send({ message: error.message });
        }
    },

    // Unflag a review (keep) - manager chooses to keep
    unflagReview: async function(req, resp) {
        try {
            const reviewId = req.params.id;
            const password = req.body && req.body.password ? req.body.password : null;
            const managerId = req.session.userId;

            // require manager password for sensitive action
            if (!password) {
                try { await auditLogger.logAccessDenied(managerId || 'ANONYMOUS', 'Review', reviewId, req.auditContext?.ipAddress || req.ip, req.auditContext?.userAgent || req.get && req.get('user-agent'), 'MISSING_MANAGER_PASSWORD'); } catch(e) { console.error('Audit error', e); }
                return resp.status(401).json({ message: 'Authentication required' });
            }

            const manager = await User.findById(managerId);
            if (!manager) {
                try { await auditLogger.logAccessDenied(managerId || 'ANONYMOUS', 'Review', reviewId, req.auditContext?.ipAddress || req.ip, req.auditContext?.userAgent || req.get && req.get('user-agent'), 'INVALID_MANAGER'); } catch(e) { console.error('Audit error', e); }
                return resp.status(401).json({ message: 'Authentication required' });
            }

            const match = bcrypt.compareSync(password, manager.password);
            if (!match) {
                try { await auditLogger.logAccessDenied(managerId || 'ANONYMOUS', 'Review', reviewId, req.auditContext?.ipAddress || req.ip, req.auditContext?.userAgent || req.get && req.get('user-agent'), 'INVALID_MANAGER_PASSWORD'); } catch(e) { console.error('Audit error', e); }
                return resp.status(401).json({ message: 'Authentication required' });
            }

            const review = await Review.findById(reviewId);
            if (!review) return resp.status(404).json({ message: 'Review not found' });

            review.flagged = false;
            review.flaggedBy = null;
            review.flaggedAt = null;
            review.flagReason = null;
            await review.save();
            // audit log
            try {
                await auditLogger.logAuditEvent('UNFLAG_REVIEW', 'success', {
                    userId: req.session.userId,
                    resource: 'Review',
                    resourceId: reviewId,
                    ipAddress: req.auditContext?.ipAddress || 'UNKNOWN',
                    userAgent: req.auditContext?.userAgent || 'UNKNOWN'
                });
            } catch (e) { console.error('Audit log error', e); }

            return resp.status(200).json({ message: 'Review unflagged (kept)' });
        } catch (error) {
            console.error('Error unflagging review:', error);
            return resp.status(500).json({ message: 'Error unflagging review' });
        }
    },

    // Remove a review - manager chooses to remove
    removeReview: async function(req, resp) {
        try {
            const reviewId = req.params.id;
            const password = req.body && req.body.password ? req.body.password : null;
            const managerId = req.session.userId;

            if (!password) {
                try { await auditLogger.logAccessDenied(managerId || 'ANONYMOUS', 'Review', reviewId, req.auditContext?.ipAddress || req.ip, req.auditContext?.userAgent || req.get && req.get('user-agent'), 'MISSING_MANAGER_PASSWORD'); } catch(e) { console.error('Audit error', e); }
                return resp.status(401).json({ message: 'Authentication required' });
            }

            const manager = await User.findById(managerId);
            if (!manager) {
                try { await auditLogger.logAccessDenied(managerId || 'ANONYMOUS', 'Review', reviewId, req.auditContext?.ipAddress || req.ip, req.auditContext?.userAgent || req.get && req.get('user-agent'), 'INVALID_MANAGER'); } catch(e) { console.error('Audit error', e); }
                return resp.status(401).json({ message: 'Authentication required' });
            }

            const match = bcrypt.compareSync(password, manager.password);
            if (!match) {
                try { await auditLogger.logAccessDenied(managerId || 'ANONYMOUS', 'Review', reviewId, req.auditContext?.ipAddress || req.ip, req.auditContext?.userAgent || req.get && req.get('user-agent'), 'INVALID_MANAGER_PASSWORD'); } catch(e) { console.error('Audit error', e); }
                return resp.status(401).json({ message: 'Authentication required' });
            }

            const review = await Review.findById(reviewId);
            if (!review) return resp.status(404).json({ message: 'Review not found' });

            await Review.deleteOne({ _id: reviewId });
            // audit log
            try {
                await auditLogger.logAuditEvent('REMOVE_REVIEW', 'success', {
                    userId: req.session.userId,
                    resource: 'Review',
                    resourceId: reviewId,
                    ipAddress: req.auditContext?.ipAddress || 'UNKNOWN',
                    userAgent: req.auditContext?.userAgent || 'UNKNOWN'
                });
            } catch (e) { console.error('Audit log error', e); }

            return resp.status(200).json({ message: 'Review removed' });
        } catch (error) {
            console.error('Error removing review:', error);
            return resp.status(500).json({ message: 'Error removing review' });
        }
    }


};


module.exports = reviewController;