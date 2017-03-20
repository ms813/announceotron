const fs = require('fs');

module.exports = {
    message : function(callback){
        fs.readFile("help.txt", "utf8", callback);
    }
}
