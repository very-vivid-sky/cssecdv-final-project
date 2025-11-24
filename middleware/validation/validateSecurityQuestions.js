const auditLogger = require('../auditLogger');

module.exports = async function validateSecurityQuestions(req, res, next) {
    const body = req.body;
    const q1 = body.securityQuestion1?.trim();
    const a1 = body.securityAnswer1?.trim();
    const q2 = body.securityQuestion2?.trim();
    const a2 = body.securityAnswer2?.trim();

    // Check that both questions are selected
    if (!q1 || !q2) {
        return res.render("register", {
            layout: "index",
            title: "Register",
            message: "Both security questions must be selected."
        });
    }

    // Check that questions are different (prevent using the same question twice)
    if (q1 === q2) {
        return res.render("register", {
            layout: "index",
            title: "Register",
            message: "Security questions must be different."
        });
    }

    // Check that answers are provided
    if (!a1 || !a2) {
        return res.render("register", {
            layout: "index",
            title: "Register",
            message: "Answers to security questions cannot be empty."
        });
    }

    // Check minimum answer length (at least 2 characters to avoid very short answers)
    if (a1.length < 2 || a2.length > 100) {
        return res.render("register", {
            layout: "index",
            title: "Register",
            message: "Security question answers must be between 2 and 100 characters."
        });
    }

    if (a2.length < 2 || a2.length > 100) {
        return res.render("register", {
            layout: "index",
            title: "Register",
            message: "Security question answers must be between 2 and 100 characters."
        });
    }

    // Check that answers are not identical (prevent reusing same answer for both questions)
    if (a1.toLowerCase() === a2.toLowerCase()) {
        return res.render("register", {
            layout: "index",
            title: "Register",
            message: "Security question answers must be different."
        });
    }

    next();
};
