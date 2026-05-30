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
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const generateInvoice = (order, res) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });

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
        const { addressId, shipping, payment, parentAddressId, finalAmount, subtotal, shippingValue, discountValue, taxValue, paymentMethod, paymentStatus, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        console.log(req.body)

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
        if (payment == "Card") {
            const wallet = await Wallet.findOne({ userId: user });
            if (!wallet) {
                return res.status(404).json({ success: false, message: "wallet not Found" });
            }
            if (wallet.balance < parseFloat(finalAmount)) {
                return res.status(400).send("Insufficient wallet balance");
            }

            const orderItems = cart.items.map((item) => {
                return {
                    productId: item.productId._id,
                    size: item.stock[0].size,
                    quantity: item.stock[0].quantity,
                    price: item.price,
                    totalPrice: item.totalPrice
                }
            })

            const newOrder = new Order({
                orderItems,
                userId: user,
                finalAmount: finalAmount,
                paymentMethod: payment,
                paymentStatus: 'Completed',
                addressId: parentAddressId,
                parentAddressId: addressId,
                shipping: shipping,
                discount: discountValue,
                tax: taxValue,
                status: 'Pending',
                couponApplied: couponApplied,
                razorpay_order_id: razorpay_order_id,
                razorpay_payment_id: razorpay_payment_id,
                razorpay_signature: razorpay_signature,


            })

            await newOrder.save();

            const findOrderId = await Order.findOne({ userId: user }).sort({ createdOn: -1 });
            const orderId = findOrderId.orderId;

            wallet.balance -= finalAmount;
            wallet.balance = wallet.balance.toFixed(2);
            wallet.transactions.push({
                transactionType: 'Debit',
                amount: finalAmount,
                status: 'Success',
                orderId: orderId,
                date: new Date()
            });
            await wallet.save();


        } else {


            const orderItems = cart.items.map((item) => {
                return {
                    productId: item.productId._id,
                    size: item.stock[0].size,
                    quantity: item.stock[0].quantity,
                    price: item.price,
                    totalPrice: item.totalPrice
                }
            })

            const newOrder = new Order({
                orderItems,
                userId: user,
                finalAmount: finalAmount,
                paymentMethod: payment,
                paymentStatus: paymentStatus,
                addressId: parentAddressId,
                parentAddressId: addressId,
                shipping: shipping,
                discount: discountValue,
                tax: taxValue,
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
        res.redirect('/orderHistory');


    } catch (error) {
        console.error("Error creating order:", error);
        res.redirect('pageNotFound')
    }
};

const getOrderHistory = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId)

        const addressDetails = await Address.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            { $unwind: "$address" },
        ]);
        const orderDetails = await Order.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            { $unwind: "$orderItems" },
            {
                $lookup: {
                    from: 'products',
                    localField: 'orderItems.productId',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: "$productDetails" },
            {
                $project: {
                    _id: 1,
                    "orderId": 1,
                    "parentAddressId": 1,
                    "orderItems.size": 1,
                    "orderItems.quantity": 1,
                    "orderItems.productId": 1,
                    "orderItems.price": 1,
                    "orderItems.totalPrice": 1,
                    "orderItems.status": 1,
                    "finalAmount": 1,
                    "parentAddressid": 1,
                    "shipping": 1,
                    "status": 1,
                    "paymentStatus": 1,
                    "razorpay_order_id": 1,
                    "razorpay_payment_id": 1,
                    "razorpay_signature": 1,
                    "orderId": 1,
                    "createdOn": 1,
                    "discount": 1,
                    "tax": 1,
                    "productDetails._id": 1,
                    "productDetails.productName": 1,
                    "productDetails.description": 1,
                    "productDetails.productOffer": 1,
                    "productDetails.color": 1,
                    "productDetails.productImage": 1,
                }
            },
            { $sort: { createdOn: -1 } }
        ])
        res.render('order-details', {
            orders: orderDetails,
            user: userData,
            addressData: addressDetails,
        })
    } catch (error) {
        console.log("Error when rendering order-details", error)
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

        // If the overall order is already cancelled, shipped, returned, or delivered, we cannot cancel individual items
        if (existingOrder.status === "Cancelled") {
            return res.status(200).json({ success: false, message: "Order is already cancelled" });
        }
        if (existingOrder.status === "Shipped" || existingOrder.status === "Delivered" || existingOrder.status === "Returned") {
            return res.status(200).json({ success: false, message: `You can't cancel items when the order status is ${existingOrder.status}` });
        }

        // If productId is not provided, we cancel the entire order
        if (!productId) {
            // Find all active items (neither Cancelled nor Returned)
            const activeItems = existingOrder.orderItems.filter(item => 
                item.status !== "Cancelled" && item.status !== "Returned"
            );

            if (activeItems.length === 0) {
                return res.status(200).json({ success: false, message: "No active items to cancel" });
            }

            // Calculate refund amount
            let refundAmount = 0;
            const orderSubtotal = existingOrder.orderItems.reduce((sum, item) => sum + item.totalPrice, 0);

            for (const item of activeItems) {
                if (orderSubtotal > 0) {
                    const itemShare = item.totalPrice / orderSubtotal;
                    const discountShare = existingOrder.discount * itemShare;
                    const taxShare = item.totalPrice * (existingOrder.tax / 100);
                    refundAmount += (item.totalPrice - discountShare + taxShare);
                } else {
                    refundAmount += item.totalPrice;
                }
            }

            // Since we cancel all remaining active items, refund the shipping fee too!
            const shippingFee = existingOrder.shipping === 'express' ? 15 : 5;
            refundAmount += shippingFee;

            refundAmount = Math.max(0, parseFloat(refundAmount.toFixed(2)));

            // Refund to wallet if payment status is Completed
            if (existingOrder.paymentStatus === "Completed" && refundAmount > 0) {
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
                                orderId: orderIdValue,
                            },
                        },
                    },
                    { new: true, upsert: true }
                );

                if (!wallet) {
                    return res.status(404).json({ success: false, message: "Failed to credit the amount to the user wallet" });
                }
            }

            // Mark all items as Cancelled and set order status to Cancelled
            activeItems.forEach(item => {
                item.status = "Cancelled";
            });
            existingOrder.status = "Cancelled";
            await existingOrder.save();

            // Restore stock for all cancelled items
            for (const item of activeItems) {
                await Product.updateOne(
                    { _id: new mongoose.Types.ObjectId(item.productId), "stock.size": item.size },
                    { $inc: { "stock.$.quantity": parseInt(item.quantity) } }
                );
            }

            return res.status(200).json({ success: true });
        }

        // Find the specific item in orderItems
        const targetItem = existingOrder.orderItems.find(item => 
            item.productId.toString() === productId.toString() && 
            item.size === orderSize
        );

        if (!targetItem) {
            return res.status(404).json({ success: false, message: "Item not found in order" });
        }

        // Check if the item's individual status is already Cancelled or Returned
        const currentItemStatus = targetItem.status || existingOrder.status;
        if (currentItemStatus === "Cancelled") {
            return res.status(200).json({ success: false, message: "This item is already cancelled" });
        }
        if (currentItemStatus === "Returned") {
            return res.status(200).json({ success: false, message: "This item is already returned" });
        }

        // Calculate proportional refund amount
        const orderSubtotal = existingOrder.orderItems.reduce((sum, item) => sum + item.totalPrice, 0);

        let refundAmount = 0;
        if (orderSubtotal > 0) {
            const itemShare = targetItem.totalPrice / orderSubtotal;
            const discountShare = existingOrder.discount * itemShare;
            const taxShare = targetItem.totalPrice * (existingOrder.tax / 100); // tax is stored as percentage (e.g. 5 for 5%)
            
            refundAmount = targetItem.totalPrice - discountShare + taxShare;

            // Check if this is the last active item being cancelled
            const activeItemsCount = existingOrder.orderItems.filter(item => 
                item.status !== "Cancelled" && item.status !== "Returned"
            ).length;
            if (activeItemsCount === 1) {
                const shippingFee = existingOrder.shipping === 'express' ? 15 : 5;
                refundAmount += shippingFee;
            }
        } else {
            refundAmount = targetItem.totalPrice;
        }

        // Round to 2 decimal places and ensure non-negative
        refundAmount = Math.max(0, parseFloat(refundAmount.toFixed(2)));

        // If payment status is Completed, refund the amount to wallet
        if (existingOrder.paymentStatus === "Completed") {
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
                            orderId: orderIdValue,
                        },
                    },
                },
                { new: true, upsert: true }
            );

            if (!wallet) {
                return res.status(404).json({ success: false, message: "Failed to credit the amount to the user wallet" });
            }
        }

        // Update the item's status to Cancelled
        targetItem.status = "Cancelled";

        // Check if all items in orderItems are now cancelled
        const allCancelled = existingOrder.orderItems.every(item => item.status === "Cancelled");
        if (allCancelled) {
            existingOrder.status = "Cancelled";
        }

        // Save order updates
        await existingOrder.save();

        // Restore stock
        const product = await Product.updateOne(
            { _id: new mongoose.Types.ObjectId(productId), "stock.size": orderSize },
            { $inc: { "stock.$.quantity": parseInt(orderQuantity) } }
        );

        if (product.nModified === 0) {
            return res.status(404).json({ success: false, message: "Product not found or size mismatch" });
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.log("Error when cancelling order item", error);
        res.status(500).json({ success: false, message: "Failed to cancel item" });
    }
};


