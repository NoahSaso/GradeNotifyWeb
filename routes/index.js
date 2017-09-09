var express = require('express');
var router = express.Router();
var url = require('url');
var config = require('../config.js');
var toastr = require('express-toastr');

// Run command in terminal
var exec = require('child_process').exec;
function puts(error, stdout, stderr) { console.log(stdout, stderr); }

function dev_log(string) { if (process.env.USER == 'noah') { console.log(string); } }

function checkAccountExists(student_id, callback) {
  var query = "./grades.py -x \"" + student_id + "\"";
  dev_log("Running: " + query);
  exec(query, function (error, stdout, stderr) {
    var response = stdout.trim();
    var error = "";
    if (response.indexOf("\n") > -1) {
      error = response.split("\n")[0];
    }
    var exists = stdout.trim() == '1';
    callback(exists, error);
  });
}

function validAccountPassword(student_id, password, callback) {
  var query = "./grades.py -z \"" + config.salt + "\" -v '" + JSON.stringify({ student_id: student_id, password: password }) + "'";
  dev_log("Running: " + query);
  exec(query, function (error, stdout, stderr) {
    var valid = stdout.trim() != '0';
    var user = {};
    if (valid) {
      user = JSON.parse(stdout.trim());
      if (user.hasOwnProperty('phone_email') && user.phone_email.indexOf('@') > -1) {
        user.phone = user.phone_email.split('@')[0];
        user.carrier = user.phone_email.split('@')[1];
        delete user.phone_email;
      }
    }
    callback(valid, user);
  });
}

function addAccount(user_data, callback) {
  var query = "./grades.py -z \"" + config.salt + "\" -a '" + JSON.stringify(user_data) + "'";
  dev_log("Running: " + query);
  exec(query, function (error, stdout, stderr) {
    callback();
  });
}

function modifyAccount(student_id, key, value, callback) {
  var query = "./grades.py -z \"" + config.salt + "\" -m '" + JSON.stringify({ student_id: student_id, key: key, value: value }) + "'";
  dev_log("Running: " + query);
  exec(query, function (error, stdout, stderr) {
    callback();
  });
}

function validICAccount(username, student_id, password, callback) {
  var query = "./grades.py -i '" + JSON.stringify({ username: username, student_id: student_id, password: password }) + "'";
  dev_log("Running: " + query);
  exec(query, function (error, stdout, stderr) {
    var response = stdout.trim();
    var exists = stdout.trim() == '1';
    var error_msg = "";
    if (response.indexOf("\n") > -1) {
      error_msg = response.split("\n")[0];
      exists = response.split("\n")[1] == '1';
    }
    callback(exists, error_msg);
  });
}

function sendGrades(student_id, callback) {
  var query = "./grades.py -z \"" + config.salt + "\" -g \"" + student_id + "\"";
  dev_log("Running: " + query);
  exec(query, puts);
}

function authenticate(req, res, next) {
  // logged in
  if (req.session.hasOwnProperty('student') && !!req.session.student) {
    next();
  } else {
    res.redirect('/');
  }
}

function authenticatePremium(req, res, next) {
  // logged in and premium
  if (req.session.hasOwnProperty('student') && !!req.session.student && req.session.premium) {
    next();
  } else {
    res.redirect('/');
  }
}

/* GET home page */
router.get('/', function (req, res, next) {
  var loggedIn = (req.session.hasOwnProperty('student') && !!req.session.student);
  res.render('index', { title: 'Grade Notify', loggedIn: loggedIn, student: req.session.student});
});

/* POST login */
router.post('/login', function (req, res, next) {

  var data = req.body;
  for (var key in data) {
    if (key != 'password') {
      data[key] = data[key].trim();
    }
  }

  res.setHeader('Content-Type', 'application/json');
  
  checkAccountExists(data.student_id, function (exists, error) {
    if (!exists) {
      res.send(JSON.stringify({ status: 'error', message: 'These credentials are invalid.' }));
    } else {
      validAccountPassword(data.student_id, data.password, function (valid, user) {
        if (!valid) {
          res.send(JSON.stringify({ status: 'error', message: 'These credentials are invalid.' }));
        } else {
          req.session.student = user;
          res.send(JSON.stringify({ status: 'ok' }));
        }
      });
    }
  });

});

