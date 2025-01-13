
const User = require('../../models/userSchema');
const Category = require("../../models/categorySchema")
const Product = require("../../models/productSchema")
const env = require('dotenv').config();
const nodeMailer = require('nodemailer')
const bcrypt = require('bcrypt')

function generateOtp(){
    return Math.floor(100000 + Math.random() * 900000).toString();
}

const pageNotFound = async (req,res)=>{
    try {
        res.render('page-404')
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}


// const loadShopping = async (req,res)=>{
//     try {
//         return res.render('shop');
//     } catch (error) {
//         console.log('shopping page not loading :',error);
//         res.status(500).send('Server Error');
//     }
// }

const loadHomepage = async (req,res)=>{
    try {
        
        const user = req.session.user;
        const userData = await User.findOne({_id:user});
        

        const categories = await Category.find({isListed:true});
            let productData = await Product.find({
                isBlocked:false,
                category:{$in:categories.map(category=>category._id)},
                // quantity:{$gt:0}
            })
            productData.sort((a,b)=>new Date(b.createdOn)-new Date(a.createdOn));
            productData = productData.slice(0,4);
        if(user){
            const userData = await User.findOne({_id:user});
            res.render("home",{
                user:userData|| null,
                products:productData
            })
          
        }else{
            return res.render('home',{products:productData})
        }
    } catch (error) {
        console.log('home page not found');
        res.status(500).send('server error')
    }
}



const loadSignup = async (req,res)=>{
    try {
        return res.render('signup');
    } catch (error) {
        console.log('home page is not loading :',error);
        res.status(500).send('Server Error')
        
    }
}

async function sendVerificationEmail(email,otp){
    try {
        const transporter = nodeMailer.createTransport({
            service:'gmail',
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD
            }
        })

        const info = await transporter.sendMail({
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:"Verify your account",
            text:`Your OTP is ${otp}`,
            html:`<b>Your OTP: ${otp}</b>`,
        })

        return info.accepted.length > 0;

    } catch (error) {

        console.error("Error in sending email",error);
        return false;
    }
}

const signup = async (req, res) => {
    try {
        const { name, phone, email, password, confirmPassword} = req.body;

        if(password!==confirmPassword){
            return res.render("signup",{message:"Password do not match"})
        }

        const findUser = await User.findOne({email});
        if(findUser){
            return res.render("signup",{message:"User already exist with this email"})
        }

        const otp = generateOtp();

        const emailSent = await sendVerificationEmail(email,otp);
        if(!emailSent){
            return res.json("email-error")
        }

        req.session.userOtp = otp;
        req.session.userData = {name, phone, email, password};

        res.render("verify-otp");
        console.log("OTP sent",otp);

    } catch (error) {
        console.error("signup error",error);
        res.redirect("/pageNotFound")
    }
}

const securePassword = async (password)=>{
    try {
        const passwordHash = await bcrypt.hash(password,10)

        return passwordHash
    } catch (error) {
        
    }
}

const verifyOtp = async (req, res) => {
    try {
        const {otp} = req.body;
        console.log(otp)

        if(otp===req.session.userOtp){
            const user = req.session.userData;
            const passwordHash = await securePassword(user.password)

            const saveUserData = new User({
                name:user.name,
                email:user.email,
                phone:user.phone,
                password:passwordHash,
            })
            console.log("cominh")
            console.log(saveUserData)

            await saveUserData.save();
            req.session.user = saveUserData._id;
            res.json({success:true, redirectUrl:'/'})
        }else{
            res.status(400).json({success:false, message:"Invalid OTP, Please try again"})
        }
    } catch (error) {
        console.error("Error in verifying OTP", error);
        res.status(500).json({success:false, message:"An error occured"})
    }
}

const resendOtp = async (req, res) => {
    try {
        const {email} = req.session.userData;
        if(!email){
            return res.status(400).json({success:false, message:"Email not found in session"})
        }

        const otp = generateOtp();
        req.session.userOtp = otp;

        const emailSent = await sendVerificationEmail(email,otp);

        if(emailSent){
            console.log("Resend OTP :",otp);
            res.status(200).json({success:true,message:"OTP Resend Successfully"})
        }else{
            res.status(500).json({success:false,message:"Failed to resend OTP, Please try again"});
        }
    } catch (error) {
        console.error("Error in resending OTP",error)
        res.status(500).json({success:false,message:"Internal Server Error, Please try again"})
    }
}

const loadLogin = async (req,res) => {
    try {
        if(!req.session.user){
            return res.render('login')
        }else{
            res.redirect('/');
        }
    } catch (error) {
        res.redirect('pageNotFound')
    }
}

const login = async (req, res) => {
    try {
        const {email, password} = req.body;

        const findUser = await User.findOne({isAdmin:0,email:email});
        if(!findUser){
            return res.render('login',{message:"User not found"})
        }
        if(findUser.isBlocked){
            return res.render('login',{message:"User is Blocked by admin"})
        }

        const passwordMatch = await bcrypt.compare(password,findUser.password);

        if(!passwordMatch){
            return res.render("login",{message:"Incorrect Username or Password"})
        }

        req.session.user = findUser._id;
        res.redirect('/');
    } catch (error) {
        console.log('login error:',error)
        res.render('login',{message:'Login Failed, Please try again later'})
    }
}

