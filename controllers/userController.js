const auditLogger = require('../middleware/auditLogger.js');
const validReg = require('../middleware/validation/validateRegister.js');
const validLogin = require('../middleware/validation/validateLogin.js');
const validEditProfile = require('../middleware/validation/validateAccountEdit.js');
const express = require('express');
const helper = require('./controllerHelper.js');
const authMiddleware = require('./authMiddleware.js');
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
        noSecurityQuestions: noSecurityQuestions
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
            noSecurityQuestions: !user.securityQuestions || user.securityQuestions.length === 0,
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
            noSecurityQuestions: !user.securityQuestions || user.securityQuestions.length === 0,
          message_warning: "Current password is incorrect."
        });
      }

    if (!user.oldPasswords) user.oldPasswords = [];
    user.oldPasswords.push(user.password);
    if (user.oldPasswords.length > 5) user.oldPasswords.shift();

      const salt = await bcrypt.genSalt(saltRounds);
      user.password = await bcrypt.hash(body.password_new, salt);
      user.passwordLastChanged = new Date();
      updated = true;
    }

    if (action === "setup_security_questions") {
      const q1 = body.securityQuestion1?.trim();
      const a1 = body.securityAnswer1?.trim();
      const q2 = body.securityQuestion2?.trim();
      const a2 = body.securityAnswer2?.trim();
      const verifyPassword = body.password_verify;

      // Verify password
      const correct = await bcrypt.compare(verifyPassword, user.password);
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
          noSecurityQuestions: !user.securityQuestions || user.securityQuestions.length === 0,
          message_warning: "Password verification failed."
        });
      }

      // Validate questions and answers
      if (!q1 || !q2 || q1 === q2) {
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
          noSecurityQuestions: !user.securityQuestions || user.securityQuestions.length === 0,
          message_warning: "Questions must be different."
        });
      }

      if (!a1 || !a2 || a1.length < 2 || a2.length < 2 || a1.length > 100 || a2.length > 100) {
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
          noSecurityQuestions: !user.securityQuestions || user.securityQuestions.length === 0,
          message_warning: "Answers must be 2-100 characters."
        });
      }

      if (a1.toLowerCase() === a2.toLowerCase()) {
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
          noSecurityQuestions: !user.securityQuestions || user.securityQuestions.length === 0,
          message_warning: "Answers must be different."
        });
      }

      // Hash and store security questions
      try {
        const salt = await bcrypt.genSalt(saltRounds);
        const hashedAnswer1 = await bcrypt.hash(a1.toLowerCase(), salt);
        const hashedAnswer2 = await bcrypt.hash(a2.toLowerCase(), salt);

        user.securityQuestions = [
          { question: q1, answerHash: hashedAnswer1 },
          { question: q2, answerHash: hashedAnswer2 }
        ];
        updated = true;
      } catch (error) {
        console.error('Error hashing security questions:', error);
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
          noSecurityQuestions: !user.securityQuestions || user.securityQuestions.length === 0,
          message_warning: "An error occurred while setting up security questions."
        });
      }
    }

     if (action === undefined) {
      if (req.file) user.userPicture = req.file.filename;
      if (body.bio) user.userDetails = body.bio;
      updated = true;
    }

     if (updated) await user.save();

    const noSecurityQuestions = !user.securityQuestions || user.securityQuestions.length === 0;

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
      noSecurityQuestions: noSecurityQuestions,
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

  resetPassword_get: async (req, resp) => {
    // GET /reset-password - show the password reset form
    if (helper.isLoggedIn(req)) return helper.get403Page(req, resp);

    return resp.render('reset-password', {
      layout: 'index',
      title: 'Reset Password',
      step: 'identify'
    });
  },

  resetPassword_post: async (req, resp) => {
    // POST /reset-password - verify security questions and allow password change
    if (helper.isLoggedIn(req)) return helper.get403Page(req, resp);

    const { email, step } = req.body;

    if (!email) {
      return resp.render('reset-password', {
        layout: 'index',
        title: 'Reset Password',
        step: 'identify',
        message: 'Email is required.'
      });
    }

    // Step 1: User provides email, return security questions
    if (step === 'identify') {
      try {
        const user = await helper.getUserFromData('userEmail', email.trim());
        if (!user) {
          // Generic message to prevent email enumeration
          return resp.render('reset-password', {
            layout: 'index',
            title: 'Reset Password',
            step: 'identify',
            message: 'If this account exists, you will be able to reset your password.'
          });
        }

        // Store email in session (temporary) for verification step
        req.session.resetEmail = email.trim();
        req.session.resetUserId = user._id.toString();

        // Render the security questions
        return resp.render('reset-password', {
          layout: 'index',
          title: 'Reset Password',
          step: 'verify',
          questions: user.securityQuestions || [],
          email: email.trim()
        });
      } catch (error) {
        console.error('Reset password email lookup error:', error);
        return resp.status(500).render('reset-password', {
          layout: 'index',
          title: 'Reset Password',
          step: 'identify',
          message: 'An error occurred. Please try again.'
        });
      }
    }

    // Step 2: User answers security questions and provides new password
    if (step === 'verify') {
      try {
        const userId = req.session.resetUserId;
        const resetEmail = req.session.resetEmail;
        const answer1 = req.body.answer1?.trim() || '';
        const answer2 = req.body.answer2?.trim() || '';
        const newPassword = req.body.newPassword || '';
        const confirmPassword = req.body.confirmPassword || '';

        if (!userId || !resetEmail) {
          return resp.render('reset-password', {
            layout: 'index',
            title: 'Reset Password',
            step: 'identify',
            message: 'Session expired. Please start over.'
          });
        }

        // Fetch user
        const user = await User.findById(userId);
        if (!user) {
          return resp.render('reset-password', {
            layout: 'index',
            title: 'Reset Password',
            step: 'identify',
            message: 'User not found.'
          });
        }

        // Verify answers to security questions
        let correctAnswers = 0;
        if (user.securityQuestions && user.securityQuestions.length >= 2) {
          const match1 = await bcrypt.compare(answer1.toLowerCase(), user.securityQuestions[0].answerHash);
          const match2 = await bcrypt.compare(answer2.toLowerCase(), user.securityQuestions[1].answerHash);
          if (match1) correctAnswers++;
          if (match2) correctAnswers++;
        }

        // Require both questions answered correctly
        if (correctAnswers !== 2) {
          return resp.render('reset-password', {
            layout: 'index',
            title: 'Reset Password',
            step: 'verify',
            questions: user.securityQuestions || [],
            email: resetEmail,
            message: 'One or more security question answers are incorrect.'
          });
        }

        // Validate new password
        if (!authMiddleware.validatePassword(newPassword)) {
          return resp.render('reset-password', {
            layout: 'index',
            title: 'Reset Password',
            step: 'verify',
            questions: user.securityQuestions || [],
            email: resetEmail,
            message: 'Password must be at least 8 characters, contain uppercase, lowercase letters, a number, and a special character.'
          });
        }

        // Check passwords match
        if (newPassword !== confirmPassword) {
          return resp.render('reset-password', {
            layout: 'index',
            title: 'Reset Password',
            step: 'verify',
            questions: user.securityQuestions || [],
            email: resetEmail,
            message: 'Passwords do not match.'
          });
        }

        // Check for password reuse
        const isReused = await authMiddleware.checkForPasswordReuse(user, newPassword);
        if (isReused) {
          return resp.render('reset-password', {
            layout: 'index',
            title: 'Reset Password',
            step: 'verify',
            questions: user.securityQuestions || [],
            email: resetEmail,
            message: 'This password has been used before. Please choose a different password.'
          });
        }

        // Set new password
        try {
          const salt = await bcrypt.genSalt(saltRounds);
          const hashedPassword = await bcrypt.hash(newPassword, salt);

          // Store old password in history
          if (!user.oldPasswords) user.oldPasswords = [];
          user.oldPasswords.push(user.password);
          if (user.oldPasswords.length > 5) user.oldPasswords.shift();

          user.password = hashedPassword;
          user.passwordLastChanged = new Date();
          await user.save();

          // Log the password reset
          try {
            await auditLogger.logAuditEvent(
              'PASSWORD_RESET_VIA_SECURITY_QUESTIONS',
              'success',
              {
                userId: user._id,
                resource: 'User',
                ipAddress: req.auditContext?.ipAddress || 'UNKNOWN',
                userAgent: req.auditContext?.userAgent || 'UNKNOWN',
                details: { email: resetEmail }
              }
            );
          } catch (e) { console.error('Failed to log password reset:', e); }

          // Clear session
          delete req.session.resetEmail;
          delete req.session.resetUserId;

          return resp.render('reset-password', {
            layout: 'index',
            title: 'Reset Password',
            step: 'success',
            email: resetEmail
          });
        } catch (error) {
          console.error('Password update error:', error);
          return resp.status(500).render('reset-password', {
            layout: 'index',
            title: 'Reset Password',
            step: 'verify',
            questions: user.securityQuestions || [],
            email: resetEmail,
            message: 'An error occurred while updating your password. Please try again.'
          });
        }
      } catch (error) {
        console.error('Reset password verification error:', error);
        return resp.status(500).render('reset-password', {
          layout: 'index',
          title: 'Reset Password',
          step: 'identify',
          message: 'An error occurred. Please try again.'
        });
      }
    }

    return resp.status(400).render('reset-password', {
      layout: 'index',
      title: 'Reset Password',
      step: 'identify',
      message: 'Invalid request.'
    });
  },
};

module.exports = userController;
