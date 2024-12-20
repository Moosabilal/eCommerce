const mongoose = require('mongoose');
const {Schema} = mongoose;


const addressSchema = new Schema({
    userId:{
        type: Schema.Types.ObjectId,
        ref:"User",
        required: true
    },
    address:{
        addressType:{
            type:String,
            required:true
        },
        name:{
            type:String,
            requied:true
        },
        city:{
            type:String,
            required:true
        },
        landMark:{
            type:String,
            required:true
        },
        state:{
            type:String,
            required:true
        },
        pincode:{
            type:Number,
            required:true
        },
        phone:{
            type:String,
            required:true
        },
        altPhone:{
            type:String,
            required:true
        }
    }
})


const Adress = mongoose.model("Adress",addressSchema)

module.exports=Adress;