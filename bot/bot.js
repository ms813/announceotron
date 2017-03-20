const express = require('express');
const Discord = require('discord.js');
const auth = require('./auth.json');
const db = require('./dbHandler');
const _ = require("underscore");
const https = require('https');
const fs = require('fs');
const help = require('./help.js');

const maxFileSize = 10485760;
const validFileExtensions = ["mp3", "wav", "ogg"];

const bot = {
    client: new Discord.Client(),
};

bot.login = function () {
    let token = auth[bot.env].token;
    this.client.login(token);
};

bot.client.on('ready', () => {
    console.log(`Announce-o-tron${bot.env === 'development' ? '-dev' : ""} is ready`);
});

bot.client.on('message', message => {
    //ignore private messages
    if (!message.guild) {
        return;
    }

    let msgParts = message.content.split(" ");
    let guildId = message.guild.id;

    if (msgParts[0] === '`db') {
        if (msgParts[1] === 'dump') {
            if (message.author.id === auth.devId) {
                db.dump(guildId);
            }
        } else if (msgParts[1] === 'query') {
            if (message.author.id === auth.devId) {
                let userId = msgParts[2];
                if (!userId) {
                    userId = message.author.id;
                }

                db.getThemeData(guildId, userId, (e, r) => {
                    message.author.sendMessage(JSON.stringify(r, null, 4));
                });
            }
        } else if (msgParts[1] === 'rename') {
            if (msgParts[2]) {
                db.renameCollection(msgParts[2], message.guild.id);
            }
        }
    }
    else if (msgParts[0] === '`remove') {
        let id = message.author.id;
        let fileName = msgParts[1];

        db.removeTheme(guildId, id, fileName, function (err, result) {
            if (!err) {
                console.log("Db entry removed");
                deleteFile("./sound/" + guildId + "/" + id + "/" + fileName, (err, result) => {
                    if (err) {
                        console.log("Error deleting file", err);
                        message.author.sendMessage("Error removing theme music: the file you specified doesn't exist! Please try again")
                    } else {
                        console.log("File deleted successfully", fileName);
                        message.author.sendMessage("Theme music removed successfully");
                    }
                });
            }
        });
    }
    else if (msgParts[0] === '`test') {
        message.channel.sendMessage("Bot online");
    } else if (msgParts[0] === '`devTest') {
        db.devTest(guildId);
    } else if (msgParts[0] === '`add') {
        addTheme(message, msgParts[1]);
    } else if (msgParts[0] === '`update') {
        let fileName = msgParts[1];
        let weight = msgParts[2];

        db.updateWeight(guildId, message.author.id, fileName, weight, (err, result) => {
            message.author.sendMessage(fileName + " weight updated to " + weight);
        });
    } else if (msgParts[0] === '`list') {
        db.getThemeData(guildId, message.author.id, (err, result) => {

            if (result === null) {
                message.author.send("I don't know who you are, why dont you try adding some theme music?");
                return;
            }

            if (!err) {
                let output = prettyPrintUserData(result);
                message.author.sendMessage("I have the following theme songs prepared for you:\n" + output).catch(console.error);
            } else {
                message.author.sendMessage("Error accessing your data, please try again later!");
            }
        })
    } else if (msgParts[0] === '`help') {
        help.message((err, msg) => {
            message.author.sendMessage(msg);
        });
    } else if (msgParts[0] === "`setmeta") {
        setMeta(message.guild, msgParts.splice(1, 1), (status) => {
            console.log("Meta update:");
            console.log(status);
        });
    }
});


bot.client.on('voiceStateUpdate', (oldMember, newMember) => {

    let channel = newMember.voiceChannel;
    let id = newMember.id;
    let guildId = newMember.guild.id;

    //channel join/leave and mute/unmute all triggered here
    //this checks to see if the user's mute status is the same.
    //If it is, then the user must have joined/left the channel
    channelJoined = oldMember.selfMute === newMember.selfMute;

    //channel === undefined if a member leaves the channel
    //only play music if a member that is not the bot joins a channel
    //only play if no other song is playing
    if (channel && channelJoined && id !== auth[bot.env].botId) {
        console.log(newMember.user.username + " joined " + newMember.guild.name + "/" + newMember.voiceChannel.name);
        let userThemeData = db.getThemeData(guildId, id, (err, item) => {

            if (item !== null && item.themes.length > 0) {
                channel.join().then(connection => {

                    //pick a random theme from the database
                    let themePath = rollTheme(item.themes);

                    console.log("Playing /sound/" + guildId + "/" + id + "/" + themePath);
                    let dispatcher = connection.playFile(
                        "./sound/" + guildId + "/" + id + "/" + themePath,     //music file path
                        {volume: 1}                //options
                    );

                    //once the sound clip ends, exit the channel
                    dispatcher.once('end', e => {
                        channel.leave();
                        globalPlay = false;
                    });
                });
            }
        });
    }
});

