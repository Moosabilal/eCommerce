const express = require('express');
const router = express.Router();
const userController = require('../controllers/user/userController');
const passport = require('passport');
const profileController = require("../controllers/user/profileController");
const productController = require("../controllers/user/productController")
const wishlistController = require("../controllers/user/wishlistController")
const { userAuth, adminAuth } = require("../middlewares/auth");


//error management
router.get('/pageNotFound',userController.pageNotFound)
//signup management
router.get('/signup',userController.loadSignup);
router.post('/signup',userController.signup)
router.post('/verify-otp',userController.verifyOtp)
router.post('/resend-otp',userController.resendOtp);

router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
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
router.get("/change-email",userAuth,profileController.changeEmail)
router.post("/change-email",userAuth,profileController.changeEmailValid)
router.get("/verify-email-otp",userAuth,profileController.getNewEmail)
router.post("/verify-email-otp",userAuth,profileController.verifyEmailOtp)
router.post("/update-email",userAuth,profileController.updateEmail)


//product managing
router.get("/productDetails",userAuth,productController.productDetails);


//whishlist manage
router.get("/wishlist",userAuth,wishlistController.loadWishlit);
router.post("/addToWishlist",userAuth,wishlistController.addToWishlist)
router.get("/removeFromWishlist",userAuth,wishlistController.removeProduct)



module.exports=router;