/* eslint-disable max-statements */
/* eslint-disable max-lines-per-function */
/* eslint-disable max-len */
/* eslint-disable camelcase */
/* eslint-disable indent */
// const SeedData = require("./seed-data");
// const deepCopy = require("./deep-copy");
// const { sortStudents, sortTests } = require("./sort");
// const { PACK_ORDER, PACKS } = require("./test-packs");
// const nextId = require("./next-id");
const { dbQuery } = require('./db-query');

module.exports = class PgPersistence {

  async addBaseline(studentId, testType) {
    const DELETE_EXISTING_BASELINE = `DELETE FROM students_tests WHERE student_id = $1;`;
    await dbQuery(DELETE_EXISTING_BASELINE, studentId);
    // console.log('took student id, deleted baseline from students tests');


    const LOAD_NEW_BASELINE_TEST = `SELECT tests.id FROM tests
                        JOIN packs ON tests.pack_id = packs.id
                        WHERE packs.test_type = $1 AND
                          packs.order = 0;`;

    const ADD_NEW_BASELINE_TEST = `INSERT INTO students_tests (test_id, student_id, done)
                        VALUES ($1, $2, true);`;

    let resultTest = await dbQuery(LOAD_NEW_BASELINE_TEST, testType);
    if (!resultTest.rows[0]) return undefined;
    // console.log('took test type, found id of generic baseline in that type');


    let testId = resultTest.rows[0].id;
    let addedTest = await dbQuery(ADD_NEW_BASELINE_TEST, testId, studentId);
    if (addedTest.rowCount === 0) return undefined;
    // console.log('took baseline test id and student id, added baseline to students_tests');

    const LOAD_BASELINE = `SELECT id AS students_tests_id FROM students_tests WHERE student_id = $1`;
    let baseline = await dbQuery(LOAD_BASELINE, studentId);
    // console.log('grabbed the students_tests_id of the baseline with a given student_id');


    return baseline.rows[0];
  }

  async addTestPack(studentId, packId) {
    const LOAD_TESTS =  `SELECT id FROM tests
                          WHERE pack_id = $1;`;
    const ADD_TEST = `INSERT INTO students_tests (test_id, student_id)
                        VALUES ($1, $2);`;

    let resultTests = await dbQuery(LOAD_TESTS, packId);
    let testPack = resultTests.rows;

    for (let index = 0; index < testPack.length; index += 1) {
      let testId = testPack[index].id;
      let addedTest = await dbQuery(ADD_TEST, testId, studentId);
      if (addedTest.rowCount === 0) return undefined;
    }

    return true;

    // load SAT packs
    // where the type of test is the same as student test plan
    // and the students_test doesn't contain any tests with that pack_id
    // insert tests from pack into students+tests
  }

  async allTests(student) {
    let displayOrder = student.testPlan === 'ACT' ? 'ASC' : 'DESC';
    const SORTED_TESTS = `SELECT t.title AS title,
                                 st.done AS done,
                                 t.id AS test_id,
                                 p.test_type AS test_type,
                                 p.title AS test_pack,
                                 st.id AS students_tests_id,
                                 to_char(st.date_completed, 'MM.DD.YY HH12:MI') AS date_modified,
                                 CAST(sc.students_tests_id AS BOOLEAN) AS has_score
                            FROM tests t
                            JOIN students_tests st ON t.id = st.test_id
                            JOIN students s ON s.id = st.student_id
                            JOIN packs p ON p.id = t.pack_id
                            LEFT JOIN scores sc ON sc.students_tests_id = st.id
                            WHERE st.student_id = $1 AND p.title NOT ILIKE '%baseline%'
                            ORDER BY st.done, st.date_completed DESC, p.test_type ${displayOrder}, p.order, t.id`;
    let resultTests = await dbQuery(SORTED_TESTS, student.id);
    if (resultTests.rowCount === 0) return undefined;
    return resultTests.rows;
  }

  calculateCumulative(testType, scoreArray) {
    let submittedScores = scoreArray.filter(sectionScore => !!sectionScore);
    if (submittedScores.length === 0) return undefined;
    let sum = submittedScores.map(sectionScore => Number(sectionScore))
                             .reduce((acc, val) => acc + val);
    if (testType === 'SAT') {
      return sum;
    } else if (testType === 'ACT') {
      return Math.round(sum / submittedScores.length);
    }

    return undefined;
  }

  async clearScore(studentsTestsId) {
    const DELETE_SCORE = `DELETE FROM scores WHERE students_tests_id = $1;`;
    // console.log('took st id and deleted score');

    let deleteResult = await dbQuery(DELETE_SCORE, studentsTestsId);
    return deleteResult.rowCount > 0;
  }

  async convertCumulativeScore(testType, cumulativeScore) {
    if (!cumulativeScore) return undefined;
    let convertedScore;
    let originalScore;

    switch (testType) {
      case 'ACT':
        convertedScore = 'sat_score';
        originalScore = 'act_score';
        break;
      case 'SAT':
        convertedScore = 'act_score';
        originalScore = 'sat_score';
        break;
      default:
        return undefined;
    }

    const GET_CONVERTED_SCORE = `SELECT ${convertedScore} FROM score_conversions
                                  WHERE ${originalScore} = $1`;

    let resultScore = await dbQuery(GET_CONVERTED_SCORE, cumulativeScore);
    if (!resultScore) return undefined;
    return resultScore.rows[0][convertedScore];
  }

  // adds new student to list and returns true if created
  async createStudent(name, testPlan) {
    const CREATE_STUDENT = `INSERT INTO students (name, test_plan) VALUES ($1, $2)`;
    let createdStudent = await dbQuery(CREATE_STUDENT, name, testPlan);
    // console.log('inserted student into table');


    if (createdStudent.rowCount !== 1) return undefined;

    const LOAD_STUDENT = `SELECT * FROM students WHERE name LIKE $1`;
    let newStudent = await dbQuery(LOAD_STUDENT, name);
    // console.log('returned student info');

    return newStudent.rows[0];
  }

  async currentPackName(studentId, testPlan) {
    const LOAD_CURRENT_PACK = `SELECT DISTINCT p.title AS title, p.order, p.test_type
                            FROM packs p
                            JOIN tests t ON t.pack_id = p.id
                            JOIN students_tests st ON st.test_id = t.id
                            WHERE st.student_id = $1
                            AND st.done = true
                            AND p.test_type = $2
                            ORDER BY p.test_type ASC, p.order DESC;`;

    let resultPack = await dbQuery(LOAD_CURRENT_PACK, studentId, testPlan);
    if (resultPack.rowCount === 0) return undefined;

    return resultPack.rows[0].title;
  }

  async deleteStudent(studentId) {
    const DELETE_STUDENT = `DELETE FROM students WHERE id = $1`;

    let deletedStudent = await dbQuery(DELETE_STUDENT, studentId);
    return deletedStudent.rowCount === 1;
  }

  async editStudentInfo(studentId, name, testPlan) {
    const UPDATE_STUDENT = `UPDATE students SET name = $1, test_plan = $2
                            WHERE id = $3`;
    let updateResult = await dbQuery(UPDATE_STUDENT, name, testPlan, studentId);
    // console.log('took existing student id, name, and plan, and updated them');

    return updateResult.rowCount > 0;
  }

  async highestTestScore(studentId) {
    const LOAD_HIGH_SCORE = `SELECT scores.mock,
                               scores.projected,
                               scores.act_english,
                               scores.act_math,
                               scores.act_reading,
                               scores.act_science,
                               scores.sat_verbal,
                               scores.sat_math,
                               scores.cumulative,
                               scores.converted_cumulative,
                               t.title AS test,
                               p.test_type
                        FROM scores
                        JOIN students_tests st ON scores.students_tests_id = st.id
                        JOIN tests t ON st.test_id = t.id
                        JOIN packs p ON t.pack_id = p.id
                        JOIN students s ON s.id = st.student_id
                        WHERE s.id = $1 AND NOT scores.projected
                        ORDER BY scores.cumulative DESC
                        LIMIT 1;`;

    let score = await dbQuery(LOAD_HIGH_SCORE, studentId);
    if (score.rowCount === 0) return null;
    // console.log('load score result', score.rows[0]);
    return score.rows[0];
  }

  // Returns `true` if `error` seems to indicate a `UNIQUE` constraint
  // violation, `false` otherwise.
  isUniqueConstraintViolation(error) {
    return /duplicate key value violates unique constraint/.test(String(error));
  }

  // // Returns `true` if `error` seems to indicate a `CHECK` constraint
  // // violation, `false` otherwise.
  // isCheckConstraintViolation(error) {
  //   return /duplicate key value violates unique constraint/.test(String(error));
  // }

  async lastPackId(studentId, testPlan) {
    const LOAD_LAST_PACK = `SELECT DISTINCT p.id AS id, p.order, p.test_type
                            FROM packs p
                            JOIN tests t ON t.pack_id = p.id
                            JOIN students_tests st ON st.test_id = t.id
                            WHERE st.student_id = $1
                            AND p.id NOT IN (
                                SELECT DISTINCT t.pack_id FROM tests t
                                JOIN students_tests st ON st.test_id = t.id
                                WHERE st.done = true)
                            ORDER BY p.test_type ASC, p.order DESC;`;

    let resultLastPack = await dbQuery(LOAD_LAST_PACK, studentId);
    if (resultLastPack.rowCount === 0) return undefined;

    // eslint-disable-next-line max-len
    let wrongTestPlan = resultLastPack.rows.find(row => row.test_type !== testPlan);
    if (wrongTestPlan) {
      return wrongTestPlan.id;
    }

    return resultLastPack.rows[0].id;
  }

  async loadScore(scoreId) { // new
    const LOAD_SCORE = `SELECT scores.mock,
                               scores.projected,
                               scores.act_english,
                               scores.act_math,
                               scores.act_reading,
                               scores.act_science,
                               scores.sat_verbal,
                               scores.sat_math,
                               scores.cumulative,
                               scores.converted_cumulative,
                               t.title AS test,
                               p.test_type
                        FROM scores
                        JOIN students_tests st ON scores.students_tests_id = st.id
                        JOIN tests t ON st.test_id = t.id
                        JOIN packs p ON t.pack_id = p.id
                        WHERE st.id = $1;
                        `;

    let score = await dbQuery(LOAD_SCORE, scoreId);
    if (score.rowCount === 0) return null;
    // console.log('load score result', score.rows[0]);
    return score.rows[0];
  }

  // eslint-disable-next-line max-lines-per-function
  async loadStudent(studentId) {
    const LOAD_STUDENT = `SELECT * FROM students WHERE students.id = $1`;
    const LOAD_BASELINE = `SELECT t.id AS test_id,
                            p.test_type AS test_type,
                            st.id AS students_tests_id,
                            to_char(st.date_completed, 'MM.DD.YY HH12:MI') AS date_modified,
                            CAST(sc.students_tests_id AS BOOLEAN) AS has_score
                            FROM tests t
                            JOIN students_tests st ON st.test_id = t.id
                            JOIN students s ON st.student_id = s.id
                            JOIN packs p ON t.pack_id = p.id
                            LEFT JOIN scores sc ON sc.students_tests_id = st.id
                            WHERE st.student_id = $1 AND p.title ILIKE '%baseline%';`;
    const LOAD_TESTS = `SELECT t.title AS title,
                          st.done AS done,
                          t.id AS test_id,
                          p.test_type AS test_type,
                          p.title AS test_pack,
                          st.id AS students_tests_id,
                          to_char(st.date_completed, 'MM.DD.YY HH12:MI') AS date_modified,
                          CAST(sc.students_tests_id AS BOOLEAN) AS has_score
                        FROM tests t
                        JOIN students_tests st ON st.test_id = t.id
                        JOIN students s ON st.student_id = s.id
                        JOIN packs p ON t.pack_id = p.id
                        LEFT JOIN scores sc ON sc.students_tests_id = st.id
                        WHERE st.student_id = $1 AND p.title NOT ILIKE '%baseline%';`;

    let resultStudent = dbQuery(LOAD_STUDENT, studentId);
    let resultBaseline = dbQuery(LOAD_BASELINE, studentId);
    let resultTests = dbQuery(LOAD_TESTS, studentId);
    let resultStudentTests = await Promise.all([resultStudent, resultBaseline, resultTests]);

    let student = resultStudentTests[0].rows[0];
    if (!student) return undefined;

    student.baseline = resultStudentTests[1].rows[0];
    // console.log('baseline load student', student.baseline);


    student.tests = resultStudentTests[2].rows;
    // console.log('load student result', student);
    return student;
  }

  async loadTest(studentId, testId) {
    const LOAD_TEST = `SELECT t.title AS title,
                              t.id AS test_id,
                              st.done AS done,
                              p.test_type AS test_type,
                              p.title AS test_pack,
                              st.id AS students_tests_id,
                              to_char(st.date_completed, 'MM.DD.YY HH12:MI') AS date_modified,
                              CAST(sc.students_tests_id AS BOOLEAN) AS has_score
                        FROM tests t
                        JOIN students_tests st ON st.test_id = t.id
                        JOIN students s ON st.student_id = s.id
                        JOIN packs p ON t.pack_id = p.id
                        LEFT JOIN scores sc ON sc.students_tests_id = st.id
                        WHERE st.student_id = $1
                          AND st.test_id = $2`;

    let resultTest = await dbQuery(LOAD_TEST, studentId, testId);
    // console.log('load test result', resultTest.rows[0]);
    return resultTest.rows[0];
  }

  async markAllDone(studentId) {
    const MARK_ALL_DONE = `UPDATE students_tests
                              SET done = true, date_completed = CURRENT_TIMESTAMP
                              WHERE student_id = $1 AND test_id NOT IN (
                                SELECT id FROM tests
                                WHERE title ILIKE '%baseline%');`;

    let toggleResult = await dbQuery(MARK_ALL_DONE, studentId);
    return toggleResult.rowCount > 0;
  }

  async markAllUndone(studentId) {
    const MARK_ALL_UNDONE = `UPDATE students_tests
                              SET done = false, date_completed = null
                              WHERE student_id = $1 AND test_id NOT IN (
                                SELECT id FROM tests
                                WHERE title ILIKE '%baseline%');`;

    const CLEAR_ALL_SCORES = `DELETE FROM scores
                              WHERE students_tests_id IN (
                                SELECT id FROM students_tests
                                WHERE student_id = $1 AND test_id NOT IN (
                                  SELECT id FROM tests
                                  WHERE title ILIKE '%baseline%')
                                );`;

    let toggleResult = dbQuery(MARK_ALL_UNDONE, studentId);
    let clearResult = dbQuery(CLEAR_ALL_SCORES, studentId);
    let result = await Promise.all([toggleResult, clearResult]);
    return result[0].rowCount > 0;
  }

  // async nextPackId(studentId, testPlan) {
  //   const LOAD_NEXT_PACK = `SELECT DISTINCT p.id AS id, p.order
  //                           FROM packs p
  //                           WHERE p.test_type = $1
  //                             AND p.id NOT IN (
  //                               SELECT DISTINCT t.pack_id FROM tests t
  //                               JOIN students_tests st ON st.test_id = t.id
  //                               WHERE st.student_id = $2
  //                             )
  //                           ORDER BY p.order ASC;`;

  //   let resultNextPack = await dbQuery(LOAD_NEXT_PACK, testPlan, studentId);
  //   if (resultNextPack.rowCount === 0) return undefined;
  //   let pack_id = resultNextPack.rows[0].id;
  //   return pack_id;
  // }

  async nextPacks(studentId, testPlan) {
    const LOAD_STUDENT_PACKS = `SELECT DISTINCT p.id AS id, p.title AS title
                                FROM packs p
                                WHERE p.test_type = $2
                                AND p.id NOT IN (
                                  SELECT DISTINCT t.pack_id FROM tests t
                                  JOIN students_tests st ON st.test_id = t.id
                                  WHERE st.student_id = $1
                                )
                                AND p.title NOT ILIKE '%baseline%'
                                ORDER BY p.id, p.title`;

    let resultPacks = await dbQuery(LOAD_STUDENT_PACKS, studentId, testPlan);
    if (resultPacks.rowCount === 0) return undefined;

    return resultPacks.rows;
  }

  async removeTestPack(studentId, packId) {
    const REMOVE_TESTS = `DELETE FROM students_tests
                          WHERE student_id = $1
                          AND test_id IN (
                            SELECT id FROM tests
                            WHERE pack_id = $2
                          );`;

    let removedTests = await dbQuery(REMOVE_TESTS, studentId, packId);
    return removedTests.rowCount > 0;
  }

  scoreString(score) {
    if (!score) return 'No Score';
    let mockString = score.mock ? 'm.e. ' : '';
    let projectedString = score.projected ? '*' : '';
    let scoreArray;

    if (score.test_type === 'SAT') {
      scoreArray = [[score.sat_verbal, 'V'], [score.sat_math, 'M']].filter(sectionScore => !!sectionScore[0]);

    } else if (score.test_type === 'ACT') {
      scoreArray = [[score.act_english, 'E'], [score.act_math, 'M'], [score.act_reading, 'R'], [score.act_science, 'S']].filter(sectionScore => !!sectionScore[0]);
    }

    let scoreString = scoreArray.map(sectionScore => {
      return projectedString + sectionScore[0] + sectionScore[1];
    }).join('/');

    return `${mockString}${scoreString} (${projectedString}${score.cumulative} ${score.test_type} <--> ${score.converted_cumulative} ${score.test_type === 'SAT' ? 'ACT' : 'SAT'})`;
  }

  async sortedStudents() {
    const ALL_STUDENTS = `SELECT * FROM students ORDER BY lower(name) ASC`;
    const ALL_TESTS = `SELECT t.title AS title,
                            t.id AS test_id,
                            st.done AS done,
                            p.test_type AS test_type,
                            p.title AS test_pack,
                            st.id AS students_tests_id,
                            to_char(st.date_completed, 'MM.DD.YY HH12:MI') AS date_modified,
                            CAST(sc.students_tests_id AS BOOLEAN) AS has_score
                        FROM tests t
                        JOIN students_tests st ON st.test_id = t.id
                        JOIN students s ON st.student_id = s.id
                        JOIN packs p ON t.pack_id = p.id
                        LEFT JOIN scores sc ON sc.students_tests_id = st.id
                        WHERE st.student_id = $1
                        ORDER BY p.order`;
    let resultStudents = await dbQuery(ALL_STUDENTS);
    let allStudents = resultStudents.rows;

    for (let index = 0; index < allStudents.length; index += 1) {
      let student = allStudents[index];
      let resultTests = await dbQuery(ALL_TESTS, student.id);
      student.baselineScore = await this.loadScore(+(resultTests.rows[0].students_tests_id));
      student.tests = resultTests.rows.slice(1);
    }

    // console.log('sorted student result', allStudents);

    return allStudents;
  }

  async sortedTests(student) {
    const SORTED_TESTS = `SELECT t.title AS title,
                                 st.done AS done,
                                 t.id AS test_id,
                                 p.test_type AS test_type,
                                 p.title AS test_pack,
                                 st.id AS students_tests_id,
                                 to_char(st.date_completed, 'MM.DD.YY HH12:MI') AS date_modified,
                                 CAST(sc.students_tests_id AS BOOLEAN) AS has_score
                            FROM tests t
                            JOIN students_tests st ON t.id = st.test_id
                            JOIN students s ON s.id = st.student_id
                            JOIN packs p ON p.id = t.pack_id
                            LEFT JOIN scores sc ON sc.students_tests_id = st.id
                            WHERE st.student_id = $1 AND p.test_type = s.test_plan
                            AND p.title NOT ILIKE '%baseline%'
                            ORDER BY st.done, st.date_completed DESC, p.order ASC, t.id ASC`;
    let resultTests = await dbQuery(SORTED_TESTS, student.id);
    console.log('sorted tests result', resultTests.rows);

    return resultTests.rows;
  }

  async studentPacks(studentId, testPlan) {
    const LOAD_STUDENT_PACKS = `SELECT DISTINCT p.id AS id, p.title AS title
                                FROM packs p
                                JOIN tests t ON t.pack_id = p.id
                                JOIN students_tests st ON st.test_id = t.id
                                WHERE st.student_id = $1 AND p.test_type = $2
                                AND p.title NOT ILIKE '%baseline%'
                                ORDER BY p.id, p.title`;

    let resultPacks = await dbQuery(LOAD_STUDENT_PACKS, studentId, testPlan);
    if (resultPacks.rowCount === 0) return undefined;

    return resultPacks.rows;
  }

  async toggleDoneTest(studentId, testId) {
    const TOGGLE_DONE_TEST = `UPDATE students_tests
                                SET done = NOT done
                                WHERE student_id = $1
                                  AND test_id = $2`;

    let toggleResult = await dbQuery(TOGGLE_DONE_TEST, studentId, testId);
    return toggleResult.rowCount > 0;
  }

  async updateScore(userInput, studentsTestsId, testType) {
    if (!studentsTestsId) return undefined;
    let DELETE_SCORE = `DELETE FROM scores
                        WHERE students_tests_id = $1;`;
    await dbQuery(DELETE_SCORE, studentsTestsId);

    let { mock, projected, ACTEnglish, ACTMath, ACTReading, ACTScience, SATVerbal, SATMath } = userInput;

    if ((testType === 'SAT' && (!SATVerbal || !SATMath)) ||
        (testType === 'ACT' && (!ACTEnglish || !ACTMath ||
                                !ACTReading || !ACTScience))) {
      projected = true;
    }

    let scoreArray = [ACTEnglish, ACTMath, ACTReading, ACTScience, SATVerbal, SATMath].map(section => Number(section) || null);
    let cumulative = this.calculateCumulative(testType, scoreArray);
    let converted = await this.convertCumulativeScore(testType, +cumulative);

    if (scoreArray.every(section => !section)) return true;
    let INPUT_SCORE = `INSERT INTO scores (
                          mock, projected,
                          act_english, act_math, act_reading, act_science,
                          sat_verbal, sat_math, cumulative, converted_cumulative, students_tests_id)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`;

    let inputScore = await dbQuery(INPUT_SCORE, (!!mock), (!!projected), ...scoreArray, +cumulative, +converted, studentsTestsId);
    // console.log('took user input, inserted score');

    return inputScore.rowCount > 0;
  }

  async updateTimestamp(studentsTestsId, doneStatus) {
    let timestamp = doneStatus ? 'CURRENT_TIMESTAMP' : null;
    let UPDATE_TIMESTAMP = `UPDATE students_tests
                            SET date_completed = ${timestamp}
                            WHERE id = $1 AND done;`;
    let updated = await dbQuery(UPDATE_TIMESTAMP, studentsTestsId);
    // console.log('took st id, updated timestamp');

    return updated.rowCount === 1;
  }
};