/* GET logout */
router.post('/logout', authenticate, function (req, res, next) {
  
  res.setHeader('Content-Type', 'application/json');

  delete req.session.student;

  res.send(JSON.stringify({ status: 'ok' }));

});

/* POST signup */
router.post('/signup', function (req, res, next) {
  
  var data = req.body;
  for (var key in data) {
    if (key != 'password') {
      data[key] = data[key].trim();
    }
  }

  res.setHeader('Content-Type', 'application/json');

  if (data.agree != 'on') {
    res.send(JSON.stringify({ status: 'error', message: 'You must agree to the terms to use the service.' }));
    return;
  }

  data.name = data.first_name + " " + data.last_name;
  delete data.first_name;
  delete data.last_name;

  checkAccountExists(data.student_id, function (exists, error) {
    if (exists) {
      res.send(JSON.stringify({ status: 'error', message: 'An account with that Student ID is already registered. Please use the enable form on the "Edit Account" page if your account is disabled.' }));
    } else {
      validICAccount(data.username, data.student_id, data.password, function (valid, error) {
        if (error.length > 0) {
          res.send(JSON.stringify({ status: 'error', message: error }));
        } else {
          if (valid) {
            addAccount(data, function () {
              res.send(JSON.stringify({ status: 'ok', message: 'You have been successfully registered. You will now receive notifications to the email you provided within roughly 30 minutes of a grade change.' }));
              sendGrades(data.student_id);
            });
          } else {
            res.send(JSON.stringify({ status: 'error', message: 'This is not a valid Infinite Campus account.' }));
          }
        }
      });
    }
  });

});

/* POST enable */
router.post('/enable', authenticate, function (req, res, next) {

  var data = req.body;
  for (var key in data) {
    if (key != 'password') {
      data[key] = data[key].trim();
    }
  }
  
  res.setHeader('Content-Type', 'application/json');

  modifyAccount(req.session.student['student_id'], 'enabled', 1, function (error, stdout, stderr) {
    res.send(JSON.stringify({ status: 'ok', message: 'Your account has been enabled.' }));
  });

});

/* POST disable */
router.post('/disable', authenticate, function (req, res, next) {

  var data = req.body;
  for (var key in data) {
    if (key != 'password') {
      data[key] = data[key].trim();
    }
  }
  
  res.setHeader('Content-Type', 'application/json');

  modifyAccount(req.session.student['student_id'], 'enabled', 0, function (error, stdout, stderr) {
    res.send(JSON.stringify({ status: 'ok', message: 'Your account has been disabled.' }));
  });

});

/* POST update */
router.post('/update', authenticate, function (req, res, next) {

  var data = req.body;
  for (var key in data) {
    if (key != 'password') {
      data[key] = data[key].trim();
    }
  }

  res.setHeader('Content-Type', 'application/json');
  
  validICAccount(req.session.student['username'], req.session.student['student_id'], data.new_password, function (valid, error) {
    if (error.length > 0) {
      res.send(JSON.stringify({ status: 'error', message: error }));
    } else {
      if (valid) {
        modifyAccount(req.session.student['student_id'], 'password', data.new_password, function (error, stdout, stderr) {
          res.send(JSON.stringify({ status: 'ok', message: 'Your password has been updated.' }));
        });
      } else {
        res.send(JSON.stringify({ status: 'error', message: 'This is not a valid Infinite Campus account.' }));
      }
    }
  });

});

/* POST update/phone */
router.post('/update/phone', authenticatePremium, function (req, res, next) {

  var data = req.body;

  res.setHeader('Content-Type', 'application/json');
  
  var phoneEmail = data['phone'] + "@" + data['carrier'];
  modifyAccount(req.session.student['student_id'], 'phone_email', phoneEmail, function (error, stdout, stderr) {
    req.session.student['phone'] = data['phone'];
    req.session.student['carrier'] = data['carrier'];
    res.send(JSON.stringify({ status: 'ok', message: 'Your phone has been updated.' }));
  });

});

module.exports = router;
