//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const shortID = require('shortid')
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const findOrCreate = require('mongoose-findorcreate');

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://saidheeraj:saidheeraj@cluster0.ua7re.mongodb.net/myFirstDatabase?retryWrites=true&w=majority", {useNewUrlParser: true});
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema ({

  username: String,
  name:String,
  password: String,
  secret: String,
  shortlinks: [
    {
        urlname: String,
        url: String,
        shortid: String,
        click: {
            type: Number,
            default: 0
        },
    }
]

});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});



app.get("/login", function(req, res){
  if(req.isAuthenticated()){
    res.redirect("/")
  }
  else{
    if(req.query.er){
      res.render('login',{errorMessage: req.query})
    }else{
      res.render('login',{errorMessage: 'mm'})
    }
  }
});

app.get("/register", function(req, res){
  if(req.isAuthenticated()){
    res.redirect("/")
  }
  else{
    res.render('register',{errorMessage:2})
  }
});

app.get("/", function(req, res){
  if(req.isAuthenticated()){
    User.findOne({username : req.user.username},function(err,data){
      res.render("index",{userData:data})
    })
  }
  else{
    res.redirect('/login')
  }
});



app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});

app.post("/register", function(req, res){
  User.findOne({username:req.body.username},function(err,data){
    if(data){
      res.render('register',{errorMessage:'hello'})
    }
    else{
      User.register({username: req.body.username}, req.body.password, function(err, user){
        if (err) {
          console.log(err);
        } else {
          passport.authenticate("local")(req, res, function(){
            User.updateOne({username:req.body.username},{$set:{name:req.body.name}},function(err,data){
              res.redirect('/')
            })
          });
        }
      });
    }
  })

});

app.post("/login", function(req, res){

  User.findOne({username:req.body.username},function (err,data) {
    if(data){

      const user = new User({
        username: req.body.username,
        password: req.body.password
      });
    
      req.login(user, function(err){
        if (err) {
          console.log(err)
          res.render('login',{errorMessage:1})
        } else {
          passport.authenticate("local",{ failureRedirect:'/login?er=pascode'})(req, res, function(){
            res.redirect("/");
          });
        }
      });

    }
    else{
      res.redirect('/login?er=uname')
    }
  })

});

app.post('/names', async function (req, res) {
  const urlname = req.body.nameInp;
  const url = req.body.urlInp
  User
      .findOne({ username: req.user.username })
      .then(data => {
          if (!data) throw { message: "Error" }
          data.shortlinks.push({
              urlname,
              url,
              shortid: shortID.generate()
          })

          return data.save()
      })
      .then(data => {
          res.redirect('/')
      })
      .catch(err => {
          console.log(err)
          res.redirect('/')
      })

})


app.get('/redirect/:shortUrl', function (req, res) {
  User.findOne({ username: req.user.username },async function(err,data){
    const index = data.shortlinks.findIndex(e => e.shortid === req.params.shortUrl);
    if(index < 0) return res.redirect("/");
    data.shortlinks[index].click += 1;
    await data.save();
    res.redirect(data.shortlinks[index].url)
  })
})

app.get('/delete/:shortUrl',function(req,res){

  User.findOne({ username: req.user.username },async function(err,data){
    data.shortlinks = data.shortlinks.filter(e => e.shortid !== req.params.shortUrl);
    await data.save();
    res.redirect("/") 
  })
  
})


app.listen(process.env.PORT || 3000, function() {
  console.log("Server started on port 3000.");
});
