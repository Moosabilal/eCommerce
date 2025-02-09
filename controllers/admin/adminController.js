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
                    totalQuantitySold: [
                    { $match: { status: "Delivered" } },
                    { $unwind: "$orderItems" },
                    { $group: { _id: null, totalQuantity: { $sum: "$orderItems.quantity" } } }
                    ]
                }
                },
                {
                $project: {
                    totalOrders: { $arrayElemAt: ["$totalOrders.totalOrders", 0] },
                    totalDiscountPrice: { $arrayElemAt: ["$totalDiscountPrice.totalDiscount", 0] },
                    totalDiscountCount: { $arrayElemAt: ["$discountGreaterThanZero.totalDiscountCount", 0] },
                    totalQuantitySold: { $arrayElemAt: ["$totalQuantitySold.totalQuantity", 0] }
                }
                }
            ]).then(async results => {
                const totalOrders = results[0]?.totalOrders || 0;
                const totalDiscountPrice = results[0]?.totalDiscountPrice || 0;
                const totalDiscountCount = results[0]?.totalDiscountCount || 0;
                const totalQuantitySold = results[0]?.totalQuantitySold || 0;
                
                const mostSoldProduct = await Order.aggregate([
                    {$match: { status: "Delivered" } },
                    { $unwind: "$orderItems" },
                    { $group: { _id: "$orderItems.productId", count: { $sum: "$orderItems.quantity" } } },
                    { $sort: { count: -1 } },
                    { $limit: 10 },
                    {$lookup:{
                        from: 'products',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'productDetails'
                    }},
                    {$unwind: '$productDetails'},
    
                ])

                const bestSellingCategory = await Order.aggregate([
                    {$match: { status: "Delivered" } },
                    { $unwind: "$orderItems" },
                    {$lookup:{
                        from: 'products',
                        localField: 'orderItems.productId',
                        foreignField: '_id',
                        as: 'productDetails'
                    }},
                    {$unwind: '$productDetails'},
                    {$group: { _id: "$productDetails.category", count: { $sum: "$orderItems.quantity" } } },
                    {$sort: { count: -1 } },
                    {$limit: 10},
                    {$lookup:{
                        from: 'categories',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'categoryDetails'
                    }},
                    {$unwind: '$categoryDetails'}

                ])

                const bestSellingBrand = [
                    {brandName: "Velvet Bloom", count: 3},
                    {brandName: "Ethereal Threads", count: 2},
                    {brandName: "Silk & Sage", count: 1},
                ]
    
                const countUser = await User.countDocuments();
    
                res.render('dashboard', {
                totalOrders: totalOrders,
                totalDiscountPrice: totalDiscountPrice,
                totalDiscountCount: totalDiscountCount,
                totalSales: totalQuantitySold,
                totalUser: countUser,
                mostSoldProduct: mostSoldProduct,
                bestSellingCategory: bestSellingCategory,
                bestSellingBrand: bestSellingBrand,
                admin
                // orders:orders
                });
            })

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