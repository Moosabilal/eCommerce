const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");
const Address = require('../../models/addressSchema')

const PostPlaceOrder = async (req, res) => {
    try {
        const {addressId, shipping, payment, parentAddressId, finalAmount, subtotal, shippingValue} = req.body;
        console.log(parentAddressId)
        const user = req.session.user;
        const cart = await Cart.findOne({ userId: user }).populate('items.productId')
        if (!cart) {
            return res.status(404).send("Cart not found");
        }
        findProduct = cart.items.map(product => product.productId);
        const products = await Product.find({ _id: { $in: findProduct } });
        const orderItems = cart.items.map((item)=>{
            return{
                productId:item.productId._id,
                size:item.stock[0].size,
                quantity:item.stock[0].quantity,
                price:item.price,
                totalPrice:item.totalPrice
            }
        })

        const newOrder = new Order({
            orderItems,
            userId: user,
            finalAmount: finalAmount,
            paymentMethod: payment,
            addressId: parentAddressId,
            parentAddressId:addressId[1],
            shipping: shipping,
            status: 'Pending'


        })
            
        await newOrder.save();
        let findSize = cart.items.map((item) => item.stock[0].size);
        products.forEach((product) => {
            product.stock.forEach((stock) => {
                if (findSize.includes(stock.size)) {
                    const cartItem = cart.items.find(item => item.stock[0].size === stock.size && item.productId.equals(product._id));
                    if (cartItem) {
                        stock.quantity -= cartItem.stock[0].quantity;
                    }
                }
            });
            product.save();
        });

        cart.items = [];
        await cart.save();
        res.redirect('/shop');
    } catch (error) {
        console.error("Error creating order:", error);
        res.redirect('pageNotFound') 
       }
};

const getOrderHistory = async (req,res)=>{
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId)
        const orders = await Order.find({userId:userId})
        .populate('addressId') 
        .populate('parentAddressId'); 
        const addressDetails = await Address.aggregate([
            { $unwind: "$address" },
            {
                $lookup: {
                    from: "orders",
                    localField: "address._id",
                    foreignField: "parentAddressId",
                    as: "matchedOrders"
                }
            },
            { $unwind: "$matchedOrders" },
            {
                $project: {
                    _id: 0,
                    parentAddress: "$address",
                    orderId: "$matchedOrders._id"
                }
            }
        ]);

        const enrichedOrders = orders.map(order => {
            const parentAddress = addressDetails.find(
                addr => addr.orderId.toString() === order._id.toString()
            );
            return {
                ...order.toObject(),
                parentAddress: parentAddress ? parentAddress.parentAddress : null,
            };
        });
        res.render('order-details',{
            orders:enrichedOrders,
            user:userData
        })
    } catch (error) {
        console.log("Error when rendering order-details",error)
        res.redirect("/pageNotFound")
        
    }
}

const cancelOrder = async (req,res)=>{
    try {
        const {orderId} = req.body
        const order = await Order.findById(orderId);
        order.status = "Cancelled";
        await order.save();
        res.status(200).json({success:true})

    } catch (error) {
        console.log("Error when cancelling order",error)
        res.redirect("/pageNotFound")
        
    }
}

module.exports = {
    PostPlaceOrder,
    getOrderHistory,
    cancelOrder,
};
