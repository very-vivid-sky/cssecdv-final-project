const express = require('express');
const helper = require('./controllerHelper.js');
const User = require('../models/userSchema.js');

const adminController = {

    // Get admin dashboard
    getAdminDashboard: async (req, resp) => {
        try {
            // Check if user is admin
            if (req.session.role !== "admin") {
                return resp.status(403).send({ message: "Access denied. Admin only." });
            }

            helper.getAllUsers(function(users) {
                // Filter out guests and admins don't need to see other admins' management
                const managedUsers = users.filter(u => u.clientType !== "guest");
                
                return resp.status(200).render('admin-dashboard', {
                    layout: 'index',
                    title: "Admin Dashboard",
                    clientType: helper.getClientType(req),
                       currentUserId: req.session.userId.toString(),
                    users: managedUsers.map(u => ({
                           id: u._id.toString(),
                        username: u.userName,
                        email: u.userEmail,
                        role: u.clientType,
                        isActive: u.isActive,
                        joined: u.createdAt.toDateString()
                    }))
                });
            });
        } catch (error) {
            console.log(error);
            resp.status(500).send({ message: error.message });
        }
    },

    // Get all users for admin management (API endpoint)
    getAllUsers_get: async (req, resp) => {
        try {
            if (req.session.role !== "admin") {
                return resp.status(403).json({ message: "Access denied. Admin only." });
            }

            helper.getAllUsers(function(users) {
                const managedUsers = users.filter(u => u.clientType !== "guest");
                
                return resp.status(200).json({
                    users: managedUsers.map(u => ({
                        id: u._id,
                        username: u.userName,
                        email: u.userEmail,
                        role: u.clientType,
                        isActive: u.isActive,
                        joined: u.createdAt.toDateString(),
                        totalReviews: u.totalReviews
                    }))
                });
            });
        } catch (error) {
            console.log(error);
            resp.status(500).json({ message: error.message });
        }
    },

    // Change user role (admin or manager)
    changeUserRole: async (req, resp) => {
        try {
            // Check if requester is admin
            if (req.session.role !== "admin") {
                return resp.status(403).json({ message: "Access denied. Admin only." });
            }

            const { userId, newRole } = req.body;

            // Prevent admin from changing their own role
            if (userId === req.session.userId.toString()) {
                return resp.status(403).json({ message: "You cannot change your own role." });
            }

            // Validate role
            if (!["admin", "manager", "user"].includes(newRole)) {
                return resp.status(400).json({ message: "Invalid role. Must be 'admin', 'manager', or 'user'." });
            }

            // Find and update user
            User.findByIdAndUpdate(
                userId,
                { clientType: newRole },
                { new: true }
            ).then((updatedUser) => {
                if (!updatedUser) {
                    return resp.status(404).json({ message: "User not found." });
                }
                return resp.status(200).json({
                    message: `User role updated to ${newRole} successfully.`,
                    user: {
                        id: updatedUser._id,
                        username: updatedUser.userName,
                        role: updatedUser.clientType
                    }
                });
            }).catch((error) => {
                console.log(error);
                resp.status(500).json({ message: error.message });
            });
        } catch (error) {
            console.log(error);
            resp.status(500).json({ message: error.message });
        }
    },

    // Disable/Enable user account
    toggleUserStatus: async (req, resp) => {
        try {
            // Check if requester is admin
            if (req.session.role !== "admin") {
                return resp.status(403).json({ message: "Access denied. Admin only." });
            }

            const { userId, isActive } = req.body;

            // Prevent admin from disabling their own account
            if (userId === req.session.userId.toString()) {
                return resp.status(403).json({ message: "You cannot disable your own account." });
            }

            // Validate isActive parameter
            if (typeof isActive !== 'boolean') {
                return resp.status(400).json({ message: "Invalid request. isActive must be a boolean." });
            }

            // Find and update user
            User.findByIdAndUpdate(
                userId,
                { isActive: isActive },
                { new: true }
            ).then((updatedUser) => {
                if (!updatedUser) {
                    return resp.status(404).json({ message: "User not found." });
                }
                const status = isActive ? "enabled" : "disabled";
                return resp.status(200).json({
                    message: `User account ${status} successfully.`,
                    user: {
                        id: updatedUser._id,
                        username: updatedUser.userName,
                        isActive: updatedUser.isActive
                    }
                });
            }).catch((error) => {
                console.log(error);
                resp.status(500).json({ message: error.message });
            });
        } catch (error) {
            console.log(error);
            resp.status(500).json({ message: error.message });
        }
    },

    // Disable user account (convenience method)
    disableUser: async (req, resp) => {
        try {
            if (req.session.role !== "admin") {
                return resp.status(403).json({ message: "Access denied. Admin only." });
            }

            const { userId } = req.body;

            // Prevent admin from disabling their own account
            if (userId === req.session.userId.toString()) {
                return resp.status(403).json({ message: "You cannot disable your own account." });
            }

            User.findByIdAndUpdate(
                userId,
                { isActive: false },
                { new: true }
            ).then((updatedUser) => {
                if (!updatedUser) {
                    return resp.status(404).json({ message: "User not found." });
                }
                return resp.status(200).json({
                    message: "User account disabled successfully.",
                    user: {
                        id: updatedUser._id,
                        username: updatedUser.userName,
                        isActive: updatedUser.isActive
                    }
                });
            }).catch((error) => {
                console.log(error);
                resp.status(500).json({ message: error.message });
            });
        } catch (error) {
            console.log(error);
            resp.status(500).json({ message: error.message });
        }
    },

    // Enable user account (convenience method)
    enableUser: async (req, resp) => {
        try {
            if (req.session.role !== "admin") {
                return resp.status(403).json({ message: "Access denied. Admin only." });
            }

            const { userId } = req.body;

            User.findByIdAndUpdate(
                userId,
                { isActive: true },
                { new: true }
            ).then((updatedUser) => {
                if (!updatedUser) {
                    return resp.status(404).json({ message: "User not found." });
                }
                return resp.status(200).json({
                    message: "User account enabled successfully.",
                    user: {
                        id: updatedUser._id,
                        username: updatedUser.userName,
                        isActive: updatedUser.isActive
                    }
                });
            }).catch((error) => {
                console.log(error);
                resp.status(500).json({ message: error.message });
            });
        } catch (error) {
            console.log(error);
            resp.status(500).json({ message: error.message });
        }
    }

};

module.exports = adminController;
