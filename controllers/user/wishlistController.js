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
        
        const isExisting = user.wishlist.some(id => id.toString() === productId);
        
        if(isExisting){
            // Remove from wishlist
            user.wishlist = user.wishlist.filter(id => id.toString() !== productId);
            await user.save();
            return res.status(200).json({status:true, action: "removed", message:"Product removed from wishlist"})
        }
        user.wishlist.push(productId);
        await user.save();
        return res.status(200).json({status:true, action: "added", message:"Product added to wishlist"})
    } catch (error) {
        console.error("Error in saving to wishlist",error);
        return res.status(500).json({status:false,message:"Server Error"})
    }
}

const removeProduct = async (req, res) => {
    try {
        const productId = req.query.productId;
        const userId = req.session.user;
        const user = await User.findById(userId);
        const index = user.wishlist.indexOf(productId);
        user.wishlist.splice(index,1);
        await user.save();
        return res.redirect("/wishlist")
    } catch (error) {
        console.error("Error in wishlist",error);
        return res.status(500).json({status:false,messae:'Server Error'})
    }
}

module.exports = {
    loadWishlit,
    addToWishlist,
    removeProduct,
}