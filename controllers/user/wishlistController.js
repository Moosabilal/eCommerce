const User = require('../../models/userSchema');
const Product = require("../../models/productSchema")

const loadWishlit = async (req, res)=>{
    try {
        const userId = req.session.user;
        const user = await User.findById(userId);
        const products = await Product.find({_id:{$in:user.wishlist}}).populate('category');
        res.render("wishlist",{
            user,
            wishlist:products,
        })
    } catch (error) {
        console.error("Error in rendering wishlist",error);
        res.redirect("/pageNotFound")
    }
}

const addToWishlist = async (req, res) => {
    try {
        const productId = req.body.productId;
        const userId = req.session.user;
        const user = await User.findById(userId);
        if(user.wishlist.includes(productId)){
            return res.status(200).json({status:false,message:"Product Already in Wishlist"})
        }
        user.wishlist.push(productId);
        await user.save();
        return res.status(200).json({status:true,message:"Product added to wishlist"})
    } catch (error) {
        console.error("Error in saving to wishlist",error);
        return res.status(500).json({status:false,message:"Server error"})
    }
}


module.exports = {
    loadWishlit,
    addToWishlist,
}