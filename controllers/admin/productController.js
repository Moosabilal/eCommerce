const Product = require ("../../models/productSchema");
const Category = require("../../models/categorySchema")
const User = require("../../models/userSchema");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp")

const getProductAddPage = async (req, res) => {
    try {
        const category = await Category.find({isListed:true});
        res.render("add-product",{
            cat: category // Pass the fetched categories to the view
        })
    } catch (error) {
        res.redirect("/pageerror")
    }
}

const addProducts = async (req, res) => {
    try {
        const products = req.body;
        const productExists = await Product.findOne({
            productName:products.productName,

        })

        if(!productExists){
            const images = [];
            if(req.files && req.files.length > 0){
                for(let i = 0 ; i < req.files.length ; i++){
                    const originalImagesPath = req.files[i].path;

                    const resizedImagePath = path.join("public","uploads","product-images",req.files[i].filename);
                    await sharp(originalImagesPath).resize({width:300,height:400}).toFile(resizedImagePath);
                    images.push(req.files[i].filename);
                }
            }
            const categoryId = await Category.findOne({name:products.category});
            if(!categoryId){
                return res.status(400).json("Invalid category name")
            }
            

            
            
            const newProduct = new Product({
                productName:products.productName,
                description:products.description,
                category:categoryId._id,
                regularPrice:products.regularPrice,
                salePrice:products.salePrice,
                createdOn:new Date(),
                quantity:products.quantity,
                size:products.size,
                color:products.color,
                productImage:images,
                status:"Available",
            })

            await newProduct.save();
            return res.redirect("/admin/addProducts")
        
        }else{
            return res.status(400).json("Product already exists, Please try with another name")
        }
    } catch (error) {
        console.error("Error saving product",error);
        return res.redirect("/admin/pageerror")
        
    }
}

const getAllProducts = async (req,res)=>{
    try {
        const search = req.query.search || "";
        const page = req.query.page || 1;
        const limit = 4;
        const productData = await Product.find({
            // $or:[
                productName:{$regex:new RegExp(".*"+search+".*","i")},

            // ],
        }).limit(limit*1).skip((page-1)*limit).populate("category").exec();
        
        const count = await Product.find({
            // $or:[
                productName:{$regex:new RegExp(".*"+search+".*","i")},
            // ]
        }).countDocuments();

        const category = await Category.find({isListed:true});

        if(category){
            res.render("products",{
                data:productData,
                currentPage:page,
                totalPages:Math.ceil(count/limit),
                cat:category
            })
        }else{
            res.render("admin-error")
        }

    } catch (error) {
        res.redirect("/pageerror")
    }
}

const addProductOffer = async (req, res) => {
    try {
        console.log("Request Body:", req.body); // Debugging request body
        const { productId, percentage } = req.body;

        if (!productId || !percentage) {
            return res.status(400).json({ status: false, message: "Invalid data provided." });
        }

        const findProduct = await Product.findOne({ _id: productId });
        if (!findProduct) {
            return res.status(404).json({ status: false, message: "Product not found." });
        }

        const findCategory = await Category.findOne({ _id: findProduct.category });
        if (!findCategory) {
            return res.status(404).json({ status: false, message: "Category not found." });
        }

        if (findCategory.categoryOffer > percentage) {
            return res.json({ status: false, message: "This product category already has a category offer" });
        }

        findProduct.salePrice = findProduct.regularPrice - Math.floor(findProduct.regularPrice * (percentage / 100));
        findProduct.productOffer = parseInt(percentage);
        await findProduct.save();

        findCategory.categoryOffer = 0; // Reset category offer
        await findCategory.save();

        console.log("Product Updated:", findProduct); // Debugging product update
        res.json({ status: true });
    } catch (error) {
        console.error("Error in addProductOffer:", error); // Debugging server error
        res.status(500).json({ status: false, message: "Internal Server Error" });
    }
};


const removeProductOffer = async (req,res)=>{
    try {
        const {productId} = req.body;
        if (!productId) {
            return res.status(400).json({ status: false, message: "Invalid data provided." });
        }
        const findProduct = await Product.findOne({_id:productId});
        const percentage = findProduct.productOffer;
        findProduct.salePrice = findProduct.salePrice+Math.floor(findProduct.regularPrice*(percentage/100));
        findProduct.productOffer = 0;
        await findProduct.save();
        res.json({status:true})

    } catch (error) {
            console.error("Error in removeProductOffer:", error);
            res.status(500).json({ status: false, message: "Internal Server Error" });
    }
}

const blockProduct = async (req,res)=>{
    try {
        let id = req.query.id;
        await Product.updateOne({_id:id},{$set:{isBlocked:true}});
        res.redirect("/admin/products");
    } catch (error) {
        res.redirect("/pageerror")
    }
}

const unBlockProduct = async (req,res)=>{
    try {
        let id = req.query.id;
        await Product.updateOne({_id:id},{$set:{isBlocked:false}});
        res.redirect("/admin/products")
    } catch (error) {
        res.redirect("/pageerror")
    }
}

module.exports = {
    getProductAddPage,
    addProducts,
    getAllProducts,
    addProductOffer,
    removeProductOffer,
    blockProduct,
    unBlockProduct,
}