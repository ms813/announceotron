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
            if (imeta > -1) {
                data.splice(imeta, 1);
            }
            users = data;
            res.render("guild_dashboard", {guildId: guildId, meta: meta, users: users});
        }
    });
};


const updateWeight = function (req, res, next) {
    let guildId = req.params.guildId;
    let userId = req.params.userId;
    let themePath = req.params.themePath;
    let weight = req.params.weight;

    db.updateWeight(guildId, userId, themePath, weight, (err, result) => {
        res.send("done");
    });
};

router.post('/:guildId$', showGuild);
router.get('/:guildId$', showGuild);

router.post('/:guildId/:userId/:themePath/update_weight/:weight', updateWeight);

module.exports = router;