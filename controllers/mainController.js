const userModel = require('../models/userSchema.js')
const express = require('express');
const User = require('../models/userSchema.js');
const helper = require('./controllerHelper.js');


const mainController = {
  getIndex: async function (req, resp) {
    resp.render("index", {
      title: "Staples",
      layout: "index",
      clientType: helper.isLoggedIn(req)
    })
  },
  
  getAboutUs: async function (req, resp) {
    resp.render("aboutus", {
      title: "Staples",
      layout: "index",
      clientType: helper.isLoggedIn(req)
    })
  },

}

module.exports = mainController;