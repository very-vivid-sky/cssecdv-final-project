const express = require('express');
const helper = require('./controllerHelper.js');
const User = require('../models/userSchema.js');
const bcrypt = require('bcryptjs');
const saltRounds = 5;

//async function checkUsername() {

function changeClient(userID) {
    if (userID != null) {
        // log in
        helper.currUser = userID;
        console.log(`Client is now a registered user with a userID: ${userID}`);
    } else {
        // log out
        helper.currUser = helper.guestUser;
        console.log("Client is now a guest");
    }
}

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
                helper.getUserFromData("userEmail", body.email, function(oldUser) {
                    console.log(oldUser)
                    if (oldUser == undefined) {
                        // probably valid?
    
                        // salt password
                        bcrypt.hash(req.body.password, saltRounds, function(err, hashedPass) {
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
                    message: "Please re-enter your password"
                });
            }
        } else {
            // error: length less than 8
            return resp.render('register', {
                layout: 'index',
                title: "Register",
                message: "Passwords are required to be at least 8 characters long"
            });
        }
        /*
        try {
            // salt password
            bcrypt.hash(req.body.pass, saltRounds, function(err, hashedPass) {
                // add to db
                let user = new User({
                    userName: req.body.username,
                    userEmail: req.body.email,
                    password: hashedPass,
                    userDetails: req.body.bio,
                    clientType: "user",
                })
                user.save().then(function() {
                    // then
                    return resp.status(201).send({ res: "success" })
                }, function() {
                    // catch
                });

            })
        } catch(error) {
            // error for posting
            resp.status(500).send({ message: error.message });
        }
        */

        /*
        try {
            if (req.file) {
                let imageDestination = ("/uploads/" + req.file.filename);
                let user = new User({
                    userName: req.body.username,
                    userEmail: req.body.email,
                    password: req.body.password,
                    userDetails: req.body.bio,
                    clientType: "user",
                    userPicture: imageDestination,
                });
                user.save();
            } else {
                let user = new User({
                    userName: req.body.username,
                    userEmail: req.body.email,
                    password: req.body.password,
                    userDetails: req.body.bio,
                    clientType: "user",
                    userPicture: "/uploads/default.png"
                });
                user.save();
            }
            return resp.render('register', {
                layout: 'index',
                title: "Register",
                message: "User Registered!"
            });
        } catch (error) {
<<<<<<< HEAD
=======
            console.log(error);
            resp.send({ message: error.message });
>>>>>>> d9cb081b117785dc75cdfb62039f1b6b667d5db5
        }
        */
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

    login_post: async (req, resp) => {
        let searchQuery = { userEmail: req.body.email, password: req.body.password };
        helper.getUserFromData("userEmail", searchQuery.userEmail, function (user) {
            if (user != undefined && user.password == searchQuery.password) {

                // email matches password
                helper.currUser = user._id;
                changeClient(helper.currUser);
                resp.redirect("/");
            } else {
                // email or password are incorrect
                resp.render('login', {
                    layout: 'index',
                    title: 'Result page',
                    message: 'Email and password do not match!'
                });

            }
        })

        /*
        const searchQuery = { userEmail: req.body.email, password: req.body.password };
        User.findOne(searchQuery).then(function (login) {
            let client = []; 
            client = login; 
            clientId = client._id.toString();

            if (login != undefined && login._id != null) {
              
                changeClient(clientId);
                User.findOne({ _id: "65ef7d6f0d0c59dfb507fb48" }).then(function (user) {
                    if (user.clientType = "user") {
                        resp.render('index', {
                            layout: 'index',
                            title: 'Staples:Home',
                            clientType: true,
                        });
                    }

                });
            } else {
                resp.render('login', {
                    layout: 'index',
                    title: 'Result page',
                    message: 'Email and password do not match!'
                });
            }

        
        }).catch((error) => {
            console.log(error);
            resp.status(500).send({ message: error.message });
        });
        */
    },

    editUser_get: async (req, resp) => {
        const searchQuery = { _id: "65ef7d6f0d0c59dfb507fb48" };
        helper.getUserFromData("_id", helper.currUser, function (user) {
            if (user != undefined) {
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
            }
        }).catch((error) => {
            console.log(error);
            resp.status(500).send({ message: error.message });
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


    logout_post: async (req, resp) => {
        changeClient();
        resp.redirect("/");
    }

    /** 
     * 
    getAllUsers: async (req, resp) => {
        try {
            const user = await User.find({});
            return resp.status(200).json({
                count: user.length, // lets you get the num of res
                data: user
            });
        } catch (error) {
            console.log(error);
            resp.status(500).send({ message: error.message });
        }

    }, 
    deleteUser: async (req, resp) => {
        try {
            const { id } = req.params;
            const result = await User.findByIdAndDelete(id);

            if (!result) {
                return resp.status(404).json({ message: 'User to be deleted not found' });
            }

            return resp.status(200).send({ message: 'User deleted!' })

        } catch (error) {
            console.log(error);
            resp.status(500).send({ message: error.message });
        }

    }, */

};


module.exports = userController;