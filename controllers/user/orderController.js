const { v4: uuidv4 } = require('uuid'); // Import UUID for unique order ID generation
const mongoose = require('mongoose')
const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");
const Address = require('../../models/addressSchema')
const Wallet = require('../../models/walletSchema')
const Razorpay = require('razorpay')
const crypto = require('crypto')


const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID, // Replace with your test Key ID
    key_secret: process.env.RAZORPAY_KEY_SECRET, // Replace with your test Key Secret
});

const PostPlaceOrder = async (req, res) => {
    try {
        const {addressId, shipping, payment, parentAddressId, finalAmount, subtotal, shippingValue, discountValue, taxValue} = req.body;

        const user = req.session.user;
        const cart = await Cart.findOne({ userId: user }).populate('items.productId')
        if (!cart) {
            return res.status(404).send("Cart not found");
        }
        const findProduct = cart.items.map(product => product.productId);
        const products = await Product.find({ _id: { $in: findProduct } });
        if(payment == "Card"){
            const wallet = await Wallet.findOne({ userId: user });
            if (!wallet) {
                return res.status(404).json({success:false,message:"wallet not Found"});
            }

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
            discount:discountValue,
            tax:taxValue,
            status: 'Pending'


        })
            
        await newOrder.save();

        const findOrderId = await Order.findOne({ userId: user }).sort({createdOn:-1});
        const orderId = findOrderId.orderId;
        console.log("orderId",orderId)
        
            console.log("balance",finalAmount)
            console.log("walletsdf",wallet.balance)

            wallet.balance -= finalAmount;
            wallet.balance = wallet.balance.toFixed(2);
            console.log("wallet",wallet.balance)
            wallet.transactions.push({
                transactionType: 'Debit',
                amount: finalAmount,
                status: 'Success',
                orderId: orderId,
                date: new Date()
            });
            await wallet.save();


    }else{
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
            discount:discountValue,
            tax:taxValue,
            status: 'Pending'


        })
            
        await newOrder.save();

    }
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
        const addressDetails = await Address.aggregate([
            {$match: {userId: new mongoose.Types.ObjectId(userId)} },
            { $unwind:"$address"},
        ]);
        const orderDetails = await Order.aggregate([
            { $match:{userId:new mongoose.Types.ObjectId(userId)}},
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
                "orderId":1,
                "parentAddressId":1,
                "orderItems.size":1,
                "orderItems.quantity":1,
                "orderItems.productId":1,
                "orderItems.price":1,
                "orderItems.totalPrice":1,
                "finalAmount":1,
                "parentAddressid":1,
                "shipping":1,
                "status":1,
                "orderId":1,
                "createdOn":1,
                "productDetails._id":1,
                "productDetails.productName":1,
                "productDetails.description":1,
                "productDetails.productOffer":1,
                "productDetails.color":1,
                "productDetails.productImage":1,
            }},
            {$sort:{createdOn:-1}}
        ])
        res.render('order-details',{
            orders:orderDetails,
            user:userData,
            addressData:addressDetails,
        })
    } catch (error) {
        console.log("Error when rendering order-details",error)
        res.redirect("/pageNotFound")
        
    }
}

const cancelOrder = async (req, res) => {
    try {
        const userId = req.session.user;
        const { orderId, productId, orderQuantity, orderSize } = req.body;

        const existingOrder = await Order.findOne({ _id: new mongoose.Types.ObjectId(orderId) });
        console.log("orders",existingOrder)

        if (!existingOrder) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }
        let orderIdValue = existingOrder.orderId; 
        console.log(orderIdValue)
        if(existingOrder.status === "Pending" || existingOrder.status === "Processing" || existingOrder.status === "Shipped"){
            return res.status(200).json({ success: false, message: "You can't cancel this order when it is in pending, processing or shipped" });
        }
        if (existingOrder.status === "Cancelled") {
            return res.status(200).json({ success: false, message: "Order is already cancelled" });
        }

        let refundAmount = existingOrder.finalAmount;
        const wallet = await Wallet.findOneAndUpdate(
            { userId: new mongoose.Types.ObjectId(userId) },
            {
                $inc: { balance: refundAmount },
                $push: {
                    transactions: {
                        transactionType: "Credit",
                        amount: refundAmount,
                        status: "Success",
                        date: new Date(),
                        orderId:orderIdValue,
                    },
                },
            },
            {
                new: true,
                upsert: true,
                setDefaultsOnInsert: false,
                runValidators: true,
            }
        );

        if (!wallet) {
            return res.status(404).json({ success: false, message: "Failed to credit the amount to the wallet, Please contact the admin" });
        }

        existingOrder.status = "Cancelled";
        await existingOrder.save();

        if (existingOrder.nModified === 0) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        const product = await Product.updateOne(
            { _id: new mongoose.Types.ObjectId(productId), "stock.size": orderSize },
            { $inc: { "stock.$.quantity": orderQuantity } }
        );

        if (product.nModified === 0) {
            return res.status(404).json({ success: false, message: "Product not found or size mismatch" });
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.log("Error when cancelling order", error);
        res.redirect("/pageNotFound");
    }
};


