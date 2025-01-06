const User = require('../../models/userSchema');
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
        console.log(enteredOtp)
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
        res.render("profile",{
            user:userData
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

const getNewEmail = async (req,res)=>{
    try {
        res.render("new-user-email")
    } catch (error) {
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
    changeEmail,
    changeEmailValid,
    verifyEmailOtp,
    updateEmail,
    getNewEmail,
}