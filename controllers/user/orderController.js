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
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');


const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID, // Replace with your test Key ID
    key_secret: process.env.RAZORPAY_KEY_SECRET, // Replace with your test Key Secret
});

const generateInvoice = (order, res) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });

    // Set response headers for PDF download
    res.setHeader('Content-Disposition', `attachment; filename=invoice_${order.orderId}.pdf`);
    res.setHeader('Content-Type', 'application/pdf');

    doc.pipe(res);

    // ---------- HEADER ----------
    doc.image('public/images/logo.png', 50, 40, { width: 100 });    
    doc.fillColor('#000').fontSize(20).font('Helvetica-Bold').text('INVOICE', 400, 50)
    
    doc.fontSize(10).text(`Invoice #: ${order.orderId}`, 400, 80);
    doc.text(`Date: ${new Date(order.createdOn).toLocaleString()}`, 400, 105);
    doc.moveDown(2);

    // ---------- BILLING DETAILS ----------
    doc.fillColor('#444').fontSize(14).font('Helvetica-Bold').text('Bill To:', 50, doc.y);
    doc.fillColor('#000').fontSize(12).font('Helvetica');
    doc.text(`Name: ${order.userId.name}`, 50);
    doc.text(`Email: ${order.userId.email}`, 50);
    doc.text(`Phone: ${order.userId.phone}`, 50);
    doc.moveDown(1);

    // ---------- ORDER TABLE HEADER ----------
    const startX = 50, tableY = doc.y + 10;
    const columnWidths = [30, 200, 50, 50, 80, 80]; // Column spacing

    doc.fillColor('#fff').rect(startX, tableY, 500, 20).fill('#000'); // Header background
    doc.fillColor('#fff').fontSize(12).font('Helvetica-Bold');
    doc.text('No', startX + 5, tableY + 5);
    doc.text('Item Description', startX + columnWidths[0] + 5, tableY + 5);
    doc.text('Size', startX + columnWidths[0] + columnWidths[1] + 5, tableY + 5);
    doc.text('Qty', startX + columnWidths[0] + columnWidths[1] + columnWidths[2] + 5, tableY + 5);
    doc.text('Price', startX + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3] + 5, tableY + 5);
    doc.text('Total', startX + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3] + columnWidths[4] + 5, tableY + 5);
    doc.fillColor('#000');

    let rowY = tableY + 25;
    doc.fontSize(11).font('Helvetica');

    order.orderItems.forEach((item, index) => {
        // Alternating row color
        if (index % 2 === 0) {
            doc.fillColor('#f5f5f5').rect(startX, rowY, 500, 20).fill();
        }

        doc.fillColor('#000');
        doc.text(index + 1, startX + 5, rowY + 5);
        doc.text(item.productId.productName || 'Product', startX + columnWidths[0] + 5, rowY + 5);
        doc.text(item.size, startX + columnWidths[0] + columnWidths[1] + 5, rowY + 5);
        doc.text(item.quantity.toString(), startX + columnWidths[0] + columnWidths[1] + columnWidths[2] + 5, rowY + 5);
        doc.text(`₹${item.price}`, startX + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3] + 5, rowY + 5);
        doc.text(`₹${item.totalPrice}`, startX + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3] + columnWidths[4] + 5, rowY + 5);
        rowY += 20;
    });

    doc.moveTo(startX, rowY).lineTo(550, rowY).stroke(); // Bottom border

    // ---------- ORDER SUMMARY ----------
    rowY += 15;
    doc.fillColor('#222').fontSize(12).font('Helvetica-Bold');
    doc.text('Subtotal:', 400, rowY);
    doc.text('Tax (5%):', 400, rowY + 20);
    doc.text('Discount:', 400, rowY + 40);
    doc.text('Total Amount:', 400, rowY + 60);
    
    doc.fillColor('#000').fontSize(12).font('Helvetica');
    doc.text(`₹${order.finalAmount - order.tax}`, 480, rowY);
    doc.text(`₹${order.tax}`, 480, rowY + 20);
    doc.text(`₹${order.discount}`, 480, rowY + 40);
    doc.fontSize(14).font('Helvetica-Bold').text(`₹${order.finalAmount}`, 480, rowY + 60);

    doc.moveDown(2);

    // ---------- PAYMENT DETAILS ----------
    doc.fillColor('#444').fontSize(14).font('Helvetica-Bold').text('Payment Information:', 50);
    doc.fillColor('#000').fontSize(12).font('Helvetica');
    doc.text(`Payment Method: ${order.paymentMethod}`, 50);
    doc.text(`Payment Status: ${order.paymentStatus}`, 50);

    if (order.paymentMethod === 'COD') {
        doc.moveDown(1);
        doc.fillColor('red').font('Helvetica-Bold').text('Cash on Delivery - Please have the exact amount ready.', 50); //⚠️
        doc.fillColor('#000');
    }

    doc.moveDown(1);

    // ---------- FOOTER ----------
    doc.moveDown(1);
    doc.fontSize(10).fillColor('#444').font('Helvetica-Bold').text('Terms & Conditions:', 50);
    doc.fontSize(10).font('Helvetica').text('1. This is a system-generated invoice.', 50);
    doc.text('2. Goods once sold are non-refundable.', 50);
    doc.text('3. For support, contact our customer service.', 50);

    doc.moveDown(2);
    doc.fontSize(12).fillColor('#000').font('Helvetica-Bold').text('Thank you for shopping with us!', { align: 'center' });

    doc.end();
};

