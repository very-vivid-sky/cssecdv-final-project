const express = require('express');
const upload = require('../public/imageHandler');


//controllers
const restaurantController = require('../controllers/restaurantController.js')
const userController = require('../controllers/userController.js');
const mainController = require('../controllers/mainController.js');
const reviewController = require('../controllers/reviewController.js');
const sessionController = require('../controllers/sessionController.js');
const adminController = require('../controllers/adminController.js');
const { isAdmin, isAccountActive, isManager, isStrictManager } = require('../controllers/authMiddleware.js');
const helper = require("../controllers/controllerHelper.js")
const { checkAccountLockout } = require('../middleware/accountLockoutMiddleware.js');

const app = express();

//main controller
app.get('/',mainController.getIndex);
app.get('/about-us',mainController.getAboutUs);

// restaurant routes

function route_search(req, resp) { // routes everything going through /search
	if (req.params.query != undefined) { return restaurantController.searchRestaurants(req, resp); }
	else { return restaurantController.getSearchPage(req, resp); }
} 

app.get('/restaurants',restaurantController.getAll);
app.get('/restaurant/:id',restaurantController.getById);
app.get('/restaurant/:id/:sort',restaurantController.getById);
app.post('/restaurant/:id', upload.array("images[]"), reviewController.createReview_post);
// flag a review (managers)
app.post('/review/:id/flag', isManager, reviewController.flagReview);
app.get("/search", route_search);
app.get("/search/:query", route_search);

// user routes
app.get('/register',userController.registerUser_get);
app.post('/register',upload.single("avatar"), userController.registerUser_post);
app.get('/login',userController.login_get);
// app.post('/login',sessionController.login);
app.post('/login', checkAccountLockout, sessionController.login);
app.get('/user/:id', userController.clientDetails_get);
app.get('/userdetails/', userController.editUser_get);
app.post("/userdetails/", userController.editUser_post);
app.get('/logout',sessionController.logout);

// admin routes (protected by isAdmin middleware)
app.get('/admin/dashboard', isAdmin, adminController.getAdminDashboard);
app.get('/api/admin/users', isAdmin, adminController.getAllUsers_get);
app.post('/api/admin/users/change-role', isAdmin, adminController.changeUserRole);
app.post('/api/admin/users/toggle-status', isAdmin, adminController.toggleUserStatus);
app.post('/api/admin/users/disable', isAdmin, adminController.disableUser);
app.post('/api/admin/users/enable', isAdmin, adminController.enableUser);

// Manager-only views for flagged reviews
app.get('/manager/flagged', isStrictManager, reviewController.getFlaggedReviews);
app.post('/manager/review/:id/unflag', isStrictManager, reviewController.unflagReview);
app.post('/manager/review/:id/remove', isStrictManager, reviewController.removeReview);

// Apply account active middleware to all routes
app.use(isAccountActive);

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