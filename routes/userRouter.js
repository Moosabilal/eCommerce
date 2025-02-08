const express = require('express');
const Cart = require('../models/cartSchema')
const User = require('../models/userSchema')
const Product = require('../models/productSchema')
const router = express.Router();
const {userAuth, userLogin} = require('../middlewares/userAuthentication')
const userController = require('../controllers/user/userController');
const passport = require('../config/passport');
const profileController = require("../controllers/user/profileController");
const productController = require("../controllers/user/productController")
const wishlistController = require("../controllers/user/wishlistController");
const cartController = require("../controllers/user/cartController")
const orderController = require("../controllers/user/orderController")
const walletController = require("../controllers/user/walletController")
const couponController = require('../controllers/user/couponController')
// const { userAuth, adminAuth } = require("../middlewares/auth");





//error management
router.get('/pageNotFound',userController.pageNotFound)
//signup management
router.get('/signup',userLogin,userController.loadSignup);
router.post('/signup',userLogin,userController.signup)
router.post('/verify-otp',userController.verifyOtp)
router.post('/resend-otp',userController.resendOtp);

router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    res.redirect('/')
});
//login management
router.get("/login",userLogin,userController.loadLogin)
router.post('/login',userLogin,userController.login)
router.get('/logout',userAuth,userController.logout)

//home management && shop
router.get('/',userAuth,userController.loadHomepage);
router.get("/shop",userController.loadShoppingPage);
router.get("/filter",userAuth,userController.filterProduct);
router.get('/filterPrice',userAuth,userController.filterByPrice);
router.get('/filterLtoHPrice',userAuth,userController.filterByLtoHPrice);
router.get('/filterHtoLPrice',userAuth,userController.filterByHtoLPrice);
router.get('/filterByNew',userAuth,userController.filterByNewProduct);
router.get('/filterByColor',userAuth,userController.filterByColor);
router.get('/filterByA-Z',userAuth,userController.filterByAtoZ);
router.get('/filterByZ-A',userAuth,userController.filterByZtoA);
router.post("/search",userController.handleSearch)

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
router.get("/productDetails",productController.productDetails);

//whishlist manage
router.get("/wishlist",userAuth,wishlistController.loadWishlit);
router.post("/addToWishlist",userAuth,wishlistController.addToWishlist)
router.get("/removeFromWishlist",userAuth,wishlistController.removeProduct)

//cart management
router.get("/loadCart",userAuth,cartController.getCart);
router.post("/addToCart",userAuth,cartController.addToCart);
router.get("/removeFromCart",userAuth,cartController.removeProduct);
router.post("/decreaseQuantity", userAuth, cartController.decreaseQuantity);
router.post("/increaseQuantity", userAuth, cartController.increaseQuantity);
router.get("/getProductStock/:productId/:stockSize", userAuth, cartController.getProductStock);
//coupon management
router.put('/applyCoupon',userAuth,couponController.applyCoupon)
router.put('/cancelCoupon',userAuth,couponController.cancelCoupon)

//checkout management
router.get("/checkout",userAuth,cartController.checkoutPage);

//order management
router.post("/placeOrder",userAuth,orderController.PostPlaceOrder);
router.get("/orderHistory",userAuth,orderController.getOrderHistory);
router.post("/cancelOrder",userAuth,orderController.cancelOrder)
router.post('/returnOrder',userAuth,orderController.returnOrder)
router.get('/orderedProducts',userAuth,orderController.orderedProductDetails)
router.post('/create-order', userAuth, orderController.createOrder);
router.post('/verify-payment', userAuth, orderController.verifyPayment);
router.post('/check-wallet-balance',userAuth,orderController.checkWalletBalance);
// router.post('/complete-order-wallet',userAuth,orderController.orderCompletion)

//wallet management
router.get("/wallet",userAuth,walletController.getWallet);
router.patch('/add-amount-to-wallet',userAuth,walletController.addAmount)

//invoice download
router.get('/download-invoice/:orderId',userAuth,orderController.downloadInvoice)



module.exports=router;