INSERT INTO students (name, test_plan)
  VALUES ('Liza', 'SAT'), ('Byrne', 'ACT');

INSERT INTO packs (title, test_type, "order")
  VALUES ('2020 SAT Blue Book', 'SAT', 1),
         ('SAT Pack A', 'SAT', 2),
         ('SAT Pack B', 'SAT', 3),
         ('SAT Mocks', 'SAT', 4),
         ('21-22 ACT Red Book', 'ACT', 1),
         ('ACT Pack A', 'ACT', 2),
         ('ACT Pack B', 'ACT', 3),
         ('ACT Mocks', 'ACT', 4),
         ('SAT Baseline', 'SAT', 0),
         ('ACT Baseline', 'ACT', 0);

INSERT INTO tests (title, pack_id)
  VALUES ('BB10', 1),
         ('BB9', 1),
         ('BB8', 1),
         ('BB7', 1),
         ('BB6', 1),
         ('BB5', 1),
         ('BB3', 1),
         ('BB1', 1),
         ('Oct 2021 US', 2),
         ('May 2021 Int', 2),
         ('May 2021 US', 2),
         ('Mar 2021 US', 2),
         ('Dec 2020 Int', 2),
         ('Oct 2020 US', 2),
         ('Mar 2020 US', 3),
         ('Apr 2019 US', 3),
         ('Mar 2019 US', 3),
         ('May 2019 US', 3),
         ('May 2018 US', 3),
         ('Apr 2018 US', 3),
         ('Mar 2018 US', 3),
         ('May 2019 Int', 4),
         ('Oct 2019 US (Backup)', 4),
         ('RB1', 5),
         ('RB2', 5),
         ('RB3', 5),
         ('RB4', 5),
         ('RB5', 5),
         ('RB6', 5),
         ('ACT 39.5', 6),
         ('ACT 40', 6),
         ('ACT 41', 6),
         ('ACT 42', 6),
         ('ACT 44', 6),
         ('ACT 45', 6),
         ('ACT 47', 6),
         ('ACT 48', 6),
         ('ACT 49', 6),
         ('ACT 21', 7),
         ('ACT 22', 7),
         ('ACT 23', 7),
         ('ACT 27', 7),
         ('ACT 30', 7),
         ('ACT 31', 7),
         ('ACT 33', 7),
         ('ACT 36', 7),
         ('ACT 38', 7),
         ('ACT 39', 8),
         ('ACT 32 (Backup)', 8),
         ('ACT 46 (Backup)', 8),
         ('Baseline PSAT/SAT', 9),
         ('Baseline ACT', 10);

INSERT INTO students_tests (test_id, student_id, done)
  VALUES (1, 1, true),
         (2, 1, true),
         (3, 1, true),
         (4, 1, false),
         (5, 1, false),
         (6, 1, false),
         (7, 1, false),
         (8, 1, false),
         (9, 1, false),
         (10, 1, false),
         (24, 2, true),
         (25, 2, true),
         (26, 2, false),
         (27, 2, false),
         (28, 2, false),
         (29, 2, false),
         (51,	1, true),
         (52,	2, true);

INSERT INTO scores (mock, projected,	act_english,	act_math, act_reading, act_science, sat_verbal, sat_math, students_tests_id)
  VALUES (false, true, null, null, null, null, 550, 600, 1),
         (true, true, null, null, null, null, 480, 700, 2),
         (true, false, 30, 30, 34, 30, null, null, 11),
         (false, true, 33, 33, 33, 33, null, null, 12),
         (false, false, null, null, null, null, 480, 500, 17),
         (false, false, 29, 30, 24, 30, null, null, 18);