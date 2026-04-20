// ── Ports ─────────────────────────────────────────────────────────────────────

/** Raw data fetched from a Google Form – produced by the form adapter. */
interface FormResponseData {
  emails: string[];
  responses: Array<Array<string | string[]>>;
}

/** email → per-question item responses (plain values, no GAS types) */
type ResponseMap = { [email: string]: Array<string | string[]> };

/** Output of PaScoreService.calcPAScores */
interface PaScoreResult {
  scores: { [email: string]: number[] };
  penalty: { [email: string]: boolean };
}

/** Logger port – isolates the domain from any concrete logging implementation. */
interface ILogger {
  log(message: string): void;
}

// ── Domain Service ─────────────────────────────────────────────────────────────

class PaScoreService {
  constructor(private readonly logger: ILogger) {}

  /**
   * Builds a response map (email → item responses) from pre-fetched form data.
   *
   * Non-domain forms include email as the first text response field;
   * domain forms capture respondent email from the submissions metadata.
   */
  buildResponseMap(data: FormResponseData): ResponseMap {
    const { emails, responses } = data;
    const responseMap: ResponseMap = {};

    for (let i = 0; i < responses.length; i++) {
      let email: string;
      if (emails[i] === "") {
        email = responses[i][0] as string;
        this.logger.log("buildResponseMap email: " + email);
      } else {
        email = emails[i];
        this.logger.log("buildResponseMap email (google): " + email);
      }
      responseMap[email] = responses[i];
    }

    return responseMap;
  }

  /**
   * Calculates the PA results for each question, plus the average.
   * Non-submissions are treated with the same grades for all students.
   *
   * @param responseMap  Response map built by buildResponseMap()
   * @param students     Students in the project group
   * @param questions    PA questions
   * @param self         Whether to include self-assessment in the score
   * @param domain       Whether Google Domain accounts are used (affects form field offset)
   * @param debug        Enable debug logging
   */
  calcPAScores(
    responseMap: ResponseMap,
    students: Student[],
    questions: string[],
    self: boolean,
    domain: boolean,
    debug: boolean,
  ): PaScoreResult {
    // offset 2: non-domain forms contain 2 extra fields before the grid (email, personalkey)
    const offset = domain ? 0 : 2;

    // Work on a shallow clone so we don't mutate the caller's map
    const rm: ResponseMap = Object.assign({}, responseMap);

    const debugLog = () => {
      if (debug) {
        for (const student of students) {
          this.logger.log(
            "calcPAScores: " + student.email + ":" + rm[student.email],
          );
        }
      }
    };

    debugLog();

    const penalty: { [email: string]: boolean } = {};

    if (!self) {
      // Fill in default neutral scores for non-submitters
      for (let i = 0; i < students.length; i++) {
        const e = students[i].email;
        penalty[e] = false;
        if (rm[e] == null) {
          penalty[e] = true;
          rm[e] = [];
          for (let q = 0; q < questions.length; q++) {
            const row: string[] = [];
            for (let s = 0; s < students.length; s++) {
              row[s] = "3"; // neutral score for non-submissions
            }
            rm[e][offset + q] = row;
          }
        }
      }

      debugLog();

      // Zero out self-assessment scores
      for (let i = 0; i < students.length; i++) {
        const e = students[i].email;
        if (rm[e] != null) {
          for (let q = 0; q < questions.length; q++) {
            (rm[e][offset + q] as string[])[i] = "0";
          }
        }
      }
    }

    let submitted = 0;
    // Normalize values row-by-row (per reviewer, per question)
    for (let i = 0; i < students.length; i++) {
      const e = students[i].email;
      if (rm[e] != null) {
        submitted++;
        for (let q = 0; q < questions.length; q++) {
          let sum = 0.0;
          const row = rm[e][offset + q] as string[];
          for (let s = 0; s < row.length; s++) {
            sum += Number(row[s]);
          }
          for (let s = 0; s < row.length; s++) {
            row[s] = String(Number(row[s]) / sum);
          }
        }
      }
    }

    const factor = students.length / submitted;

    debugLog();

    // Aggregate scores per student, per question
    const score: { [email: string]: number[] } = {};
    for (let i = 0; i < students.length; i++) {
      const email = students[i].email;
      score[email] = [];
      for (let q = 0; q < questions.length; q++) {
        let sum = 0.0;
        for (let j = 0; j < students.length; j++) {
          const r = students[j].email;
          if (rm[r] != null) {
            sum += Number((rm[r][offset + q] as string[])[i]);
          }
        }
        score[email][q] = sum * factor;
      }
    }

    // Compute per-student average and prepend it as the first element
    for (let i = 0; i < students.length; i++) {
      const e = students[i].email;
      let avg = 0;
      for (let q = 0; q < score[e].length; q++) {
        avg += score[e][q];
      }
      avg /= score[e].length;
      score[e].unshift(avg);
      if (debug) {
        this.logger.log("AVG " + avg);
        this.logger.log(String(score[e]));
      }
    }

    return { scores: score, penalty };
  }

  /**
   * Returns the final adjusted grade taking into account the PA score,
   * the weight percentage, and the non-submission penalty.
   *
   * @param grade   Group grade (baseline)
   * @param pascore Peer assessment score (~1.0 = average contributor)
   * @param weight  Fraction of the grade affected by PA (0–1)
   * @param penalty Non-submission penalty fraction
   */
  calculateGrade(
    grade: number,
    pascore: number,
    weight: number,
    penalty: number,
  ): number {
    let adjgrade = grade * weight;
    let fixedgrade = grade - adjgrade;
    let pagrade = adjgrade * pascore + fixedgrade;
    pagrade = pagrade - pagrade * penalty;
    return pagrade;
  }
}
