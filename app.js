  //jshint esversion:6
require('dotenv').config();
const express = require("express")
const bodyParser = require("body-parser")
const ejs = require("ejs")
const mongoose = require("mongoose")
// const encrypt = require("mongoose-encryption")
// const md5 = require("md5")
// const bcrypt = require("bcrypt")
// const saltRounds = 10
const passport = require("passport")
const session = require("express-session")
const passportLocalMongoose = require("passport-local-mongoose")
var GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');



const app = express()


app.use(bodyParser.urlencoded({extended:true}))
app.use(express.static("public"))
app.set('view engine','ejs')
app.use(session({
  secret:"our little secret",
  resave:false,
  saveUninitialized:false
}))

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB",{useNewUrlParser:true})

const userSchema = new mongoose.Schema({
  email:String,
  password:String
})

// userSchema.plugin(encrypt,{secret:process.env.SECRET,encryptedFields:['password']})

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


const User = new mongoose.model("User",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"

  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get('/',function(req,res){
  res.render("home")
})

app.get('/login',function(req,res){
  res.render("login")
})

app.get('/register',function(req,res){
  res.render("register")
})

app.get("/secrets",function isLoggedIn(req, res) {
  if (req.isAuthenticated()) {
    res.render("secrets");

  } else {
    res.redirect('/login');
  }
})

app.get("/auth/google",function(req,res){
  passport.authenticate('google', { scope: ['profile'] });
})

app.get('/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

  app.get("/submit", function(req, res){
    if (req.isAuthenticated()){
      res.render("submit");
    } else {
      res.redirect("/login");
    }
  });
  
  app.post("/submit", function(req, res){
    const submittedSecret = req.body.secret;
  
 
  
    User.findById(req.user.id, function(err, foundUser){
      if (err) {
        console.log(err);
      } else {
        if (foundUser) {
          foundUser.secret = submittedSecret;
          foundUser.save(function(){
            res.redirect("/secrets");
          });
        }
      }
    });
  });


app.post('/register',function(req,res){
//   bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
//     const newUser = new User({
//       email:req.body.username,
//       password:hash
//   });
//
//   newUser.save(function(err){
//     if(err){
//       console.log(err)
//     }
//     else{
//       res.render("home")
//     }
//   })
// })

User.register({username: req.body.username}, req.body.password, function(err, user){
  if (err) {
    console.log(err);
    res.redirect("/register");
  } else {
    passport.authenticate("local")(req, res, function(){
      res.redirect("/secrets");
    });
  }
});
})

app.get('/logout',function(req,res){
  res.redirect("/")
})

app.post("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});


app.post("/login",function(req,res){
//   const username = req.body.username
//   const password = req.body.password
//
//   User.findOne({email:username},function(err,foundUser){
//     if (err) {
//       console.log(err)
//     } else {
//       if (foundUser) {
//         bcrypt.compare(password, foundUser.password, function(err, result) {
//
//           if (result === true) {
//             res.render("secrets")
//           }
//           else {
//             console.log("Its not match")
//           }
// });
//
//       }
//     }
//   })

const user = new User({
  username: req.body.username,
  password: req.body.password
});

req.login(user, function(err){
  if (err) {
    console.log(err);
  } else {
    passport.authenticate("local")(req, res, function(){
      res.redirect("/secrets");
    });
  }
});
});



app.listen(3000,function(){
  console.log("Server is running on 3000 port")
})
