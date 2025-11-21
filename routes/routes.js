const express = require('express');
const upload = require('../public/imageHandler');


//controllers
const restaurantController = require('../controllers/restaurantController.js')
const userController = require('../controllers/userController.js');
const mainController = require('../controllers/mainController.js');
const reviewController = require('../controllers/reviewController.js');
const sessionController = require('../controllers/sessionController.js');

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
app.get("/search", route_search);
app.get("/search/:query", route_search);

// user routes
app.get('/register',userController.registerUser_get);
app.post('/register',upload.single("avatar"), userController.registerUser_post);
app.get('/login',userController.login_get);
app.post('/login',sessionController.login);
app.get('/user/:id', userController.clientDetails_get);
app.get('/userdetails/', userController.editUser_get);
app.get('/logout',sessionController.logout);

//review routes

//app.get('/users', userController.getAllUsers);
// app.get('/user/edit/:id',userController.editUser);
//app.delete('/user/delete/:id',userController.getUserById);


/*
app.get('/logout',userController.logOut_get);
app.put('/restaurants/edit/:id',restaurantController.editRes);
app.post('/create-restaurant',restaurantController.createRestaurant);
*/
module.exports = app;