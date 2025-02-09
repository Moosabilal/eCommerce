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
        res.redirect("/admin/pageerror")
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

                    const resizedImagePath = path.join("public","uploads","product-images",`resized_${req.files[i].filename}`);
                    await sharp(originalImagesPath).resize({width:300,height:400}).toFile(resizedImagePath);
                    images.push(`resized_${req.files[i].filename}`);
                }
            }
            const categoryId = await Category.findOne({name:products.category});
            if(!categoryId){
                return res.status(400).json("Invalid category name")
            }
            
            

            
            const newProduct = new Product({
                productName: products.productName,
                description: products.description,
                category: categoryId._id,
                regularPrice: products.regularPrice,
                salePrice: products.salePrice,
                createdOn: new Date(),
                stock:[{
                    size: products.size,
                    quantity: products.quantity,
                }],
                color: products.color,
                productImage: images,
                status: "Available",
            })
            await newProduct.save();
            return res.redirect("/admin/Products")
        
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
        const limit = 10;
        const productData = await Product.find({
                productName:{$regex:new RegExp(".*"+search+".*","i")},

        }).limit(limit*1).skip((page-1)*limit).populate("category").exec();
        const count = await Product.find({
                productName:{$regex:new RegExp(".*"+search+".*","i")},
        }).countDocuments();

        const category = await Category.find({isListed:true});
        if(category){
            res.render("products",{
                data:productData,
                currentPage:page,
                totalPages:Math.ceil(count/limit),
                
            })
        }else{
            res.render("admin-error")
        }

    } catch (error) {
        res.redirect("/admin/pageerror")
    }
}

const addProductOffer = async (req, res) => {
    try {
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
        findProduct.salePrice = findProduct.salePrice+Math.ceil(findProduct.regularPrice*(percentage/100));
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
        res.redirect("/admin/pageerror")
    }
}

const unBlockProduct = async (req,res)=>{
    try {
        let id = req.query.id;
        await Product.updateOne({_id:id},{$set:{isBlocked:false}});
        res.redirect("/admin/products")
    } catch (error) {
        res.redirect("/admin/pageerror")
    }
}

const getEditProduct = async (req,res)=>{
    try {
        const id = req.query.id;
        const product = await Product.findOne({_id:id});
        const category = await Category.findOne({_id:product.category});
        const categories = await Category.find({});
        res.render("edit-product",{
            product:product,
            cat:category,
            categories:categories
        })
    } catch (error) {
        res.redirect("/admin/pageerror")
    }
}

const editProduct = async (req,res)=>{
    try {
        const id = req.params.id;
        const product = await Product.findOne({_id:id});
        const data = req.body;

        const existingProduct = await Product.findOne({
            productName:data.productName,
            _id:{$ne:id}
        })
        const categoryId = await Category.find({name:data.category});
        
        
        if(existingProduct){
            return res.status(400).json({error:"Product with this name already exists, Please try with another name"});
        }

        const images =[];
        if(req.files && req.files.length>0){
            for(let i=0;i<req.files.length;i++){
                images.push(req.files[i].filename);
            }
        }
        const updateFields = {
            productName:data.productName,
            description:data.description,
            category:categoryId[0]._id,
            regularPrice:data.regularPrice,
            salePrice:data.salePrice,

            color:data.color
        }
        const size = data.size;      
        const quantity = data.quantity;  

        const existingSize = product.stock.find((item) => item.size === size);
        if (existingSize) {
            existingSize.quantity += Number(quantity);
        } else {
            product.stock.push({ size: size, quantity: quantity });
        }

        updateFields.stock = product.stock;
        if(req.files.length>0){
            updateFields.$push = {productImage:{$each:images}};
        }
        
        await Product.findByIdAndUpdate(id,updateFields,{new:true});
        res.redirect("/admin/products");
    } catch (error) {
        console.error(error)
        res.redirect("/admin/pageerror")
    }
}


const deleteSingleImage = async (req,res)=>{
    try {
        const {imageNameToServer,productIdToServer} = req.body;
        const product = await Product.findByIdAndUpdate(productIdToServer,{$pull:{productImage:imageNameToServer}});
        const imagePath = path.join("public","uploads","product-images",imageNameToServer);
        if(fs.existsSync(imagePath)){
            await fs.unlinkSync(imagePath);
            console.log(`Image ${imageNameToServer} deleted successfully`)
        }else{
            console.log(`Image ${imageNameToServer} not found`)
        }
        res.send({status:true})

    } catch (error) {
        res.redirect("/admin/pageerror")
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
    getEditProduct,
    editProduct,
    deleteSingleImage,
}