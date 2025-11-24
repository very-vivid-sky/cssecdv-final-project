const path = require('path');
const multer = require('multer');

const ALLOWED_MIME = ['image/jpeg', 'image/png'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

var storate = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'public/uploads/');
    },
     filename: function(req, file, cb) {
        let ext = path.extname(file.originalname);

        let userId = req.session?.userId;

        if (!userId) {
            userId = "new_" + crypto.randomUUID().slice(0, 8);
        }

        const timestamp = Date.now();

        cb(null, `user_${userId}_${timestamp}${ext}`);
    }
});

// Accept only jpeg/jpg and png
const fileFilter = function(req, file, cb) {
    if (ALLOWED_MIME.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only JPEG and PNG files are allowed'), false);
    }
};

var upload = multer({
    storage: storate,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: fileFilter
});

module.exports = upload;