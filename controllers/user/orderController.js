const orderController = require("../../models/orderSchema");
const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");


const PostPlaceOrder = async (req,res)=>{
    try {
        console.log(req.body)
        const userId = req.session.user;
        const userData = await User.findById(userId);
        const cartData = await Cart.findOne({userId:userId});
        const items = cartData.items;
        let totalPrice = 0;
        items.forEach(item=>{
            totalPrice += item.totalPrice;
        })
        const order = new orderController({
            userId:userId,
            items:items,
            totalPrice:totalPrice
        })
        await order.save();
        res.redirect("/orders")
        } catch (error) {
        console.error("Error in placing order",error)
        res.redirect("/pageNotFound")
    }

}



module.exports = {
    PostPlaceOrder,
}