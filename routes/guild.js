const express = require('express');
const router = express.Router();
const db = require('../bot/dbHandler.js');
const _ = require('underscore');

const showGuild = function (req, res, next) {
    let guildId = req.params.guildId;

    db.getGuild(guildId, (err, data) => {
        if (err || data == null) {
            res.render('guild_not_found', {guildId: guildId});
        } else {
            let meta = _.find(data, e => {
                return e._id == 'meta';
            });

            let imeta = data.indexOf(meta);
            if (imeta > -1){
                data.splice(imeta, 1);
                users = data;
            }
            console.log(meta)
            console.log(users)
            res.render("guild_dashboard", {meta: meta, users: users});
        }
    });
};

router.post('/:guildId', showGuild);
router.get('/:guildId', showGuild);

module.exports = router;