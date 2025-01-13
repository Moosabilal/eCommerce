const User = require('../models/userSchema');



const userAuth = async (req,res,next)=>{
 
    if(req.session.user){
      const user = await User.findById(req.session.user)
      if(user.isBlocked === false){
        return next()
      }else{
        req.session.destroy()
        return res.redirect('/login')
      }
    }else{
      return res.redirect('/login')
    }
  }
  
  const userLogin = async (req,res,next)=>{
    if(req.session.user){
      return res.redirect('/')
    }else{
      return next()
    }
  }
  
  module.exports = {userAuth,userLogin}