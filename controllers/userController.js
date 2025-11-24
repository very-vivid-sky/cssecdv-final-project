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
    const securityQuestion1 = body.securityQuestion1?.trim() || "";
    const securityAnswer1 = body.securityAnswer1?.trim() || "";
    const securityQuestion2 = body.securityQuestion2?.trim() || "";
    const securityAnswer2 = body.securityAnswer2?.trim() || "";

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
                    // Hash security question answers
                    const hashedAnswer1 = await bcrypt.hash(securityAnswer1.toLowerCase(), salt);
                    const hashedAnswer2 = await bcrypt.hash(securityAnswer2.toLowerCase(), salt);

                    const user = new User({
                        userName: username,
                        userEmail: email,
                        password: hashedPass,
                        userDetails: bio || "",
                        clientType: "user",
                        userPicture: req.file ? req.file.filename : null,
                        securityQuestions: [
                            { question: securityQuestion1, answerHash: hashedAnswer1 },
                            { question: securityQuestion2, answerHash: hashedAnswer2 }
                        ]
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
                            "REGISTRATION_FAILED",
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
      
      // Check if user has security questions set up
      const noSecurityQuestions = !user.securityQuestions || user.securityQuestions.length === 0;
      
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
        securityQuestions: authMiddleware.securityQuestions,
      });
    });
  },


  editUser_post: async (req, resp) => {
    helper.validateAccess("user", req, async (isValid, user) => {
      if (!isValid) return helper.get403Page(req, resp);

      const body = req.body;
      const action = body.action;

      // object for resp.render
      let renderObject = {
              layout: "index",
              title: "Profile",
              userName: user.userName,
              joined: user.createdAt.toDateString(),
              totalReviews: user.totalReviews,
              bio: user.userDetails,
              image: user.userPicture,
              userId: user._id,
              clientType: helper.getClientType(req),
              securityQuestions: authMiddleware.securityQuestions,
      }

      if (body.username) user.userName = body.username;
      if (body.bio) user.userDetails = body.bio;
      if (req.file) user.userPicture = req.file.filename;

      let updated = false;

      if (action === "change_username") {
        const correct = await bcrypt.compare(body.password_old, user.password);
        if (!correct) {
          renderObject.message_warning = "Current password is incorrect."
          return resp.render("edit-user", renderObject);
        }

        user.userName = body.username;
        renderObject.userName = body.username;
        updated = true;
      }

      else if (action === "change_password") {
      const correct = await bcrypt.compare(body.password_old, user.password);
        if (!correct) {
          renderObject.message_warning = "Current password is incorrect."
          return resp.render("edit-user", renderObject);
        }

        if (!user.oldPasswords) user.oldPasswords = [];
        user.oldPasswords.push(user.password);
        if (user.oldPasswords.length > 5) user.oldPasswords.shift();

        const salt = await bcrypt.genSalt(saltRounds);
        user.password = await bcrypt.hash(body.password_new, salt);
        user.passwordLastChanged = new Date();
        updated = true;
      }

      else if (action === "change_security_qns") {
        const correct = await bcrypt.compare(body.password_old, user.password);
        if (!correct) {
          renderObject.message_warning = "Current password is incorrect."
          return resp.render("edit-user", renderObject);
        }

        // they're pretty much backup passwords, should encrypt them
        let hashedA1 = await authMiddleware.encryptPassword(body.securityQn1_a);
        let hashedA2 = await authMiddleware.encryptPassword(body.securityQn2_a);
        user.securityQuestions = {
          first: { question: body.securityQn1_q, answer: hashedA1 },
          second: { question: body.securityQn2_q, answer: hashedA2 },
        }

        updated = true;
      }

      else if (action === undefined) {
        if (req.file) user.userPicture = req.file.filename;
        if (body.bio) { user.userDetails = body.bio; renderObject.bio = body.bio; };
        updated = true;
      }

      if (updated) await user.save();

      renderObject.message_success = "Profile updated successfully!"
      return resp.render("edit-user", renderObject);
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
              //images: helper.getPfp(user),
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


  
  // renders the base reset password screen
  resetPassword_get: async (req, resp) => {
    if (helper.isLoggedIn(req)) return helper.get403Page(req, resp);

    return resp.render('reset-password', {
      layout: 'index',
      title: "Reset password",
      step: "identify",
    });
  },

  // handles all the logic for post requests to resetPassword
  resetPassword_post: async(req, resp) => {
    if (req.body.step == "identify") {
      // identify step — get the email if it exists and send the associated recovery questions
      let user = await helper.getUserFromData("userEmail", req.body.email);
      if (
        user == undefined || user.securityQuestions == undefined ||
        user.securityQuestions.first.question == null || user.securityQuestions.second.question == null ||
        user.securityQuestions.first.answer == null || user.securityQuestions.second.answer == null
      ) {
        // no email /or/ no security questions — display the same error msg
        return resp.render('reset-password', {
          layout: 'index',
          title: "Reset password",
          step: "identify",
          message_warning: "Cannot get security questions associated with this email; potentially because it is not registered or no security questions have been attached to it. If this is your account, please notify an admin to restore your account access.",
        });
      } else {
        // email + security questions found — move on to the next step
        return resp.render('reset-password', {
          layout: 'index',
          title: "Reset password",
          step: "verify",
          email: req.body.email,
          securityQuestion1: user.securityQuestions.first.question,
          securityQuestion2: user.securityQuestions.second.question,
        });
      }
    } else if (req.body.step == "verify") {
      // verify step — confirm that the answers given to each security question are correct; only then should we change the password
      let user = await helper.getUserFromData("userEmail", req.body.email);
      if (
        user == undefined || user.securityQuestions == undefined ||
        user.securityQuestions.first.question == null || user.securityQuestions.second.question == null ||
        user.securityQuestions.first.answer == null || user.securityQuestions.second.answer == null
      ) {
        // previous step should catch such errors, but just in case!
        return resp.render('reset-password', {
          layout: 'index',
          title: "Reset password",
          step: "identify",
          message_warning: "An unexpected error occured while processing your request. Please try again.",
        });
      } else {
        // obtained security questions
        let correct1 = await authMiddleware.comparePassword(req.body.answer1, user.securityQuestions.first.answer);
        let correct2 = await authMiddleware.comparePassword(req.body.answer2, user.securityQuestions.second.answer);
        if (!correct1 || !correct2) {
          // one of them are not correct! deny
          return resp.render("reset-password", {
            layout: "index",
            title: "Reset password",
            step: "verify",
            email: req.body.email,
            securityQuestion1: req.body.question1,
            securityQuestion2: req.body.question2,
            message_warning: "One or both of the answers to the security questions were not correct. Please try again."
          });
        } else {
          // one last verification: has this password been used before?
          let wasPasswordReused = await authMiddleware.checkForPasswordReuse(user, req.body.newPassword);
          if (wasPasswordReused) {
            // it was! deny
            return resp.render("reset-password", {
              layout: "index",
              title: "Reset password",
              step: "verify",
              email: req.body.email,
              securityQuestion1: req.body.question1,
              securityQuestion2: req.body.question2,
              message_warning: "Unable to set your password. Try another password."
            })
          } else {
            // it wasn't! set this password
            if (!user.oldPasswords) user.oldPasswords = [];
            user.oldPasswords.push(user.password);
            if (user.oldPasswords.length > 5) user.oldPasswords.shift();

            let hashedPassword = await authMiddleware.encryptPassword(req.body.newPassword);
            user.password = hashedPassword;
            user.save();

            return resp.render("login", {
              layout: "index",
              title: "Login",
              message_success: "Password reset! You may now login using this password."
            });
          }
        }
      }
    } else {
      return resp.render('reset-password', {
        layout: 'index',
        title: "Reset password",
        step: "identify",
        message_warning: "An unexpected error occured while processing your request. Please try again.",
      });
    }
  }
};

module.exports = userController;
