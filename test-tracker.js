/* eslint-disable max-statements */
/* eslint-disable max-len */
/* eslint-disable camelcase */
/* eslint-disable max-depth */
/* eslint-disable max-lines-per-function */
const express = require("express");
const morgan = require("morgan");
const flash = require("express-flash");
const session = require("express-session");
const { validationResult } = require("express-validator");
const store = require("connect-loki");
const validate = require("./lib/validator");
// const SeedData = require("./lib/seed-data");
// const SessionPersistence = require("./lib/session-persistence");
const PgPersistence = require("./lib/pg-persistence");
const catchError = require("./lib/catch-error");

const app = express();
const host = "localhost";
const port = 3000;
const LokiStore = store(session);

app.set("views", "./views");
app.set("view engine", "pug");

app.use(morgan("common"));
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));
app.use(session({
  cookie: {
    httpOnly: true,
    maxAge: 31 * 24 * 60 * 60 * 1000, // 31 days in millseconds
    path: "/",
    secure: false,
  },
  name: "test-tracker-session-id",
  resave: false,
  saveUninitialized: true,
  secret: "this is not very secure",
  store: new LokiStore({}),
}));

app.use(flash());

// Create a new datastore
app.use((req, res, next) => {
  // res.locals.store = new SessionPersistence(req.session);
  res.locals.store = new PgPersistence(req.session);
  next();
});

// Extract session info
app.use((req, res, next) => {
  res.locals.username = req.session.username;
  res.locals.signedIn = req.session.signedIn;
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  next();
});

// Extract session info
app.use((req, _res, next) => {
  let studentView = "student";
  if ("studentView" in req.session) {
    studentView = req.session.studentView;
  }
  req.session.studentView = studentView;
  next();
});

// Detect unauthorized access to routes.
const requiresAuthentication = (_req, res, next) => {
  if (!res.locals.signedIn) {
    console.log("Unauthorized.");
    res.status(401).send("Unauthorized.");
  } else {
    next();
  }
};


// Redirect start page
app.get("/", (_req, res) => {
  res.redirect("/students");
});

// Render the list of students
app.get("/students",
  catchError(async (_req, res) => {
    let store = res.locals.store;
    let students = await store.sortedStudents();

    let studentsInfo = students.map(student => {
      return {
        countStudentTestsComplete: student.tests.filter(test => test.done).length,
        countStudentTests: student.tests.length,
        // highestTest: store.highestScoringTest(student.id),
        // highestTestScore: store.scoreString(store.highestScoringTest(student.id)),
        baselineScore: store.scoreString(student.baselineScore),
      };
    });

    res.render("students", {
      students,
      studentsInfo,
    });
  })
);

// Render new student page
app.get("/students/new",
  requiresAuthentication,
  (_req, res) => {
    res.render("new-student");
  }
);


