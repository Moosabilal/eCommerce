const mongoose = require('mongoose');
const { Schema } = mongoose;

const bannerSchema = new Schema({
    title: { 
        type: String, 
        required: true 
    },
    description: { 
        type: String, 
        required: true 
    },
    image: { 
        type: String, 
        required: true 
    },
    isActive: { 
        type: Boolean, 
        default: true 
    } // Banner visibility toggle
});

const Banner = mongoose.model('Banner', bannerSchema);
module.exports = Banner;