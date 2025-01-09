const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");
const User = require("../../models/userSchema")

const getCart = async (req, res) => {
    try {
        const userId = req.session.user;
        const user = await User.findById(userId);
        const products = await Product.find({_id:{$in:user.cart}}).populate('category');
        console.log(products)
        res.render('shopping-cart',{
            user:user,
            cart:products
        })
    } catch (error) {
        console.log("Error in getCart", error);
        res.redirect("/pageNotFound")
    }
}

const addToCart = async (req, res) => {
    try {
        const productId = req.body.productId;
        const userId = req.session.user;
        const user = await User.findById(userId);
        if(user.cart.includes(productId)){
            return res.status(200).json({status:false,message:"Product already added to cart"})
        }
        user.cart.push(productId)
        await user.save();
        return res.status(200).json({status:true,message:"Product added to Cart"})
    } catch (error) {
        console.log("Error in addToCart", error);
        return res.status(500).json({status:false,message:"Server Error"})
    }
}

module.exports = {
    getCart,
    addToCart,
}