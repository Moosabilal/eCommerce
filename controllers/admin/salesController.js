const User = require('../../models/userSchema')
const Order = require('../../models/orderSchema')

const getSales = async (req, res) => {
    try {
        const orders = await Order.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'customerInfo',
                },
            },
            {
                $unwind: '$customerInfo',
            },
            {
                $project: {
                    orderId: 1,
                    customerName: '$customerInfo.name',
                    salesCount: {
                        $sum: '$orderItems.quantity',
                    },
                    orderAmount: '$finalAmount',
                    discount: 1, 
                    status: 1,
                    createdOn:1,
                },
            },
            {$sort:{createdOn:-1}}
            
        ]);
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


            const countUser = await User.countDocuments();

            res.render('salesReport', {
            totalOrders: totalOrders,
            totalDiscountPrice: totalDiscountPrice,
            totalDiscountCount: totalDiscountCount,
            totalSales: totalQuantitySold,
            totalUser: countUser,
            orders:orders
            });
        })

    } catch (error) {
        console.log("Error in rendering getSales page");
        res.redirect('/admin/pageerror')
    }
}

    const filterSales = async (req, res) => {
    try {
        const { period, startDate, endDate } = req.body;
    
        
            let matchQuery = {};
    
            // Define date ranges based on period
            if (period === 'day') {
                matchQuery.createdOn = {
                    $gte: new Date(new Date().setDate(new Date().getDate() - 1)),
                };
            } else if (period === 'week') {
                matchQuery.createdOn = {
                    $gte: new Date(new Date().setDate(new Date().getDate() - 7)),
                };
            } else if (period === 'month') {
                matchQuery.createdOn = {
                    $gte: new Date(new Date().setMonth(new Date().getMonth() - 1)),
                };
            } else if (period === 'year') {
                matchQuery.createdOn = {
                    $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
                };
            } else if (period === 'custom' && startDate && endDate) {
                matchQuery.createdOn = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate),
                };
            }
    
            const orders = await Order.aggregate([
                { $match: matchQuery },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'customerInfo',
                    },
                },
                { $unwind: '$customerInfo' },
                {
                    $project: {
                        orderId: 1,
                        customerName: '$customerInfo.name',
                        salesCount: { $sum: '$orderItems.quantity' },
                        orderAmount: '$finalAmount',
                        discount: '$discount',
                        status: '$status',
                        createdOn: 1,
                    },
                },
                { $sort: { createdOn: -1 } },
            ]);
    
            // Calculate totals for summary cards
            // const totalSales = orders.reduce((sum, order) => sum + order.orderAmount, 0);
            // const totalOrders = orders.length;
            // const totalDiscountPrice = orders.reduce((sum, order) => sum + order.discount, 0);
            // const totalUser = new Set(orders.map((order) => order.customerName)).size;
    
            res.json({
                orders,
                // totalSales,
                // totalOrders,
                // totalDiscountPrice,
                // totalUser,
            });
        } catch (error) {
            console.error('Error fetching report:', error);
            res.status(500).json({ error: 'Failed to fetch report data.' });
        }
    }


module.exports = {
    getSales,
    filterSales,
}
