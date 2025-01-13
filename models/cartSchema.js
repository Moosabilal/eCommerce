const mongoose = require('mongoose');
const {Schema} = mongoose;

const cartSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',    
        required: true
    },
    items: [{
        productId: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true //true
        },
        stock:[{
            size:{
                type:String,
                required:true
            },
            quantity:{
                type:Number,
                required:true
                }
        }],
        price: {
            type: Number,
            required: true //true

        },
        totalPrice: {
            type: Number,
            required: true //true
        },
        status: {
            type: String,
            default: 'placed'
        },
        cancellationReason: {
            type: String,
            default: 'none'
        }
   }]
})


const Cart = mongoose.model('Cart',cartSchema)

module.exports = Cart;