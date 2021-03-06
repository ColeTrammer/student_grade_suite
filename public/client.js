"use strict";

$(document).ready(function () {
    var modalHTML = "";
    var percentTotalWanted = 90;
    var assignmentsKeyMap = {};
    var gradeSummaryKeyMap = {};
    var currentSemester = {};
    var tableOrder = {};
    var spaceRegExp = new RegExp(" ", "g");

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
                out += key.key === "hidden" ? "<td>" + (val.substring(0, 3) + ("data-i=\"" + i + "\" ") + val.substring(3)) + "</td>" : "<td>" + (val + (key.display.includes("%") && val !== Infinity ? "%" : "")) + "</td>";
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
                    subset.percent = grade.total.percent || 100;
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
                    var percentSubsetWanted = (percentTotalWanted  - grade.total.percent + adjustedSubsetWeight * subset.points / subset.possible) / adjustedSubsetWeight * 100;
                    if (assignment.possible !== 0) {
                        var _percentAssignmentWanted = (percentSubsetWanted - subset.percent + assignment.percent * assignment.possible / subset.possible) / assignment.possible * subset.possible;
                        assignment.pointsMin = Math.round(_percentAssignmentWanted / 100 * assignment.possible * 1000) / 1000;
                    } else {
                        assignment.pointsMin = Math.round((percentSubsetWanted * subset.possible / 100 - subset.points) * 1000) / 1000;
                    }
                }
                assignment.pointsMin = Math.max(assignment.pointsMin, 0);
            } else {
                assignment.pointsMin = 0;
            }
            if (assignment.possible === 0 && assignment.points === 0) {
                assignment.percent = 0;
            }
            return assignment;
        });
        return grade;
    }

    function processGrades(semester) {
        semester.classes = semester.classes.map(processGrade);
        return semester;
    }

    function renderGrade(grade) {
        function sort(data, tableOrderKey) {
            var order = tableOrder[tableOrderKey];
            data.sort(function (a, b) {
                return typeof a[order.prop] === "string" ? order.prop !== "hidden" ? a[order.prop].toUpperCase() > b[order.prop].toUpperCase() ? 1 : a[order.prop].toUpperCase() === b[order.prop].toUpperCase() ? a.name.toUpperCase() > b.name.toUpperCase() ? 1 : -1 : -1 : a[order.prop].toUpperCase().replace(/>(.*)</g, "$1") > b[order.prop].toUpperCase().replace(/>(.*)</g, "$1") ? 1 : a[order.prop].toUpperCase() === b[order.prop].toUpperCase() ? a.name.toUpperCase() > b.name.toUpperCase() ? 1 : -1 : -1 : a[order.prop] - b[order.prop];
            });
            if (order.order !== "down") data.reverse();
        }
        sort(grade.assignments, currentSemester.name.replace(spaceRegExp, "") + grade.period + "-assignments");
        sort(grade.gradeSummary, currentSemester.name.replace(spaceRegExp, "") + grade.period + "-gradeSummary");
        document.getElementById("grades" + grade.period + "-body").innerHTML = "<div class=\"graph-header\"><h3 class=\"grade-header-1\">Graph</h3></div>" +
            "<svg class=\"graph\" id=\"" + currentSemester.name.replace(spaceRegExp, "") + grade.period + "-graph\"></svg>" +
            "<div class=\"assignments-header\">\n" + 
            "<h3 class=\"grade-header-1\">Assignments</h3>" +
            "<button class=\"btn plus\" data-toggle=\"modal\" id=\"plus-" + grade.period + "\" data-target=\"#add-assignment\" data-period=\"" + grade.period + "\">" +
                "<span class=\"plus-text\" data-period=\"" + grade.period + "\">+</span>" + 
            "</button>\n" + 
            "</div>\n" + 
            generateTable(grade.assignments, assignmentsKeyMap, "assignments", grade.period, currentSemester.name.replace(spaceRegExp, "") + grade.period + "-assignments", true) + "\n" +
            "<div class=\"summary-header\">\n<h3 class=\"grade-header-1\">Summary</h3>" +
                "<div class=\"input-group min-group\">\n" +
                "<div class=\"input-group-addon\">Target Percent:</div>\n" +
                    "<input class=\"form-control min-val\" value=\"" + percentTotalWanted + "\" id=\"" + grade.period + "-target-val\" data-period=\"" + grade.period + "\">\n" +
                    "<div class=\"input-group-addon percent\">%</div></div>\n</div>\n" + 
            generateTable(grade.gradeSummary, gradeSummaryKeyMap, "gradeSummary", grade.period, currentSemester.name.replace(spaceRegExp, "") + grade.period + "-gradeSummary", false);
        $("#assignments" + grade.period).on("click", "a", function (e) {
            e.preventDefault();
            var target = $(e.target);
            var course = currentSemester.classes.find(function (c) {
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
            var course = currentSemester.classes.find(function (c) {
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
            var course = currentSemester.classes.find(function (c) {
                return +c.period === target.data("period");
            });
            var data = course[target.data("name")];
            var order = tableOrder[currentSemester.name.replace(spaceRegExp, "") + course.period + "-" + target.data("name")];
            var down = order.prop !== target.data("key") || order.order === "up";
            order.prop = target.data("key");
            order.order = down ? "down" : "up";
            renderGrade(course);
        }
        $("#assignments" + grade.period + "-header").on("click", "th", sortHandler);
        $("#gradeSummary" + grade.period + "-header").on("click", "th", sortHandler);
        $("#" + grade.period + "-target-val").on("change", function (e) {
            var target = $(e.target);
            var course = currentSemester.classes.find(function (c) {
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
        $("#main-percent-" + grade.period).html("<h4>" + (grade.total.percent || 100) + "%" + "</h4>" + getDifference(grade));
        graphCourse(grade);
    }

    function graphCourse(course) {
        var margin = {
            top: 0,
            bottom: 20,
            left: 25,
            right: 0
        };
        var divWidth = document.getElementById("card" + course.period).getBoundingClientRect().width;
        var desiredWidth = (divWidth - 2) * 0.97;// subtracts 2% of the divWidth
                                                 // when not inspecting,
                                                 // when inspecting subracts 3% of the divWidth
                                                 // b/c js
        var width = desiredWidth - margin.left - margin.right,
            height = 500 - margin.top - margin.bottom;
          
        var svg = d3.select("#" + currentSemester.name.replace(spaceRegExp, "") + course.period + "-graph")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom);

        var g = svg.append("g")
            .attr("transform", "translate(" + [margin.left, margin.top] + ")");

        var x = d3.scaleTime()
            .range([0, width]);
    
        var y = d3.scaleLinear()
            .range([height, 0]);

        var line = d3.line()
            .x(function(d) { return x(d.date); })
            .y(function(d) { return y(d.percent); });
        
        x.domain(d3.extent(course.previous, function(d) { return d.date; }));
        y.domain(d3.extent(course.previous, function(d) { return d.percent; }));

        g.append("path")
            .data([course.previous])
            .attr("class", "line")
            .attr("d", line);

        g.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x));
      
        g.append("g")
            .call(d3.axisLeft(y));
    }

    function render() {
        var main = document.getElementById("main");
        main.innerHTML = "";
        currentSemester.classes.forEach(function (grade, i) {
            main.innerHTML += "<div class=\"card class text-left\" id=\"card" + grade.period + "\">\n" +
                "<div class=\"card-header\" data-toggle=\"collapse\" href=\"#grades" + grade.period + "\">\n" +
                    "<div class=\"class-name-header\"><h2 class=\"mb-0\"><a href=\"#\" onclick=\"return false\">" + grade.period + ": " + grade.name + "</a></h1>\n" +
                    "<div id=\"main-percent-" + grade.period + "\" class=\"mb-0 grade-percent\">" + grade.total.percent + "%</h2>" +
                "</div></div></div>\n" +
                "<div id=\"grades" + grade.period + "\" class=\"collapse card-body body\" data-parent=\"#main\">\n" +
                    "<div id=\"grades" + grade.period + "-body\">\n\n</div>\n</div>\n";
        });
        currentSemester.classes.forEach(renderGrade);
        modalInit()
    }

    function modalInit() {
        var modal = $("#add-assignment");
        var classSelect = modal.find("#classSelect");
        classSelect.html(currentSemester.classes.reduce(function (acc, c) {
            return acc + ("<option value=\"" + c.name + "\">" + c.period + ": " + c.name + "</option>");
        }, ""));
        modal.on("show.bs.modal", function (e) {
            var period = $(e.relatedTarget).data("period");
            var course = currentSemester.classes.find(function (course) {
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
                var course = currentSemester.classes.find(function (course) {
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
        var updateSelect = document.getElementById("semester");
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
            if (acc[0] && (+assignment.date === +acc[0][0].date)) {
                acc[0].push(assignment);
            } else {
                acc.unshift([assignment]);
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
        });
        return previous;
    }

    function initDisplay(data) {
        if (data.error) {
            console.log(data.error);
            return setTimeout(getGradeData, 2000);
        }
        data.semesters.sort(function (a, b) {
            return a.name.toUpperCase() > b.name.toUpperCase() ? 1 : -1;
        });
        var currentSemesterPath = localStorage.getItem("elocGrades-currentSemesterPath") || data.semesters[0].path;
        currentSemester = data.semesters.find(function(semester) {
            return semester.path === currentSemesterPath;
        }) || data.semesters[0];
        localStorage.setItem("elocGrades-currentSemesterPath", currentSemester.path);
        var semesterSelectLink = document.getElementById("semester-select-link");
        semesterSelectLink.innerHTML = currentSemester.name;
        var semesterSelect = document.getElementById("semester-select");
        data.semesters.forEach(function (semester) {
            semesterSelect.innerHTML += "<a class=\"dropdown-item\" href=\"#\" data-name=\"" + semester.name + "\">" + semester.name + "</a>";
        });
        var updateSelect = document.getElementById("semester");
        $(semesterSelect).click(function(e) {
            var target = $(e.target);
            var newSemester = data.semesters.find(function(semester) {
                return semester.name === target.data("name");
            });
            currentSemester = newSemester;
            document.getElementById("semester-select-link").innerHTML = currentSemester.name;
            localStorage.setItem("elocGrades-currentSemesterPath", currentSemester.path);
            $(updateSelect).val(currentSemester.path);
            render();
        });
        data.semesters.forEach(function(semester) {
            updateSelect.innerHTML += "<option value=\"" + semester.path + "\">" + semester.name + "</option>";
        });
        updateSelect.innerHTML += "<option value=\"all\">All</option>"
        $(updateSelect).val(currentSemester.path);
        data.semesters.forEach(function(semester) {
            semester.classes = semester.classes.sort(function (a, b) {
                return a.period - b.period;
            }).map(function (course) {
                course.assignments = course.assignments.map(function (assignment) {
                    assignment.hidden = assignment.implicit ? ">True<" : ">False<";
                    return assignment;
                });
                course.previous = generatePreviousMap(course);
                return course;
            });
        });
        data.semesters = data.semesters.map(function(semester) {
            semester = processGrades(semester);
            semester.classes.forEach(function (course) {
                tableOrder[semester.name.replace(spaceRegExp, "") + course.period + "-assignments"] = {
                    prop: "date",
                    order: "up"
                };
                tableOrder[semester.name.replace(spaceRegExp, "") + course.period + "-gradeSummary"] = {
                    prop: "name",
                    order: "down"
                };
                tableOrder[semester.name.replace(spaceRegExp, "") + course.period + "-totals"] = {
                    prop: "none",
                    order: "none"
                };
                course.gradeSummary.sort(function (a, b) {
                    return a.name.toUpperCase() > b.name.toUpperCase() ? 1 : -1;
                });
            }); 
            return semester;
        })
        data.assignmentsKeyMap.splice(2, 0, {
            key: "pointsMin",
            display: "Minimum Points"
        });
        data.assignmentsKeyMap.push({
            key: "hidden",
            display: "Hidden"
        });
        data.assignmentsKeyMap.splice(1, 0, {
            key: "date",
            display: "Date"
        })
        assignmentsKeyMap = data.assignmentsKeyMap;
        gradeSummaryKeyMap = data.gradeSummaryKeyMap;       
        render();
    }

    var apiUrl = window.location.protocol + "//" + window.location.hostname + ":" + window.location.port + "/api/get";
    function getGradeData() {
        $.ajax({
            url: apiUrl,
            error: function error(xhr, status, err) {
                console.log(status + JSON.stringify(err));
            },
            success: initDisplay
        });
    }

    getGradeData();
});

