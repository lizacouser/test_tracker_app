/* eslint-disable camelcase */
/* eslint-disable indent */
const SeedData = require("./seed-data.js");
const deepCopy = require("./deep-copy");
const { sortStudents, sortTests } = require("./sort");
const { PACK_ORDER, PACKS } = require("./test-packs");
const nextId = require("./next-id");

module.exports = class SessionPersistence {
  constructor(session) {
    this._students = session.students || deepCopy(SeedData);
    session.students = this._students;
  }

  // clearBaseline(studentId) {
  //   let student = this._findStudent(studentId);
  //   if (!student) return undefined;
  //   student.baseline = null;
  // }

  // clearScore(studentId, testId) {
  //   let test = this._findTest(studentId, testId);
  //   if (!test) return undefined;
  //   if (!test.score) return undefined;

  //   test.score = null;
  // }

  _findStudent(studentId) {
    return this._students.find(student => student.id === studentId);
  }

  _findTest(studentId, testId) {
    let student = this._findStudent(studentId);
    if (!student) return undefined;

    return student.tests.find(test => test.id === testId);
  }

  addTest(studentId, title, test_plan, testPack) {
    let student = this._findStudent(studentId);
    if (!student) return undefined;

    student.tests.push({
      id: nextId(),
      title,
      done: false,
      testPack,
      plan: test_plan,
    });

    return true;
  }

  addTestPack(studentId, test_plan, packName) {
    let student = this._findStudent(studentId);
    if (!student) return undefined;

    let testList = PACKS[packName];
    testList.forEach(title => {
      this.addTest(studentId, title, test_plan, packName);
    });

    return true;
  }

  allStudentTestsCompleted(studentId) {
    let student = this._findStudent(studentId);
    if (!student) return undefined;
    return student.tests.length > 0 &&
           student.tests.every(test => test.done);
  }

  createFirstPack(studentId, test_plan) {
    let student = this._findStudent(studentId);
    if (!student) return undefined;

    let testPacks = PACK_ORDER[test_plan];
    let firstPack = testPacks[0];
    return this.addTestPack(studentId, test_plan, firstPack);
  }

    // addBaseline(studentId, score) {
  //   let student = this._findStudent(studentId);
  //   if (!student) return undefined;

  //   let plan = this.test_plan;
  //   if (score.length === 2) { // there has to be a better way to decide this
  //     plan = "SAT";
  //   } else if (score.length === 4) {
  //     plan = "ACT";
  //   }

  //   let testId = nextId();
  //   this.addTest(studentId, "Baseline", plan);
  //   this.setScore(studentId, testId, score);
  //   return true;
  // }

  // inserts score data into database
  // setScore(studentId, testId, score, projected, mock) {
  //   let test = this._findTest(studentId, testId);
  //   if (!test) return false;

  //   if (test.plan === "ACT") {
  //     this.score = {
  //       test: "ACT", projected, mock,
  //       scoreArray: score,
  //       english: score[0], ACTMath: score[1],
  //       reading: score[2], science: score[3]
  //     };
  //   } else if (test.plan === "SAT") {
  //     this.score = {
  //       test: "SAT", projected, mock,
  //       scoreArray: score,
  //       verbal: score[0],
  //       math: score[1]
  //     };
  //   }
  //   return true;
  // }

  // baseline(studentId) {
  //   let student = this._findStudent(studentId);
  //   if (!student) return undefined;

  //   return deepCopy(student.tests).find(test => test.title === "Baseline");
  // }

  // adds new student to list and returns true if created
  createStudent(name, test_plan, /*baselineScore*/) {
    let studentId = nextId();

    // inserts student and test data into database
    let newStudent = {
      id: studentId,
      name,
      test_plan,
      tests: [],
    };

    this._students.push(newStudent);
    // this.addBaseline(studentId, baselineScore);
    this.createFirstPack(studentId, test_plan);
    return true;
  }

  currentTestPackName(studentId) {
    let student = this._findStudent(studentId);
    if (!student) return undefined;

    let completedTest;
    let unfinishedTest;
    for (let index = 0; index < student.tests.length; index += 1) {
      let test = student.tests[index];
      if (test.done) {
        completedTest = test;
      } else {
        unfinishedTest = test;
        break;
      }
    }
    // let nextTest = student.tests.find(test => !test.done);
    if (unfinishedTest) {
      return unfinishedTest.testPack;
    } else {
      return completedTest.testPack;
    }
  }

  deleteStudent(studentId) {
    let index = this._students.findIndex(student => {
      return student.id === studentId;
    });

    if (index === -1) return undefined;
    this._students.splice(index, 1);
    return true;
  }

  editStudent(studentId, name, test_plan) {
    let student = this._findStudent(studentId);
    if (!student) return undefined;

    student.name = name;
    if (student.test_plan !== test_plan) {
      student.test_plan = test_plan;
      this.addTestPack(studentId, test_plan, this.nextTestPackName(studentId));
    }
    return true;
  }

  // eslint-disable-next-line max-lines-per-function
  lastTestPackName(studentId) {
    let student = this._findStudent(studentId);
    if (!student) return undefined;

    let studentPacks = [];
    student.tests.forEach(test => {
      if (!studentPacks.includes(test.testPack)) {
        studentPacks.push(test.testPack);
      }
    });

    let removeablePack;
    for (let index = (studentPacks.length - 1); index >= 0; index -= 1) {
      let packName = studentPacks[index];
      removeablePack = student.tests.filter(test => {
                         return test.testPack === packName;
                       });

      if (removeablePack.every(test => !test.done)) {
        return packName;
      }
    }

    return null;
  }

  loadStudent(studentId) {
    return deepCopy(this._findStudent(studentId));
  }

  loadTest(studentId, testId) {
    return deepCopy(this._findTest(studentId, testId));
  }

  markAllDone(studentId) {
    let student = this._findStudent(studentId);
    if (!student) return undefined;

    student.tests.forEach(test => {
      test.done = true;
    });
    return true;
  }

  markAllUndone(studentId) {
    let student = this._findStudent(studentId);
    if (!student) return undefined;

    student.tests.forEach(test => {
      test.done = false;
    });
    return true;
  }

  sortedStudents() {
    return sortStudents(this._students);
  }

  sortedTests(studentId) {
    let student = this._findStudent(studentId);
    if (!student) return undefined;

    let newPlan = student.tests.filter(test => test.plan === student.test_plan);
    let oldPlan = student.tests.filter(test => test.plan !== student.test_plan);

    let tests = deepCopy(sortTests(newPlan, oldPlan));

    let undone = tests.filter(test => !test.done);
    let done = tests.filter(test => test.done);

    return deepCopy(sortTests(undone, done));
  }

  nextTestPackName(studentId) {
    let student = this._findStudent(studentId);
    if (!student) return undefined;
    let testPacks = PACK_ORDER[student.test_plan];
    for (let index = 0; index < testPacks.length; index += 1) {
      if (!student.tests.some(test => {
        return test.testPack === testPacks[index];
      })) {
        return testPacks[index];
      }
    }
    return null;
  }

  removeTestPack(studentId, packName) {
    let student = this._findStudent(studentId);
    if (!student) return undefined;

    student.tests = student.tests.filter(test => {
      return test.testPack !== packName;
    });
    return true;
  }

  // someStudentTestsCompleted(studentId) {
  //   let student = this._findStudent(studentId);
  //   return student.tests.length > 0 &&
  //          student.tests.some(test => test.done);
  // }

  // highestScoringTest(studentId) {
  //   let student = this._findStudent(studentId);
  //   if (!student) return undefined;
  //   return deepCopy(student.tests.filter(test => test.done))
  //                       .sort((testA, testB) => {
  //                         return this.cumulativeScore(testB.score) -
  //                                this.cumulativeScore(testA.score);
  //                       })[0];
  // }

  // cumulativeScore(score) {
  // eslint-disable-next-line max-len
  //   let sectionsComplete = score.scoreArray.filter(section => !!section).length;
  //   if (score.test === "ACT") {
  //     return Math.round((score.english + score.ACTMath +
  //                        score.reading + score.science) /
  //                        sectionsComplete);
  //   } else if (score.test === "SAT") {
  //     return score.verbal + score.math;
  //   } else {
  //     return null;
  //   }
  // }

  toggleDoneTest(studentId, testId) {
    let test = this._findTest(studentId, testId);
    if (!test) return false;

    test.done = !test.done;
    return true;
  }

  // eslint-disable-next-line max-lines-per-function
  // updatedScore(studentId, testId, score, projected, mock) {
  //   let test = this._findTest(studentId, testId);
  //   if (!test) return false;

  //   if (test.plan === "ACT") {
  //     let [english, math, reading, science] = score;
  //     test.score = {
  //       test: test.plan, projected, mock,
  //       english, ACTMath: math, reading, science,
  //       scoreArray: [english, math, reading, science],
  //     };
  //     // console.log(test.score);
  //   } else if (test.plan === "SAT") {
  //     let [verbal, math] = score;
  //     test.score = {
  //       test: test.plan, projected, mock,
  //       verbal, math, scoreArray: [verbal, math],
  //     };
  //     // console.log(test.score);
  //   }

  //   return true;
  // }

  // eslint-disable-next-line max-lines-per-function
//   scoreString(test) {
//     if (!test) return undefined;
//     let score = test.score;
//     if (!score) return undefined;

//     let starProjected = (score.projected ? "*" : "");
//     let mock = (score.mock ? "MOCK" : "");
//     let scoreArray = [];
//     let cumulative = this.cumulativeScore(score);
// eslint-disable-next-line max-len
//     let sections = (score.test === 'ACT') ? [[score.english, "E"], [score.ACTMath, "M"],
// eslint-disable-next-line max-len
//       [score.reading, "R"], [score.science, "S"]] : [[score.verbal, "V"], [score.math, "M"]];

//     sections.forEach(sectionArray => {
//       let [section, label] = sectionArray;
//       if (section) {
//         scoreArray.push(`${starProjected}${section}${label}`);
//       }
//     });
//     // console.log(test.title, scoreArray);

//     if (scoreArray.length === 0) return "No Score";
// eslint-disable-next-line max-len
//     return `${mock} ${scoreArray.join("/")} (${starProjected}${cumulative}C)`;
//   }
};