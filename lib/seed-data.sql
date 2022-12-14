INSERT INTO students (name, test_plan, username)
  VALUES ('Liza', 'SAT', 'admin'), ('Byrne', 'ACT', 'admin');

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

INSERT INTO students_tests (test_id, student_id, done, date_completed, username)
  VALUES (1, 1, true, '2022-08-13 23:51:54.720', 'admin'),
         (2, 1, true, '2022-08-20 23:51:54.720', 'admin'),
         (3, 1, true, '2022-08-27 23:51:54.720', 'admin'),
         (4, 1, false, null, 'admin'),
         (5, 1, false, null, 'admin'),
         (6, 1, false, null, 'admin'),
         (7, 1, false, null, 'admin'),
         (8, 1, false, null, 'admin'),
         (9, 1, false, null, 'admin'),
         (10, 1, false, null, 'admin'),
         (24, 2, true, '2022-06-23 23:51:54.720', 'admin'),
         (25, 2, true, '2022-06-14 23:51:54.720', 'admin'),
         (26, 2, false, null, 'admin'),
         (27, 2, false, null, 'admin'),
         (28, 2, false, null, 'admin'),
         (29, 2, false, null, 'admin'),
         (51, 1, true, '2021-10-13 23:51:54.720', 'admin'),
         (52, 2, true, '2021-8-27 23:51:54.720', 'admin');

INSERT INTO scores (mock, projected, act_english, act_math, act_reading, act_science, sat_verbal, sat_math, cumulative, converted_cumulative, students_tests_id)
  VALUES (false, true, null, null, null, null, 550, 600, 1150, 23, 1),
         (true, true, null, null, null, null, 480, 700, 1180, 21, 2),
         (true, false, 30, 30, 34, 30, null, null, 31, 1400, 11),
         (false, true, 33, 33, 33, 33, null, null, 33, 1480, 12),
         (false, false, null, null, null, null, 480, 500, 980, 18, 17),
         (false, false, 29, 30, 24, 30, null, null, 28, 1320, 18);

INSERT INTO score_conversions (sat_score, act_score)
  VALUES (1600, 36), (1250, 26), (900, 16),
         (1590, 36), (1240, 26), (890, 16),
         (1580, 36), (1230, 26), (880, 16),
         (1570, 36), (1220, 25), (870, 15),
         (1560, 35), (1210, 25), (860, 15),
         (1550, 35), (1200, 25), (850, 15),
         (1540, 35), (1190, 24), (840, 15),
         (1530, 35), (1180, 24), (830, 15),
         (1520, 34), (1170, 24), (820, 14),
         (1510, 34), (1160, 24), (810, 14),
         (1500, 34), (1150, 23), (800, 14),
         (1490, 34), (1140, 23), (790, 14),
         (1480, 33), (1130, 23), (780, 14),
         (1470, 33), (1120, 22), (770, 13),
         (1460, 33), (1110, 22), (760, 13),
         (1450, 33), (1100, 22), (750, 13),
         (1440, 32), (1090, 21), (740, 13),
         (1430, 32), (1080, 21), (730, 13),
         (1420, 32), (1070, 21), (720, 12),
         (1410, 31), (1060, 21), (710, 12),
         (1400, 31), (1050, 20), (700, 12),
         (1390, 31), (1040, 20), (690, 12),
         (1380, 30), (1030, 20), (680, 11),
         (1370, 30), (1020, 19), (670, 11),
         (1360, 30), (1010, 19), (660, 11),
         (1350, 29), (1000, 19), (650, 11),
         (1340, 29), (990, 19), (640, 10),
         (1330, 29), (980, 18), (630, 10),
         (1320, 28), (970, 18), (620, 10),
         (1310, 28), (960, 18), (610, 9),
         (1300, 28), (950, 17), (600, 9),
         (1290, 27), (940, 17), (590, 9),
         (1280, 27), (930, 17), (1270, 27),
         (920, 17), (1260, 27), (910, 16);