const mongoose = require('mongoose');
const {Schema} = mongoose;

const SizeSchema = new Schema({
    small:{
        type:String,
        default:0
    },
    medium:{
        type:Number,
        default:0
    },
    large:{
        type:Number,
        default:0
    },
    extraLarge:{
        type:Number,
        default:0
    },
    doubleExtraLarge:{
        type:Number,
        default:0
    },
    createdOn:{
        type:Date,
        default:Date.now
    }
    
})

const Size = mongoose.model('Size',SizeSchema);

module.exports = Size;