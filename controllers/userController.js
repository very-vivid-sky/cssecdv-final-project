const auditLogger = require('../middleware/auditLogger.js');
const authMiddleware = require("./authMiddleware.js");
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

      let hashedPassword = await authMiddleware.encryptPassword(password);
      const user = new User({
        userName: username,
        userEmail: email,
        password: hashedPassword,
        userDetails: bio || "",
        clientType: "user",
        userPicture: req.file ? req.file.filename : null
      })

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

      /*
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
      */
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


// Edits the details of a user via their /userdetails page
editUser_post: async (req, resp) => {
  helper.validateAccess("user", req, async function(isValid, user) {
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
      // password policy check
      if (wantsPasswordChange) {
        if (!authMiddleware.validatePassword(body.password_new)) {
          renderObject.message_warning = "Password must be at least 8 characters, contain uppercase, lowercase letters, a number, and a special character.";
          return resp.render('edit-user', renderObject);
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
      // verify the username is usable
      if (wantsUsernameChange) {
        let userWithThisName = await helper.getUserFromData("userName", body.username);
        // if this username is already taken, deny
        if (userWithThisName != undefined) {
          renderObject.message_warning = "Current username has already been taken. Please choose a different username.";
          return resp.render('edit-user', renderObject);
        }
      }

      // verify old password
      let isPasswordCorrect = await authMiddleware.comparePassword(body.password_old, user.password);
      if (!isPasswordCorrect) {
        // no, it isn't! sad!
          renderObject.message_warning = "Current password is incorrect.";
          // audit logging
          const user_id = auditLogger.getUser(req);
          const ip = auditLogger.getIp(req);
          const ua = auditLogger.getUa(req);
          auditLogger.logAccessDenied(user_id, "PasswordChange", user._id, ip, ua, reason="Incorrect password trying to edit username/password while logged in");
          return resp.render('edit-user', renderObject);
      }

      // shunt to this path if and only if this edits the password
      if (wantsPasswordChange) {

        // verify if this password has already been used before by this user
        let isPasswordReused = await authMiddleware.checkForPasswordReuse(user, body.password_new);
        if (isPasswordReused) {
          // password is reused — deny change
            renderObject.message_warning = "You cannot reuse passwords.";
            return resp.render('edit-user', renderObject);
        } else {
          // password is not reused — process changes
          let success = await authMiddleware.setNewPassword(req, user, body.password_new);
          if (success) {
            // success — chang everything else the user requested to be changed
            if (wantsUsernameChange) { user.userName = body.username; }
            if (wantsBioChange) { user.userDetails = body.bio; }
            await user.save();

            if (wantsUsernameChange) {
              renderObject.message_success = "Password and username changed successfully!";
            } else {
              renderObject.message_success = "Password changed successfully!";
            }
            return resp.render('edit-user', renderObject);
          } else {
            renderObject.message_warning = "Something went wrong. Please try again.";
            return resp.render('edit-user', renderObject);
          }
        }

      } else {
        // this path is for editing the username, which requires less checks here
        if (wantsUsernameChange) { user.userName = body.username; }
        if (wantsBioChange) { user.userDetails = body.bio; }
        await user.save();

        renderObject.message_success = "Username changed successfully!";
        return resp.render('edit-user', renderObject);
      }

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
