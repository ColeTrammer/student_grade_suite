"use strict"

const Grade = require("./models/grades")
const bodyParser = require("body-parser")
const updateGrades = require("./update-grades")

module.exports = (app, passport) => {
    app.get("/api/get", forceLogIn, (req, res) => {
        Grade.findById(req.user.grades, (err, grades) => {
            if (err)
                return res.status(404).send({ error: "No grades" })
            res.send(grades)
        })
    })

    app.post("/api/update/", bodyParser.urlencoded({ extended: false }), forceLogIn, (req, res) => {
        req.body.username = req.user.username
        req.body.domain = req.user.domain
        if (req.body.semester === "all") {
            updateGrades.updateAll(req.user, req.body, () => {
                res.redirect("/grades")
            })
        } else {
            updateGrades.updateSemester(req.user, req.body, () => {
                res.redirect("/grades")
            })
        }
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