// Create a new student
app.post("/students",
  requiresAuthentication,

  [
    validate.uniqueName,
    validate.SATScore,
    validate.ACTScore,
  ],

  catchError(async (req, res) => {
    let satScoreInput = [req.body.SATVerbal, req.body.SATMath];
    let actScoreInput = [req.body.ACTEnglish, req.body.ACTMath, req.body.ACTReading, req.body.ACTScience];

    const incompleteBaseline = () => {
      let isPartialSat = satScoreInput.some(sectionScore => !!sectionScore) &&
                        !satScoreInput.every(sectionScore => !!sectionScore);
      let isPartialAct = actScoreInput.some(sectionScore => !!sectionScore) &&
                        !actScoreInput.every(sectionScore => !!sectionScore);
      return (isPartialSat || isPartialAct);
    };

    const multipleBaselines = () => {
      let someSat = satScoreInput.some(sectionScore => !!sectionScore);
      let someAct = actScoreInput.some(sectionScore => !!sectionScore);
      return someSat && someAct;
    };

    const rerenderNewStudent = () => {
      res.render("new-student", {
        flash: req.flash(),
        studentName: req.body.studentName,
        SATVerbal: req.body.SATVerbal,
        SATMath: req.body.SATMath,
        ACTEnglish: req.body.ACTEnglish,
        ACTMath: req.body.ACTMath,
        ACTReading: req.body.ACTReading,
        ACTScience: req.body.ACTScience,
        test_plan: req.body.test_plan,
      });
    };

    try {
      let errors = validationResult(req);
      if (!errors.isEmpty()) {
        errors.array().forEach(message => req.flash("error", message.msg));
        rerenderNewStudent();
      } else if (incompleteBaseline()) {
        req.flash("error", "You must complete all sections to submit a baseline score.");
        rerenderNewStudent();
      } else if (multipleBaselines()) {
        req.flash("error", "You can only save scores for one baseline.");
        rerenderNewStudent();
      } else {
        let createdStudent = await res.locals.store.createStudent(req.body.studentName, req.body.test_plan);
        if (!createdStudent) {
          throw new Error('Not Found.');
        } else {
          let baselineType = req.body.test_plan;
          if (req.body.SATVerbal) {
            baselineType = 'SAT';
          } else if (req.body.ACTEnglish) {
            baselineType = 'ACT';
          }
          let baseline = await res.locals.store.addBaseline(createdStudent.id, baselineType);

          let baselineScores = {
            mock: false,
            projected: false,
            SATVerbal: req.body.SATVerbal,
            SATMath: req.body.SATMath,
            ACTEnglish: req.body.ACTEnglish,
            ACTMath: req.body.ACTMath,
            ACTReading: req.body.ACTReading,
            ACTScience: req.body.ACTScience,
          };

          let addBaselineScores = await res.locals.store.updateScore(baselineScores, baseline.students_tests_id, baseline.test_type);

          if (!addBaselineScores) {
            throw new Error("Not Found.");
          } else {
            let nextPacks = await res.locals.store.nextPacks(createdStudent.id, createdStudent.test_plan);
            let firstPackId = nextPacks[0].id;
            if (!firstPackId) throw new Error("Not Found.");
            else {
              await res.locals.store.addTestPack(createdStudent.id, firstPackId);
              req.flash("success", "The student has been created.");
              res.redirect(`/students/${createdStudent.id}`);
            }
          }
        }
      }
    } catch (error) {
      if (await res.locals.store.isUniqueConstraintViolation(error)) {
        req.flash("error", "Student name must be unique");
        rerenderNewStudent();
      } else {
        throw error;
      }
    }
  })
);

// Delete a student
app.post("/students/:studentId/destroy",
  requiresAuthentication,
  catchError(async (req, res) => {
    let studentId = req.params.studentId;

    let deleted = await res.locals.store.deleteStudent(+studentId);
    if (!deleted) {
      throw new Error("Not Found.");
    } else {
      req.flash("success", "Student deleted.");
      res.redirect("/students");
    }
  })
);

// Render individual todo list and its todos
app.get("/students/:studentId",
  catchError(async (req, res) => {
    req.session.studentView = "student";
    let studentId = req.params.studentId;
    let student = await res.locals.store.loadStudent(+studentId);

    if (student === undefined) {
      throw new Error("Not found.");
    } else {
      student.tests = await res.locals.store.sortedTests(student);

      let testScores = [];
      for (let index = 0; index < student.tests.length; index += 1) {
        let test = student.tests[index];
        let score = await res.locals.store.loadScore(+test.students_tests_id);
        testScores.push(res.locals.store.scoreString(score));
      }

      let studentBaselineScore = await res.locals.store.loadScore(+student.baseline.students_tests_id);
      let studentHighest = await res.locals.store.highestTestScore(+studentId);

      let improvement = 0;
      if (studentHighest) {
        improvement = studentHighest.cumulative - (studentBaselineScore ? studentBaselineScore.cumulative : 0);
      }

      res.render(req.session.studentView, {
        student,
        testScores,
        improvement,
        nextPacks: await res.locals.store.nextPacks(studentId, student.test_plan),
        studentPacks: await res.locals.store.studentPacks(studentId, student.test_plan),
        studentHighest: res.locals.store.scoreString(studentHighest),
        studentBaseline: res.locals.store.scoreString(studentBaselineScore),
        studentIsDone: student.tests.every(test => test.done),
        someTestsDone: student.tests.some(test => test.done),
      });
    }
  })
);

// Render edit todo list form
app.get("/students/:studentId/edit",
  requiresAuthentication,
  catchError(async(req, res, next) => {
    let studentId = req.params.studentId;
    let student = await res.locals.store.loadStudent(+studentId);
    if (!student) {
      next(new Error("Not found."));
    } else {
      res.render("edit-student", { student, studentBaseline: await res.locals.store.loadScore(+student.baseline.students_tests_id), });
    }
  })
);

app.get("/users/signin", (req, res) => {
  req.flash('info', 'Please sign in.');
  res.render('sign-in', {
    flash: req.flash(),
  });
});

