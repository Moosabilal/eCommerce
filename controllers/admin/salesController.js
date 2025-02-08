const User = require('../../models/userSchema')
const Order = require('../../models/orderSchema')
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

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

    
            res.json({orders});
        } catch (error) {
            console.error('Error fetching report:', error);
            res.status(500).json({ error: 'Failed to fetch report data.' });
        }
    }

    const getSalesData = async (req, res) => {
        try {
        const  {filterType}  = req.query;
        let matchQuery = {};
      
          if (filterType === 'yearly') {
            matchQuery.createdOn = {
              $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
            };
          } else if (filterType === 'monthly') {
            matchQuery.createdOn = {
              $gte: new Date(new Date().setMonth(new Date().getMonth() - 1)),
            };
          } else if (filterType === 'weekly') {
            matchQuery.createdOn = {
              $gte: new Date(new Date().setDate(new Date().getDate() - 7)), 
          }
        }
      
          let groupByField;
          let additionalProject = {};
      
          if (filterType === 'yearly') {
            groupByField = { $year: '$createdOn' };
          } else if (filterType === 'monthly') {
            groupByField = { $month: '$createdOn' };
          } else if (filterType === 'weekly') {
            groupByField = { $isoDayOfWeek: '$createdOn' }; 
            additionalProject = { dayOfWeek: { $isoDayOfWeek: '$createdOn' } }; 
          }
      
          const salesData = await Order.aggregate([
            {
              $match: {...matchQuery, status: 'Delivered'} 
            },
            { $unwind: '$orderItems' },
            {
              $project: {
                dateField: groupByField,
                sales: { $sum: 1 }, 
                ...additionalProject, 
              },
            },
            {
              $group: {
                _id: '$dateField', // Group by year, month, or day of the week
                totalSales: { $sum: '$sales' }, // Sum of all orders in the selected period
              },
            },
            {
              $sort: { _id: 1 }, // Sort by year, month, or day of the week
            },
          ]);
      
          // Prepare frontend-friendly response
          let labels = [];
          let data = [];
      
          if (filterType === 'yearly') {
            const currentYear = new Date().getFullYear();
            const startYear = currentYear - 5;
            for (let year = startYear; year <= currentYear; year++) {
              const salesForYear = salesData.find(sale => sale._id === year);
              labels.push(year.toString());
              data.push(salesForYear ? salesForYear.totalSales : 0);
            }
          } else if (filterType === 'monthly') {
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            for (let i = 0; i < salesData.length; i++) {
              labels.push(monthNames[salesData[i]._id - 1]); 
              data.push(salesData[i].totalSales);
            }
          } else if (filterType === 'weekly') {
            const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            let weeklyData = Array(7).fill(0); 
            salesData.forEach(sale => {
              const dayIndex = sale._id - 1;
              weeklyData[dayIndex] = sale.totalSales; 
            });
      
            labels = dayNames;
            data = weeklyData;
          }

          res.status(200).json({ labels, data });
      
        } catch (error) {
          console.error(error);
          res.status(500).json({ success: false, message: "Internal Server Error" });
        }
      };

      
      const generateLedger = async (req, res) => {
          try {
      const orders = await Order.aggregate([
          {
              $lookup: {
                  from: 'users',
                  localField: 'userId',
                  foreignField: '_id',
                  as: 'userInfo'
              }
          },
          {
              $unwind: '$userInfo'
          },
          {
              $project: {
                  orderId: 1,
                  userId: 1,
                  finalAmount: 1,
                  paymentMethod: 1,
                  status: 1,
                  createdOn: 1,
                  userName: '$userInfo.name'
              }
          },
          {
              $sort: { createdOn: -1 }
          }
      ]);
      
              if (!orders.length) {
                  return res.status(404).json({ message: "No orders found" });
              }
      
              const doc = new PDFDocument({ margin: 40, size: 'A3', layout: 'landscape' });

const reportsDir = path.join(__dirname, '../public/reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

const filePath = path.join(reportsDir, 'ledger.pdf');
const stream = fs.createWriteStream(filePath);
doc.pipe(stream);

// Title
doc.fontSize(26).fillColor('#000').text('Ledger Book', { align: 'center', underline: true }).moveDown(1);

// Column Settings
const columnWidths = {
  orderId: 120,
  user: 150,
  amount: 100,
  paymentMethod: 120,
  status: 120,
  createdOn: 200
};

const totalTableWidth = Object.values(columnWidths).reduce((a, b) => a + b); // Calculate total table width
const startX = (doc.page.width - totalTableWidth) / 2; // Center the table horizontally
const startY = doc.y;

// Table Headers
doc
  .font('Helvetica-Bold')
  .fontSize(14)
  .fillColor('#fff')
  .rect(startX, startY, totalTableWidth, 30)
  .fill('#333')
  .fillColor('#fff');

doc.text('Order ID', startX + 10, startY + 8, { width: columnWidths.orderId, align: 'left' });
doc.text('User', startX + 10 + columnWidths.orderId, startY + 8, { width: columnWidths.user, align: 'left' });
doc.text('Amount', startX + 10 + columnWidths.orderId + columnWidths.user, startY + 8, { width: columnWidths.amount, align: 'center' });
doc.text('Payment', startX + 10 + columnWidths.orderId + columnWidths.user + columnWidths.amount, startY + 8, { width: columnWidths.paymentMethod, align: 'center' });
doc.text('Status', startX + 10 + columnWidths.orderId + columnWidths.user + columnWidths.amount + columnWidths.paymentMethod, startY + 8, { width: columnWidths.status, align: 'center' });
doc.text('Order Created', startX + 10 + columnWidths.orderId + columnWidths.user + columnWidths.amount + columnWidths.paymentMethod + columnWidths.status, startY + 8, { width: columnWidths.createdOn, align: 'center' });

doc.moveDown(1);

// Orders Data
let yPosition = startY + 40;
const rowHeight = 40; // Adjust the row height as needed
const pageBottomMargin = doc.page.height - 60; // Leave some space at the bottom

orders.forEach((order, index) => {
  // Check if yPosition is too close to the bottom of the page
  if (yPosition + rowHeight > pageBottomMargin) {
    doc.addPage();
    yPosition = 50; // Reset yPosition for the new page
    
    // Re-draw the table headers on the new page
    doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .fillColor('#fff')
      .rect(startX, yPosition, totalTableWidth, 30)
      .fill('#333')
      .fillColor('#fff');

    doc.text('Order ID', startX + 10, yPosition + 8, { width: columnWidths.orderId, align: 'left' });
    doc.text('User', startX + 10 + columnWidths.orderId, yPosition + 8, { width: columnWidths.user, align: 'left' });
    doc.text('Amount', startX + 10 + columnWidths.orderId + columnWidths.user, yPosition + 8, { width: columnWidths.amount, align: 'center' });
    doc.text('Payment', startX + 10 + columnWidths.orderId + columnWidths.user + columnWidths.amount, yPosition + 8, { width: columnWidths.paymentMethod, align: 'center' });
    doc.text('Status', startX + 10 + columnWidths.orderId + columnWidths.user + columnWidths.amount + columnWidths.paymentMethod, yPosition + 8, { width: columnWidths.status, align: 'center' });
    doc.text('Order Created', startX + 10 + columnWidths.orderId + columnWidths.user + columnWidths.amount + columnWidths.paymentMethod + columnWidths.status, yPosition + 8, { width: columnWidths.createdOn, align: 'center' });

    yPosition += 40; // Move yPosition below the header
  }

  // Fill each order row
  const bgColor = index % 2 === 0 ? '#f3f3f3' : '#fff';
  doc.rect(startX, yPosition, totalTableWidth, rowHeight).fill(bgColor).fillColor('#000');

  doc
    .font('Helvetica')
    .fontSize(12)
    .text(order.orderId.slice(-9), startX + 10, yPosition + 8, { width: columnWidths.orderId, align: 'left' })
    .text(order.userName || 'Guest', startX + 10 + columnWidths.orderId, yPosition + 8, { width: columnWidths.user, align: 'left' })
    .text(`₹${order.finalAmount.toFixed(2)}`, startX + 10 + columnWidths.orderId + columnWidths.user, yPosition + 8, { width: columnWidths.amount, align: 'center' })
    .text(order.paymentMethod, startX + 10 + columnWidths.orderId + columnWidths.user + columnWidths.amount, yPosition + 8, { width: columnWidths.paymentMethod, align: 'center' })
    .text(order.status, startX + 10 + columnWidths.orderId + columnWidths.user + columnWidths.amount + columnWidths.paymentMethod, yPosition + 8, { width: columnWidths.status, align: 'center' })
    .text(order.createdOn.toLocaleDateString('en-GB') + ' ' + order.createdOn.toLocaleTimeString('en-GB'), startX + 10 + columnWidths.orderId + columnWidths.user + columnWidths.amount + columnWidths.paymentMethod + columnWidths.status, yPosition + 8, { width: columnWidths.createdOn, align: 'center' });

  yPosition += rowHeight;
});

// Add Footer with Ledger Download Date
doc.moveDown(2);
doc
  .font('Helvetica-Bold')
  .fontSize(12)
  .text(`Ledger Book Downloaded on: ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}`, {
    align: 'right'
});

doc.end();

stream.on('finish', () => {
  res.download(filePath, 'ledger.pdf', (err) => {
    if (err) console.error(err);
    fs.unlinkSync(filePath); // Delete after download
  });
});

      
          } catch (error) {
              console.error('Error generating ledger:', error);
              res.status(500).json({ message: "Error generating ledger" });
          }
      };
      
      
    


module.exports = {
    getSales,
    filterSales,
    getSalesData,
    generateLedger,
}
