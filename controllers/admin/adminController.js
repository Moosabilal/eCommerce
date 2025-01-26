const User = require('../../models/userSchema');
const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema');
const Cart = require('../../models/cartSchema');
const Coupon = require('../../models/couponSchema')
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const pageerror = async (req, res,) => {
    res.render("admin-error")
}


const loadLogin = (req,res)=> {
    if(req.session.admin){
        return res.redirect('/admin/')
    }
    res.render("admin-login",{message:null})
}

const login = async (req,res)=>{
    try {
        const {email, password} = req.body;
        const admin = await User.findOne({email,isAdmin:true});
        if(admin) {
            const passwordMatch = await bcrypt.compare(password,admin.password);
            if(passwordMatch) {
                req.session.admin = true;
                return res.redirect('/admin')
            }else{
                return res.render('admin-login',{message:"Invalid Email or Password"});
            }
        }else{
            return res.render('admin-login',{message:"Invalid Email or Password"})
        }
    } catch (error) {
        console.log("login error",error);
        return res.redirect('/admin/pageerror')
        
    }
}

const loadDashboard = async (req,res)=>{
    if(req.session.admin){
        try {
            console.log("hellolsljdfng")
            const admin = await User.findOne({isAdmin:true});
            Order.aggregate([
                {
                  $facet: {
                    totalOrders: [{ $count: "totalOrders" }],
                    totalDiscountPrice: [{ $group: { _id: null, totalDiscount: { $sum: "$discount" } } }],
                    discountGreaterThanZero: [
                      { $match: { discount: { $gt: 0 } } },
                      { $count: "totalDiscountCount" }
                    ],
                    totalSales: [
                      { $unwind: "$orderItems" },
                      { $group: { _id: "$orderItems.productId" } },
                      { $count: "totalSales" }
                    ]
                  }
                },
                {
                  $project: {
                    totalOrders: { $arrayElemAt: ["$totalOrders.totalOrders", 0] },
                    totalDiscountPrice: { $arrayElemAt: ["$totalDiscountPrice.totalDiscount", 0] },
                    totalDiscountCount: { $arrayElemAt: ["$discountGreaterThanZero.totalDiscountCount", 0] },
                    totalSales: { $arrayElemAt: ["$totalSales.totalSales", 0] }
                  }
                }
              ]).then(results => {
                const totalOrders = results[0]?.totalOrders || 0;
                const totalDiscountPrice = results[0]?.totalDiscountPrice || 0;
                const totalDiscountCount = results[0]?.totalDiscountCount || 0;
                const totalSales = results[0]?.totalSales || 0;

                console.log("Total Orders:", totalOrders);
  console.log("Total Discount Price:", totalDiscountPrice);
  console.log("Total Discount Count (greater than 0):", totalDiscountCount);
  console.log("Total Sales (unique product count):", totalSales);
})
            

            res.render("dashboard");
        } catch (error) {
            res.redirect("/admin/pageerror")
        }
    }   
}

const logout = async (req,res)=>{
    try {
        req.session.destroy(err=>{
            if(err){
                console.log("Error in destroying session:",err);
                return res.redirect('/admin/pageerror')
            }
            res.redirect('/admin/login')
        })
    } catch (error) {
        console.log("Unexpected error during logout ; ",error)
        res.redirect('/admin/pageerror')
    }
}




module.exports = {
    loadLogin,
    login,
    loadDashboard,
    pageerror,
    logout,
}