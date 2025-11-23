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
  helper.validateAccess("user", req, (isValid, user) => {
    if (!isValid) return helper.get403Page(req, resp);

    const body = req.body;

    const renderObject = {
      layout: 'index',
      title: "Profile",
      clientType: helper.getClientType(req),
      userName: user.userName,
      joined: user.createdAt.toDateString(),
      totalReviews: user.totalReviews,
      bio: user.userDetails,
      image: user.userPicture,
      userId: user._id,
    };

    const wantsPasswordChange = !!body.password_new;
    const wantsUsernameChange = !!body.username;
    const wantsBioChange = !!body.bio;

    if (wantsPasswordChange || wantsUsernameChange) {

      // must enter current password
      if (!body.password_old) {
        renderObject.message_warning = "You need to enter your current password to proceed.";
        return resp.render('edit-user', renderObject);
      }

      // password policy check
      if (wantsPasswordChange) {
        if (!validatePassword(body.password_new)) {
          renderObject.message_warning = validatePassword_errorMsg;
          return resp.render('edit-user', renderObject);
        }

        // retype check
        if (!body.password_retype || body.password_new !== body.password_retype) {
          renderObject.message_warning = "Passwords do not match. Please retype.";
          return resp.render('edit-user', renderObject);
        }
      }

      // verify old password
      helper.verifyPasswordIsCorrect(user.userEmail, body.password_old, (ok) => {
        if (!ok) {
          renderObject.message_warning = "Current password is incorrect.";
          return resp.render('edit-user', renderObject);
        }

        // finish helper
        const finish = () => {
          user.save().then(() => {
            if (wantsPasswordChange && wantsUsernameChange) {
              renderObject.message_success = "Successfully updated your password and username!";
            } else if (wantsPasswordChange) {
              renderObject.message_success = "Password successfully updated!";
            } else if (wantsUsernameChange) {
              renderObject.message_success = "Username successfully updated!";
            } else if (wantsBioChange) {
              renderObject.message_success = "Profile details updated!";
            }
            return resp.render('edit-user', renderObject);
          });
        };

        // hash password if needed
        if (wantsPasswordChange) {
          bcrypt.genSalt(saltRounds, (err, salt) => {
            if (err) {
              renderObject.message_warning = "Something went wrong. Please try again.";
              return resp.render('edit-user', renderObject);
            }
            bcrypt.hash(body.password_new, salt, (err2, hashedPass) => {
              if (err2) {
                renderObject.message_warning = "Something went wrong. Please try again.";
                return resp.render('edit-user', renderObject);
              }

              user.password = hashedPass;
              if (wantsUsernameChange) user.userName = body.username;
              if (wantsBioChange) user.userDetails = body.bio;
              finish();
            });
          });

        } else {
          // username or bio only
          if (wantsUsernameChange) user.userName = body.username;
          if (wantsBioChange) user.userDetails = body.bio;
          finish();
        }
      });

    } 
    else if (wantsBioChange) {
      user.userDetails = body.bio;
      user.save().then(() => {
        renderObject.message_success = "Profile details updated!";
        return resp.render('edit-user', renderObject);
      });
    } 
    else {
      return resp.render('edit-user', renderObject);
    }

  });
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
                    clientType: helper.getClientType(req),
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