var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

/* POST account */
router.post('/', function(req, res, next) {
  res.render('index', { title: 'Thanks', req: JSON.stringify(req.body.test) });
});

module.exports = router;
