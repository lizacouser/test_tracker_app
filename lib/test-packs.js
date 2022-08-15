
const PACK_ORDER = {
  SAT: ["2020 SAT Blue Book", "SAT Pack A", "SAT Pack B", "SAT Mocks"],
  ACT: ["21-22 ACT Red Book", "ACT Pack A", "ACT Pack B", "ACT Mocks"]
};

const PACKS = {
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

module.exports = {PACK_ORDER, PACKS};
