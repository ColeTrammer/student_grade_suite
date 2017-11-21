"use strict"

const mongoose = require("mongoose")

const schema = new mongoose.Schema({
    "totalsKeyMap": Object,
    "gradeSummaryKeyMap": Object,
    "assignmentsKeyMap": Object,
    "semesters": Object,
    "username": String,
    "cookies": String
})

module.exports = mongoose.model("Grade", schema)