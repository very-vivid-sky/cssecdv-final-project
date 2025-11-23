const auditLogger = require('../middleware/auditLogger.js');
const express = require('express');
const helper = require('./controllerHelper.js');
const User = require('../models/userSchema.js');
const bcrypt = require('bcryptjs');
const saltRounds = 5;


const userController = {

    registerUser_get: async (req, resp) => {
        try {
            return resp.render('register', {
                layout: 'index',
                title: "Register",
            });
        } catch (error) {
            console.log(error);
            resp.status(500).send({ message: error.message });
        }
    },


    registerUser_post: async (req, resp) => {
        let body = req.body

        if (body.password.length > 7) {
            if (body.password == body.password2) {
                helper.getUserFromData("userEmail", body.email, async function(oldUser) {
                    if (oldUser == undefined) {
                        // probably valid?

                        // salt password
                        bcrypt.genSalt(saltRounds, function(err, salt) {
                            bcrypt.hash(req.body.password, salt, async function(err, hashedPass) {
                                // add to db
                                let user = new User({
                                    userName: req.body.username,
                                    userEmail: req.body.email,
                                    password: hashedPass,
                                    userDetails: req.body.bio,
                                    clientType: "user",
                                })
                                
                                user.save().then(async function() {
                                    // Log successful registration
                                    await auditLogger.logRegistration(
                                        user._id,
                                        user.userEmail,
                                        req.auditContext?.ipAddress,
                                        req.auditContext?.userAgent
                                    );
                                    
                                    // log in & redirect
                                    req.session.userId = user._id;
                                    resp.redirect("/");
                                }).catch(async (error) => {
                                    // Log registration save error
                                    await auditLogger.logAuditEvent(
                                        'REGISTRATION',
                                        'failure',
                                        {
                                            userId: body.email,
                                            resource: 'User',
                                            ipAddress: req.auditContext?.ipAddress,
                                            userAgent: req.auditContext?.userAgent,
                                            errorMessage: error.message
                                        }
                                    );
                                    
                                    console.error('Registration save error:', error);
                                    resp.status(500).render('register', {
                                        layout: 'index',
                                        title: 'Register',
                                        message: 'Registration failed. Please try again.'
                                    });
                                });
                            })
                        })
                    } else {
                        // error: email exists
                        // Log email already registered validation failure
                        await auditLogger.logValidationFailure(
                            'UNKNOWN',
                            'User',
                            'Email already registered',
                            req.auditContext?.ipAddress,
                            req.auditContext?.userAgent
                        );
                        
                        resp.render("register", {
                            layout: 'index',
                            title: "Register",
                            message: "Unable to complete registration. Please try again."
                        });
                    }
                })

            } else {
                // error: pass1 and pass2 are not the same
                // Log password mismatch validation failure
                await auditLogger.logValidationFailure(
                    'UNKNOWN',
                    'User',
                    'Password mismatch',
                    req.auditContext?.ipAddress,
                    req.auditContext?.userAgent
                );
                
                return resp.render('register', {
                    layout: 'index',
                    title: "Register",
                    message: "Registration failed. Please verify your input and try again."
                });
            }
        } else {
            // error: length less than 8
            // Log password too short validation failure
            await auditLogger.logValidationFailure(
                'UNKNOWN',
                'User',
                'Password too short',
                req.auditContext?.ipAddress,
                req.auditContext?.userAgent
            );
            
            return resp.render('register', {
                layout: 'index',
                title: "Register",
                message: "Registration failed. Please verify your input and try again."
            });
        }
    },


    login_get: async (req, resp) => {
        try {
            resp.render('login', {
                layout: 'index',
                title: "Login",
            });
        } catch (error) {
            console.log(error);
            resp.status(500).send({ message: error.message });
        }
    },


    editUser_get: async (req, resp) => {
        helper.getUserFromData("_id", req.session.userId, function (user) {
            if (user != undefined || user != null) {
                let clientParentArr = [];
                clientParentArr = user;

                return resp.status(200).render('edit-user', {
                    layout: 'index',
                    title: "Profile",
                    userName: clientParentArr.userName,
                    joined: clientParentArr.createdAt.toDateString(),
                    totalReviews: clientParentArr.totalReviews,
                    bio: clientParentArr.userDetails,
                    image: clientParentArr.userPicture,
                    userId: clientParentArr,
                    clientType: true
                });
            } else {
                resp.status(500).send({ message: "An error occured while loading your profile." });
            }
        }).catch((error) => {
            console.log(error);
            resp.status(500).send({ message: "An error occured while loading your profile." });
        });
    },


    clientDetails_get: async (req, resp) => {
        const { id } = req.params;
        helper.getUserFromData("_id", id, function (user) {
            helper.getAllReviewsBy(id, function (revData) {
                helper.getAllRestaurants(function (restaurants) {
                    let uploadedImgs = [];
                    let reviews = [];
                    let rating = [];
                    let totalReviews = revData.length;

                    for (let rev of revData) {
                        let resto = restaurants.find((o) => { return (o._id.toString() == rev.restaurantAcc) });
                        if (resto != undefined) {
                            let hasImages = false;
                            if (rev.images.length != 0) {
                                hasImages = true;
                                for (const image of rev.images) {
                                    uploadedImgs.push({
                                        path: image.path
                                    })
                                }
                            }
                            reviews.push({
                                username: user.userName,
                                restoName: resto.name,
                                img: helper.getPfp(user),
                                rating: rev.rating,
                                ratingStars: helper.generateStarHTML(rev.rating),
                                date: "",
                                comment: rev.reviewBody,
                                helpful: rev.helpful,
                                nothelpful: rev.nothelpful,
                                hasImages: hasImages,
                                uploadedimages: uploadedImgs,
                                restuarantid: rev.restaurantAcc,
                                hasImages: hasImages,
                            })
                            rating.push(rev.rating);
                        }
                    }
                    // ave
                    let ratingRes = 0;
                    for (let n of rating) {
                        ratingRes += parseFloat(n);
                    }
                    ratingRes /= rating.length;
                    // render
                    return resp.status(200).render('user-details', {
                        layout: 'index',
                        title: user.userName,
                        totalReviews: totalReviews,
                        joined: user.createdAt,
                        images: helper.getPfp(user),
                        userName: user.userName,
                        clientType: helper.isLoggedIn(req),
                        reviews: reviews,
                        bio: user.userDetails,
                    }
                    );

                });
            });
        }).catch((error) => {
            console.log(error);
            resp.status(500).send({ message: error.message });
        });
    },
};



module.exports = userController;