const PostPlaceOrder = async (req, res) => {
    try {
        console.log("req.body",req.body)
        const {addressId, shipping, payment, parentAddressId, finalAmount, subtotal, shippingValue, discountValue, taxValue, paymentMethod, paymentStatus, razorpay_order_id, razorpay_payment_id, razorpay_signature} = req.body;

        const user = req.session.user;
        const cart = await Cart.findOne({ userId: user }).populate('items.productId')
        if (!cart) {
            return res.status(404).send("Cart not found");
        }
        let couponApplied = false;
        if (discountValue > 0) {
            couponApplied = true;
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
            paymentStatus: 'Completed',
            addressId: parentAddressId,
            parentAddressId:addressId[1],
            shipping: shipping,
            discount:discountValue,
            tax:taxValue,
            status: 'Pending',
            couponApplied: couponApplied,
            razorpay_order_id: razorpay_order_id,
            razorpay_payment_id: razorpay_payment_id,
            razorpay_signature: razorpay_signature,


        })
            
        await newOrder.save();

        const findOrderId = await Order.findOne({ userId: user }).sort({createdOn:-1});
        const orderId = findOrderId.orderId;
        
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
            paymentStatus:paymentStatus,
            addressId: parentAddressId,
            parentAddressId:addressId[1],
            shipping: shipping,
            discount:discountValue,
            tax:taxValue,
            status: 'Pending',
            couponApplied: couponApplied,
            razorpay_order_id: razorpay_order_id,
            razorpay_payment_id: razorpay_payment_id,
            razorpay_signature: razorpay_signature,


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
                "paymentStatus":1,
                "razorpay_order_id":1,
                "razorpay_payment_id":1,
                "razorpay_signature":1,
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
            // {
            //     new: true,
            //     upsert: true,
            //     setDefaultsOnInsert: false,
            //     runValidators: true,
            // }
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
            // {
            //     new: true,
            //     upsert: true,
            //     setDefaultsOnInsert: false,
            //     runValidators: true,
            // }
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
            addressDetails:addressDetails,
            orderId:orderId
        })
    } catch (error) {
        console.log("Error when rendering ordered product details",error)
        res.redirect("/pageNotFound")
        
    }
}




const createOrder = async (req, res) => {
    const { amount, currency } = req.body;

    try {
        const amountInPaise = Math.round(parseFloat(amount) * 100);

        const options = {
            amount: amountInPaise,  
            currency: currency || 'INR',
            receipt: `receipt_${Date.now()}`, 
        };

        const order = await razorpay.orders.create(options);
        console.log("order",order)

        if (!order) {
            return res.status(500).json({ success: false, message: "Error creating Razorpay order." });
        }

        res.status(200).json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            order:order // This is already in paise
        });

    } catch (error) {
        console.error("Razorpay Order Creation Error: ", error);
        res.status(500).json({ success: false, message: "Failed to create Razorpay order" });
    }
};

const verifyPayment = async (req, res) => {
    try {
        
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    console.log("razorpaync",req.body);

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET) 
        .update(body.toString())
        .digest('hex');
        console.log("expectedSignature",expectedSignature)
        console.log("razorpay_signature",razorpay_signature)
    if (expectedSignature === razorpay_signature) {
        const order = await Order.findOne({ razorpay_order_id });
            if (order) {

            order.razorpay_payment_id = razorpay_payment_id;
            order.razorpay_signature = razorpay_signature;
            order.paymentStatus = "Completed";
            await order.save();

            return res.status(200).json({ success: true, message: "Payment verified and order updated" });
            } else {
                res.status(200).json({ success: true, message: 'Payment verified!' });

            }
    } else {
        res.status(400).json({ success: false, message: 'Invalid signature!' });
    }
    } catch (error) {
        console.error("Razorpay Payment Verification Error: ", error);
        res.status(500).json({ success: false, message: "Failed to verify payment" });          
    }
};



const checkWalletBalance = async (req, res) => {
    try {
        const userId = req.session.user;
        const { amount } = req.body;

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

const downloadInvoice  = async (req, res)=>{
    try {
        const order = await Order.findOne({ orderId: req.params.orderId }).populate('userId orderItems.productId userId.addressId');
        if (!order) return res.status(404).json({ error: 'Order not found' });


        generateInvoice(order, res);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}



module.exports = {
    PostPlaceOrder,
    getOrderHistory,
    cancelOrder,
    returnOrder,
    orderedProductDetails,
    createOrder,
    verifyPayment,
    checkWalletBalance,
    downloadInvoice,

};
