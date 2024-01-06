//jshint esversion:6
require('dotenv').config()
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
//Google OAuth2.0
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
// const bcrypt = require("bcrypt"); level 4
// const saltRounds = 10;
// const md5 = require("md5"); level 3
// const encrypt = require("mongoose-encryption"); level 2

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.URL,
    })
}))



app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.URL)


// const userSchema = {
//     email: String,
//     password: String
// };

//Changing schema to apply encryption level 2
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ['password']});
// level 2

const User = new mongoose.model("User", userSchema); 

passport.use(User.createStrategy());

passport.serializeUser(function(user, done){
    done(null, user.id);
});

passport.deserializeUser(async function(id, done){
    const user = await User.findById(id);
    return done(null, user);
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://secret-jtut.onrender.com/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({googleId: profile.id}, function (err, user){
        return cb(err, user);
    });
  }

));


app.get("/", function(req, res){
    res.render("home")
})

app.get("/auth/google",
    passport.authenticate("google",{ scope: ["profile"] })
);

app.get("/auth/google/secrets",
    passport.authenticate("google", {failureRedirect: "/login"}),
    function(req, res) {
        res.redirect("/secrets");
})

app.get("/login", function(req, res){
    res.render("login")
})

app.get("/register", function(req, res){
    res.render("register")
})

//Session Passport
app.get("/secrets", function(req, res){
    find()
    async function find() {
        const foundUsers = await User.find({"secret": {$ne: null}})
        if (foundUsers) {
            res.render("secrets", {usersWithSecrets: foundUsers});
        } 
    }
}); 

app.get("/submit", function(req, res) {
    if (req.isAuthenticated()){
        res.render("submit");
    } else {
        res.redirect("/login");
    }
})

app.post("/submit", function(req, res){
    const submittedSecret = req.body.secret;

    console.log(req.user.id);

    find()
    async function find(){
        const foundUser = await User.findById(req.user.id)

        if (foundUser) {
            foundUser.secret = submittedSecret
            foundUser.save()
            res.redirect("/secrets");
            
        }
    }
})

//Session Delete
app.get("/logout", function(req, res, next){
    req.logout(function(err){
        if (err) {
            return next(err);
        }
        res.redirect("/");
    });
});

app.post("/register", function(req, res){

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
    //level 4
    // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {

    //     const newUser = new User({
    //         email: req.body.username,
    //         // password: req.body.password
    //         // level 3
    //         // password: md5(req.body.password)
    //         //level 4
    //         password: hash
    //     });
    
    //     newUser.save()
    //     res.render("secrets");
    // });

    
})


app.post("/login", function(req, res){

    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err){
        if (err) {
            console.log(err)
        } else {
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            });
        }
    });


    // level 3
    // const password = md5(req.body.password);

    // find()
    // async function find(){
    //     const foundUser = await User.findOne({ email: username}) 
        // console.log(res)
        // console.log(res.password)
        // level 4
    //     if (foundUser) {
    //         bcrypt.compare(password, foundUser.password, function(err, result) {
    //             if (result == true) {
    //                 res.render("secrets")
    //             }
    //         });

    //         // if (foundUser.password === password) {
    //         //     res.render("secrets") }   
    //     } else {
    //         console.log("No User Found")   
    //     }
    
})

let port = process.env.PORT;
if (port == null || port == ""){
  port = 3000
}


app.listen(port, function() {
  console.log("Server started on port 3000");
});
