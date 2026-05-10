const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../public/uploads/product-images');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const userId = req.session.user ? req.session.user : 'unknown';
    cb(null, userId + '.png');
  }
});

const uploads = multer({
  storage: storage,
  limits: {
    fieldNameSize: 255,
    fieldSize: 5 * 1024 * 1024,
    fileSize: 10 * 1024 * 1024,
    files: 4
  }
});

module.exports = uploads;