app.post("/users/signin",
  catchError(async (req, res) => {
    let username = req.body.username.trim();
    let password = req.body.password;
    if (username === 'admin' && password === 'secret') {
      req.session.username = username;
      req.session.signedIn = true;
      req.flash('success', 'Welcome!');
      res.redirect('/students');
    } else {
      req.flash('error', 'Invalid credentials.');
      res.render('sign-in', {
        flash: req.flash(),
        username: req.body.username,
      });
    }
  })
);

app.post("/users/signout",
  catchError(async (req, res) => {
    delete req.session.username;
    delete req.session.signedIn;
    req.flash('success', 'Welcome!');
    res.redirect('/students');
  })
);


app.get("/students/:studentId/tests/:testId/edit",
  requiresAuthentication,
  catchError(async (req, res, _next) => {
    let { studentId, testId } = { ...req.params };
    let student = await res.locals.store.loadStudent(+studentId);

    if (!student) {
      throw new Error("Not found.");
    } else {
      let test = await res.locals.store.loadTest(+studentId, +testId);
      if (!test) {
        throw new Error("Not Found.");
      } else {
        let score = await res.locals.store.loadScore(+test.students_tests_id);
        res.render("edit-score", { student, test, score });
      }
    }
  })
);

app.post("/students/:studentId/tests/:testId/clear",
  requiresAuthentication,
  catchError(async (req, res) => {
    let { studentId, testId } = { ...req.params };
    let student = await res.locals.store.loadStudent(+studentId);

    if (!student) {
      throw new Error("Not found.");
    } else {
      let test = await res.locals.store.loadTest(+studentId, +testId);
      if (!test) {
        throw new Error("Not Found.");
      } else {
        let clearScore = await res.locals.store.clearScore(+test.students_tests_id);
        if (!clearScore) throw new Error("Not Found.");
        req.flash("success", `"${test.title}" score cleared!`);
        res.redirect(`/students/${studentId}`);
      }
    }
  })
);

// Toggle completion status of a todo
app.post("/students/:studentId/tests/:testId/toggle",
  requiresAuthentication,

  [
    validate.SATScore,
    validate.ACTScore,
  ],

  catchError(async (req, res) => {
    let { studentId, testId } = { ...req.params };
    let student = await res.locals.store.loadStudent(+studentId);

    if (!student) {
      throw new Error("Not found.");
    } else {
      let test = await res.locals.store.loadTest(+studentId, +testId);
      if (!test) throw new Error ('Not Found');

      let errors = validationResult(req);
      if (!errors.isEmpty()) {
        errors.array().forEach(message => req.flash("error", message.msg));
        student.tests = await res.locals.store.sortedTests(student);

        res.render('edit-score', {
          student, test,
          flash: req.flash(),
          mock: !!req.body.mock,
          projected: !!req.body.projected,
          SATVerbal: req.body.SATVerbal,
          SATMath: req.body.SATMath,
          ACTEnglish: req.body.ACTEnglish,
          ACTMath: req.body.ACTMath,
          ACTReading: req.body.ACTReading,
          ACTScience: req.body.ACTScience,
        });
      } else {
        // let test = await res.locals.store.loadTest(+studentId, +testId);
        let studentsTestsId = test.students_tests_id;

        let updateScore = await res.locals.store.updateScore(req.body, +studentsTestsId, test.test_type);
        if (!updateScore) throw new Error("Not Found.");

        if (!student.baseline.has_score) {
          let updateBaseline = await res.locals.store.updateScore(req.body, +student.baseline.students_tests_id, student.baseline.test_type);
          if (!updateBaseline) throw new Error("Not Found.");
        }

        let toggled = await res.locals.store.toggleDoneTest(+studentId, +testId);
        if (!toggled) {
          throw new Error("Not Found.");
        } else {
          let doneStatus;
          if (test.done) {
            doneStatus = false;
            req.flash("success", `"${test.title}" marked as NOT done!`);
          } else {
            doneStatus = true;
            req.flash("success", `"${test.title}" marked done.`);
          }
          res.locals.store.updateTimestamp(studentsTestsId, doneStatus);
          res.redirect(`/students/${studentId}`);
        }
      }
    }
  })
);