const returnOrder = async (req, res) => {
    try {
        const userId = req.session.user;
        const { orderId, reason } = req.body;

        const existingOrder = await Order.findOne({ _id: new mongoose.Types.ObjectId(orderId) });

        if (!existingOrder) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }
        let orderIdValue = existingOrder.orderId;
        if (existingOrder.status === "Pending" || existingOrder.status === "Processing" || existingOrder.status === "Shipped") {
            return res.status(200).json({ success: false, message: "You can't Return this order when it is in pending, processing or shipped" });
        }

        if (existingOrder.status === "Return_Requested") {
            return res.status(200).json({ success: false, message: "Retrun request already sent wait for admin response" });
        }
        if (existingOrder.status === "Cancelled") {
            return res.status(200).json({ success: false, message: "our order is already cancelled, courier will pickup soon" });
        }
        if (existingOrder.status === "Delivered") {
            existingOrder.status = "Return_Requested";
            existingOrder.orderItems.forEach(item => {
                const itemStatus = item.status || "Delivered";
                if (itemStatus === "Delivered") {
                    item.status = "Return_Requested";
                }
            });
            const returnStatus = existingOrder.status;
            await existingOrder.save();
            return res.status(200).json({ success: true, returnStatus });
        }

        if (existingOrder.nModified === 0) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.log("Error when returning order", error);
        res.status(500).json({ success: false, message: "Failed to return order" });
    }
};

