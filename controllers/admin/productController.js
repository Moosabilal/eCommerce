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



module.exports = {
    getProductAddPage,
    addProducts,
}