// edit score
app.post("/students/:studentId/tests/:testId/edit",
  requiresAuthentication,
  [
    validate.SATScore,
    validate.ACTScore,
  ],

  // eslint-disable-next-line max-statements
  catchError(async (req, res) => {
    let { studentId, testId } = { ...req.params };
    let student = await res.locals.store.loadStudent(+studentId);

    if (!student) {
      throw new Error("Not found.");
    } else {
      let test = await res.locals.store.loadTest(+studentId, +testId);
      if (!test) {
        throw new Error("Not Found.");
      } else {
        let errors = validationResult(req);
        if (!errors.isEmpty()) {
          errors.array().forEach(message => req.flash("error", message.msg));

          res.render("edit-score", {
            student, test,
            flash: req.flash(),
            SATVerbal: req.body.SATVerbal,
            SATMath: req.body.SATMath,
            ACTEnglish: req.body.ACTEnglish,
            ACTMath: req.body.ACTMath,
            ACTReading: req.body.ACTReading,
            ACTScience: req.body.ACTScience,
          });

        } else {
          let updateScore = await res.locals.store.updateScore(req.body, +test.students_tests_id, test.test_type);
          if (!updateScore) throw new Error("Not Found.");
          await res.locals.store.updateTimestamp(+test.students_tests_id, test.done);
          req.flash("success", `"${test.title}" score changed.`);
          res.redirect(`/students/${studentId}`);
        }
      }
    }
  })
);

// Mark all todos as done
app.post("/students/:studentId/complete_all",
  requiresAuthentication,
  catchError(async (req, res) => {
    let studentId = req.params.studentId;
    let student = res.locals.store.loadStudent(+studentId);
    if (!student) {
      throw new Error("Not found.");
    } else {
      let allDone = await res.locals.store.markAllDone(+studentId);

      if (!allDone) {
        throw new Error("Not Found.");
      } else {
        req.flash("success", "All tests have been marked as complete.");
        res.redirect(`/students/${studentId}`);
      }
    }
  })
);

// Uncheck all todos
app.post("/students/:studentId/uncheck_all",
  requiresAuthentication,
  catchError(async (req, res) => {
    let studentId = req.params.studentId;
    let student = await res.locals.store.loadStudent(+studentId);
    if (!student) {
      throw new Error("Not found.");
    } else {
      let allUndone = await res.locals.store.markAllUndone(+studentId);

      if (!allUndone) {
        throw new Error("Not Found.");
      } else {
        req.flash("success", "All tests have been marked incomplete.");
        res.redirect(`/students/${studentId}`);
      }
    }
  })
);

// filter test display
app.post("/students/:studentId/filter",
  requiresAuthentication,
  catchError(async (req, res) => {
    let studentId = req.params.studentId;
    let student = await res.locals.store.loadStudent(+studentId);
    if (!student) {
      throw new Error("Not found.");
    } else {
      student.tests = await res.locals.store.sortedTests(student);
      let filteredView = "student";
      let currentFilter;

      switch (req.body.filter) {
        case "plan":
          res.redirect(`/students/${studentId}`);
          break;
        case "all":
          currentFilter = 'all';
          student.tests = await res.locals.store.allTests(student);
          break;
        case "completed":
          currentFilter = 'completed';
          filteredView += "-completed";
          break;
        case "incomplete":
          currentFilter = 'incomplete';
          filteredView += "-incomplete";
          break;
        default:
          filteredView += "-current";
          currentFilter = req.body.filter;
          break;
      }
      req.session.studentView = filteredView;
      let testScores = [];
      for (let index = 0; index < student.tests.length; index += 1) {
        let test = student.tests[index];
        let score = await res.locals.store.loadScore(+test.students_tests_id);
        testScores.push(res.locals.store.scoreString(score));
      }

      let studentBaselineScore = await res.locals.store.loadScore(+student.baseline.students_tests_id);
      let studentHighest = await res.locals.store.highestTestScore(+studentId);

      let improvement = 0;
      if (studentHighest) {
        improvement = studentHighest.cumulative - (studentBaselineScore ? studentBaselineScore.cumulative : 0);
      }

      res.render(req.session.studentView, {
        student,
        testScores,
        studentHighest: res.locals.store.scoreString(studentHighest),
        studentBaseline: res.locals.store.scoreString(studentBaselineScore),
        improvement,
        studentIsDone: student.tests.every(test => test.done),
        someTestsDone: student.tests.some(test => test.done),
        currentFilter,
        nextPacks: await res.locals.store.nextPacks(studentId, student.test_plan),
        studentPacks: await res.locals.store.studentPacks(studentId, student.test_plan),
        flash: req.flash(),
      });
    }
  })
);

