var express = require('express');
var router = express.Router();
var url = require('url');
var config = require('../config.js');
var toastr = require('express-toastr');

// Run command in terminal
var exec = require('child_process').exec;
function puts(error, stdout, stderr) { console.log(stdout, stderr); }

function dev_log(string) { if (process.env.USER == 'noah') { console.log(string); } }

function checkAccountExists(username, callback) {
  var query = "./grades.py -x '" + username + "'";
  dev_log("Running: " + query);
  exec(query, function (error, stdout, stderr) {
    var exists = stdout.trim() == '1';
    callback(exists);
  });
}

function validAccountPassword(username, password, callback) {
  var query = "./grades.py -z \"" + config.salt + "\" -v '" + JSON.stringify({ username: username, password: password }) + "'";
  dev_log("Running: " + query);
  exec(query, function (error, stdout, stderr) {
    var valid = stdout.trim() == '1';
    callback(valid);
  });
}

function addAccount(user_data, callback) {
  var query = "./grades.py -z \"" + config.salt + "\"\"" + config.salt + "\" -a '" + JSON.stringify(data) + "'";
  dev_log("Running: " + query);
  exec(query, function (error, stdout, stderr) {
    callback();
  });
}

/* GET home page */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'GradeNotify', req: req });
});

/* POST signup */
router.post('/signup', function (req, res, next) {
  
  data = req.body;

  if (data.agree != 'on') {
    req.toastr.error('You must agree to the terms to use the service.');
    res.redirect('/');
    return;
  }

  data.name = data.first_name + " " + data.last_name;
  delete data.first_name;
  delete data.last_name;

  checkAccountExists(data.username, function (exists) {
    if (exists) {
      req.toastr.error('An account with that username is already registered.');
      res.redirect('/');
    } else {
      console.log(JSON.stringify(data));
      addAccount(data, function () {
        req.toastr.success('You have been successfully registered. You will now receive notifications to the email you provided within roughly 30 minutes of a grade change.');
        res.redirect('/');
      });
    }
  });

});

/* POST enable */
router.post('/enable', function (req, res, next) {
  data = req.body;
  query = {};

  validAccountPassword(data.username, data.password, function (valid) {
    if (!valid) {
      req.toastr.error('This username and password do not match.');
      res.redirect('/');
    } else {
      exec("./grades.py -e '" + data.username + "'", function (error, stdout, stderror) {
        req.toastr.success('Your account has been enabled.');
        res.redirect('/');
      });
    }
  });
});

/* POST disable */
router.post('/disable', function (req, res, next) {
  data = req.body;
  
  validAccountPassword(data.username, data.password, function (valid) {
    if (!valid) {
      req.toastr.error('This username and password do not match.');
      res.redirect('/');
    } else {
      exec("./grades.py -d '" + data.username + "'", function (error, stdout, stderror) {
        req.toastr.success('Your account has been disabled.');
        res.redirect('/');
      });
    }
  });
});

/* POST update */
router.post('/update', function (req, res, next) {
  data = req.body;
  
  validAccountPassword(data.username, data.old_password, function (valid) {
    if (!valid) {
      req.toastr.error('This username and password do not match.');
      res.redirect('/');
    } else {
      exec("./grades.py -z \"" + config.salt + "\" -m '" + JSON.stringify({username:data.username,key:'password',value:data.new_password}) + "'", function (error, stdout, stderror) {
        req.toastr.success('Your password has been updated.');
        res.redirect('/');
      });
    }
  });
});

module.exports = router;
