CREATE TABLE students (
  id serial PRIMARY KEY,
  "name" text UNIQUE NOT NULL,
  test_plan text CHECK(test_plan = 'SAT' or test_plan = 'ACT')
);

CREATE TABLE packs (
  id serial PRIMARY KEY,
  title text UNIQUE NOT NULL,
  test_type text CHECK(test_type = 'SAT' or test_type = 'ACT'),
  "order" integer NOT NULL
);

CREATE TABLE tests (
  id serial PRIMARY KEY,
  title text UNIQUE NOT NULL,
  pack_id integer NOT NULL
    REFERENCES packs(id)
    ON DELETE CASCADE
);

CREATE TABLE students_tests (
  id serial PRIMARY KEY,
  test_id integer NOT NULL
    REFERENCES tests(id)
    ON DELETE CASCADE,
  student_id integer NOT NULL
    REFERENCES students(id)
    ON DELETE CASCADE,
  done boolean NOT NULL DEFAULT false
);

CREATE TABLE scores (
  id serial PRIMARY KEY,
  mock boolean NOT NULL DEFAULT false,
  projected boolean NOT NULL DEFAULT false,
  act_english integer	
    CHECK(act_english BETWEEN 20 AND 36),
  act_math integer
    CHECK(act_math BETWEEN 20 AND 36),
  act_reading integer
    CHECK(act_reading BETWEEN 20 AND 36),
  act_science integer
    CHECK(act_science BETWEEN 20 AND 36),
  sat_verbal integer	
    CHECK(sat_verbal BETWEEN 400 AND 800),
  sat_math integer
    CHECK(sat_math BETWEEN 400 AND 800),
  students_tests_id integer
    REFERENCES students_tests(id)
    ON DELETE CASCADE
);

-- CREATE TABLE scores (
--   id serial PRIMARY KEY,
--   title text,
--   projected boolean NOT NULL DEFAULT false,
--   score integer	
--     CHECK(score BETWEEN 20 AND 36 OR score BETWEEN 400 AND 800),
--   students_tests_id integer
--     REFERENCES students_tests(id)
--     ON DELETE CASCADE
-- );