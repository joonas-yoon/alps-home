var express = require('express');
var passport = require('passport');
var router = express.Router();

var User = require('../models/user');
var permission = require('permission');

router.get('/user', permission(['admin', 'user']), function(req, res) {
  res.render('pages/user/edit', {
    user: req.user,
    isLocalProvider: req.user.provider == 'local',
    success: req.flash('success'),
    error: req.flash('error')
  });
});

router.post('/user', permission(['admin', 'user']), function(req, res) {
  if( ! req.isAuthenticated() ){
    return res.render('pages/error');
  }
  
  var user = req.user;
  var body = req.body;
  
  var failedMessage = '수정을 실패했습니다';
  var successMessage = '정보가 수정되었습니다!';
  
  function saveUser(u){
    u.save(function(err, result){
      if(err)
        req.flash('error', failedMessage);
      else
        req.flash('success', successMessage);
  
      res.redirect('/user');
    });
  }

  if(body.student_id) user.student_id = body.student_id;
  if(body.nickname) user.nickname = body.nickname;

  if(user.provider == 'local'){
    
    if(body.new_password && body.new_password.length < 6){
      req.flash('error', '새 비밀번호가 너무 짧습니다.');
      res.redirect('/user');
    } else {
      user.authenticate(body.password, function(err, model, perr){
        if(err || !model || perr){
          req.flash('error', '비밀번호가 일치하지 않습니다.');
          res.redirect('/user');
        } else {
          user.setPassword(body.new_password, function(err, model, perr){
            if(err || !model || perr){
              req.flash('error', '비밀번호 변경에 실패했습니다.');
              res.redirect('/user');
            } else {
              saveUser(user);
            }
          });
        }
      });
    }
  }
});

// =====================================
// DEFAULT ROUTES (login/register) =====
// =====================================
router.get('/register', redirectIfLoggedIn, function(req, res) {
  res.render('pages/register', {
    user : req.user
  });
});

router.post('/register', function(req, res) {
  // console.log(req);
  User.register(new User({
    username  : req.body.username,
    firstname : req.body.firstname,
    lastname  : req.body.lastname,
    student_id: req.body.student_id
  }), req.body.password, function(err, user) {
    if (err) {
      var messages = {
        'UserExistsError': '이미 존재하는 아이디입니다.'
      };
      return res.render('pages/register', {
        user : user,
        error_message: messages[err.name] || '가입에 실패했습니다. 관리자에게 문의하세요.'
      });
    }

    passport.authenticate('local')(req, res, function () {
      res.redirect('/');
    });
  });
});

router.get('/login', autoLogout, function(req, res) {
  res.render('pages/login', {
    user : req.user,
    error_messages: req.flash('error')
  });
});

router.post('/login',
  passport.authenticate('local', {
    successRedirect: '/study',
    failureRedirect: '/login',
    failureFlash: true
  }), function(req, res) {
    res.redirect('/');
  }
);

router.get('/logout', autoLogout, function(req, res) {
  res.redirect('/');
});

// =====================================
// GOOGLE ROUTES =======================
// =====================================
// send to google to do the authentication
// profile gets us their basic information including their name
// email gets their emails
router.get('/auth/google', passport.authenticate('google', { scope : ['profile', 'email'] }));

// the callback after google has authenticated the user
router.get('/auth/google/return',
  passport.authenticate('google', {
    successRedirect: '/study',
    failureRedirect: '/login'
  })
);

// =====================================
// FACEBOOK ROUTES =====================
// =====================================
router.get('/auth/facebook', passport.authenticate('facebook', {
  authType: 'rerequest', scope: ['public_profile', 'email']
}));

router.get('/auth/facebook/callback',
  passport.authenticate('facebook', {
    successRedirect: '/study',
    failureRedirect: '/login'
  }), function(req, res) {
    res.redirect('/');
  }
);

// =====================================

function redirectIfLoggedIn(req, res, next){
  if(req.isAuthenticated()){
    res.redirect('/');
  } else {
    next();
  }
}

function renderIfNotLoggedIn(req, res, next){
  if(req.isAuthenticated()){
    return next();
  } else {
    res.render('pages/error', { status: 404, message: 'Not Found' });
  }
}

function autoLogout(req, res, next) {
  req.logout();
  next();
}

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

exports = module.exports = router;