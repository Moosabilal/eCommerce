const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure the upload directory exists
const uploadDir = path.join(__dirname, '../public/uploads/product-images');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Define storage for the images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Initialize multer with the storage configuration and limits
const uploads = multer({
  storage: storage,
  limits: {
    fieldNameSize: 255, // Limit the size of the field name
    fieldSize: 5 * 1024 * 1024, // Limit the size of the field value
    fileSize: 10 * 1024 * 1024, // Limit the file size to 10MB
    files: 4 // Limit the number of files
  }
});

module.exports = uploads;