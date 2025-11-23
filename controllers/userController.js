const auditLogger = require('../middleware/auditLogger.js');
const validReg = require('../middleware/validation/validateRegister.js');
const validLogin = require('../middleware/validation/validateLogin.js');
const validEditProfile = require('../middleware/validation/validateAccountEdit.js');
const express = require('express');
const helper = require('./controllerHelper.js');
const User = require('../models/userSchema.js');
const bcrypt = require('bcryptjs');
const saltRounds = 5;

// source: https://emailregex.com/
const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

// Checks if the email is valid
function validateEmail(email) { return emailRegex.test(email); }

// current password validation requirements
const validatePassword_settings = {
  minLength: 8,
  uppercaseReq: true,
  lowercaseReq: true,
  numberReq: false,
  specialReq: false,
};

// Checks if the (plaintext) password meets policy
function validatePassword(password) {
  if (validatePassword_settings.minLength > 0 && password.length < validatePassword_settings.minLength) return false;
  if (validatePassword_settings.uppercaseReq && !(/[A-Z]/.test(password))) return false;
  if (validatePassword_settings.lowercaseReq && !(/[a-z]/.test(password))) return false;
  if (validatePassword_settings.numberReq && !(/[0-9]/.test(password))) return false;
  if (validatePassword_settings.specialReq && !(/[!@#$%^&*()\-_\\\/~`{}[\]|:;"'<>,.?+=]/.test(password))) return false;
  return true;
}

const validatePassword_errorMsg =
  "Passwords are required to be at least 8 characters long, and have at least one uppercase and lowercase letter";

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

            user.save().then(async () => {
             
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
            }).catch(async (saveErr) => {
            
              if (auditLogger?.logAuditEvent) {
                await auditLogger.logAuditEvent(
                  'REGISTRATION',
                  'failure',
                  {
                    userId: email,
                    resource: 'User',
                    ipAddress: req.auditContext?.ipAddress,
                    userAgent: req.auditContext?.userAgent,
                    errorMessage: saveErr.message
                  }
                );
              }
              console.error('Registration save error:', saveErr);
              return resp.status(500).render('register', {
                layout: 'index',
                title: 'Register',
                message: 'Registration failed. Please try again.'
              });
            });
          });
        });
      });
    } catch (error) {
      console.log(error);
      return resp.status(500).render('register', {
        layout: 'index',
        title: 'Register',
        message: 'Registration failed. Please try again.'
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
        if (!body.password_old) {
          renderObject.message_warning = "You need to use your current password to change it or your username.";
          return resp.render('edit-user', renderObject);
        }
        if (wantsPasswordChange) {
          if (!validatePassword(body.password_new)) {
            renderObject.message_warning = validatePassword_errorMsg;
            return resp.render('edit-user', renderObject);
          }
          if (!body.password_retype || body.password_new !== body.password_retype) {
            renderObject.message_warning = "Passwords are not the same. Please retype them.";
            return resp.render('edit-user', renderObject);
          }
        }

        helper.verifyPasswordIsCorrect(user.userEmail, body.password_old, (ok) => {
          if (!ok) {
            renderObject.message_warning = "Current password is incorrect.";
            return resp.render('edit-user', renderObject);
          }

          const finish = () => {
            user.save().then(() => {
              if (wantsPasswordChange && wantsUsernameChange) {
                renderObject.message_success = "Successfully changed your password and username!";
              } else if (wantsPasswordChange) {
                renderObject.message_success = "Successfully changed your password!";
              } else if (wantsUsernameChange) {
                renderObject.message_success = "Successfully changed your username!";
              } else if (wantsBioChange) {
                renderObject.message_success = "Successfully edited your public profile details!";
              }
              return resp.render('edit-user', renderObject);
            });
          };

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
            if (wantsUsernameChange) user.userName = body.username;
            if (wantsBioChange) user.userDetails = body.bio;
            finish();
          }
        });
      } else {
        // Only bio edited or nothing
        if (wantsBioChange) {
          user.userDetails = body.bio;
          user.save().then(() => {
            renderObject.message_success = "Successfully edited your public profile details!";
            return resp.render('edit-user', renderObject);
          });
        } else {
          return resp.render('edit-user', renderObject);
        }
      }
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
