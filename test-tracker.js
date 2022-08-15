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

// Redirect start page
app.get("/", (_req, res) => {
  res.redirect("/students");
});

// Render the list of todo lists
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
    console.log(studentsInfo, students);

    res.render("students", {
      students,
      studentsInfo,
    });
  })
);

// Render new todo list page
app.get("/students/new", (_req, res) => {
  res.render("new-student");
});

// Create a new student
app.post("/students",
  [
    validate.uniqueName,
    validate.SATScore,
    validate.ACTScore,
  ],

  catchError(async (req, res) => {
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
      } else {
        let createdStudent = await res.locals.store.createStudent(req.body.studentName, req.body.test_plan);

        if (!createdStudent) {
          throw new Error('Not Found.');
        } else {
          let baselineType = req.body.test_plan;
          if (req.body.SATVerbal || req.body.SATMath) {
            baselineType = 'SAT';
          } else if (req.body.ACTEnglish || req.body.ACTMath || req.body.ACTReading || req.body.ACTScience) {
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

          let addBaselineScores = await res.locals.store.inputScore(baselineScores, baseline.id);

          if (!addBaselineScores) {
            throw new Error("Not Found.");
          } else {
            req.flash("success", "The student has been created.");
            res.redirect(`/students`);
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
        let score = await res.locals.store.loadScore(+test.score_id);
        testScores.push(res.locals.store.scoreString(score));
      }

      let studentBaselineScore = await res.locals.store.loadScore(+student.baseline.score_id);

      res.render(req.session.studentView, {
        student,
        testScores,
        nextPacks: await res.locals.store.nextPacks(studentId, student.test_plan),
        studentPacks: await res.locals.store.studentPacks(studentId, student.test_plan),
        studentBaseline: res.locals.store.scoreString(studentBaselineScore),
        studentIsDone: student.tests.every(test => test.done),
        someTestsDone: student.tests.some(test => test.done),
      });
    }
  })
);

// Render edit todo list form
app.get("/students/:studentId/edit",
  catchError(async(req, res, next) => {
    let studentId = req.params.studentId;
    let student = await res.locals.store.loadStudent(+studentId);
    if (!student) {
      next(new Error("Not found."));
    } else {
      res.render("edit-student", { student, studentBaseline: await res.locals.store.loadScore(+student.baseline.score_id), });
    }
  })
);


app.get("/students/:studentId/tests/:testId/edit",
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
        let score = await res.locals.store.loadScore(+test.score_id);
        res.render("edit-score", { student, test, score });
      }
    }
  })
);

app.post("/students/:studentId/tests/:testId/clear",
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

        if (test.done && test.score_id) {
          let clearScore = await res.locals.store.clearScore(+studentsTestsId);
          if (!clearScore) throw new Error("Not Found.");
        } else if (!test.done) {
          let inputScore = await res.locals.store.inputScore(req.body, +studentsTestsId);
          if (!inputScore) throw new Error("Not Found.");
        }
        let toggled = await res.locals.store.toggleDoneTest(+studentId, +testId);
        if (!toggled) {
          throw new Error("Not Found.");
        } else {
          if (test.done) {
            req.flash("success", `"${test.title}" marked as NOT done!`);
          } else {
            req.flash("success", `"${test.title}" marked done.`);
          }
          res.redirect(`/students/${studentId}`);
        }
      }
    }
  })
);

// edit score
app.post("/students/:studentId/tests/:testId/edit",

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
          if (test.score_id) {
            let updateScore = await res.locals.store.updateScore(req.body, +test.students_tests_id);
            if (!updateScore) throw new Error("Not Found.");
          } else {
            let inputScore = await res.locals.store.inputScore(req.body, +test.students_tests_id);
            if (!inputScore) throw new Error("Not Found.");
          }
          req.flash("success", `"${test.title}" score changed.`);
          res.redirect(`/students/${studentId}`);
        }
      }
    }
  })
);

// Mark all todos as done
app.post("/students/:studentId/complete_all",
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
  catchError(async (req, res) => {
    let studentId = req.params.studentId;
    let student = await res.locals.store.loadStudent(+studentId);
    if (!student) {
      throw new Error("Not found.");
    } else {
      student.tests = await res.locals.store.sortedTests(student);
      let filteredView = "student";
      let filteredPack;

      switch (req.body.filter) {
        case "plan":
          res.redirect(`/students/${studentId}`);
          break;
        case "all":
          student.tests = await res.locals.store.allTests(student);
          break;
        case "completed":
          filteredView += "-completed";
          break;
        case "incomplete":
          filteredView += "-incomplete";
          break;
        default:
          filteredView += "-current";
          filteredPack = req.body.filter;
          break;
      }
      req.session.studentView = filteredView;
      let testScores = [];
      for (let index = 0; index < student.tests.length; index += 1) {
        let test = student.tests[index];
        let score = await res.locals.store.loadScore(+test.id);
        testScores.push(res.locals.store.scoreString(score));
      }

      let studentBaselineScore = await res.locals.store.loadScore(+student.baseline.id);

      res.render(req.session.studentView, {
        student,
        testScores,
        studentBaseline: res.locals.store.scoreString(studentBaselineScore),
        studentIsDone: student.tests.every(test => test.done),
        someTestsDone: student.tests.some(test => test.done),
        currentPack: filteredPack,
        nextPacks: await res.locals.store.nextPacks(studentId, student.test_plan),
        studentPacks: await res.locals.store.studentPacks(studentId, student.test_plan),
        flash: req.flash(),
      });
    }
  })
);

// add test pack
app.post("/students/:studentId/add_tests",
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
  // eslint-disable-next-line max-statements
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
  [
    validate.uniqueName,
    validate.SATScore,
    validate.ACTScore,
  ],

  // eslint-disable-next-line max-statements
  catchError(async (req, res) => {
    let studentId = req.params.studentId;

    const rerenderEditStudent = async () => {
      let student = await res.locals.store.loadStudent(+studentId);
      if (!student) throw new Error("Not found.");
      res.render("edit-student", {
        flash: req.flash(),
        studentName: req.body.studentName,
        student,
        studentBaseline: await res.locals.store.loadScore(+student.baseline.score_id),
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
          let studentBaseline = student.baseline;
          console.log('okay', student);
          if (student.baseline.score_id) {
            let updateScore = await res.locals.store.updateScore(req.body, +studentBaseline.score_id);
            if (!updateScore) throw new Error("Not Found.");
          } else {
            let inputScore = await res.locals.store.inputScore(req.body, +studentBaseline.students_tests_id);
            if (!inputScore) throw new Error("Not Found.");
          }
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