const express = require('express');
const router = express.Router();
// const upload = require("../helpers/multer")
const adminController = require('../controllers/admin/adminController');
const customerController = require('../controllers/admin/customerController')
const categoryController = require('../controllers/admin/categoryController')
const productController = require('../controllers/admin/productController');
const orderController = require('../controllers/admin/orderController');
const couponController = require('../controllers/admin/couponController')

const multer = require('multer'); 
// const { userAuth, adminAuth } = require("../middlewares/auth");
const {isAuthenticated, isLogin} = require('../middlewares/adminAuthentication')

// multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/product-images'); 
    },
    filename: function (req, file, cb) {
        const originalExtension = file.originalname.split('.').pop(); 
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}.${originalExtension}`;
        cb(null, uniqueName); 
    }
});

const upload = multer({ storage });

// const upload= multer({ storage: storage }); // Create the upload middleware

router.get("/pageerror",adminController.pageerror)
router.get('/login',adminController.loadLogin);
router.post('/login',adminController.login);
router.get('/',isAuthenticated,adminController.loadDashboard);
router.get('/logout',adminController.logout);

router.get('/users',isAuthenticated,customerController.customerInfo)
router.get('/blockCustomer',isAuthenticated,customerController.customerBlocked)
router.get('/unblockCustomer',customerController.customerUnBlocked)
//category
router.get("/category",isAuthenticated,categoryController.categoryInfo)
router.post("/addCategory",isAuthenticated,categoryController.addCategory)
router.post("/addCategoryOffer",isAuthenticated,categoryController.addCategoryOffer)
router.post("/removeCategoryOffer",isAuthenticated,categoryController.removeCategoryOffer);
router.get("/listCategory",isAuthenticated,categoryController.getlistCategory);
router.get("/unlistCategory",isAuthenticated,categoryController.getunlistCategory)
router.get("/editCategory",isAuthenticated,categoryController.getEditCategory)
router.post("/editCategory/:id",isAuthenticated,categoryController.editCategory)
//product
router.get("/addProducts",isAuthenticated,productController.getProductAddPage);
router.post("/addProducts",isAuthenticated,upload.array("images",4),productController.addProducts)
router.get("/products",isAuthenticated,productController.getAllProducts)
router.post("/addProductOffer",isAuthenticated,productController.addProductOffer)
router.post("/removeProductOffer",isAuthenticated,productController.removeProductOffer)
router.get("/blockProduct",isAuthenticated,productController.blockProduct);
router.get("/unblockProduct",isAuthenticated,productController.unBlockProduct)
router.get("/editProduct",isAuthenticated,productController.getEditProduct)
router.post("/editProduct/:id",isAuthenticated,upload.array("images",4),productController.editProduct)
router.post("/deleteImage",isAuthenticated,productController.deleteSingleImage)

//order management
router.get("/orders",isAuthenticated,orderController.getOrders)
router.post('/statusSelection',isAuthenticated,orderController.statusSelection);
router.post('/deleteOrder',isAuthenticated,orderController.deleteOrder)

//coupon management
router.get('/displayCoupon',isAuthenticated,couponController.showCouponDetails)
router.get('/addCoupon',isAuthenticated,couponController.addCoupon)
router.post('/getAddCoupon',isAuthenticated,couponController.createCoupon)
router.get('/editCoupon',isAuthenticated,couponController.editCoupon)
router.post('/updateCoupon',isAuthenticated,couponController.updateCoupon)
router.get("/deleteCoupon",isAuthenticated,couponController.deleteCoupon)


module.exports = router;