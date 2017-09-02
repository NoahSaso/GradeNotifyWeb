var express = require('express');
var router = express.Router();
var url = require('url');

// Run command in terminal
var exec = require('child_process').exec;
function puts(error, stdout, stderr) { console.log(stdout); }

/* GET home page */
router.get('/', function (req, res, next) {
  if (req.query.d === undefined) {
    req.query.d = 0;
  }
  res.render('index', { title: 'GradeNotify', done: req.query.d });
});

/* POST signup */
router.post('/signup', function (req, res, next) {
  data = req.body;
  console.log(data);
  exec("./grades.py -a '${JSON.stringify(data)}'", puts);

  res.redirect(url.format({
    pathname: "/",
    query: {
       "d": 1,
     }
  }));
});

module.exports = router;
