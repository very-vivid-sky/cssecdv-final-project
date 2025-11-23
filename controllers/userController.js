const auditLogger = require('../middleware/auditLogger.js');
const validReg = require('../middleware/validation/validateRegister.js');
const validLogin = require('../middleware/validation/validateLogin.js');
const validEditProfile = require('../middleware/validation/validateAccountEdit.js');
const express = require('express');
const helper = require('./controllerHelper.js');
const User = require('../models/userSchema.js');
const bcrypt = require('bcryptjs');
const saltRounds = 5;

const userController = {

  registerUser_get: async (req, resp) => {
    if (helper.isLoggedIn(req)) return helper.get403Page(req, resp);

    return resp.render('register', {
      layout: 'index',
      title: "Register",
    });
  },
  
 registerUser_post: async (req, resp) => {
    if (helper.isLoggedIn(req)) return helper.get403Page(req, resp);

    const body = req.body;
    const email = body.email?.trim() || "";
    const password = body.password || "";
    const username = body.username?.trim() || "";
    const bio = body.bio || "";

    try {
        bcrypt.genSalt(saltRounds, (err, salt) => {
            if (err) {
                console.error("Salt error:", err);
                return resp.status(500).render("register", {
                    layout: "index",
                    title: "Register",
                    message: "Registration failed. Please try again."
                });
            }

            bcrypt.hash(password, salt, async (err2, hashedPass) => {
                if (err2) {
                    console.error("Hash error:", err2);
                    return resp.status(500).render("register", {
                        layout: "index",
                        title: "Register",
                        message: "Registration failed. Please try again."
                    });
                }

                try {
                    const user = new User({
                        userName: username,
                        userEmail: email,
                        password: hashedPass,
                        userDetails: bio || "",
                        clientType: "user",
                        userPicture: req.file ? req.file.filename : null
                    });

                    await user.save();

                    if (auditLogger?.logRegistration) {
                        await auditLogger.logRegistration(
                            user._id,
                            user.userEmail,
                            req.auditContext?.ipAddress,
                            req.auditContext?.userAgent
                        );
                    }

                    req.session.userId = user._id;
                    req.session.role = user.clientType;

                    return resp.redirect("/");
                } catch (saveErr) {
                    console.error("Registration save error:", saveErr);

                    if (auditLogger?.logAuditEvent) {
                        await auditLogger.logAuditEvent(
                            "REGISTRATION",
                            "failure",
                            {
                                userId: email,
                                resource: "User",
                                ipAddress: req.auditContext?.ipAddress,
                                userAgent: req.auditContext?.userAgent,
                                errorMessage: saveErr.message
                            }
                        );
                    }

                    return resp.status(500).render("register", {
                        layout: "index",
                        title: "Register",
                        message: "Registration failed. Please try again."
                    });
                }
            });
        });
    } catch (error) {
        console.log(error);
        return resp.status(500).render("register", {
            layout: "index",
            title: "Register",
            message: "Registration failed. Please try again."
        });
    }
},

  login_get: async (req, resp) => {
    if (helper.isLoggedIn(req)) {
      helper.get403Page(req, resp);
      return;
    }
    try {
      return resp.render('login', {
        layout: 'index',
        title: "Login",
      });
    } catch (error) {
      console.log(error);
      resp.status(500).send({ message: error.message });
    }
  },


  editUser_get: async (req, resp) => {
    helper.validateAccess("user", req, (isValid, user) => {
      if (!isValid) {
        return helper.get403Page(req, resp);
      }
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
      });
    });
  },


 editUser_post: async (req, resp) => {
  helper.validateAccess("user", req, async (isValid, user) => {
    if (!isValid) return helper.get403Page(req, resp);

    const body = req.body;
    const action = body.action;

    if (body.username) user.userName = body.username;
    if (body.bio) user.userDetails = body.bio;
    if (req.file) user.userPicture = req.file.filename;

    let updated = false;

    if (action === "change_username") {
      const correct = await bcrypt.compare(body.password_old, user.password);
      if (!correct) {
        return resp.render("edit-user", {
          layout: "index",
            title: "Profile",
            userName: user.userName,
            joined: user.createdAt.toDateString(),
            totalReviews: user.totalReviews,
            bio: user.userDetails,
            image: user.userPicture,
            userId: user._id,
            clientType: helper.getClientType(req),
          message_warning: "Current password is incorrect."
        });
      }

      user.userName = body.username;
      updated = true;
    }

     if (action === "change_password") {
      const correct = await bcrypt.compare(body.password_old, user.password);
      if (!correct) {
        return resp.render("edit-user", {
          layout: "index",
            title: "Profile",
            userName: user.userName,
            joined: user.createdAt.toDateString(),
            totalReviews: user.totalReviews,
            bio: user.userDetails,
            image: user.userPicture,
            userId: user._id,
            clientType: helper.getClientType(req),
          message_warning: "Current password is incorrect."
        });
      }

      const salt = await bcrypt.genSalt(saltRounds);
      user.password = await bcrypt.hash(body.password_new, salt);
      updated = true;
    }

     if (action === undefined) {
      if (req.file) user.userPicture = req.file.filename;
      if (body.bio) user.userDetails = body.bio;
      updated = true;
    }

     if (updated) await user.save();


    return resp.render("edit-user", {
      layout: "index",
      title: "Profile",
      userName: user.userName,
      joined: user.createdAt.toDateString(),
      totalReviews: user.totalReviews,
      bio: user.userDetails,
      image: user.userPicture,
      userId: user._id,
      clientType: helper.getClientType(req),
      message_success: "Profile updated successfully!"
    });
  });
},

  clientDetails_get: async (req, resp) => {
    const { id } = req.params;

    try {
      helper.getUserFromData("_id", id, (user) => {
        if (!user) {
          return resp.status(404).render('404', {
            layout: 'index',
            title: 'Not Found'
          });
        }

        helper.getAllReviewsBy(id, (revData) => {
          helper.getAllRestaurants((restaurants) => {
            const reviews = [];
            const ratingArr = [];
            const totalReviews = revData.length;

            for (const rev of revData) {
              const resto = restaurants.find((o) => o._id.toString() === rev.restaurantAcc);
              if (!resto) continue;

              const hasImages = (rev.images && rev.images.length > 0);
              const uploadedImgs = hasImages
                ? rev.images.map(img => ({ path: img.path }))
                : [];

              reviews.push({
                username: user.userName,
                restoName: resto.name,
                img: helper.getPfp(user),
                rating: rev.rating,
                ratingStars: helper.generateStarHTML(rev.rating),
                date: "", // TODO: format if you have rev.date
                comment: rev.reviewBody,
                helpful: rev.helpful,
                nothelpful: rev.nothelpful,
                hasImages: hasImages,
                uploadedimages: uploadedImgs,
                restuarantid: rev.restaurantAcc
              });

              ratingArr.push(rev.rating);
            }

            let ratingRes = 0;
            if (ratingArr.length > 0) {
              ratingRes = ratingArr.reduce((a, b) => a + parseFloat(b), 0) / ratingArr.length;
            }

            return resp.status(200).render('user-details', {
              layout: 'index',
              title: user.userName,
              totalReviews,
              joined: user.createdAt,
              images: helper.getPfp(user),
              userName: user.userName,
              clientType: helper.getClientType(req),
              reviews,
              bio: user.userDetails,
              averageRating: ratingRes
            });
          });
        });
      });
    } catch (error) {
      console.log(error);
      return resp.status(500).send({ message: error.message });
    }
  },
};

module.exports = userController;
