var express = require('express');
var router = express.Router();
var url = require('url');
var config = require('../config.js');

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
  res.render('index', { title: 'GradeNotify', query: req.query });
});

/* POST signup */
router.post('/signup', function (req, res, next) {
  
  data = req.body;

  if (data.agree != 'on') {
    res.redirect(url.format({ pathname: "/", query: { a: 1 } }));
    return;
  }

  data.name = data.first_name + " " + data.last_name;
  delete data.first_name;
  delete data.last_name;

  checkAccountExists(data.username, function (exists) {
    if (exists) {
      res.redirect(url.format({ pathname: "/", query: {e: 1} }));
    } else {
      console.log(JSON.stringify(data));
      addAccount(data, function (){
        res.redirect(url.format({ pathname: "/", query: {d: 1} }));
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
      res.redirect(url.format({ pathname: "/", query: {p: 1} }));
    } else {
      exec("./grades.py -e '" + data.username + "'", function (error, stdout, stderror) {
        res.redirect(url.format({ pathname: "/", query: {s: 'e'} }));
      });
    }
  });
});

/* POST disable */
router.post('/disable', function (req, res, next) {
  data = req.body;
  
  validAccountPassword(data.username, data.password, function (valid) {
    if (!valid) {
      res.redirect(url.format({ pathname: "/", query: {p: 1} }));
    } else {
      exec("./grades.py -d '" + data.username + "'", function (error, stdout, stderror) {
        res.redirect(url.format({ pathname: "/", query: {s: 'd'} }));
      });
    }
  });
});

/* POST update */
router.post('/update', function (req, res, next) {
  data = req.body;
  query = {};
  
  validAccountPassword(data.username, data.old_password, function (valid) {
    if (!valid) {
      res.redirect(url.format({ pathname: "/", query: {p: 1} }));
    } else {
      exec("./grades.py -z \"" + config.salt + "\" -m '" + JSON.stringify({username:data.username,key:'password',value:data.new_password}) + "'", function (error, stdout, stderror) {
        res.redirect(url.format({ pathname: "/", query: {s: 'p'} }));
      });
    }
  });
});

module.exports = router;
