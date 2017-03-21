const MongoClient = require('mongodb').MongoClient;
const auth = require('./auth.json');
const bcrypt = require('bcrypt');
const saltRounds = 10;

const dbHandler = {};

dbHandler.getConnection = function (callback) {
    MongoClient.connect(auth[this.env].db, (err, db) => {
        if (err) {
            console.log("error connecting to db");
        } else {
            callback(db);
        }
    });
};

dbHandler.dump = function (guildId) {
    this.getConnection(db => {
        db.collection(guildId, (err, collection) => {
            collection.find().toArray((err, result) => {
                console.log(result);
            });
        });
    });
};

dbHandler.getThemeData = function (guildId, userId, callback) {
    this.getConnection(db => {
        db.collection(guildId, (err, collection) => {
            collection.findOne({id: userId}, callback);
        });
    });
};

dbHandler.addTheme = function (guildId, userId, path, weight, callback) {

    let newTheme = {"weight": weight, "path": path};

    this.getConnection(db => {
        db.collection(guildId, (err, collection) => {
            collection.update({id: userId}, {$addToSet: {themes: newTheme}}, {w: 1}, callback);
        });
    });
};

dbHandler.removeTheme = function (guildId, userId, themeName, callback) {

    this.getConnection(db => {
        db.collection(guildId, (err, collection) => {
            collection.update({id: userId}, {$pull: {themes: {path: themeName}}}, callback);
        });
    });
};

dbHandler.updateWeight = function (guildId, userId, themeName, newWeight, callback) {

    this.getConnection(db => {
        db.collection(guildId, (err, collection) => {
            collection.update(
                {"id": userId, "themes.path": themeName},
                {$set: {"themes.$.weight": newWeight}},
                callback
            );
        });
    });
};

dbHandler.drop = function (guildId) {
    this.getConnection(db => {
        db.collection(guildId, (err, collection) => {
            collection.remove();
            console.log("DB " + guildId + "DROPPED");
        });
    });
};

dbHandler.addUser = function (guildId, userId, username, callback) {
    let newUser = {
        id: userId,
        username: username,
        themes: []
    };
    this.getConnection(db => {

        db.collection(guildId, (err, collection) => {
            //!FIXME
            collection.find().count(n => console.log(n));
            collection.insert(newUser, {w: 1}, callback);
        });
    });
};

dbHandler.devTest = function (guildId) {
    this.getConnection(db => {
        db.collection(guildId, (err, collection) => {

        });
    });
};

dbHandler.renameCollection = function (oldName, newName) {
    console.log("Renaming collection", oldName, "to", newName);
    this.getConnection(db => {
        db.collection(oldName, (err, collection) => {
            collection.rename(newName);
        });
    });
};

dbHandler.setMeta = function (guildId, data, callback) {
    this.getConnection(db => {
        db.collection(guildId, (err, collection) => {
            if (err) {
                callback(err);
            } else {
                data._id = "meta";
                let meta = collection.update(
                    {_id: data._id},
                    data,
                    {upsert: true}
                );
                callback(meta);
            }
        })
    });
};

dbHandler.getGuild = function (guildId, callback) {
    this.getConnection(db => {
        db.collection(guildId, (err, collection) => {
            if (err) {
                callback(err);
            } else {
                collection.find().toArray((err, data) => {
                    callback(err, data);
                });
            }
        })
    });
};

dbHandler.createWebAccount = function (userId, password, guildAdminId, callback) {

    bcrypt.hash(password, saltRounds, (err, hash) => {
        let entry = {
            _id: userId,
            password: hash,
            guildAdmin: [guildAdminId]
        };

        dbHandler.getConnection(db => {
            db.collection("auth", (err, collection) => {
                collection.insert(entry, callback);
            });
        });
    });
};

dbHandler.setGuildAdmin = function (userId, guildId) {

};

dbHandler.resetWebPassword = function (userId, password, callback) {
    bcrypt.hash(password, saltRounds, (err, hash) => {
        dbHandler.getConnection(db => {
            db.collection("auth", (err, collection) =>{
               collection.updateOne( {_id : userId}, {$set : {password : hash}}, callback);
            });
        });
    });
};

module.exports = dbHandler;
