const express = require('express');
const helper = require('./controllerHelper.js');
const User = require('../models/userSchema.js');
const bcrypt = require('bcryptjs');
const saltRounds = 5;

// Checks if the (currently plaintext) password someone is using is currently valid
function validatePassword(password) {
    if (validatePassword_settings.minLength > 0 && password.length < validatePassword_settings.minLength) { return false; }
    if (validatePassword_settings.uppercaseReq && !(/[A-Z]/.test(password))) { return false; }
    if (validatePassword_settings.lowercaseReq && !(/[a-z]/.test(password))) { return false; }
    if (validatePassword_settings.numberReq && !(/[0-9]/.test(password))) { return false; }
    if (validatePassword_settings.specialReq && !(/[!@#$%^&*()\-_\\\/~`{}[\]|:;"'<>,.?+=]/.test(password))) { return false; }
    return true;
}

// current password validation requirements
const validatePassword_settings = {
    "minLength": 8,
    "uppercaseReq": true,
    "lowercaseReq": true,
    "numberReq": false,
    "specialReq": false,
}

// Message to send if invalid
const validatePassword_errorMsg = "Passwords are required to be at least 8 characters long, and have at least one uppercase and lowercase letter"

const userController = {


    registerUser_get: async (req, resp) => {
        // deny if logged in already
        if (helper.isLoggedIn(req)) {
            helper.get403Page(req, resp);
            return;
        }

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
        // deny if logged in already
        if (helper.isLoggedIn(req)) {
            helper.get403Page(req, resp);
            return;
        }
        
        let body = req.body

        if (validatePassword(body.password)) {
            if (body.password == body.password2) {
                helper.getUserFromData("userEmail", body.email, function(oldUser) {
                    if (oldUser == undefined) {
                        // probably valid?
    
                        // salt password
                        bcrypt.genSalt(saltRounds, function(err, salt) {
                            bcrypt.hash(req.body.password, salt, function(err, hashedPass) {
                                // add to db
                                let user = new User({
                                    userName: req.body.username,
                                    userEmail: req.body.email,
                                    password: hashedPass,
                                    userDetails: req.body.bio,
                                    clientType: "user",
                                })
                                user.save().then(function() {
                                    // log in & redirect
                                    req.session.userId = user._id;
                                    resp.redirect("/");
                                });
                            })
                        })
                    } else {
                        // error: email exists
                        resp.render("register", {
                            layout: 'index',
                            title: "Register",
                            message: "Account registered to email, please log in"
                        });
                    }
                })
    
            } else {
                // error: pass1 and pass2 are not the same
                return resp.render('register', {
                    layout: 'index',
                    title: "Register",
                    message: "Passwords do not match; please re-enter them"
                });
            }
        } else {
            // error: length less than 8
            return resp.render('register', {
                layout: 'index',
                title: "Register",
                message: validatePassword_errorMsg
            });
        }
    },

    login_get: async (req, resp) => {
        // deny if logged in already
        if (helper.isLoggedIn(req)) {
            helper.get403Page(req, resp);
            return;
        }

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
                helper.get403Page(req, resp);
                return;
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