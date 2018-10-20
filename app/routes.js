"use strict"

const Grade = require("./models/grades")
const User = require("./models/user")
const bodyParser = require("body-parser")
const updateGrades = require("./update-grades")

module.exports = (app, passport) => {
    app.get("/api/get", forceLogIn, (req, res) => {
        if (req.user.updating) {
            return res.send({ error: "Updating grades" })
        }
        Grade.findById(req.user.grades, (err, grades) => {
            if (!grades || err)
                return res.send({ error: "No grades" })
            res.send(grades)
        })
    })

    app.post("/api/update/", bodyParser.urlencoded({ extended: false }), forceLogIn, (req, res) => {
        User.findById(req.user._id, (err, user) => {
            if (err) {}
            user.updating = true
            user.save((err) => {
                if (err) {}
                req.body.username = req.user.username
                req.body.domain = req.user.domain
                if (req.body.semester === "all") {
                    setTimeout(() => {
                        updateGrades.updateAll(user, req.body, () => {
                        })
                    }, 0)
                } else {
                    setTimeout(() => {
                        updateGrades.updateSemester(user, req.body, () => {
                        })
                    }, 0)
                }
                res.redirect("/grades")
            })
        })
    })

    app.get("/", (req, res) => {
        res.render("login", { message: req.flash("loginMessage")[0] })
    })

    app.post("/", bodyParser.urlencoded({ extended: false }), passport.authenticate("local", {
        successRedirect: "/grades",
        failureRedirect: "/",
        failureFlash: true
    }))
                       
    app.get("/logout", (req, res) => {
        req.logout()
        res.redirect("/")
    })
    
    app.get("/grades", forceLogIn, (req, res) => {
        res.render("index")
    })

    app.get("*", (req, res) => {
        res.status(404)
        res.send("404 Not Found")
    })

    function forceLogIn(req, res, next) {
        if (req.isAuthenticated())
            return next()
        res.redirect("/")   
    }
}