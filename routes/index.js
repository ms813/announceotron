var express = require('express');
var router = express.Router();
const auth = require('../bot/auth.json');

/* GET home page. */
router.get('/', function(req, res, next) {
  context = {
      title: 'Announce-o-tron',
      botId: auth.production.botId
  };

  res.render('index', context);
});

module.exports = router;
