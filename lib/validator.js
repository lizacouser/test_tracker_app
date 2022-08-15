const { body } = require('express-validator');

module.exports = {
  name: body("studentName")
    .trim()
    .isLength({ min: 1 })
    .withMessage("Student Name is required.")
    .isLength({ max: 100 })
    .withMessage("Name must be between 1 and 100 characters."),

  uniqueName: body("studentName")
    .trim()
    .isLength({ min: 1 })
    .withMessage("Student Name is required.")
    .isLength({ max: 100 })
    .withMessage("Name must be between 1 and 100 characters.")
    .custom((name, { req }) => {
      let students = req.session.students;
      let duplicate = students.find(student => student.name === name);
      return duplicate === undefined;
    })
    .withMessage("Student name must be unique."),

  SATScore: body(["SATVerbal", "SATMath"])
    .optional({ checkFalsy: true })
    .isInt({ min: 400, max: 800 })
    .withMessage(`SAT section scores must be between 400 and 800.`),

  ACTScore: body(["ACTEnglish", "ACTMath", "ACTReading", "ACTScience"])
    .optional({ checkFalsy: true })
    .isInt({ min: 1, max: 36 })
    .withMessage(`ACT section scores must be between 1 and 36.`),

};