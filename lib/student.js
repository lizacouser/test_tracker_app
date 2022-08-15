const nextId = require("./next-id");
const Test = require("./test");


class Student {
  constructor(name, test_plan) {
    this.id = nextId();
    this.name = name;
    this.test_plan = test_plan;
    this.createFirstPack(test_plan);
  }

  settest_plan(plan) {
    this.test_plan = plan;

    if (this.tests.every(test => {
      return test.plan !== plan;
    })) {
      this.addTestPack(plan, Test.PACK_ORDER[plan][0]);
    }

    this.reorderTestsByPlan(plan);
  }

  createFirstPack(plan) {
    let testPacks = Test.PACK_ORDER[plan];
    let firstPack = testPacks[0];

    this.tests = [];
    this.addTestPack(plan, firstPack);
  }

  addTestPack(plan, packName) {
    let testList = Test.PACKS[packName];

    testList.forEach(testName => {
      this.tests.push(new Test(testName, plan, packName));
    });

    this.reorderTestsByPlan(plan);
  }

  reorderTestsByPlan(prioritytest_plan) {
    let newPlan = this.tests.filter(test => test.plan === prioritytest_plan);
    let oldPlan = this.tests.filter(test => test.plan !== prioritytest_plan);
    this.tests = [].concat(newPlan, oldPlan);
  }

  getNextTestPackName() {
    let testPacks = Test.PACK_ORDER[this.test_plan];
    for (let index = 0; index < testPacks.length; index += 1) {
      if (!this.tests.some(test => {
        return test.testPack === testPacks[index];
      })) {
        return testPacks[index];
      }
    }
    return null;
  }

  getCurrentTestPackName() {
    let nextTest = this.tests.find(test => !test.isDone());

    return nextTest.testPack;
  }

  getTestPack(packName) {
    return this.tests.filter(test => {
      return test.testPack === packName;
    });
  }

  removeTestPack(packName) {
    this.tests = this.tests.filter(test => {
      return test.testPack !== packName;
    });
  }

  getTestPackNames() {
    let testPacks = [];

    this.tests.forEach(test => {
      if (!testPacks.includes(test.testPack)) {
        testPacks.push(test.testPack);
      }
    });

    return testPacks;
  }

  getRemoveableTestPackName() {
    let packs = this.getTestPackNames();
    let removeablePack;

    for (let index = (packs.length - 1); index >= 0; index -= 1) {
      let packName = packs[index];
      removeablePack = this.getTestPack(packName);

      if (removeablePack.every(test => !test.isDone())) {
        return packName;
      }
    }

    return null;
  }


  add(test) {
    if (!(test instanceof Test)) {
      throw new TypeError("can only add Test objects");
    }

    this.tests.push(test);
  }

  // mostRecentCompleted() {
  //   return this.allDone().sort((testA, testB) => {
  //     return testB.dateTaken - testA.dateTaken;
  //   })[0];
  // }

  highestScoringTest() {
    let highScoreTest = this.allDone().sort((testA, testB) => {
      return testB.getCumulativeScore() - testA.getCumulativeScore();
    })[0];

    return highScoreTest;
  }

  recentMock() {
    return this.allDone().find(test => {
      return test.getScore().isMock();
    });
  }

  size() {
    return this.tests.length;
  }

  first() {
    return this.tests[0];
  }

  last() {
    return this.tests[this.size() - 1];
  }

  itemAt(index) {
    this._validateIndex(index);
    return this.tests[index];
  }

  markDoneAt(index) {
    this.itemAt(index).markDone();
  }

  markUndoneAt(index) {
    this.itemAt(index).markUndone();
  }

  isDone() {
    return this.size() > 0 && this.tests.every(test => test.isDone());
  }

  hasNotBegun() {
    return this.size() > 0 && this.tests.every(test => !test.isDone());
  }

  shift() {
    return this.tests.shift();
  }

  pop() {
    return this.tests.pop();
  }

  removeAt(index) {
    this._validateIndex(index);
    return this.tests.splice(index, 1);
  }

  toString() {
    let name = `---- ${this.name} ----`;
    let testList = this.tests.map(test => test.toString()).join("\n");
    return `${name}\n${testList}`;
  }

  forEach(callback) {
    this.tests.forEach(test => callback(test));
  }

  filter(callback) {
    let newStudent = new Student(this.name, this.test_plan);
    this.tests.forEach(test => {
      if (callback(test)) {
        newStudent.add(test);
      }
    });

    return newStudent;
  }

  findByName(name) {
    return this.tests.filter(test => test.name === name).first();
  }

  findById(id) {
    return this.tests.filter(test => test.id === id).first();
  }

  findIndexOf(testToFind) {
    let findId = testToFind.id;
    return this.tests.findIndex(test => test.id === findId);
  }

  allDone() {
    return this.tests.filter(test => test.isDone());
  }

  allNotDone() {
    return this.tests.filter(test => !test.isDone());
  }

  allTests() {
    return this.tests.filter(_ => true);
  }

  markDone(name) {
    let test = this.findByName(name);
    if (test !== undefined) {
      test.markDone();
    }
  }

  markAllDone() {
    this.tests.forEach(test => {
      test.markDone();
      test.setScore([]);
    });
  }

  markAllUndone() {
    this.tests.forEach(test => test.markUndone());
  }

  toArray() {
    return this.tests.slice();
  }

  setName(name) {
    this.name = name;
  }

  getBaseline() {
    return this.baseline;
  }

  setBaseline(baselineScore) {
    if (baselineScore.length === 2) {
      this.baseline = new Test("Baseline", "SAT");
      this.baseline.setScore(baselineScore);
    } else if (baselineScore.length === 4) {
      this.baseline = new Test("Baseline", "ACT");
      this.baseline.setScore(baselineScore);
    } else {
      this.baseline = new Test("Baseline", this.test_plan);
      this.baseline.setScore(baselineScore);
    }
  }

  clearBaseline() {
    this.baseline = new Test("Baseline", this.test_plan);
    this.baseline.setScore([]);
  }

  noBaseline() {
    return !this.baseline || this.baseline.noScore();
  }

  static makeStudent(rawStudent) {
    // eslint-disable-next-line max-len
    let student = Object.assign(new Student(rawStudent.name, rawStudent.test_plan), {
      id: rawStudent.id,
      tests: [],
      baseline: Test.makeTest(rawStudent.baseline),
    });
    if (rawStudent.tests) {
      rawStudent.tests.forEach(test => student.add(Test.makeTest(test)));
    }

    return student;
  }

  _validateIndex(index) { // _ in name indicates "private" method
    if (!(index in this.tests)) {
      throw new ReferenceError(`invalid index: ${index}`);
    }
  }
}

module.exports = Student;
