const userModel = require('../models/userSchema.js')
const express = require('express');
const User = require('../models/userSchema.js');
const helper = require('./controllerHelper.js');


const mainController = {
  getIndex: async function (req, resp) {
    // Pull any last-use message set at login and clear it after reading
    const lastUseMessage = req.session.lastUseMessage || null;
    if (req.session.lastUseMessage) { delete req.session.lastUseMessage; }

    resp.render("index", {
      title: "Staples",
      layout: "index",
      clientType: helper.getClientType(req),
      lastUseMessage: lastUseMessage
    })
  },
  
  getAboutUs: async function (req, resp) {
    resp.render("aboutus", {
      title: "Staples",
      layout: "index",
      clientType: helper.getClientType(req)
    })
  },

}

module.exports = mainController;