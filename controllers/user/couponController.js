const Coupon = require('../../models/couponSchema');
const User = require('../../models/userSchema')


const applyCoupon = async (req, res) => {   
    try {
        const userId = req.session.user;
        const couponCode = req.body.coupon;
        let couponC = couponCode.trim();

        const coupon = await Coupon.findOne({ couponCode: couponC,expireOn: { $gte: new Date() } });
        if (!coupon) {
            return res.status(404).json({ success: false, message: "Coupon not found" });
        }
        const usedCoupon = await Coupon.findOne({ userId: userId });
        if (usedCoupon) {
            return res.status(400).json({ success: false, message: "User has already applied a coupon" });
        }
        coupon.userId.push(userId);
        await coupon.save();

        const discount = coupon.offerPrice;
        console.log("coupon",coupon)

        return res.status(200).json({
            success: true,
            message: "Coupon applied successfully",
            discount: discount,
            appliedCoupon: coupon,
        });
    } catch (error) {
        console.log("Error in applyCoupon", error);
        res.status(500).json({ status: false, message: "Internal Server Error" });
        
    }
}

const cancelCoupon = async (req, res) => {
    try {
        couponCode = req.body.coupon
        let couponC = couponCode.trim();
        const user = req.session.user
        const coupon = await Coupon.findOneAndUpdate({couponCode:couponC},{})
        if (!coupon) {
            return res.status(404).json({ success: false, message: "Coupon not found" });
        }

        const userIndex = coupon.userId.indexOf(user);
        if (userIndex > -1) {
            coupon.userId.splice(userIndex, 1);
            await coupon.save();
            return res.status(200).json({ success: true, message: "Coupon cancelled successfully" });
        } else {
            return res.status(400).json({ success: false, message: "This Coupon not applied" });
        }
        console.log(coupon)
    } catch (error) {
        console.log(" Error in cancelCoupon", error);
        res.status(500).json({ status: false, message: "Internal Server Error" });
    }
}

module.exports = {
    applyCoupon,
    cancelCoupon,
}
