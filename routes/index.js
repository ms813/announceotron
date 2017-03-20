var express = require('express');
var router = express.Router();
const db = require('../bot/dbHandler.js');
const auth = require('../bot/auth.json');


/* GET home page. */
router.get('/', (req, res, next) => {
    let context = {
        title: 'Announce-o-tron',
        botId: auth.production.botId
    };

    res.render('index', context);
});

module.exports = router;
