const express = require('express');
const router = express.Router();
// const upload = require("../helpers/multer")
const adminController = require('../controllers/admin/adminController');
const customerController = require('../controllers/admin/customerController')
const categoryController = require('../controllers/admin/categoryController')
const productController = require('../controllers/admin/productController');
const bannerController = require('../controllers/admin/bannerController');
const multer = require('multer'); // Import multer
const { userAuth, adminAuth } = require("../middlewares/auth");

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/product-images'); // Destination for uploaded files
    },
    filename: function (req, file, cb) {
        const originalExtension = file.originalname.split('.').pop(); // Get original file extension
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}.${originalExtension}`;
        cb(null, uniqueName); // Save with original extension
    }
});

const upload = multer({ storage });

// const upload= multer({ storage: storage }); // Create the upload middleware

router.get("/pageerror",adminController.pageerror)
router.get('/login',adminController.loadLogin);
router.post('/login',adminController.login);
router.get('/',adminAuth,adminController.loadDashboard);
router.get('/logout',adminController.logout);

router.get('/users',adminAuth,customerController.customerInfo)
router.get('/blockCustomer',adminAuth,customerController.customerBlocked)
router.get('/unblockCustomer',adminAuth,customerController.customerUnBlocked)
//category
router.get("/category",adminAuth,categoryController.categoryInfo)
router.post("/addCategory",adminAuth,categoryController.addCategory)
router.post("/addCategoryOffer",adminAuth,categoryController.addCategoryOffer)
router.post("/removeCategoryOffer",adminAuth,categoryController.removeCategoryOffer);
router.get("/listCategory",adminAuth,categoryController.getlistCategory);
router.get("/unlistCategory",adminAuth,categoryController.getunlistCategory)
router.get("/editCategory",adminAuth,categoryController.getEditCategory)
router.post("/editCategory/:id",adminAuth,categoryController.editCategory)
//product
router.get("/addProducts",adminAuth,productController.getProductAddPage);
router.post("/addProducts",adminAuth,upload.array("images",4),productController.addProducts)
router.get("/products",adminAuth,productController.getAllProducts)
router.post("/addProductOffer",adminAuth,productController.addProductOffer)
router.post("/removeProductOffer",adminAuth,productController.removeProductOffer)
router.get("/blockProduct",adminAuth,productController.blockProduct);
router.get("/unblockProduct",adminAuth,productController.unBlockProduct)
router.get("/editProduct",adminAuth,productController.getEditProduct)
router.post("/editProduct/:id",adminAuth,upload.array("images",4),productController.editProduct)
router.post("/deleteImage",adminAuth,productController.deleteSingleImage)
//banner Management
// router.get("/banner",adminAuth,bannerController.getBannerPage)

module.exports = router;