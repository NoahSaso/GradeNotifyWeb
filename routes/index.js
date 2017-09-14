var express = require('express');
var router = express.Router();
var url = require('url');
var config = require('../config.js');
var toastr = require('express-toastr');

// Run command in terminal
var exec = require('child_process').exec;
function puts(error, stdout, stderr) { console.log(stdout, stderr); }

function dev_log(string) { if (process.env.USER == 'noah') { console.log(string); } }

function checkAccountExists(studentId, callback) {
  var query = "./grades.py -x \"" + studentId + "\"";
  dev_log("Running: " + query);
  exec(query, function (error, stdout, stderr) {
    var response = stdout.trim();
    var localError = "";
    if (response.indexOf("\n") > -1) {
      localError = response.split("\n")[0];
    }
    var exists = stdout.trim() == '1';
    callback(exists, localError);
  });
}

function validAccountPassword(studentId, password, callback) {
  var query = "./grades.py -z \"" + config.salt + "\" -v '" + JSON.stringify({ student_id: studentId, password: password }) + "'";
  dev_log("Running: " + query);
  exec(query, function (error, stdout, stderr) {
    var valid = stdout.trim() != '0';
    var user = {};
    if (valid) {
      user = JSON.parse(stdout.trim());
      if (user.hasOwnProperty('phone_email') && user.phone_email && user.phone_email.indexOf('@') > -1) {
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

function modifyAccount(studentId, key, value, callback) {
  var query = "./grades.py -z \"" + config.salt + "\" -m '" + JSON.stringify({ student_id: studentId, key: key, value: value }) + "'";
  dev_log("Running: " + query);
  exec(query, function (error, stdout, stderr) {
    callback(error, stdout, stderr);
  });
}

function validICAccount(username, studentId, password, callback) {
  var query = "./grades.py -i '" + JSON.stringify({ username: username, student_id: studentId, password: password }) + "'";
  dev_log("Running: " + query);
  exec(query, function (error, stdout, stderr) {
    var response = stdout.trim();
    var exists = stdout.trim() == '1';
    var errorMsg = "";
    if (response.indexOf("\n") > -1) {
      errorMsg = response.split("\n")[0];
      exists = response.split("\n")[1] == '1';
    }
    callback(exists, errorMsg);
  });
}

function sendGrades(studentId) {
  var query = "./grades.py -z \"" + config.salt + "\" -g \"" + studentId + "\"";
  dev_log("Running: " + query);
  exec(query, puts);
}

function getUserList(callback) {
  var query = "./grades.py -l -j";
  dev_log("Running: " + query);
  exec(query, function (error, stdout, stderr) {
    var response = stdout.trim();
    var students = JSON.parse(response);
    callback(students);
  });
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
  if (req.session.hasOwnProperty('student') && !!req.session.student && req.session.student.hasOwnProperty('premium') && req.session.student.premium) {
    next();
  } else {
    console.log('Not premium');
    res.redirect('/');
  }
}

function authenticateAdmin(req, res, next) {
  // logged in and admin
  if (req.session.hasOwnProperty('student') && !!req.session.student && req.session.student['student_id'] == '76735' && req.session.student['name'] == 'Noah Saso') {
    next();
  } else {
    console.log('Not admin');
    res.redirect('/');
  }
}

function jsonResponse(req, res, next) {
  res.setHeader('Content-Type', 'application/json');
  next();
}

/* GET home page */
router.get('/', function (req, res, next) {
  var loggedIn = (req.session.hasOwnProperty('student') && !!req.session.student);
  var isAdmin = (loggedIn && req.session.student['student_id'] == '76735' && req.session.student['name'] == 'Noah Saso');
  if (!req.session.hasOwnProperty('justEnabledPremium')) {
    req.session.justEnabledPremium = false;
  }
  locals = { title: 'Grade Notify', loggedIn: loggedIn, student: req.session.student, isAdmin: isAdmin, stripe: { publishable: config.stripe.publishable }, jEP: req.session.justEnabledPremium };
  if (req.session.justEnabledPremium) {
    req.session.justEnabledPremium = false;
  }
  if (isAdmin) {
    getUserList(function (students) {
      var localStudents = {
        disabled: students.disabled.sort(function (a, b) {
          return a.name > b.name;
        }),
        enabled: students.enabled.sort(function (a, b) {
          return a.name > b.name;
        })
      };
      localStudents['all'] = [].concat(localStudents.disabled).concat(localStudents.enabled);
      locals['students'] = localStudents;
      res.render('index', locals);
    });
  } else {
    res.render('index', locals);
  }
});

/* POST charge */
router.post('/charge', authenticate, jsonResponse, function (req, res, next) {
  var stripe = require("stripe")(config.stripe.secret);
  var token = req.body.stripeToken;
  var amount = req.body.amount;
  if (token == 'FREE' || amount == 'FREE') {
    modifyAccount(req.session.student['student_id'], 'premium', 1, function (error, stdout, stderr) {
      req.session.justEnabledPremium = true;
      req.session.student['premium'] = true;
      res.send(JSON.stringify({ status: 'ok' }));
    });
  } else {
    amount = amount * 100;
    stripe.charges.create({
      amount: amount,
      currency: 'usd',
      description: 'WG Cares Donation',
      source: token
    }).then(function (charge) {
      if (charge.paid) {
        modifyAccount(req.session.student['student_id'], 'premium', 1, function (error, stdout, stderr) {
          req.session.justEnabledPremium = true;
          req.session.student['premium'] = true;
          res.send(JSON.stringify({ status: 'ok' }));
        });
      } else {
        res.send(JSON.stringify({ status: 'error', message: 'There was an error completing the transaction. You can try again or give Noah money at school to donate. You may still upgrade your account with the other button.' }));
      }
    });
  }
});

/* POST login */
router.post('/login', jsonResponse, function (req, res, next) {

  var data = req.body;
  for (var key in data) {
    if (key != 'password') {
      data[key] = data[key].trim();
    }
  }
  
  checkAccountExists(data.studentId, function (exists, error) {
    if (!exists) {
      res.send(JSON.stringify({ status: 'error', message: 'These credentials are invalid.' }));
    } else {
      validAccountPassword(data.studentId, data.password, function (valid, user) {
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

/* POST logout */
router.post('/logout', jsonResponse, function (req, res, next) {

  delete req.session.student;

  res.send(JSON.stringify({ status: 'ok' }));

});

/* POST signup */
router.post('/signup', jsonResponse, function (req, res, next) {
  
  var data = req.body;
  for (var key in data) {
    if (key != 'password') {
      data[key] = data[key].trim();
    }
  }

  if (data.agree != 'on') {
    res.send(JSON.stringify({ status: 'error', message: 'You must agree to the terms to use the service.' }));
    return;
  }

  data.name = data.first_name + " " + data.last_name;
  delete data.first_name;
  delete data.last_name;

  checkAccountExists(data.studentId, function (exists, error) {
    if (exists) {
      res.send(JSON.stringify({ status: 'error', message: 'An account with that Student ID is already registered. Please use the enable form on the "Edit Account" page if your account is disabled.' }));
    } else {
      validICAccount(data.username, data.studentId, data.password, function (valid, error) {
        if (error.length > 0) {
          res.send(JSON.stringify({ status: 'error', message: error }));
        } else {
          if (valid) {
            addAccount(data, function () {
              res.send(JSON.stringify({ status: 'ok', message: 'You have been successfully registered. You will now receive notifications to the email you provided within roughly 30 minutes of a grade change.' }));
              sendGrades(data.studentId);
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
router.post('/enable', authenticate, jsonResponse, function (req, res, next) {

  var data = req.body;
  for (var key in data) {
    if (key != 'password') {
      data[key] = data[key].trim();
    }
  }

  modifyAccount(req.session.student['student_id'], 'enabled', 1, function (error, stdout, stderr) {
    req.session.student['enabled'] = true;
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
    req.session.student['enabled'] = false;
    res.send(JSON.stringify({ status: 'ok', message: 'Your account has been disabled.' }));
  });

});

/* POST update */
router.post('/update', authenticate, jsonResponse, function (req, res, next) {

  var data = req.body;
  for (var key in data) {
    if (key != 'password') {
      data[key] = data[key].trim();
    }
  }
  
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
router.post('/update/phone', authenticatePremium, jsonResponse, function (req, res, next) {

  var data = req.body;
  
  var phoneEmail = data['phone'] + "@" + data['carrier'];
  modifyAccount(req.session.student['student_id'], 'phone_email', phoneEmail, function (error, stdout, stderr) {
    req.session.student['phone'] = data['phone'];
    req.session.student['carrier'] = data['carrier'];
    res.send(JSON.stringify({ status: 'ok', message: 'Your phone has been updated.' }));
    sendGrades(req.session.student['student_id']);
  });

});

router.post('/admin/update', authenticateAdmin, function (req, res, next) {
  
  var data = req.body;

  modifyAccount(data['studentId'], data['key'], data['value'], function (error, stdout, stderr) {
    res.send(JSON.stringify({ status: 'ok', message: stdout.trim() }));
    if (data['key'] == 'phone_email') {
      sendGrades(data['studentId']);
    }
  });

});

module.exports = router;