const logout = async (req,res)=> {
    try {
        req.session.destroy((err)=>{
            if(err){
                console.log("Session destruction error")
                return res.redirect('/pageNotFound')
            }
            return res.redirect('/login');
        })
    } catch (error) {
        console.log("Logout Error");
        res.redirect('/pageNotFound')
    }
}

const loadShoppingPage = async (req, res) => {
    try {
        const user = req.session.user;
        const userData =await User.findOne({_id:user});
        const categories = await Category.find({isListed:true});
        const categoryIds = categories.map((category)=>category._id);
        const page = parseInt(req.query.page) || 1;
        const limit = 12;
        const skip = (page - 1) * limit;
        const products = await Product.find({
            isBlocked:false,
            category:{$in:categoryIds},
            
        }).sort({createdOn:-1}).skip(skip).limit(limit)
        const totalProducts = await Product.countDocuments({
            isBlocked:false,
            category:{$in:categoryIds},
           
        });
        const totalPages = Math.ceil(totalProducts/limit);
        const categoriesWithIds = categories.map((category)=>({_id:category._id,name:category.name}));
        console.log(products)
        res.render('shop',{
            user:userData,
            category:categoriesWithIds,
            products:products,
            totalProducts:totalProducts,
            totalPages:totalPages,
            currentPage:page,
        });
        
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

const filterProduct = async (req, res) => {
    try {
        const userId = req.session.user;
        const categoryId = req.query.category; 
        const page = parseInt(req.query.page) || 1;
        const itemsPerPage = 10; 

        const findCategory = categoryId ? await Category.findById(categoryId) : null;

        const query = {
            isBlocked: false,
            // quantity: { $gt: 0 },
        };
        if (findCategory) {
            query.category = findCategory._id; 
        }

        const totalProducts = await Product.countDocuments(query);
        const findProducts = await Product.find(query)
            .sort({ createdOn: -1 }) 
            .skip((page - 1) * itemsPerPage)
            .limit(itemsPerPage)
            .lean();

        const categories = await Category.find({ isListed: true });

        let userData = null;
        if (userId) {
            userData = await User.findById(userId);
            if (userData) {
                const searchEntry = {
                    category: findCategory ? findCategory._id : null,
                    searchedOn: new Date(),
                };
                userData.searchHistory.push(searchEntry);
                await userData.save();
            }
        }
        res.render('shop', {
            user: userData,
            products: findProducts,
            category: categories,
            totalPages: Math.ceil(totalProducts / itemsPerPage),
            currentPage: page,
            selectedCategory: categoryId || null,
        });
    } catch (error) {
        console.error("Error in filterProduct:", error);
        res.redirect("/pageNotFound");
    }
};

const filterByPrice = async (req, res) => {
    try {
        const user = req.session.user;
        const userData = await User.findOne({_id:user});
        const categories = await Category.find({ isListed: true }).lean();

        let findProducts = await Product.find({
            salePrice:{$gt:req.query.gt,$lt:req.query.lt},
            isBlocked:false,
            // quantity:{$gt:0}
        }).lean();

        findProducts.sort((a,b)=>new Date(b.createdOn) - new Date(a.createdOn));

        let itemsPerPage =  10;
        let currentPage = parseInt(req.query.page) || 1;
        let startIndex = (currentPage-1)*itemsPerPage;
        let endIndex = startIndex + itemsPerPage;
        let totalPages = Math.ceil(findProducts.length/itemsPerPage);
        const currentProduct = findProducts.slice(startIndex,endIndex);
        req.session.findProducts = findProducts;

        res.render("shop",{
            user:userData,
            products:currentProduct,
            category:categories,
            totalPages,
            currentPage
        })
    } catch (error) {
        console.log(error)
        req.redirect("/pageNotFound")
    }
}

const searchProducts = async (req,res)=>{
    try {
        const user = req.session.user;
        const userData = await User.findOne({_id:user});
        let search = req.body.query;
        const categories = await Category.find({ isListed: true }).lean();
        const categoryIds = categories.map((category)=>category._id.toString());
        let searchResult = [];
        if(req.session.filteredProducts && req.session.filteredProducts.length>0){
            searchResult = req.session.filteredProducts.filter(product=>
            product.productName.toLowerCase().includes(search.toLowerCase()))
        }else{
            searchResult = await Product.find({
                productName:{$regex:".*"+search+".*",$options:"i"},
                isBlocked:false,
                // quantity:{$gt:0},
                category:{$in:categoryIds}  
            })
        }

        searchResult.sort((a,b)=>new Date(b.createdOn) - new Date(a.createdOn));
        let itemsPerPage =  10;
        let currentPage = parseInt(req.query.page) || 1;
        let startIndex = (currentPage-1)*itemsPerPage;
        let endIndex = startIndex + itemsPerPage;
        let totalPages = Math.ceil(searchResult.length/itemsPerPage);
        const currentProduct = searchResult.slice(startIndex,endIndex);

        res.render("shop",{
            user:userData,
            products:currentProduct,
            category:categories,
            totalPages,
            currentPage,
            count:searchResult.length
        })


    } catch (error) {
        console.log("Error in searching",error);
        res.redirect("/pageNotFound")
    }
}




module.exports={
    pageNotFound,
    loadHomepage,
    loadSignup,
    // loadShopping,
    signup,
    verifyOtp,
    resendOtp,
    loadLogin,
    login,
    logout,
    loadShoppingPage,
    filterProduct,
    filterByPrice,
    searchProducts,
    
}