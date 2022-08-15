const nextId = require("./next-id");
const { SATScore, ACTScore } = require("./score");

class Test {
  constructor(title, plan, testPack) {
    this.id = nextId();
    this.title = title;
    this.done = false;
    this.testPack = testPack;
    this.plan = plan;
  }

  isACT() {
    return this.plan === "ACT";
  }

  isSAT() {
    return this.plan === "SAT";
  }

  markDone() {
    this.done = true;
  }

  setDateTaken(year, month, day) {
    this.dateTaken = new Date(year, month, day);
  }

  markUndone() {
    this.done = false;
  }

  isDone() {
    return this.done;
  }

  setTitle(title) {
    this.title = title;
  }

  setScore(score, projected, mock) {
    if (this.isACT()) {
      this.score = new ACTScore(...score, projected, mock);
    } else if (this.isSAT()) {
      this.score = new SATScore(...score, projected, mock);
    }
  }

  clearScore() {
    this.setScore([]);
    // this.isProjected = null;
    // this.mock = null;
  }

  getScore() {
    return this.score;
  }

  noScore() {
    return this.score.isEmpty();
  }

  getTitle() {
    return this.title;
  }

  getCumulativeScore() {
    let numSections = this.plan === "SAT" ? 2 : 4;
    return this.score.getCumulativeScore(numSections) || null;
  }

  toString() {
    return this.score.toString();
  }

  static makeTest(rawTest) {
    let test = Object.assign(new Test(), rawTest);
    if (rawTest.score && test.isACT()) {
      test.score = ACTScore.makeACTScore(rawTest.score);
    } else if (rawTest.score && test.isSAT()) {
      test.score = SATScore.makeSATScore(rawTest.score);
    }
    return test;
  }
}

Test.PACK_ORDER = {
  SAT: ["2020 SAT Blue Book", "SAT Pack A", "SAT Pack B", "SAT Mocks"],
  ACT: ["21-22 ACT Red Book", "ACT Pack A", "ACT Pack B", "ACT Mocks"]
};

Test.PACKS = {
  "2020 SAT Blue Book": [
    "BB10", "BB9", "BB8", "BB7",
    "BB6", "BB5", "BB3", "BB1",
  ],
  "SAT Pack A": [
    "Oct 2021 US", "May 2021 Int", "May 2021 US",
    "Mar 2021 US", "Dec 2020 Int", "Oct 2020 US"
  ],
  "SAT Pack B": [
    "Mar 2020 US", "Apr 2019 US", "Mar 2019 US", "May 2019 US",
    "May 2018 US", "Apr 2018 US", "Mar 2018 US"
  ],
  "SAT Mocks": ["May 2019 Int", "Oct 2019 US (Backup)"],

  "21-22 ACT Red Book": [
    "RB1", "RB2", "RB3", "RB4", "RB5", "RB6",
  ],
  "ACT Pack A": [
    "ACT 39.5", "ACT 40", "ACT 41", "ACT 42", "ACT 44",
    "ACT 45", "ACT 47", "ACT 48", "ACT 49"
  ],
  "ACT Pack B": [
    "ACT 21", "ACT 22", "ACT 23", "ACT 27", "ACT 30",
    "ACT 31", "ACT 33", "ACT 36", "ACT 38"
  ],
  "ACT Mocks": ["ACT 39", "ACT 32 (Backup)", "ACT 46 (Backup)"],
};

module.exports = Test;
