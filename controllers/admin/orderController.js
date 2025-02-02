const Order = require('../../models/orderSchema')
const Product = require('../../models/productSchema')
const User = require('../../models/userSchema')
const Cart = require('../../models/cartSchema')
const Address = require('../../models/addressSchema')
const mongoose = require('mongoose')


const getOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('userId', 'name email') 
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
                userId: "$userId",
                parentAddress: "$address",
                orderId: "$matchedOrders._id",
                uniqueOrderId: "$matchedOrders.orderId",
            }
            },
            {$sort:{createdOn:-1 }}
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

        enrichedOrders.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));

        res.render('orderDetails', {
            orders: enrichedOrders,
        });
    } catch (error) {
        console.error("Error in getOrders:", error);
        res.redirect('/admin/pageerror');
    }
};

const statusSelection = async (req,res)=>{
    try {
        const {orderId,status} = req.body;
        const order = await Order.findByIdAndUpdate(orderId, { status }, { new: true });
        if(!order){
            return res.status(404).json({ status:false,message: "Order not found" });
        }
        res.status(200).json({ success:true,message: "Order status updated successfully" });

    } catch (error) {
        console.error("Error in statusSelection:", error);
        res.status(500).json({ success:false,message: "Failed to update order status" });
        
    }
}

const deleteOrder = async (req, res) => {
    try {
        const {orderId} = req.body;
        const order = await Order.findByIdAndDelete(orderId);
        if(!order){
            return res.status(404).json({ status:false});
            }
            res.status(200).json({ success:true });

    } catch (error) {
        console.error("Error in deletion of order",error);
        res.status(500).json({ success:false,message: "Failed to delete order" });
        
    }
}

const orderedDetailsPage = async (req,res)=>{
    try {
        console.log(req.query)
        const userId = req.session.user;
        const size = req.query.size
        const productId = req.query.productId
        const parentAddressId = req.query.parentAddressId
        const orderId = req.query.orderId
        const userData = await User.findById(userId);
        const addressDetails = await Address.aggregate([
            {$match: {userId: new mongoose.Types.ObjectId(userId)} },
            { $unwind:"$address"},
            { $match: { "address._id": new mongoose.Types.ObjectId(parentAddressId) }}
        ])

        const orderDetails = await Order.aggregate([
            { $match:{_id:new mongoose.Types.ObjectId(orderId)}},
            { $unwind:"$orderItems"},
            { $lookup:{
                from: 'products',
                localField: 'orderItems.productId',
                foreignField: '_id',
                as: 'productDetails'
            }},
            { $unwind:"$productDetails"},
           
            { $project:{
                _id:1,
                "parentAddressId":1,
                "orderItems.size":1,
                "orderItems.quantity":1,
                "orderItems.productId":1,
                "orderItems.price":1,
                "orderItems.totalPrice":1,
                "paymentMethod":1,
                "finalAmount":1,
                "parentAddressid":1,
                "shipping":1,
                "status":1,
                "orderId":1,
                "createdOn":1,
                "paymentStatus":1,
                "productDetails._id":1,
                "productDetails.productName":1,
                "productDetails.description":1,
                "productDetails.productOffer":1,
                "productDetails.color":1,
                "productDetails.productImage":1,
            }}
        ])
        res.render('orderedDetails',{
            user:userData,
            orderDetails:orderDetails,
            addressDetails:addressDetails,
            orderId:orderId
        })
    } catch (error) {
        console.log("Error when rendering ordered product details",error)
        res.redirect("/pageNotFound")
        
    }
}

module.exports = {
    getOrders,
    statusSelection,
    deleteOrder,
    orderedDetailsPage,
};

