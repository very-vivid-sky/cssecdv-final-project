const express = require('express');
const upload = require('../public/imageHandler');

//controllers
const restaurantController = require('../controllers/restaurantController.js')
const userController = require('../controllers/userController.js');
const mainController = require('../controllers/mainController.js');
const reviewController = require('../controllers/reviewController.js');
const sessionController = require('../controllers/sessionController.js');
const adminController = require('../controllers/adminController.js');
const { isAdmin, isAccountActive, isManager, isStrictManager, isLoggedIn } = require('../controllers/authMiddleware.js');
const helper = require("../controllers/controllerHelper.js")
const { checkAccountLockout } = require('../middleware/accountLockoutMiddleware.js');
const validateRegister = require('../middleware/validation/validateRegister.js');
const validateLogin = require('../middleware/validation/validateLogin.js');
const validateAccountEdit = require('../middleware/validation/validateAccountEdit.js');
const validateReview = require('../middleware/validation/validateReview.js');

const User = require('../models/userSchema.js');

const app = express();

// Apply account active middleware to all routes defined in this router
// This ensures disabled accounts are blocked before any route handler runs
app.use(isAccountActive);

//main controller
app.get('/',mainController.getIndex);
app.get('/about-us',mainController.getAboutUs);

// restaurant routes

function route_search(req, resp) { // routes everything going through /search
	if (req.params.query != undefined) { return restaurantController.searchRestaurants(req, resp); }
	else { return restaurantController.getSearchPage(req, resp); }
} 

// Attach user object to req for edit validation
function loadUserForEdit(req, res, next) {
    if (!req.session.userId) return next();

    User.findById(req.session.userId)
        .then(user => {
            req.userData = user;   // <-- validateAccountEdit needs this
            next();
        })
        .catch(err => {
            console.error("loadUserForEdit error:", err);
            next();
        });
}

app.get('/restaurants',restaurantController.getAll);
app.get('/restaurant/:id',restaurantController.getById);
app.get('/restaurant/:id/:sort',restaurantController.getById);
//app.post('/restaurant/:id', isLoggedIn, upload.array("images[]"), reviewController.createReview_post);
app.post(
    '/restaurant/:id',
    isLoggedIn,
    upload.array("images[]"),
    validateReview,
    reviewController.createReview_post
);
// flag a review (managers)
app.post('/review/:id/flag', isManager, reviewController.flagReview);
app.get("/search", route_search);
app.get("/search/:query", route_search);

// user routes
app.get('/register',userController.registerUser_get);
//app.post('/register',upload.single("avatar"), userController.registerUser_post);
app.post('/register',
    upload.single("avatar"),   
    validateRegister,          
    userController.registerUser_post 
);
app.get('/login',userController.login_get);
// app.post('/login',sessionController.login);
app.post('/login', validateLogin, checkAccountLockout, sessionController.login);
app.get('/user/:id', userController.clientDetails_get);
app.get('/userdetails/', isLoggedIn, userController.editUser_get);
app.post(
    "/userdetails",
    isLoggedIn,
    upload.single("avatar"),     
    loadUserForEdit,             
    validateAccountEdit,         
    userController.editUser_post 
);
app.get('/logout', isLoggedIn, sessionController.logout);

// admin routes (protected by isAdmin middleware)
app.get('/admin/dashboard', isAdmin, adminController.getAdminDashboard);
app.get('/api/admin/users', isAdmin, adminController.getAllUsers_get);
app.post('/api/admin/verify-password', isAdmin, adminController.verifyAdminPassword);
app.post('/api/admin/users/change-role', isAdmin, adminController.changeUserRole);
app.post('/api/admin/users/toggle-status', isAdmin, adminController.toggleUserStatus);
app.post('/api/admin/users/disable', isAdmin, adminController.disableUser);
app.post('/api/admin/users/enable', isAdmin, adminController.enableUser);
app.get('/logs', isAdmin, adminController.getAuditLogs);

// Manager-only views for flagged reviews
app.get('/manager/flagged', isStrictManager, reviewController.getFlaggedReviews);
app.post('/manager/review/:id/unflag', isStrictManager, reviewController.unflagReview);
app.post('/manager/review/:id/remove', isStrictManager, reviewController.removeReview);

// account active middleware is applied at the top of this file so it runs before route handlers

//review routes

//app.get('/users', userController.getAllUsers);
// app.get('/user/edit/:id',userController.editUser);
//app.delete('/user/delete/:id',userController.getUserById);


/*
app.get('/logout',userController.logOut_get);
app.put('/restaurants/edit/:id',restaurantController.editRes);
app.post('/create-restaurant',restaurantController.createRestaurant);
*/

// 404 route
app.all("*", helper.get404Page);

module.exports = app;