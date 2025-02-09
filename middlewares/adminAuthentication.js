const User = require('../models/userSchema')
const isAuthenticated = async (req,res,next)=>{
    if(req.session.admin){
      const admin = await User.findOne({isAdmin:req.session.admin})
        res.locals.admin = admin
      next()
    }else{
      return res.redirect('/admin/login')
    }
  }
  
  
  const isLogin = (req,res,next)=>{
    if(!req.session.admin){
      return res.redirect('/admin/login')
    }else{
      next()
    }
  }
  
  module.exports = {isAuthenticated,isLogin}