const returnOrderItem = async (req, res) => {
    try {
        const userId = req.session.user;
        const { orderId, productId, orderSize, reason } = req.body;

        const existingOrder = await Order.findOne({ _id: new mongoose.Types.ObjectId(orderId) });

        if (!existingOrder) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        // Find the specific item in orderItems
        const targetItem = existingOrder.orderItems.find(item => 
            item.productId.toString() === productId.toString() && 
            item.size === orderSize
        );

        if (!targetItem) {
            return res.status(404).json({ success: false, message: "Item not found in order" });
        }

        const currentItemStatus = targetItem.status || existingOrder.status;

        if (currentItemStatus === "Return_Requested") {
            return res.status(200).json({ success: false, message: "Return request already sent for this item" });
        }
        if (currentItemStatus === "Returned") {
            return res.status(200).json({ success: false, message: "This item is already returned" });
        }
        if (currentItemStatus === "Cancelled") {
            return res.status(200).json({ success: false, message: "This item is cancelled" });
        }

        // Set individual item status to Return_Requested
        targetItem.status = "Return_Requested";

        // Also update overall status to Return_Requested to notify admin
        existingOrder.status = "Return_Requested";

        await existingOrder.save();

        res.status(200).json({ success: true });
    } catch (error) {
        console.log("Error when requesting item return", error);
        res.status(500).json({ success: false, message: "Failed to request return" });
    }
};

const orderedProductDetails = async (req, res) => {
    try {
        const userId = req.session.user;
        const size = req.query.size
        const productId = req.query.productId
        const parentAddressId = req.query.parentAddressId
        const orderId = req.query.orderId
        const userData = await User.findById(userId);
        const addressDetails = await Address.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            { $unwind: "$address" },
            { $match: { "address._id": new mongoose.Types.ObjectId(parentAddressId) } }
        ])

        const orderDetails = await Order.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(orderId) } },
            { $unwind: "$orderItems" },
            {
                $lookup: {
                    from: 'products',
                    localField: 'orderItems.productId',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: "$productDetails" },

            {
                $project: {
                    _id: 1,
                    "orderItems.size": 1,
                    "orderItems.quantity": 1,
                    "orderItems.productId": 1,
                    "orderItems.price": 1,
                    "orderItems.totalPrice": 1,
                    "orderItems.status": 1,
                    "paymentMethod": 1,
                    "finalAmount": 1,
                    "parentAddressId": 1,
                    "shipping": 1,
                    "status": 1,
                    "orderId": 1,
                    "createdOn": 1,
                    "paymentStatus": 1,
                    "discount": 1,
                    "tax": 1,
                    "productDetails._id": 1,
                    "productDetails.productName": 1,
                    "productDetails.description": 1,
                    "productDetails.productOffer": 1,
                    "productDetails.color": 1,
                    "productDetails.productImage": 1,
                }
            }
        ])
        res.render('orderProducts', {
            user: userData,
            orderDetails: orderDetails,
            addressDetails: addressDetails,
            orderId: orderId
        })
    } catch (error) {
        console.log("Error when rendering ordered product details", error)
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

        if (!order) {
            return res.status(500).json({ success: false, message: "Error creating Razorpay order." });
        }

        res.status(200).json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            order: order // This is already in paise
        });

    } catch (error) {
        console.error("Razorpay Order Creation Error: ", error);
        res.status(500).json({ success: false, message: "Failed to create Razorpay order" });
    }
};

const verifyPayment = async (req, res) => {
    try {

        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');
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

const downloadInvoice = async (req, res) => {
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
    returnOrderItem,
    orderedProductDetails,
    createOrder,
    verifyPayment,
    checkWalletBalance,
    downloadInvoice,

};
