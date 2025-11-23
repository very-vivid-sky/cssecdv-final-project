const MAX_REVIEW_LENGTH = 500;
const MAX_IMAGES = 5;

module.exports = function validateReview(req, res, next) {
    const { review, rating } = req.body;

    // --- Text review ---
    if (!review || review.trim() === "") {
        req.validationError = "Review cannot be empty.";
        return next();
    }

    if (review.length > MAX_REVIEW_LENGTH) {
        req.validationError = `Review must be under ${MAX_REVIEW_LENGTH} characters.`;
        return next();
    }

    // --- Rating ---
    const parsed = Number(rating);
    if (isNaN(parsed) || parsed < 1 || parsed > 5) {
        req.validationError = "Rating must be between 1–5 stars.";
        return next();
    }

    // --- Images ---
    if (req.files) {
        if (req.files.length > MAX_IMAGES) {
            req.validationError = `You can upload up to ${MAX_IMAGES} images.`;
            return next();
        }

        for (let f of req.files) {
            if (f.size > 2 * 1024 * 1024) {
                req.validationError = "Each image must be under 2 MB.";
                return next();
            }
            if (!["image/jpeg", "image/png", "image/jpg"].includes(f.mimetype)) {
                req.validationError = "Images must be JPEG or PNG.";
                return next();
            }
        }
    }

    next();
};
