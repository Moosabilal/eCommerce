const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");
const User = require("../../models/userSchema")

const getCart = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findOne({ _id: userId });
        const userCart = await Cart.findOne({ userId: userId });
        
        if (!userCart || !userCart.items.length) {
            return res.render('shopping-cart', {
                user: userData,
                cart: null,
            });
        }
        
        const productIds = userCart.items.map((item) => item.productId);
        const products = await Product.find({ _id: { $in: productIds } });

        
        res.render('shopping-cart', {
            user: userData,
            cart: userCart,
            products: products,  
        });
    } catch (error) {
        console.log("Error in getCart", error);
        res.redirect("/pageNotFound");
    }
};


const addToCart = async (req, res) => {
    try {
        const {productId} = req.body;
        const userId = req.session.user;
        const userData = await User.findById(userId);
        const userCart = await Cart.findOne({ userId: userData._id });
        const products = await Product.findById(productId)        
        if(!userCart){
            const newCart = new Cart({
                userId:userData._id,
                items:[{
                    productId:productId,
                    stock:products.stock,
                    price:products.salePrice,
                    totalPrice:products.salePrice,
                    status:'placed',
                    cancellationReason:"none",

                }]
            })
            await newCart.save()
            return res.status(200).json({status:true,message:"Product added to cart"})
        }
        const productExists = await userCart.items.some(item=>item.productId.toString()===productId.toString());
        if(productExists){
            return res.status(200).json({status:false,message:"Product already added to cart"})
        }
        userCart.items.push({
            productId:productId,
            quantity:1,
            price:products.salePrice,
            totalPrice,
            status:'placed',
            cancellationReason:"none",
        })
        await userCart.save();
        return res.status(200).json({status:true,message:"Product added to Cart"})
    } catch (error) {
        console.log("Error in addToCart", error);
        return res.status(500).json({status:false,message:"Server Error"})
    }
}

const removeProduct = async (req, res) => {
    try {
        const productId = req.query.productId;
        const userId = req.session.user;
        const userCart = await Cart.findOne({ userId: userId });
        const index = userCart.items.findIndex((item) => item.productId.toString() === productId.toString());
        userCart.items.splice(index, 1);
        await userCart.save();
        return res.redirect("/loadCart")
 
    } catch (error) {
        console.log("Error in removeProduct", error);
        return res.status(500).json({status:false,message:"Server Error"})
    }
}

module.exports = {
    getCart,
    addToCart,
    removeProduct,
}