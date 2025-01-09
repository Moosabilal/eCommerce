const User = require('../../models/userSchema');
const Address = require("../../models/addressSchema")
const nodemailer = require("nodemailer");
const bcrypt = require('bcrypt')
const env = require('dotenv').config();
const session = require("express-session")

function generateOtp(){
    const digits = "1234567890";
    let otp = "";
    for(let i = 0; i < 6; i++){
        otp += digits[Math.floor(Math.random()*10)];
    }
    return otp;
}

const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password,10);
        return passwordHash;
    } catch (error) {
        
    }
}

const getForgotPassPage = async (req,res)=>{
    try {
        res.render("forgot-password")
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

const sendVerificationEmail= async (email,otp)=>{
    try {
        const transporter = nodemailer.createTransport({
            service:"gmail",
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD
            }
        })

        const mailOptions = {
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:"Your OTP for password reset",
            text:`Your OTP is ${otp} Please enter this OTP to reset your password`,
            html:`<b><h4>Your OTP : ${otp}</h4><br></b>`
        }

        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent: ",info.messageId);
        return true;
    } catch (error) {
        console.log('Error sending email',error)
        return false;
        }
}

const forgotEmailValid = async (req,res)=>{
    try {
        const {email} = req.body;
        const findUser = await User.findOne({email:email});
        if(findUser){
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email,otp)
            if(emailSent){
                req.session.userOtp = otp;
                req.session.email = email;
                res.render("forgotPass-otp");
                console.log("OTP:",otp);
            }else{
                res.json({success:false,message:"Failed to send OTP, Please try again"});
            }
        }else{
            res.render("forgot-password",{
                message:"User with this email does not exist"
            })
        }
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

const verifyForgotPassOtp = async (req,res)=>{
    try {
        const enteredOtp = req.body.otp;
        if(enteredOtp===req.session.userOtp){
            res.json({success:true,redirectUrl:"/reset-password"})
        }else{
            res.json({success:false,message:"OTP not matched"})
        }
    } catch (error) {
        res.status(500).json({success:false,message:"An error occured, Please try again"});
    }
}

const getResetPassPage = async (req,res)=>{
    try {
        res.render("reset-password")
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

const resendOtp = async (req,res)=>{
    try {
        const otp = generateOtp();
        req.session.userOtp =  otp;
        const email = req.session.email;
        console.log("Resending OTP to email:",email);
        const emailSent =  await sendVerificationEmail(email,otp);
        if(emailSent){
            console.log("OTP resent :",otp);
            res.status(200).json({success:true,message:"Resend OTP successfull"});
        }
    } catch (error) {
        console.error("Error in resendOtp:",error);
        res.status(500).json({success:false,message:"Internal Server Error"})
    }
}

const postNewPassword = async (req,res)=>{
    try {
        const {newPassword, confirmPassword} = req.body;
        const email = req.session.email;
        if(newPassword===confirmPassword){
            const passwordHash =  await securePassword(newPassword);
            await User.updateOne({email:email},{$set:{password:passwordHash}});
            res.redirect("/login")

        }else{
            res.render("reset-password",{message:"Password do not match"})
        }
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

const userProfile = async (req,res)=>{
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        const addressData = await Address.findOne({userId:userId});
        const count = addressData.address.length;
        res.render("profile",{
            user:userData,
            userAddress:addressData,
            count:count,
        })
    } catch (error) {
        console.error("Error fot retrieve user profile:",error);
        res.redirect("/pageerror")
    }
}

const getEditProfile = async (req,res)=>{
    try {
        const userId = req.session.user;
        const userData = await User.findOne({_id:userId})
        res.render("edit-profile",{
            user:userData
        })
    } catch (error) {
        console.error("Error in sending editProfile page",error);
        res.redirect("/pageNotFound")
    }
}

const postEditProfile = async (req,res)=>{
    try {
        const {name, phone} = req.body;
        const userId = req.session.user;
        const userData = await User.findById(userId)
        await User.findByIdAndUpdate(userId,{name:name,phone:phone})
        res.redirect("/userProfile")

    } catch (error) {
        console.log("Error in updating user profile",error);
        res.redirect("/pageerror")
    }
}


const changeEmail = async (req,res)=>{
    try {
        res.render("change-email")
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

const changeEmailValid = async (req,res)=>{
    try {
        const {email} = req.body;
        const userExists = await User.findOne({email});
        if(userExists){
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email,otp);
            if(emailSent){
                req.session.userOtp = otp;
                req.session.userData = req.body;
                req.session.email = email;
                res.render("change-email-otp");
                console.log("email Sent",email)
                console.log("otp Sent",otp)

            }else{
                res.json("email-error")
            }
        }else{
            res.render("change-email",{
                message:"User with this email not exist"
            })
        }
    } catch (error) {
        console.error("change-email-error",error)
        res.redirect("/pageNotFound")
    }
}

const verifyEmailOtp = async (req,res)=>{
    try {
        const enteredOtp = req.body.otp;
        if(enteredOtp===req.session.userOtp){
            req.session.userData = req.body.user;
            res.json({success:true, redirectUrl:'/verify-email-otp'})

        }else{
            res.render("change-email-otp",{
                message:"OTP not matching",
                userData:req.session.userData
            })
        }
    } catch (error) {
        console.error("Error in email otp",error);
        res.render("/pageNotFound")
        
    }
}

const getNewEmail = async (req,res)=>{
    try {
        res.render("new-user-email")
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

const updateEmail = async (req,res)=>{
    try {
        const newEmail = req.body.newEmail;
        const userId = req.session.user;
        await User.findByIdAndUpdate(userId,{email:newEmail});
        res.redirect("/userProfile")
    } catch (error) {
        console.log("Error in updateEmail",error);
        res.render("/pageNotFound")
    }
}


const changePassword = async (req,res)=>{
    try {
        res.render("change-password")
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

const changePasswordValid = async (req,res)=>{
    try {
        const {email} = req.body;
        const userExists = await User.findOne({email});
        if(userExists){
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email,otp);
            if(emailSent){
                req.session.userOtp =  otp;
                req.session.userEmail = email;
                req.session.userData = req.body;
                res.render("change-password-otp");
                console.log("OTP",otp)
            }else{
                res.json({
                    success:false,
                    message:"Failed to send OTP, Please try again"
                })
            }
        }else{
            res.render("change-password",{
                message:"User with this email does not exists"
            });
        }
    } catch (error) {
        console.log("Error in change password validation error")
        res.redirect("/pageNotFound")
    }
}

const verifyChangePassOtp = async (req,res)=>{
    try {
        const enteredOtp = req.body.otp;
        if(enteredOtp===req.session.userOtp){
            res.json({success:true,redirectUrl:"/reset-profile-password"})
        }else{
            res.json({success:false,message:"OTP not matching"})
        }
    } catch (error) {
        console.log("Error in verify change pass otp",error);
        res.json({success:false,message:"An error occured, Please try again later"})  
    }
}

const getResetProfilePassPage = async (req,res)=>{
    try {
        res.render("reset-profile-password")
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

const postNewProfilePassword = async (req,res)=>{
    try {
        const {newPassword, confirmPassword} = req.body;
        const email = req.session.email;
        if(newPassword===confirmPassword){
            const passwordHash =  await securePassword(newPassword);
            await User.updateOne({email:email},{$set:{password:passwordHash}});
            res.render("userProfile")
            

        }else{
            res.render("reset-profile-password",{message:"Password do not match"})
        }
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}


const addAddress = async (req,res)=>{
    try {
        const userId = req.session.user;
        const userData = await User.findOne({_id:userId});
        const userAddress = await Address.findOne({userId:userData._id});

        res.render("address",{
            userAddress:userAddress,
            user:userData
        
        })
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

const postAddAddress = async (req,res)=>{
    try {
        const userId = req.session.user;
        const userData = await User.findOne({_id:userId});
        const {addressType, name, city, landMark, state, pincode, phone, altPhone} = req.body;

        const userAddress = await Address.findOne({userId:userData._id});
        console.log("user address : ",userAddress)
        if(!userAddress){
            const newAddress = new Address({
                userId:userData._id,
                address:[{addressType, name, city, landMark, state, pincode, phone, altPhone}],

            })
            await newAddress.save();
        }else{
            userAddress.address.push({addressType, name, city, landMark, state, pincode, phone, altPhone});
            await userAddress.save()
        }  
        res.redirect("/userProfile")
    } catch (error) {
        console.error("Error in add address",error);
        res.redirect("/pageNotFound")
    }
}

const editAddress = async (req,res)=>{
    try {
        const addressId = req.query.id;
        const user = req.session.user;
        const currentAddress = await Address.findOne({
            "address._id":addressId
        })
        if(!currentAddress){
            return res.redirect("/pageNotFound")
        }

        const addressData = currentAddress.address.find((item)=>{
            return item._id.toString()===addressId.toString()
        })
        if(!addressData){
            return res.redirect("/pageNotFound")
        }
        res.render("edit-address",{
            address:addressData,
            user:user
        })
    } catch (error) {
        console.error("Error in edit address",error);
        res.redirect("/pageNotFound")
    }
}

const postEditAddress = async (req,res)=>{
    try {
        const data = req.body;
        const addressId = req.query.id;
        const user = req.session.user;
        const findAddress = await Address.findOne({"address._id":addressId})
        if(!findAddress){
            res.redirect("/pageNotFound")
        }

        await Address.updateOne(
            {"address._id":addressId},
            {$set:{
                "address.$":{
                    id:addressId,
                    addressType:data.addressType,
                    name:data.name,
                    city:data.city,
                    landMark:data.landMark,
                    state:data.state,
                    pincode:data.pincode,
                    phone:data.phone,
                    altPhone:data.altPhone

                }
            }}
        )
        res.redirect("/userProfile")
    } catch (error) {
        console.error("Error in edit address",error);
        res.redirect("/pageNotFound")
    }
}

const deleteAddress = async (req,res)=>{
    try {
        const addressId = req.query.id;
        const findAddress = await Address.findOne({"address._id":addressId})
        if(!findAddress){
            return res.status(404).send("Address not found");
        }
        await Address.updateOne(
            {"address._id":addressId},
            {$pull:{
                address:{
                    _id:addressId
                     
                }
            }}
        )
        res.redirect("/userProfile")
    } catch (error) {
        console.error("Error in delete address",error);
        res.redirect("/pageNotFound")
    }
}

module.exports = {
    getForgotPassPage,
    forgotEmailValid,
    verifyForgotPassOtp,
    getResetPassPage,
    resendOtp,
    postNewPassword,
    userProfile,
    getEditProfile,
    postEditProfile,
    changeEmail,
    changeEmailValid,
    verifyEmailOtp,
    updateEmail,
    getNewEmail,
    changePassword,
    changePasswordValid,
    verifyChangePassOtp,
    getResetProfilePassPage,
    postNewProfilePassword,
    addAddress,
    postAddAddress,
    editAddress,
    postEditAddress,
    deleteAddress,
    

}