const auditLogger = require('../middleware/auditLogger.js');
const express = require('express');
const helper = require('./controllerHelper.js');
const User = require('../models/userSchema.js');
const bcrypt = require('bcryptjs');
const saltRounds = 5;

// source: https://emailregex.com/
const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

// Checks if the email is valid
function validateEmail(email) { return emailRegex.test(email); }

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

        // perform validation checks
        if (!validateEmail(body.email)) {
            // error: email is not valid
            return resp.render('register', {
                layout: 'index',
                title: "Register",
                message: "Email does not seem to be valid"
            });       
        } else if (!validatePassword(body.password)) {
            // error: password not validated against required standards
            return resp.render('register', {
                layout: 'index',
                title: "Register",
                message: validatePassword_errorMsg
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
        } else if (body.password != body.password2) {
            // error: pass1 and pass2 are not the same
            return resp.render('register', {
                layout: 'index',
                title: "Register",
                message: "Passwords do not match; please re-enter them"
            });
        } else {
            // check performed last as to ensure that errors that do not
            // require the server to check do not need to use unnecessary
            // resources
            helper.getUserFromData("userEmail", body.email, function(oldUser) {
                if (oldUser != undefined) {
                    // error: email exists
                    resp.render("register", {
                        layout: 'index',
                        title: "Register",
                        message: "Account already registered to email, please log in"
                    });
                } else {
                    // all clear! add to db
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
                }
            })
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
        helper.validateAccess("user", req, function(isValid, user) {
            if (!isValid) {
                // throw 403
                return helper.get403Page(req, resp);
            } else {
                return resp.status(200).render('edit-user', {
                    layout: 'index',
                    title: "Profile",
                    userName: user.userName,
                    joined: user.createdAt.toDateString(),
                    totalReviews: user.totalReviews,
                    bio: user.userDetails,
                    image: user.userPicture,
                    userId: user._id,
                    clientType: helper.getClientType(req),
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
                    clientType: helper.getClientType(req),
                });
            }
        })
    },

    editUser_post: async (req, resp) => {
        helper.validateAccess("user", req, function(isValid, user) {
            // quickfail
            if (!isValid) {
                return helper.get403Page(req, resp);
            }

            let body = req.body
            
            let userId = user._id;
            let changes = 0;
            let renderObject = {
                layout: 'index',
                title: "Profile",
                clientType: helper.isLoggedIn(req),
                
                userName: user.userName,
                joined: user.createdAt.toDateString(),
                totalReviews: user.totalReviews,
                bio: user.userDetails,
                image: user.userPicture,
                userId: user._id,
            }

            if (body.username != "" || body.password_new != "") {
                // require a valid password authentication before accepting
                // block of checks for common errors
                if (body.password_old == "") {
                    renderObject["message_warning"] = "You need to use your password to change it or your username.";
                    return resp.render('edit-user', renderObject);
                } else if (body.password_new != "" && !validatePassword(body.password_new)) {
                    renderObject["message_warning"] = validatePassword_errorMsg;
                    return resp.render('edit-user', renderObject);
                } else if (body.password_new != "" && body.password_old == "") {
                    renderObject["message_warning"] = "Please type your password twice.";
                    return resp.render('edit-user', renderObject);
                } else if (body.password_new != "" && (body.password_new != body.password_retype)) {
                    renderObject["message_warning"] = "Passwords are not the same. Please retype them.";
                    return resp.render('edit-user', renderObject);
                }

                // compare with current password if valid
                helper.verifyPasswordIsCorrect(user.userEmail, body.password_old, function (res) {
                    // only if password is to be set: salt and hash it
                    if (body.password_new != "") {
                        bcrypt.genSalt(saltRounds, function(err, salt) {
                            bcrypt.hash(req.body.password_new, salt, function(err, hashedPass) {
                                user.password = hashedPass;
                                if (body.username != "") { user.userName = body.username; }
                                if (body.bio != "") { user.userDetails = body.bio; }
                                user.save().then(function() {
                                    renderObject["message_success"] = "Successfully changed your password and edited your profile!"
                                    return resp.render('edit-user', renderObject);
                                })
                            })
                        })
                    } else {
                        // other changes only
                        if (body.username != "") { user.userName = body.username; }
                        if (body.bio != "") { user.userDetails = body.bio; }
                        user.save().then(function() {
                            renderObject["message_success"] = "Successfully changed your username and edited your profile!"
                            return resp.render('edit-user', renderObject);
                        })
                    }
                });
            } else {
                // more common operations only
                if (body.bio != "") { user.userDetails = body.bio; changes++; }
                
                // if not empty
                if (changes > 0) {
                    user.save().then(function() {
                        renderObject["message_success"] = "Successfully edited your public profile details!"
                        return resp.render('edit-user', renderObject);
                    })
                } else {
                    return resp.render('edit-user', renderObject);
                }

            }
        })
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
                        clientType: helper.getClientType(req),
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
