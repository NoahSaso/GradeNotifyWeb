var express = require('express');
var router = express.Router();
var url = require('url');

// Run command in terminal
var exec = require('child_process').exec;
function puts(error, stdout, stderr) { console.log(stdout, stderr); }

function checkAccountExists(username, callback) {
  exec("./grades.py -x '" + username + "'", function (error, stdout, stderr) {
    var exists = stdout.trim() == '1';
    callback(exists);
  });
}

function validAccountPassword(username, password, callback) {
  exec("./grades.py -z 123 -v '" + JSON.stringify({ username: username, password: password }) + "'", function (error, stdout, stderr) {
    var valid = stdout.trim() == '1';
    callback(valid);
  });
}

/* GET home page */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'GradeNotify', query: req.query });
});

/* POST signup */
router.post('/signup', function (req, res, next) {
  
  data = req.body;
  data.name = data.first_name + " " + data.last_name;
  delete data.first_name;
  delete data.last_name;

  query = {};

  checkAccountExists(data.username, function (exists) {
    if (exists) {
      query['e'] = 1;
    } else {
      query['d'] = 1;
      console.log(JSON.stringify(data));
      exec("./grades.py -z 123 -a '" + JSON.stringify(data) + "'", puts);
    }
    res.redirect(url.format({
      pathname: "/",
      query: query
    }));
  });

});

/* POST enable */
router.post('/enable', function (req, res, next) {
  data = req.body;
  query = {};

  validAccountPassword(data.username, data.password, function (valid) {
    if (!valid) {
      query['p'] = 1;
    } else {
      console.log(JSON.stringify(data));
      exec("./grades.py -e '" + data.username + "'", function (error, stdout, stderror) {
        query['s'] = 'enabled';
        res.redirect(url.format({ pathname: "/", query: query }));
      });
    }
  });
});

/* POST disable */
router.post('/disable', function (req, res, next) {
  data = req.body;
  query = {};
  
  validAccountPassword(data.username, data.password, function (valid) {
    if (!valid) {
      query['p'] = 1;
    } else {
      console.log(JSON.stringify(data));
      exec("./grades.py -d '" + data.username + "'", function (error, stdout, stderror) {
        query['s'] = 'disabled';
        res.redirect(url.format({ pathname: "/", query: query }));
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
      query['p'] = 1;
    } else {
      console.log("./grades.py -z 123 -m '" + JSON.stringify({ username: data.username, key: 'password', value: data.new_password }) + "'");
      exec("./grades.py -z 123 -m '" + JSON.stringify({username:data.username,key:'password',value:data.new_password}) + "'", function (error, stdout, stderror) {
        query['s'] = 'set to your new password';
        res.redirect(url.format({ pathname: "/", query: query }));
      });
    }
  });
});

module.exports = router;
