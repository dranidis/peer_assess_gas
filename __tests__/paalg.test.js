"use strict";
// PaScoreService is placed in global scope by jest.setup.js.
// Types are declared in globals.d.ts.
// ── Helpers ───────────────────────────────────────────────────────────────────
function makeLogger() {
  return { log: jest.fn() };
}
/** Build a minimal Student object for test data. */
function makeStudent(email, projectkey = "proj1") {
  return {
    fname: "Test",
    lname: "User",
    email,
    projectkey,
    personalkey: "",
    verified: true,
    submittedpa: {},
  };
}
/**
 * Build a FormResponseData for a non-domain form (offset = 2).
 * ratingsMap maps each reviewer email to their rating row (one string[] per question).
 */
function buildNonDomainFormData(_students, ratingsMap) {
  const emails = [];
  const responses = [];
  for (const [email, row] of Object.entries(ratingsMap)) {
    // Non-domain offset is 2: [email, personalkey, ...question grids]
    emails.push("");
    responses.push([email, "KEY00", row]);
  }
  return { emails, responses };
}
// ── PaScoreService ─────────────────────────────────────────────────────────────
describe("PaScoreService", () => {
  let service;
  beforeEach(() => {
    service = new PaScoreService(makeLogger());
  });
  // ── calcPAScores ─────────────────────────────────────────────────────────────
  describe("calcPAScores", () => {
    /**
     * Two-student group, one question, both submitted equal scores.
     * After self-zeroing and normalisation each student receives a PA score of 1
     * (the neutral / average contribution).
     */
    it("gives both students a neutral score (1) when they rate each other equally", () => {
      const students = [makeStudent("s1@x.com"), makeStudent("s2@x.com")];
      // Non-domain offset=2. Each student rates [self, other].
      // s1 rates → [4, 4], s2 rates → [2, 2]  (equal → neutral after normalization)
      const rm = buildNonDomainFormData(students, {
        "s1@x.com": ["4", "4"],
        "s2@x.com": ["2", "2"],
      });
      const result = service.calcPAScores(
        rm,
        students,
        ["Q1"],
        false,
        false,
        false,
      );
      expect(result.penalty["s1@x.com"]).toBe(false);
      expect(result.penalty["s2@x.com"]).toBe(false);
      // scores[email][0] = average, scores[email][1] = Q1 score
      expect(result.scores["s1@x.com"][1]).toBeCloseTo(1);
      expect(result.scores["s2@x.com"][1]).toBeCloseTo(1);
    });
    /**
     * With 3 students and asymmetric ratings, the peer-preferred student
     * should receive a PA score above 1 while the peer-penalised student
     * should receive a score below 1.
     *
     * Ratings (pre self-zero) — only the off-diagonal values matter:
     *   s1 rates: [0, 4, 1]  →  after self-zero [0,4,1]  → norm [0, 4/5, 1/5]
     *   s2 rates: [4, 0, 1]  →  after self-zero [4,0,1]  → norm [4/5, 0, 1/5]
     *   s3 rates: [1, 4, 0]  →  after self-zero [1,4,0]  → norm [1/5, 4/5, 0]
     *
     * Column sums (factor = 3/3 = 1):
     *   s1: 0   + 4/5 + 1/5 = 1.0
     *   s2: 4/5 + 0   + 4/5 = 1.6  ← above average
     *   s3: 1/5 + 1/5 + 0   = 0.4  ← below average
     */
    it("gives a higher PA score to the student rated higher by peers (3-student group)", () => {
      const students = [
        makeStudent("s1@x.com"),
        makeStudent("s2@x.com"),
        makeStudent("s3@x.com"),
      ];
      const rm = buildNonDomainFormData(students, {
        "s1@x.com": ["0", "4", "1"],
        "s2@x.com": ["4", "0", "1"],
        "s3@x.com": ["1", "4", "0"],
      });
      const result = service.calcPAScores(
        rm,
        students,
        ["Q1"],
        false,
        false,
        false,
      );
      expect(result.penalty["s1@x.com"]).toBe(false);
      expect(result.penalty["s2@x.com"]).toBe(false);
      expect(result.penalty["s3@x.com"]).toBe(false);
      expect(result.scores["s2@x.com"][1]).toBeCloseTo(1.6);
      expect(result.scores["s3@x.com"][1]).toBeCloseTo(0.4);
      expect(result.scores["s1@x.com"][1]).toBeCloseTo(1.0);
    });
    it("marks non-submitters with a penalty flag", () => {
      const students = [makeStudent("s1@x.com"), makeStudent("s2@x.com")];
      const rm = buildNonDomainFormData(students, {
        "s1@x.com": ["3", "3"],
        // s2 does not submit
      });
      const result = service.calcPAScores(
        rm,
        students,
        ["Q1"],
        false,
        false,
        false,
      );
      expect(result.penalty["s1@x.com"]).toBe(false);
      expect(result.penalty["s2@x.com"]).toBe(true);
    });
    it("produces scores for every student regardless of submission", () => {
      const students = [
        makeStudent("s1@x.com"),
        makeStudent("s2@x.com"),
        makeStudent("s3@x.com"),
      ];
      const rm = buildNonDomainFormData(students, {
        "s1@x.com": ["3", "3", "3"],
        // s2 and s3 do not submit
      });
      const result = service.calcPAScores(
        rm,
        students,
        ["Q1"],
        false,
        false,
        false,
      );
      expect(Object.keys(result.scores)).toHaveLength(3);
      expect(Object.keys(result.penalty)).toHaveLength(3);
    });
    it("uses the domain offset (0) when domain=true", () => {
      const students = [makeStudent("s1@x.com"), makeStudent("s2@x.com")];
      // Domain mode: no email/key prefix fields — ratings start at index 0
      const rm = {
        emails: ["s1@x.com", "s2@x.com"],
        responses: [[["2", "2"]], [["2", "2"]]],
      };
      const result = service.calcPAScores(
        rm,
        students,
        ["Q1"],
        false,
        true,
        false,
      );
      expect(result.scores["s1@x.com"][1]).toBeCloseTo(1);
      expect(result.scores["s2@x.com"][1]).toBeCloseTo(1);
    });
    it("prepends the per-student average as element [0] of their score array", () => {
      const students = [makeStudent("s1@x.com"), makeStudent("s2@x.com")];
      // Non-domain offset=2: [email, personalkey, [q1_ratings], [q2_ratings]]
      const rm = {
        emails: ["", ""],
        responses: [
          ["s1@x.com", "KEY00", ["2", "2"], ["4", "4"]],
          ["s2@x.com", "KEY00", ["2", "2"], ["4", "4"]],
        ],
      };
      const result = service.calcPAScores(
        rm,
        students,
        ["Q1", "Q2"],
        false,
        false,
        false,
      );
      const s1scores = result.scores["s1@x.com"];
      const avg = s1scores[0];
      const q1 = s1scores[1];
      const q2 = s1scores[2];
      expect(avg).toBeCloseTo((q1 + q2) / 2);
    });
  });
  // ── calculateGrade ──────────────────────────────────────────────────────────
  describe("calculateGrade", () => {
    it("returns the original grade unchanged when weight is 0", () => {
      expect(service.calculateGrade(80, 1.5, 0, 0)).toBeCloseTo(80);
    });
    it("returns the original grade unchanged when PA score is 1 (neutral contributor)", () => {
      expect(service.calculateGrade(80, 1.0, 0.5, 0)).toBeCloseTo(80);
    });
    it("increases the grade for an above-average contributor (pascore > 1)", () => {
      expect(service.calculateGrade(80, 1.2, 0.5, 0)).toBeGreaterThan(80);
    });
    it("decreases the grade for a below-average contributor (pascore < 1)", () => {
      expect(service.calculateGrade(80, 0.8, 0.5, 0)).toBeLessThan(80);
    });
    it("applies a non-submission penalty that reduces the final grade", () => {
      const withPenalty = service.calculateGrade(80, 1.0, 0.5, 0.3);
      const withoutPenalty = service.calculateGrade(80, 1.0, 0.5, 0);
      expect(withPenalty).toBeLessThan(withoutPenalty);
    });
    it("applies full weight adjustment when weight=1", () => {
      // adjgrade = 80*1=80, fixedgrade=0, pagrade = 80*1.2+0 = 96
      expect(service.calculateGrade(80, 1.2, 1, 0)).toBeCloseTo(96);
    });
    it("returns 0 when grade is 0", () => {
      expect(service.calculateGrade(0, 1.5, 0.5, 0)).toBeCloseTo(0);
    });
  });
});
