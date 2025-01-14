const Product  = require("../../models/productSchema");
const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");

const productDetails = async (req,res)=>{
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        const productId = req.query.id;
        const product = await Product.findById(productId).populate("category");
        const findCategory = product.category;
        // const stock = product.stock.;
        let relatedProducts = await Product.find({category:findCategory._id}).populate('category');

        
        const categoryOffer = findCategory ?. categoryOffer || 0 ;
        const productOffer = product.productOffer || 0;
        const totalOffer = categoryOffer + productOffer;
        res.render("product-details",{
            user:userData,
            product:product,
            
            totalOffer:totalOffer,
            category:findCategory,
            relatedProducts:relatedProducts,
        })



    } catch (error) {
        console.error("Error in fetching product details",error)
        res.redirect("/pageNotFound")
    }
}


module.exports = {
    productDetails,
}