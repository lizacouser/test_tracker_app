class Score {
  constructor(testType, projected, mock) {
    this.test = testType;
    this.projected = projected;
    this.mock = mock;
    this.scoreArray = [];
  }

  isACTScore() {
    return this.test === "ACT";
  }

  isSATScore() {
    return this.test === "SAT";
  }

  isProjected() {
    return this.projected;
  }

  isMock() {
    return this.mock;
  }

  isEmpty() {
    return this.scoreArray.every(sectionScore => {
      return !sectionScore;
    });
  }

  static makeScore(rawScore) {
    return Object.assign(new Score(), rawScore);
  }
}


class SATScore extends Score {
  static MAX_SAT_SCORE = 800;
  static MIN_SAT_SCORE = 400;

  constructor(verbal, math, projected, mock) {
    super("SAT", projected, mock);
    this.verbal = verbal;
    this.math = math;
    this.scoreArray = [verbal, math];
  }

  getCumulativeScore() {
    return this.verbal + this.math;
  }

  toString() {
    let starProjected = (this.isProjected() ? "*" : "");
    let mock = (this.isMock() ? "MOCK" : "");
    let scoreArray = [];
    let cumulative = "";

    if (this.verbal) {
      scoreArray.push(`${starProjected}${this.verbal}V`);
    }

    if (this.math) {
      scoreArray.push(`${starProjected}${this.math}M`);
    }

    if (scoreArray.length === 2) {
      cumulative = `(${starProjected}${this.getCumulativeScore(scoreArray.length)}C)`;
    }

    if (scoreArray.length === 0) {
      return "No Score";
    }

    return `${mock} ${scoreArray.join("/")} ${cumulative}`;
  }

  static makeSATScore(rawSATScore) {
    return Object.assign(new SATScore(), rawSATScore);
  }
}

class ACTScore extends Score {
  static MAX_ACT_SCORE = 36;
  static MIN_SAT_SCORE = 1;

  constructor(english, math, reading, science, projected, mock) {
    super("ACT", projected, mock);
    this.english = english;
    this.ACTMath = math;
    this.reading = reading;
    this.science = science;
    this.scoreArray = [english, math, reading, science];
  }

  getCumulativeScore(numSections) {
    let scoreSum = this.english + this.ACTMath + this.reading + this.science;
    return Math.round(scoreSum / numSections);
  }


  toString() {
    let starProjected = (this.isProjected() ? "*" : "");
    let mock = (this.isMock() ? "MOCK" : "");
    let scoreArray = [];
    let cumulative = "";

    let sections = [[this.english, "E"], [this.ACTMath, "M"], [this.reading, "R"], [this.science, "S"]];

    sections.forEach(sectionArray => {
      let [section, label] = sectionArray;
      if (section) {
        scoreArray.push(`${starProjected}${section}${label}`);
      }
    });

    if (scoreArray.length === 4) {
      cumulative = `(${starProjected}${this.getCumulativeScore(scoreArray.length)}C)`;
    }

    if (scoreArray.length === 0) {
      return "No Score";
    }

    return `${mock} ${scoreArray.join("/")} ${cumulative}`;
  }

  static makeACTScore(rawACTScore) {
    return Object.assign(new ACTScore(), rawACTScore);
  }
}

module.exports = {SATScore, ACTScore};
