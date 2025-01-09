const express = require('express');
const Cart = require('../models/cartSchema')
const User = require('../models/userSchema')
const router = express.Router();
const userController = require('../controllers/user/userController');
const passport = require('../config/passport');
const profileController = require("../controllers/user/profileController");
const productController = require("../controllers/user/productController")
const wishlistController = require("../controllers/user/wishlistController");
const cartController = require("../controllers/user/cartController")
const { userAuth, adminAuth } = require("../middlewares/auth");


router.use(async (req, res, next) => {
    const userId = req.session.user;
    const user = await User.findById(userId);
        const cart = await Cart.find({ _id: userId }).populate('product');
        res.locals.cart = cart; // Make cart globally accessible in views
    
    next();
});



//error management
router.get('/pageNotFound',userController.pageNotFound)
//signup management
router.get('/signup',userController.loadSignup);
router.post('/signup',userController.signup)
router.post('/verify-otp',userController.verifyOtp)
router.post('/resend-otp',userController.resendOtp);

router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    res.redirect('/')
});
//login management
router.get("/login",userController.loadLogin)
router.post('/login',userController.login)
router.get('/logout',userController.logout)

//home management && shop
router.get('/',userController.loadHomepage);
router.get("/shop",userAuth,userController.loadShoppingPage);
router.get("/filter",userAuth,userController.filterProduct);
router.get('/filterPrice',userAuth,userController.filterByPrice);
router.post("/search",userAuth,userController.searchProducts)

//profile management
router.get("/forgot-password",profileController.getForgotPassPage)
router.post("/forgot-email-valid",profileController.forgotEmailValid)
router.post("/verify-passForgot-otp",profileController.verifyForgotPassOtp)
router.get("/reset-password",profileController.getResetPassPage);
router.post("/resend-forgot-otp",profileController.resendOtp)
router.post("/reset-password",profileController.postNewPassword);
//userProfile
router.get("/userProfile",userAuth,profileController.userProfile);
router.get("/updateProfile",userAuth,profileController.getEditProfile)
router.post("/updateProfile",userAuth,profileController.postEditProfile);
router.get("/change-email",userAuth,profileController.changeEmail)
router.post("/change-email",userAuth,profileController.changeEmailValid)
router.get("/verify-email-otp",userAuth,profileController.getNewEmail)
router.post("/verify-email-otp",userAuth,profileController.verifyEmailOtp)
router.post("/update-email",userAuth,profileController.updateEmail)
router.get("/change-password",userAuth,profileController.changePassword)
router.post("/change-password",userAuth,profileController.changePasswordValid)
router.post("/verify-changePassword-otp",userAuth,profileController.verifyChangePassOtp)
router.get("/reset-profile-password",profileController.getResetProfilePassPage);
router.post("/reset-profile-password",profileController.postNewProfilePassword);
//address manage
router.get("/addAddress",userAuth,profileController.addAddress)
router.post("/addAddress",userAuth,profileController.postAddAddress)
router.get("/editAddress",userAuth,profileController.editAddress);
router.post("/editAddress",userAuth,profileController.postEditAddress);
router.get("/deleteAddress",userAuth,profileController.deleteAddress)




//product managing
router.get("/productDetails",userAuth,productController.productDetails);

//whishlist manage
router.get("/wishlist",userAuth,wishlistController.loadWishlit);
router.post("/addToWishlist",userAuth,wishlistController.addToWishlist)
router.get("/removeFromWishlist",userAuth,wishlistController.removeProduct)

//cart management
router.get("/loadCart",userAuth,cartController.getCart);
router.post("/addToCart",userAuth,cartController.addToCart);

module.exports=router;