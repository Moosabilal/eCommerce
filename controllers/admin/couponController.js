const Coupon = require('../../models/couponSchema')
const mongoose = require("mongoose")

const showCouponDetails = async (req, res) => {
    try {
        const findCoupons = await Coupon.find()
        res.render('displayCoupon',{coupons:findCoupons})
    } catch (error) {
        res.redirect('/admin/pageerror')
    }
}

const addCoupon = async (req, res) => {
    try {
        res.render('addCoupon')
    } catch (error) {
        res.redirect('/admin/pageerror')
    }
}

const createCoupon = async (req, res) => {
    try {
        const data={
            couponName:req.body.couponName,
            couponCode:req.body.couponCode,
            startDate : new Date(req.body.startDate + "T00:00:00"),
            endDate : new Date(req.body.endDate + "T00:00:00"),
            offerPrice:parseInt(req.body.offerPrice),
            minimumPrice: parseInt(req.body.minimumPrice),
        }

        const newCoupon = new Coupon({
            name:data.couponName,
            couponCode:data.couponCode,
            createdOn:data.startDate,
            expireOn:data.endDate,
            offerPrice:data.offerPrice,
            minimumPrice:data.minimumPrice
        })
        await newCoupon.save();
        return res.redirect('/admin/displayCoupon')
    } catch (error) {
        console.error(" Error in creating coupon", error)
        res.redirect('/admin/pageerror')
    }
}

const editCoupon =  async (req, res) => {
    try {
        const id = req.query.id;
        const findCoupon = await Coupon.findById(id)

        res.render('editCoupon',{findCoupon})
    } catch (error) {
        console.error(" Error in edit coupon", error)
        res.redirect('/admin/pageerror')
    }
}

const updateCoupon = async (req, res) => {
    try {
        const couponId = req.body.couponId;
        const old = new mongoose.Types.ObjectId(couponId)
        const selectedCoupon = await Coupon.findOne({_id:old});
        if(selectedCoupon){
            const startDate = new Date(req.body.startDate);
            const endDate = new Date(req.body.endDate);
            const updatedCoupon = await Coupon.updateOne(
                { _id: old },
                {$set:{
                    name:req.body.couponName,
                    couponCode:req.body.couponCode,
                    createdOn:startDate,
                    expireOn:endDate,
                    offerPrice:parseInt(req.body.offerPrice),
                    minimumPrice:parseInt(req.body.minimumPrice)
                }},{new:true}
            );
            if(updatedCoupon!==null){
                res.status(200).json("Coupon Updated Successfully")
            }else{
                res.status(500).json("Coupon Updation Failed")
            }
        }
    } catch (error) {
        console.log(" Error in updating coupon", error)
        res.redirect('/admin/pageerror')
    }
}

const deleteCoupon = async (req, res) => {
    try {
        const id= req.query.id;
        await Coupon.deleteOne({_id:id})
        res.status(200).json({success:true,message:"Coupon Delete Successfully"})
    } catch (error) {
        console.log(" Error in deleting coupon", error)
        res. status(500).json({success:false,message:"Coupon Deletion Failed"})
    }
}

module.exports = {
    showCouponDetails,
    addCoupon,
    createCoupon,
    editCoupon,
    updateCoupon,
    deleteCoupon,
}