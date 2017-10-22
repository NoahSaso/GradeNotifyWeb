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
    var localError = "";
    if (response.indexOf("\n") > -1) {
      localError = response.split("\n")[0];
    }
    var exists = stdout.trim() == '1';
    callback(exists, localError);
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

function modifyAccount(student_id, key, value, callback) {
  var query = "./grades.py -z \"" + config.salt + "\" -m '" + JSON.stringify({ student_id: student_id, key: key, value: value }) + "'";
  dev_log("Running: " + query);
  exec(query, function (error, stdout, stderr) {
    callback(error, stdout, stderr);
  });
}

function validICAccount(username, student_id, password, callback) {
  var query = "./grades.py -i '" + JSON.stringify({ username: username, student_id: student_id, password: password }) + "'";
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

function sendGrades(student_id) {
  var query = "./grades.py -z \"" + config.salt + "\" -g \"" + student_id + "\"";
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
  
  if (!req.session.hasOwnProperty('justUpgraded')) {
    req.session.justUpgraded = false;
  }
  if (!req.session.hasOwnProperty('justRegistered')) {
    req.session.justRegistered = false;
  }

  locals = { title: 'Grade Notify', loggedIn: loggedIn, student: req.session.student, isAdmin: isAdmin, stripe: { publishable: config.stripe.publishable }, jU: req.session.justUpgraded, jR: req.session.justRegistered };
  
  if (req.session.justUpgraded) {
    req.session.justUpgraded = false;
  }
  if (req.session.justRegistered) {
    req.session.justRegistered = false;
  }

  if (isAdmin) {
    getUserList(function (students) {
      var localStudents = {
        disabled: students.disabled.sort(function (a, b) {
          return (a.name.split(' ')[0] == b.name.split(' ')[0] ? a.name.split(' ')[1] > b.name.split(' ')[1] : a.name.split(' ')[0] > b.name.split(' ')[0]);
        }),
        enabled: students.enabled.sort(function (a, b) {
          return (a.name.split(' ')[0] == b.name.split(' ')[0] ? a.name.split(' ')[1] > b.name.split(' ')[1] : a.name.split(' ')[0] > b.name.split(' ')[0]);
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
  var amount = req.body.amount * 100; // cents
  stripe.charges.create({
    amount: amount,
    currency: 'usd',
    description: 'WG Cares Donation',
    source: token
  }).then(function (charge) {
    if (!charge.paid) {
      res.send(JSON.stringify({ status: 'error', message: 'There was an error completing the transaction. You can try again, give Noah money at school to donate, or send a Venmo to @NoahSaso.' }));
    }
  });
});

/* POST login */
router.post('/login', jsonResponse, function (req, res, next) {

  var data = req.body;
  for (var key in data) {
    if (key != 'password') {
      data[key] = data[key].trim();
    }
  }
  
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

/* POST logout */
router.post('/logout', jsonResponse, function (req, res, next) {

  delete req.session.student;

  res.send(JSON.stringify({ status: 'ok' }));

});

/* POST register */
router.post('/register', jsonResponse, function (req, res, next) {
  
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

  checkAccountExists(data.student_id, function (exists, error) {
    if (exists) {
      res.send(JSON.stringify({ status: 'error', message: 'This student ID is already registered to an account.' }));
    } else {
      validICAccount(data.username, data.student_id, data.password, function (valid, error) {
        if (error.length > 0) {
          res.send(JSON.stringify({ status: 'error', message: error }));
        } else {
          if (valid) {
            addAccount(data, function () {
              sendGrades(data.student_id);
              validAccountPassword(data.student_id, data.password, function (valid, user) {
                if (!valid) {
                  res.send(JSON.stringify({ status: 'error', message: 'Something went wrong. Please try again later' }));
                } else {
                  req.session.justRegistered = true;
                  req.session.student = user;
                  res.send(JSON.stringify({ status: 'ok' }));
                }
              });
            });
          } else {
            res.send(JSON.stringify({ status: 'error', message: 'This is not a valid Infinite Campus account.' }));
          }
        }
      });
    }
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

  if (Object.keys(data).includes('key') && Object.keys(data).includes('value')) {

    if (data.key == 'password') {
      validICAccount(req.session.student['username'], req.session.student['student_id'], data.value, function (valid, error) {
        if (error.length > 0) {
          res.send(JSON.stringify({ status: 'error', message: error }));
          return;
        } else {
          if (!valid) {
            res.send(JSON.stringify({ status: 'error', message: 'This is not a valid Infinite Campus account.' }));
            return;
          }
        }
      });
    }

    modifyAccount(req.session.student['student_id'], data.key, data.value, function (error, stdout, stderr) {
      req.session.student[data.key] = data.value;
      if (data.key == 'enabled') {
        res.send(JSON.stringify({ status: 'ok', message: 'Your account has been ' + (data.value == 1 ? 'enabled' : 'disabled') + '.' }));
      } else {
        res.send(JSON.stringify({ status: 'ok', message: 'Your account has been updated.' }));
      }
    });

  }

  else if (Object.keys(data).includes('data')) {

    data.data = JSON.parse(data.data);

    var keys = Object.keys(data.data);
    var i = 0;
    
    var loopModify = function() {
      modifyAccount(req.session.student['student_id'], keys[i], data.data[keys[i]], function (error, stdout, stderr) {
        req.session.student[keys[i]] = data.data[keys[i]];
        if (i < (keys.length - 1)) {
          i+=1;
          loopModify();
        } else {
          res.send(JSON.stringify({ status: 'ok', message: 'Your preferences have been saved.' }));
        }
      });
    };
    loopModify();

  }

});

router.post('/admin/update', authenticateAdmin, function (req, res, next) {
  
  var data = req.body;

  modifyAccount(data['student_id'], data['key'], data['value'], function (error, stdout, stderr) {
    res.send(JSON.stringify({ status: 'ok', message: stdout.trim() }));
    if (data['key'] == 'phone_email') {
      sendGrades(data['student_id']);
    }
  });

});

module.exports = router;
