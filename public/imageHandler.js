const path = require('path');
const multer = require('multer');

var storate = multer.diskStorage({
    destination: function(req,file,cb){
        cb(null,'public/uploads/');
    },
    filename: function(req,file,cb){
        let ext = path.extname(file.originalname)
        cb(null,Date.now()+ext);
    },
     resize: { width: 500, height: 500 },
})

var upload = multer({storage: storate});

module.exports = upload;