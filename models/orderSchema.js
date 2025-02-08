const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const {Schema} = mongoose;
const {v4:uuidv4} = require('uuid');

const orderSchema = new Schema({
    orderId : {
        type: String,
        default:()=>uuidv4(),
        unique: true
    },
    userId : {
        type: Schema.Types.ObjectId,
        ref: 'User',
        },
    orderItems:[{
        productId: {
            type:Schema.Types.ObjectId,
            ref:'Product',
            required:true
        },
        size:{
            type: String,
            required: true
        },
        quantity: {
            type: Number,
            required:true
        },
        price: {
            type: Number,
            default:0
        },
        totalPrice: {
            type: Number,
            required: true
        },

        
    }],
    
    finalAmount: {
        type: Number,
        required: true
    },
    paymentMethod:{
        type: String,
        required: true,
        enum: ['COD', 'Card', 'UPI']
    },
    paymentStatus: {
        type: String,
        required: false, //true
        enum: ['Pending', 'Completed', 'Failed', 'Refunded'],
        default: 'Pending',
    },
    addressId: {
        type: Schema.Types.ObjectId,
        ref: 'Address',
        required: true
    },
    parentAddressId:{
        type: Schema.Types.ObjectId,
        ref: 'Address',

    },
    // invoiceDate: {
    //     type: Date,
    //     default: Date.now,
    // },
    shipping:{
        type: String,
        required: true,
        enum: ['standard', 'express']
    },
    discount:{
        type:Number,
        default:0
    },
    tax:{
        type:Number,
        default:0
    },
    status: {
        type: String,
        required: true,
        enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Return_Requested', 'Returned'],
    },
    createdOn: {
        type: Date,
        default: Date.now,
        required:true
    },
    couponApplied: {
        type: Boolean,
        default: false
    },
    razorpay_order_id:{
        type: String,
        default: null
    },
    razorpay_payment_id:{
        type: String,
        default: null
    },
    razorpay_signature:{
        type: String,
        default: null
    },
    
})

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;