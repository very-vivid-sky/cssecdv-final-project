const path = require('path');
const multer = require('multer');

// Storage engine
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function(req, file, cb) {
        const ext = path.extname(file.originalname);
        cb(null, Date.now() + ext);
    }
});

// Only allow images
function imageOnlyFilter(req, file, cb) {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg'];

    if (!allowedMimeTypes.includes(file.mimetype)) {
        return cb(new Error("Only image files are allowed."), false);
    }

    cb(null, true);
}

const upload = multer({
    storage: storage,
    fileFilter: imageOnlyFilter,
    limits: { fileSize: 1 * 1024 * 1024 } // 1 MB max
});

module.exports = upload;