const rollTheme = function (themePathData) {
    //total the weight
    let totalWeight = _.reduce(themePathData, function (memo, themeDatum) {
        return memo += parseInt(themeDatum.weight);
    }, 0);

    //get a random number between 0 and the total weight
    let rnd = Math.random() * totalWeight;

    let runningTotal = 0;
    for (let i = 0; i < themePathData.length; i++) {
        runningTotal += parseInt(themePathData[i].weight);

        //return the path from the bucket that the random number falls into
        if (rnd < runningTotal) {
            return themePathData[i].path;
        }
    }
}

const mkdir = function (path, cb) {
    fs.mkdir(path, err => {
        if (err) {
            if (err.code == 'EEXIST') {
                //dir already exists
            } else {
                //something else has gone wrong
                console.log("Error while trying to create dir " + path);
                console.log(err);
                cb(err);
            }
        } else {
            console.log(path + " created successfully");
        }
    });
}

//download a file from url to dest
const download = function (url, fileData, cb) {

    // check the directories required for the file exists, if not, create them
    let dir = fileData.root + fileData.guildId + "/";

    //check the guild dir has been made
    mkdir(dir, cb);

    //check the user has a directory inside the guild dir
    dir += fileData.userId + "/";
    mkdir(dir, cb);

    let dest = fileData.root + fileData.guildId + "/" + fileData.userId + "/" + fileData.themeName;

    let file = fs.createWriteStream(dest);
    let request = https.get(url, function (response) {
        response.pipe(file);
        file.on('finish', function () {
            file.close(cb);  // close() is async, call cb after close completes.
        });
    }).on('error', function (err) { // Handle errors
        fs.unlink(dest); // Delete the file async. (But we don't check the result)
        if (cb) {
            cb(err.message);
        }
    });
};

const deleteFile = function (path, callback) {
    fs.unlink(path, callback);
};

const isNumber = function (n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
};

const isValidFormat = function (filename) {
    let themeFormat = filename.split(".");
    let extension = themeFormat[themeFormat.length - 1];

    let valid = _.find(validFileExtensions, function (format) {
        return format === extension
    });
    return !!valid;
};

const prettyPrintUserData = function (userData) {
    let stringbuilder = [];
    for (let i = 0; i < userData.themes.length; i++) {
        stringbuilder.push(userData.themes[i].path, ", \t\t\t\t weighting: " + userData.themes[i].weight + "\n");
    }
    return stringbuilder.join("");
};

const addTheme = function (message, weight) {

    let attachment = message.attachments.first();
    let guildId = message.guild.id;

    if (!attachment) {
        message.author.sendMessage("No file received. Post your theme music with the message 'add *<probablility_weight>*'");
        return;
    }

    if (!isValidFormat(attachment.filename)) {
        message.author.sendMessage("File format invalid!");
        return;
    }

    if (attachment.filesize > maxFileSize) {
        message.author.sendMessage("Sorry, that file is too big! Max file size: " + maxFileSize / (1024 * 1024) + " MB");
        return;
    }

    db.getThemeData(guildId, message.author.id, (err, data) => {
        if (data === null) {
            db.addUser(guildId, message.author.id, message.author.username, (err, result) => {
                console.log("User added" + message.author.username);
            });
            addTheme(message, weight);
            return;
        }

        let fileName = attachment.filename;
        let exists = _.find(data.themes, e => {
            return e.path === fileName;
        });

        if (exists) {
            message.author.sendMessage("Sorry, a theme with this file name already exists!");
            return;
        }

        if (!weight) {
            weight = 1;
            message.author.sendMessage("No probability specified, setting the weight to 1");
        }

        let fileData = {
            root: "sound/",
            guildId: guildId,
            userId: message.author.id,
            themeName: fileName
        };

        download(attachment.url, fileData, err => {
            if (err) {
                console.log("error downloading file");
                message.author.sendMessage("Sorry, there was an error downloading your file");
            } else {
                console.log("attachment downloaded");
                db.addTheme(guildId, message.author.id, fileName, weight, (err, result) => {
                    if (err) {
                        console.log("Error adding record to db");
                        console.log(err);
                        message.author.sendMessage("Sorry, there was an error adding your music to the database, please try again later");
                    } else {
                        console.log("Record added to db");
                        message.author.sendMessage("New theme music added!");
                    }
                });
            }
        });
    });
};

const setMeta = function (guild, parts, cb) {
    let meta = {
        "guildId": guild.id,
        "guildName": guild.name,
    };

    db.setMeta(guild.id, meta, cb);

    cb("meta set");
};

module.exports = bot;