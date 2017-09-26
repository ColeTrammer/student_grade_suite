"use strict"

const mongoose = require("mongoose")

const schema = new mongoose.Schema({
    "totalsKeyMap": Object,
    "gradeSummaryKeyMap": Object,
    "assignmentsKeyMap": Object,
    "classes": Object
})

module.exports = mongoose.model("Grade", schema)