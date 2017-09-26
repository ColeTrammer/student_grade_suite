"use strict"

const mongoose = require("mongoose")
const bcrypt = require("bcrypt-nodejs")

const schema = new mongoose.Schema({
    username: String,
    password: String,
    domain: String,
    grades: mongoose.SchemaTypes.ObjectId
})

schema.methods.generateHash = (password) => {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null)
}

schema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.password)
}

module.exports = mongoose.model("User", schema)