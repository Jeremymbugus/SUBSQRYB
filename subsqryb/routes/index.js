var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  res.render('login', { title: 'Subsqrb' });
  //res.status(200).render('login.ejs')
});

module.exports = router;
