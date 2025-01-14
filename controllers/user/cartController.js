const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");
const User = require("../../models/userSchema")

const getCart = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findOne({ _id: userId });
        const userCart = await Cart.findOne({ userId: userId });
        
        if (!userCart || !userCart.items.length) {
            return res.render('shopping-cart', {
                user: userData,
                cart: null,
            });
        }
        
        const productIds = userCart.items.map((item) => item.productId);
        const products = await Product.find({ _id: { $in: productIds } });

        
        res.render('shopping-cart', {
            user: userData,
            cart: userCart,
            products: products,  
        });
    } catch (error) {
        console.log("Error in getCart", error);
        res.redirect("/pageNotFound");
    }
};


const addToCart = async (req, res) => {
    try {
        const { productId, size, quantity } = req.body;
        const userId = req.session.user;

        // Validate inputs
        if (!productId || !size || !quantity) {
            return res.status(400).json({ status: false, message: "Missing required fields" });
        }

        const userData = await User.findById(userId);
        const userCart = await Cart.findOne({ userId: userData._id });
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ status: false, message: "Product not found" });
        }

        // Check if stock for the requested size exists
        const stockItem = product.stock.find(stock => stock.size === size);
        if (!stockItem || stockItem.quantity < quantity) {
            return res.status(400).json({
                status: false,
                message: `Insufficient stock for size: ${size}`
            });
        }

        // If the user doesn't have a cart, create a new one
        if (!userCart) {
            const newCart = new Cart({
                userId: userData._id,
                items: [{
                    productId: productId,
                    stock: [{ size, quantity }],
                    price: product.salePrice,
                    totalPrice: product.salePrice * quantity,
                    status: 'placed',
                    cancellationReason: "none",
                }]
            });
            await newCart.save();
            return res.status(200).json({ status: true, message: "Product added to cart" });
        }

        // Check if the product and size already exist in the cart
        const itemIndex = userCart.items.findIndex(item =>
            item.productId.toString() === productId.toString() &&
            item.stock.some(stock => stock.size === size)
        );

        if (itemIndex !== -1) {
            // If the product and size already exist, return an appropriate response
            return res.status(200).json({
                status: false,
                message: `Product with size: ${size} is already in the cart`
            });
        }

        // Add the product and size to the cart as a new item
        userCart.items.push({
            productId: productId,
            stock: [{ size, quantity }],
            price: product.salePrice,
            totalPrice: product.salePrice * quantity,
            status: 'placed',
            cancellationReason: "none",
        });

        await userCart.save();
        return res.status(200).json({ status: true, message: "Product added to cart" });
    } catch (error) {
        console.error("Error in addToCart:", error);
        return res.status(500).json({ status: false, message: "Server Error" });
    }
};



const removeProduct = async (req, res) => {
    try {
        const productId = req.query.productId;
        const userId = req.session.user;
        const userCart = await Cart.findOne({ userId: userId });
        const index = userCart.items.findIndex((item) => item.productId.toString() === productId.toString());
        userCart.items.splice(index, 1);
        await userCart.save();
        return res.redirect("/loadCart")
 
    } catch (error) {
        console.log("Error in removeProduct", error);
        return res.status(500).json({status:false,message:"Server Error"})
    }
}

const decreaseQuantity = async (req, res) => {
    try {
        const { stockId } = req.body; 
        const userId = req.session.user;

        const userCart = await Cart.findOne({ userId });

        if (!userCart) {
            return res.status(404).json({ status: false, message: "Cart not found" });
        }

        let itemFound = false;
        userCart.items.forEach(item => {
            const stockIndex = item.stock.findIndex(stock => stock._id.toString() === stockId);
            if (stockIndex !== -1) {
                itemFound = true;

                if (item.stock[stockIndex].quantity === 1) {
                    return res.status(400).json({
                        status: false,
                        message: "Minimum quantity should be 1"
                    });
                }

                item.stock[stockIndex].quantity -= 1;
                item.totalPrice = item.stock.reduce((total, stock) => {
                    return total + stock.quantity * item.price;
                }, 0);
            }
        });

        if (!itemFound) {
            return res.status(404).json({ status: false, message: "Item or size not found in cart" });
        }
        console.log(userCart.items)
        await userCart.save();

        return res.status(200).json({
            status: true,
            message: "Quantity decreased",
            updatedCart: userCart 
        });
    } catch (error) {
        console.error("Error in decreaseQuantity:", error);
        return res.status(500).json({ status: false, message: "Server Error" });
    }
};


const increaseQuantity = async (req, res) => {
    try {
        const { stockId } = req.body; 
        const userId = req.session.user;

        const userCart = await Cart.findOne({ userId });

        if (!userCart) {
            return res.status(404).json({ status: false, message: "Cart not found" });
        }

        let itemFound = false;
        userCart.items.forEach(item => {
            const stockIndex = item.stock.findIndex(stock => stock._id.toString() === stockId);
            if (stockIndex !== -1) {
                itemFound = true;

                item.stock[stockIndex].quantity += 1;
                item.totalPrice = item.stock.reduce((total, stock) => {
                    return total + stock.quantity * item.price;
                }, 0);
            }
        });

        if (!itemFound) {
            return res.status(404).json({ status: false, message: "Item or size not found in cart" });
        }

        await userCart.save();

        return res.status(200).json({
            status: true,
            message: "Quantity increased",
            updatedCart: userCart 
        });
    } catch (error) {
        console.error("Error in increaseQuantity:", error);
        return res.status(500).json({ status: false, message: "Server Error" });
    }
};








    
    

module.exports = {
    getCart,
    addToCart,
    removeProduct,
    decreaseQuantity,
    increaseQuantity,
}