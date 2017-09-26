"use strict"

if (process.env.NODE_ENV !== "production")
    require('dotenv').config()

const express = require("express")
const app = express()
const path = require("path")
const mongoose = require("mongoose")
const passport = require("passport")
const flash = require("connect-flash")
const cookieParser = require("cookie-parser")
const session = require("express-session")

mongoose.Promise = global.Promise
mongoose.connect(process.env.MONGO_URI, { useMongoClient: true })
require("./app/config/passport.js")(passport)

app.set("view engine", "pug")
app.set("views", path.join(__dirname, "app/views"))

app.use("/public", express.static(path.join(__dirname, "public")))
app.use(cookieParser())
app.use(session({ secret: process.env.SECRET, resave: false, saveUninitialized: false }))
app.use(passport.initialize())
app.use(passport.session())
app.use(flash())

require("./app/routes.js")(app, passport)

app.listen(process.env.PORT || 3000)