const returnOrder = async (req, res) => {
    try {
        const userId = req.session.user;
        const { orderId, productId, orderQuantity, orderSize } = req.body;

        const existingOrder = await Order.findOne({ _id: new mongoose.Types.ObjectId(orderId) });
        console.log("orders",existingOrder)

        if (!existingOrder) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }
        let orderIdValue = existingOrder.orderId; 
        console.log(orderIdValue)
        if(existingOrder.status === "Pending" || existingOrder.status === "Processing" || existingOrder.status === "Shipped"){
            return res.status(200).json({ success: false, message: "You can't Return this order when it is in pending, processing or shipped" });
        }

        if (existingOrder.status === "Return Request") {
            return res.status(200).json({ success: false, message: "Retrun request already sent wait for admin response" });
        }
        if (existingOrder.status === "Cancelled") {
            return res.status(200).json({ success: false, message: "our order is already cancelled, courier will pickup soon" });
        }

        let refundAmount = existingOrder.finalAmount;
        const wallet = await Wallet.findOneAndUpdate(
            { userId: new mongoose.Types.ObjectId(userId) },
            {
                $inc: { balance: refundAmount },
                $push: {
                    transactions: {
                        transactionType: "Credit",
                        amount: refundAmount,
                        status: "Success",
                        date: new Date(),
                        orderId:orderIdValue,
                    },
                },
            },
            {
                new: true,
                upsert: true,
                setDefaultsOnInsert: false,
                runValidators: true,
            }
        );

        if (!wallet) {
            return res.status(404).json({ success: false, message: "Failed to credit the amount to the wallet, Please contact the admin" });
        }

        existingOrder.status = "Returned";
        await existingOrder.save();

        if (existingOrder.nModified === 0) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        const product = await Product.updateOne(
            { _id: new mongoose.Types.ObjectId(productId), "stock.size": orderSize },
            { $inc: { "stock.$.quantity": orderQuantity } }
        );

        if (product.nModified === 0) {
            return res.status(404).json({ success: false, message: "Product not found or size mismatch" });
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.log("Error when cancelling order", error);
        res.redirect("/pageNotFound");
    }
};

const orderedProductDetails = async (req,res)=>{
    try {
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
                "productDetails._id":1,
                "productDetails.productName":1,
                "productDetails.description":1,
                "productDetails.productOffer":1,
                "productDetails.color":1,
                "productDetails.productImage":1,
            }}
        ])
        res.render('orderProducts',{
            user:userData,
            orderDetails:orderDetails,
            addressDetails:addressDetails
        })
    } catch (error) {
        console.log("Error when rendering ordered product details",error)
        res.redirect("/pageNotFound")
        
    }
}




const createOrder = async (req, res) => {
    const { amount, currency } = req.body; 

    try {
        const options = {
            amount: amount * 100, 
            currency: currency || 'INR',
            receipt: `receipt_${Date.now()}`, 
        };

        const order = await razorpay.orders.create(options);
        res.status(200).json({ success: true, orderId: order.id, amount: order.amount });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const verifyPayment = (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET) // Use your Key Secret
        .update(body.toString())
        .digest('hex');

    if (expectedSignature === razorpay_signature) {
        res.status(200).json({ success: true, message: 'Payment verified!' });
    } else {
        res.status(400).json({ success: false, message: 'Invalid signature!' });
    }
};



const checkWalletBalance = async (req, res) => {
    try {
        const userId = req.session.user;
        const { amount } = req.body;
        console.log(amount)

        const wallet = await Wallet.findOne({ userId: new mongoose.Types.ObjectId(userId) });

        if (!wallet) {
            return res.status(404).json({ success: false, message: "Wallet not found" });
        }

        if (wallet.balance >= amount) {
            return res.status(200).json({ success: true, balance: wallet.balance });
        } else {
            return res.status(200).json({ success: false, balance: wallet.balance });
        }
    } catch (error) {
        console.error("Error checking wallet balance:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};



module.exports = {
    PostPlaceOrder,
    getOrderHistory,
    cancelOrder,
    returnOrder,
    orderedProductDetails,
    createOrder,
    verifyPayment,
    checkWalletBalance

};
