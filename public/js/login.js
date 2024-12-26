const emailid = document.getElementById('email');
const passid = document.getElementById('password');
const error1 = document.getElementById('error1');
const error2 = document.getElementById('error2');
const loginform = document.getElementById('loginform');

function emailValidateChecking(e){
    const emailval = emailid.value;
    const emailpattern = /^[a-zA-Z0-9._-]+@([a-zA-Z0-9.-]+)\.([a-zA-Z]{2,4})$/;
    if(!emailpattern.test(emailVal)){
        error1.style.display="block";
        error1.innerHTML="Invalid Format";
    }else{
        error1.style.display="none";
        error1.innerHTML="";
    }
}

function passwordValidateChecking(e){
    const passVal = passid.value;
    if(passVal.length<8){
        error2.style.display="block";
        error2.innerHTML = "Should contain atleast 8 characters";
    }else{
        error2.style.display="none";
        error2.innerHTML = "";
    }
}

document.addEventListener('DOMContentLoaded',function(){
    loginform.addEventListener("submit",function(e){
        emailValidateChecking();
        passValidateChecking();

        if(!emailid || !passid || !error1 || !error2 || !loginform){
            console.error("One or more element not found");
        }

        if(error1.innerHTML || error2.innerHTML){
            e.preventDefault();
        }
    })
})