// add test pack
app.post("/students/:studentId/add_tests",
  requiresAuthentication,
  catchError(async (req, res) => {
    let studentId = req.params.studentId;
    try {
      let student = await res.locals.store.loadStudent(+studentId);
      if (!student) {
        throw new Error("Not found.");
      } else {
        let newPackId = req.body.newPack;
        let addedPack = await res.locals.store.addTestPack(+studentId, +newPackId);
        if (!addedPack) {
          throw new Error("Not Found");
        } else {
          req.flash("success", "Test pack has been added.");
          res.redirect(`/students/${studentId}`);
        }
      }
    } catch (error) {
      if (/All test packs added/.test(String(error))) {
        req.flash("error", "All test packs in test plan have been added.");
        res.redirect(`/students/${studentId}`);
      } else {
        throw error;
      }
    }
  })
);

// remove test pack
app.post("/students/:studentId/remove_tests",
  requiresAuthentication,
  catchError(async (req, res) => {
    let studentId = req.params.studentId;
    try {
      let student = await res.locals.store.loadStudent(+studentId);
      if (!student) {
        throw new Error("Not found.");
      } else {
        let removePackId = req.body.removePack;
        let removedPack = await res.locals.store.removeTestPack(+studentId, +removePackId);

        if (!removedPack) {
          throw new Error("Not Found.");
        } else {
          req.flash("success", "Test pack has been removed.");
          res.redirect(`/students/${studentId}`);
        }
      }
    } catch (error) {
      if (/completed tests/.test(String(error))) {
        req.flash("error", "Cannot remove completed tests.");
        res.redirect(`/students/${studentId}`);
      } else {
        throw error;
      }
    }
  })
);

// Edit student
app.post("/students/:studentId/edit",
  requiresAuthentication,
  [
    validate.uniqueName,
    validate.SATScore,
    validate.ACTScore,
  ],

  catchError(async (req, res) => {
    let studentId = req.params.studentId;

    const rerenderEditStudent = async () => {
      let student = await res.locals.store.loadStudent(+studentId);
      if (!student) throw new Error("Not found.");
      res.render("edit-student", {
        flash: req.flash(),
        studentName: req.body.studentName,
        student,
        studentBaseline: await res.locals.store.loadScore(+student.baseline.students_tests_id),
        SATVerbal: req.body.SATVerbal,
        SATMath: req.body.SATMath,
        ACTEnglish: req.body.ACTEnglish,
        ACTMath: req.body.ACTMath,
        ACTReading: req.body.ACTReading,
        ACTScience: req.body.ACTScience,
        test_plan: req.body.test_plan,
      });
    };

    try {
      let errors = validationResult(req);
      if (!errors.isEmpty()) {
        errors.array().forEach(message => req.flash("error", message.msg));

        rerenderEditStudent();
      } else {
        let student = await res.locals.store.loadStudent(+studentId);
        if (!student) throw new Error("Not found.");

        let editedStudentInfo = await res.locals.store.editStudentInfo(+studentId, req.body.studentName, req.body.test_plan);

        if (!editedStudentInfo) {
          throw new Error("Not Found.");
        } else {
          let baselineType = req.body.test_plan;
          if (req.body.SATVerbal && req.body.SATMath) {
            baselineType = 'SAT';
          } else if (req.body.ACTEnglish && req.body.ACTMath && req.body.ACTReading && req.body.ACTScience) {
            baselineType = 'ACT';
          }

          if (student.baseline.test_type !== baselineType) {
            student.baseline = await res.locals.store.addBaseline(student.id, baselineType);
          }

          let updateScore = await res.locals.store.updateScore(req.body, +student.baseline.students_tests_id, student.baseline.test_type);
          if (!updateScore) throw new Error("Not Found.");
          req.flash("success", "Student updated.");
          res.redirect(`/students/${studentId}`);
        }
      }
    } catch (error) {
      if (res.locals.store.isUniqueConstraintViolation(error)) {
        req.flash("error", "The list title must be unique.");
        rerenderEditStudent();
      } else {
        throw error;
      }
    }
  })
);

// Error handler
app.use((err, _req, res, _next) => {
  console.log(err); // Writes more extensive information to the console log
  res.status(404).send(err.message);
});

// Listener
app.listen(port, host, () => {
  console.log(`Test Tracker is listening on port ${port} of ${host}!`);
});