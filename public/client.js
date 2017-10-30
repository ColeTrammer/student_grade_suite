"use strict";

$(document).ready(function () {
    var modalHTML = "";
    var percentTotalWanted = 90;
    var assignmentsKeyMap = {};
    var gradeSummaryKeyMap = {};
    var totalsKeyMap = {};
    var grades = {};
    var tableOrder = {};

    function generateTable(data, keyOrder, name, period, sortKey, makePointsInputField) {
        var id = name + period;
        var out = "<table class=\"table table-bordered table-hover table-responsive text-left\" id=\"" + id + "\"><thead class=\"thead-inverse\"><tr id=\"" + id + "-header\">";
        keyOrder.forEach(function (key) {
            out += "<th data-key=\"" + key.key + "\" data-period=\"" + period + "\" data-name=\"" + name + "\">" + (key.display + (tableOrder[sortKey].prop === key.key ? tableOrder[sortKey].order === "down" ? " &#9660;" : " &#9650;" : "")) + "</th>";
        });
        out += "</tr></thead><body>";

        data.forEach(function (data, i) {
            out += "<tr id=\"" + id + "-" + i + "\" " + (data.hidden && data.hidden.includes(">True<") ? "class=\"bg-secondary text-white\"" : "") + ">";

            keyOrder.forEach(function (key) {
                var val = data[key.key];
                if (makePointsInputField && key.key === "points") {
                    out += "<td><input class=\"form-control points\" id=\"" + id + "-input-" + i + "\" data-period=\"" + period + "\" data-i=\"" + i + "\" value=\"" + val + "\"></td>";
                } else {
                    out += key.key === "hidden" ? "<td>" + (val.substring(0, 3) + ("data-i=\"" + i + "\" ") + val.substring(3)) + "</td>" : "<td>" + (val + (key.display.includes("%") ? "%" : "")) + "</td>";
                }
            });
            out += "</tr>";
        });

        return out + "</thead></table>";
    }

    function processGrade(grade) {
        function getLetterGrade(percent) {
            return "ABCDFFFFFF".charAt(4 - Math.floor((percent - 50) / 10)) || "A";
        }

        function roundPercent(dec) {
            return Math.round(dec * 100000) / 1000;
        }

        if (grade.gradeSummary === "none" || grade.gradeSummary.every(function (s) {
            return s.implicit;
        })) {
            var categoryMap = {};
            var totals = [0, 0];
            grade.assignments.forEach(function (assignment) {
                if (!assignment.hidden || assignment.hidden.includes(">False<")) {
                    if (categoryMap[assignment.type]) {
                        categoryMap[assignment.type].points += assignment.points;
                        categoryMap[assignment.type].possible += assignment.possible;
                    } else {
                        categoryMap[assignment.type] = {
                            points: assignment.points,
                            possible: assignment.possible
                        };
                    }
                    totals[0] += assignment.points;
                    totals[1] += assignment.possible;
                }
            });
            grade.total = {
                points: totals[0],
                possible: totals[1],
                percent: roundPercent(totals[0] / totals[1]),
                grade: getLetterGrade(totals[0] / totals[1] * 100)
            };
            grade.gradeSummary = [];
            for (var name in categoryMap) {
                if (categoryMap.hasOwnProperty(name)) {
                    grade.gradeSummary.push({
                        name: name,
                        weight: roundPercent(categoryMap[name].possible / grade.total.possible),
                        points: categoryMap[name].points,
                        possible: categoryMap[name].possible,
                        percent: roundPercent(categoryMap[name].points / categoryMap[name].possible),
                        weightedPercent: roundPercent(categoryMap[name].possible / grade.total.possible * categoryMap[name].points / categoryMap[name].possible),
                        grade: getLetterGrade(roundPercent(categoryMap[name].points / categoryMap[name].possible)),
                        implicit: true
                    });
                }
            }
            grade.gradeSummary = grade.gradeSummary.sort(function (a, b) {
                return a.name.toUpperCase() > b.name.toUpperCase() ? 1 : -1;
            });
        } else {
            grade.gradeSummary = grade.gradeSummary.map(function (subset) {
                subset.points = 0;
                subset.possible = 0;
                return subset;
            });
            grade.assignments.forEach(function (assignment) {
                if (assignment.hidden.includes(">False<")) {
                    var subset = grade.gradeSummary.find(function (s) {
                        return s.name === assignment.type;
                    });
                    subset.points += assignment.points;
                    subset.possible += assignment.possible;
                }
            });
            var totals = [0, 0, 0, 0];
            grade.gradeSummary = grade.gradeSummary.map(function (subset) {
                if (subset.possible !== 0) {
                    subset.percent = roundPercent(subset.points / subset.possible);
                    subset.weightedPercent = roundPercent(subset.weight * subset.percent / 10000);
                    subset.grade = getLetterGrade(subset.percent);
                    subset.implicit = false;
                    totals[0] += subset.points;
                    totals[1] += subset.possible;
                    totals[2] += subset.weightedPercent;
                    totals[3] += subset.weight;
                }

                return subset;
            });
            grade.total = {
                points: totals[0],
                possible: totals[1],
                percent: roundPercent(totals[2] / totals[3]),
                grade: getLetterGrade(totals[2] / totals[3] * 100)
            };
            grade.gradeSummary = grade.gradeSummary.map(function (subset) {
                if (subset.possible === 0) {
                    subset.percent = grade.total.percent;
                    subset.weightedPercent = roundPercent(subset.weight * subset.percent / 10000);
                    subset.grade = getLetterGrade(subset.percent);
                    subset.implicit = true;
                }

                return subset;
            }).sort(function (a, b) {
                return a.name.toUpperCase() > b.name.toUpperCase() ? 1 : -1;
            });
        }
        grade.assignments = grade.assignments.filter(function (assignment) {
            return grade.gradeSummary.find(function (obj) {
                return obj.name === assignment.type;
            }) !== undefined;
        }).map(function (assignment, i) {
            var subset = grade.gradeSummary.find(function (obj) {
                return obj.name === assignment.type;
            });
            if (assignment.hidden === ">False<" || assignment.hidden === ">True<") assignment.hidden = "<a href=\"#\" data-class=\"" + grade.name + "\"" + assignment.hidden + "/a>";
            if (assignment.implicit) {
                assignment.percent = subset.percent;
                assignment.points = Math.round(assignment.percent * assignment.possible * 10) / 1000;
            }
            assignment.percent = roundPercent(assignment.points / assignment.possible);
            if (assignment.hidden.includes(">True<")) {
                assignment.weight = 0;
                assignment.weightedPercent = 0;
            } else {
                assignment.weight = roundPercent(subset.weight / 100 * assignment.possible / subset.possible);
                assignment.weightedPercent = roundPercent(assignment.points * subset.weight / 100 / subset.possible);
            }
            assignment.grade = getLetterGrade(assignment.percent);
            if (assignment.hidden.includes(">False<")) {
                if (grade.gradeSummary.every(function (s) {
                    return s.implicit;
                })) {
                    var percentAssignmentWanted = (percentTotalWanted - grade.total.percent + assignment.percent * assignment.possible / grade.total.possible) / assignment.possible * grade.total.possible;
                    assignment.pointsMin = Math.round(percentAssignmentWanted / 100 * assignment.possible * 1000) / 1000;
                } else {
                    var adjustedSubsetWeight = roundPercent(subset.weight / 100 + subset.weight / 100 / grade.gradeSummary.reduce(function (acc, s) {
                        return acc + (s.implicit ? 0 : s.weight);
                    }, 0) * grade.gradeSummary.reduce(function (acc, s) {
                        return acc + (s.implicit ? s.weight : 0);
                    }, 0));
                    var percentSubsetWanted = (percentTotalWanted - grade.total.percent + adjustedSubsetWeight * subset.points / subset.possible) / adjustedSubsetWeight * 100;
                    var _percentAssignmentWanted = (percentSubsetWanted - subset.percent + assignment.percent * assignment.possible / subset.possible) / assignment.possible * subset.possible;
                    assignment.pointsMin = Math.round(_percentAssignmentWanted / 100 * assignment.possible * 1000) / 1000;
                }
                assignment.pointsMin = Math.max(assignment.pointsMin, 0);
            } else {
                assignment.pointsMin = 0;
            }
            return assignment;
        });
        return grade;
    }

    function processGrades() {
        return grades.classes.map(processGrade);
    }

    function renderGrade(grade) {
        function sort(data, tableOrderKey) {
            var order = tableOrder[tableOrderKey];
            data.sort(function (a, b) {
                return typeof a[order.prop] === "string" ? order.prop !== "hidden" ? a[order.prop].toUpperCase() > b[order.prop].toUpperCase() ? 1 : a[order.prop].toUpperCase() === b[order.prop].toUpperCase() ? a.name.toUpperCase() > b.name.toUpperCase() ? 1 : -1 : -1 : a[order.prop].toUpperCase().replace(/>(.*)</g, "$1") > b[order.prop].toUpperCase().replace(/>(.*)</g, "$1") ? 1 : a[order.prop].toUpperCase() === b[order.prop].toUpperCase() ? a.name.toUpperCase() > b.name.toUpperCase() ? 1 : -1 : -1 : a[order.prop] - b[order.prop];
            });
            if (order.order !== "down") data.reverse();
        }
        sort(grade.assignments, grade.period + "-assignments");
        sort(grade.gradeSummary, grade.period + "-gradeSummary");
        document.getElementById("grades" + grade.period + "-body").innerHTML = "<div class=\"assignments-header\">\n" + 
            "<h3 class=\"grade-header-1\">Assignments</h3>" +
            "<button class=\"btn plus\" data-toggle=\"modal\" id=\"plus-" + grade.period + "\" data-target=\"#add-assignment\" data-period=\"" + grade.period + "\">" +
                "<span class=\"plus-text\" data-period=\"" + grade.period + "\">+</span>" + 
            "</button>\n" + 
            "</div>\n" + 
            generateTable(grade.assignments, assignmentsKeyMap, "assignments", grade.period, grade.period + "-assignments", true) + "\n" +
            "<div class=\"assignments-header\">\n<h3 class=\"grade-header-1\">Summary</h3>" +
                "<div class=\"input-group min-group\">\n" +
                "<div class=\"input-group-addon\">Target Percent:</div>\n" +
                    "<input class=\"form-control min-val\" value=\"" + percentTotalWanted + "\" id=\"" + grade.period + "-target-val\" data-period=\"" + grade.period + "\">\n" +
                    "<div class=\"input-group-addon percent\">%</div></div>\n</div>\n" + 
            generateTable(grade.gradeSummary, gradeSummaryKeyMap, "gradeSummary", grade.period, grade.period + "-gradeSummary", false) + 
            "\n<h3 class=\"header\">Totals</h3>\n" + 
            generateTable([grade.total], totalsKeyMap, "total", grade.period, grade.period + "-totals", false);
        $("#assignments" + grade.period).on("click", "a", function (e) {
            e.preventDefault();
            var target = $(e.target);
            var course = grades.classes.find(function (c) {
                return c.name === target.data("class");
            });
            var assignment = course.assignments[target.data("i")];
            assignment.hidden = target.html() === "True" ? assignment.hidden.replace(">True<", ">False<") : assignment.hidden = assignment.hidden.replace(">False<", ">True<");
            processGrade(course);
            renderGrade(course);
        });
        $("#assignments" + grade.period).on("change", "input", function (e) {
            e.preventDefault();
            var target = $(e.target);
            var course = grades.classes.find(function (c) {
                return +c.period === target.data("period");
            });
            var assignment = course.assignments[target.data("i")];
            var points = parseFloat(target.val());
            if (!isNaN(points)) {
                assignment.points = points;
                assignment.implicit = false;
                processGrade(course);
            }
            renderGrade(course);
        });
        function sortHandler(e) {
            var target = $(e.target);
            var course = grades.classes.find(function (c) {
                return +c.period === target.data("period");
            });
            var data = course[target.data("name")];
            var order = tableOrder[course.period + "-" + target.data("name")];
            var down = order.prop !== target.data("key") || order.order === "up";
            order.prop = target.data("key");
            order.order = down ? "down" : "up";
            renderGrade(course);
        }
        $("#assignments" + grade.period + "-header").on("click", "th", sortHandler);
        $("#gradeSummary" + grade.period + "-header").on("click", "th", sortHandler);
        $("#" + grade.period + "-target-val").on("change", function (e) {
            var target = $(e.target);
            var course = grades.classes.find(function (c) {
                return +c.period === target.data("period");
            });
            var newVal = parseFloat(target.val());
            if (!isNaN(newVal)) percentTotalWanted = newVal;
            processGrade(course);
            renderGrade(course);
        });
        function getDifference(grade) {
            var difference = grade.total.percent - (grade.previous && grade.previous[1] && grade.previous[1].percent) || 0;
            var negative = difference < 0;
            var positive = difference > 0;
            return "<h4 class=\"" + (negative ? "negative" : positive ? "positive" : "") + "\">" + (negative ? "-" : "+") + Math.round(Math.abs(difference) * 1000) / 1000 + "%" + "</h4>";
        }
        $("#main-percent-" + grade.period).html("<h4>" + grade.total.percent + "%" + "</h4>" + getDifference(grade));
    }

    function render() {
        var main = document.getElementById("main");
        grades.classes.forEach(function (grade, i) {
            main.innerHTML += "<div class=\"card class text-left\">\n" +
                "<div class=\"card-header\" data-toggle=\"collapse\" href=\"#grades" + grade.period + "\">\n" +
                    "<div class=\"class-name-header\"><h2 class=\"mb-0\"><a href=\"#\" onclick=\"return false\">" + grade.period + ": " + grade.name + "</a></h1>\n" +
                    "<div id=\"main-percent-" + grade.period + "\" class=\"mb-0 grade-percent\">" + grade.total.percent + "%</h2>" +
                "</div></div>\n" +
                "<div id=\"grades" + grade.period + "\" class=\"collapse\" data-parent=\"#main\">\n" +
                    "<div id=\"grades" + grade.period + "-body\">\n</div>\n</div>\n</div>\n";
        });
        grades.classes.forEach(renderGrade);
    }

    function modalInit() {
        var modal = $("#add-assignment");
        var classSelect = modal.find("#classSelect");
        classSelect.html(grades.classes.reduce(function (acc, c) {
            return acc + ("<option value=\"" + c.name + "\">" + c.period + ": " + c.name + "</option>");
        }, ""));
        modal.on("show.bs.modal", function (e) {
            var period = $(e.relatedTarget).data("period");
            var course = grades.classes.find(function (course) {
                return +course.period === period;
            });
            classSelect.val(course.name);
            modal.find("#typeSelect").html(course.gradeSummary.reduce(function (acc, s) {
                return acc + ("<option value=\"" + s.name + "\">" + s.name + "</option>");
            }, ""));
        });
        function handleSubmit(e) {
            e.preventDefault();
            var values = {};
            $('#assignment-form').serializeArray().forEach(function (field) {
                values[field.name] = field.value;
            });
            values.points = +values.points;
            values.possible = +values.possible;
            if (values.possible && (values.points || values.points === 0) && values.name) {
                var course = grades.classes.find(function (course) {
                    return course.name === values.class;
                });
                function zero(num) {
                    return (num < 10 ? "0" : "") + num
                } 
                course.assignments.unshift({
                    name: values.name,
                    type: values.type,
                    points: values.points,
                    possible: values.possible,
                    hidden: ">False<",
                    date: zero(new Date().getMonth() + 1) + "/" + zero(new Date().getDate()) + "/" + new Date().getFullYear(),
                    implicit: false
                });
                var category = course.gradeSummary.find(function (s) {
                    return s.name === values.type;
                });

                processGrade(course);
                renderGrade(course);

                modal.modal("hide");
            }
            return false
        }
        modal.find("#assignment-form").on("submit", handleSubmit);
    }

    function generatePreviousMap(course) {
        course = JSON.parse(JSON.stringify(course));
        var assignments = course.assignments.map(function(assignment) {
            var month = assignment.date.substring(0, 2) - 1;
            var day = +assignment.date.substring(3, 5);
            var year = +assignment.date.substring(6);
            assignment.date = new Date(year, month, day);
            return assignment;
        }).reduce(function(acc, assignment) {
            if (acc[acc.length - 1] && acc[acc.length - 1][0] && (+assignment.date === +acc[acc.length - 1][0].date)) {
                acc[acc.length - 1].push(assignment);
            } else {
                acc.push([assignment]);
            }
            return acc;
        }, []);
        var previous = [];
        var noGradeSummary = course.gradeSummary === "none";
        course.assignments = [];
        assignments.forEach(function(group) {
            group.forEach(function(assignment) {
                course.assignments.push(assignment);
            });
            var currentTotal = processGrade(course).total;
            previous.unshift(currentTotal);
            previous[0].date = group[0].date;
            if (noGradeSummary) {
                course.gradeSummary = "none";
            }
        })
        return previous;
    }

    function initDisplay(data) {
        data.classes = data.classes.sort(function (a, b) {
            return a.period - b.period;
        }).map(function (course) {
            course.assignments.map(function (assignment) {
                assignment.hidden = assignment.implicit ? ">True<" : ">False<";
            });
            course.previous = generatePreviousMap(course);
            console.log(course)
            return course;
        });
        grades = data;
        processGrades();
        grades.assignmentsKeyMap.splice(2, 0, {
            key: "pointsMin",
            display: "Minimum Points"
        });
        grades.assignmentsKeyMap.push({
            key: "hidden",
            display: "Hidden"
        });
        grades.assignmentsKeyMap.splice(1, 0, {
            key: "date",
            display: "Date"
        })
        assignmentsKeyMap = grades.assignmentsKeyMap;
        gradeSummaryKeyMap = grades.gradeSummaryKeyMap;
        totalsKeyMap = grades.totalsKeyMap;
        grades.classes.forEach(function (course) {
            tableOrder[course.period + "-assignments"] = {
                prop: "date",
                order: "up"
            };
            tableOrder[course.period + "-gradeSummary"] = {
                prop: "name",
                order: "down"
            };
            tableOrder[course.period + "-totals"] = {
                prop: "none",
                order: "none"
            };
            course.gradeSummary.sort(function (a, b) {
                return a.name.toUpperCase() > b.name.toUpperCase() ? 1 : -1;
            });
        });        
        render();
        modalInit();
    }

    var apiUrl = window.location.protocol + "//" + window.location.hostname + ":" + window.location.port + "/api";

    $.ajax({
        url: apiUrl,
        error: function error(xhr, status, err) {
            $("#main").html(status + JSON.stringify(err));
        },
        success: initDisplay
    });
});

