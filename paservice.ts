// ── Peer Assessment Service ────────────────────────────────────────────────────
//
// Contains all PA business logic. Has no dependency on Google APIs:
// every external concern is behind an injected interface (repos, emailService,
// formAdapter). This makes each method unit-testable with simple stubs.

class PaService {
  constructor(
    private readonly studentRepo: IStudentRepository,
    private readonly projectRepo: IProjectRepository,
    private readonly paRepo: IPaRepository,
    private readonly paProjectRepo: IPaProjectRepository,
    private readonly emailService: EmailService,
    private readonly formAdapter: IFormAdapter,
  ) {}

  // ── PA lifecycle ─────────────────────────────────────────────────────────────

  /**
   * Closes all forms for the given PA, notifies the instructor, and marks the
   * PA as closed. The GAS layer is responsible for obtaining instructorEmail
   * and spreadsheetUrl from Session / SpreadsheetApp before calling this.
   */
  closePA(
    pa: PeerAssessment,
    instructorEmail: string,
    spreadsheetUrl: string,
  ): void {
    this.setFormsAcceptingResponses(pa.id, false, pa.name);
    if (instructorEmail) {
      this.emailService.sendClosedToInstructor(
        pa,
        instructorEmail,
        spreadsheetUrl,
      );
    }
    this.paRepo.setState(pa, PaState.CLOSED);
  }

  /**
   * Opens or closes all PA forms for every project linked to paId.
   * Pass closedMessage only when disabling responses.
   */
  setFormsAcceptingResponses(
    paId: string,
    enabled: boolean,
    paName?: string,
  ): void {
    const projectKeys = this.projectRepo.getKeys();
    for (const projectKey of projectKeys) {
      const pp = this.paProjectRepo.find(paId, projectKey);
      if (pp == null) {
        sheetLog(
          `setFormsAcceptingResponses: No PA project row found for ${paId} and ${projectKey}.`,
        );
        continue;
      }
      const closedMsg =
        !enabled && paName
          ? `The peer assessment ${paName} has closed due to past deadline.`
          : undefined;
      this.formAdapter.setAcceptingResponses(
        pp.data.formId,
        enabled,
        closedMsg,
      );
    }
  }

  // ── Reminders ────────────────────────────────────────────────────────────────

  /** Returns verified students who have not yet submitted the given PA. */
  getStudentsWhoDidNotSubmit(pa: PeerAssessment): Student[] {
    const result: Student[] = [];
    for (const projectKey of this.projectRepo.getKeys()) {
      const students = this.studentRepo
        .findByProject(projectKey)
        .filter((s) => s.verified && !s.submittedpa[pa.id]);
      result.push(...students);
    }
    return result;
  }

  /** Sends PA reminder emails to the given list of students. */
  sendPaReminders(pa: PeerAssessment, students: Student[]): void {
    for (const student of students) {
      const pp = this.paProjectRepo.find(pa.id, student.projectkey);
      if (pp == null) {
        sheetLog(
          `sendPaReminders: No PA project found for ${pa.id} and ${student.projectkey}.`,
        );
        continue;
      }
      this.emailService.sendReminder(
        pa,
        student,
        this.formAdapter.getPublishedUrl(pp.data.formId),
      );
    }
  }

  /** Returns students who have not yet verified their registration. */
  notVerifiedStudents(): Student[] {
    const result: Student[] = [];
    for (const projectKey of this.projectRepo.getKeys()) {
      const students = this.studentRepo
        .findByProject(projectKey)
        .filter((s) => !s.verified);
      result.push(...students);
    }
    return result;
  }

  /**
   * Sends confirmation reminder emails to unverified students.
   * Generates a personal key if the student doesn't have one yet.
   */
  sendConfirmationReminders(
    students: Student[],
    verificationUrl: string,
  ): void {
    for (const student of students) {
      if (student.personalkey === "") {
        const row = this.studentRepo.findByEmail(student.email);
        if (row == null) {
          sheetLog(
            "sendConfirmationReminders: No student found for email " +
              student.email,
          );
          continue;
        }
        row.data.personalkey = generateUniqueKey();
        student.personalkey = row.data.personalkey;
        this.studentRepo.save(row);
      }
      this.emailService.sendConfirmation(student, verificationUrl);
    }
  }

  // ── Form submission handlers ─────────────────────────────────────────────────

  /**
   * Handles a peer assessment form submission.
   * Parameters are plain values extracted by the GAS layer from the sheet event.
   */
  handlePaSubmission(
    pa: PeerAssessment,
    projectkey: string,
    pakey: string,
    email: string,
    personalkey: string | null,
    editUrl: string,
    isDomain: boolean,
  ): void {
    const studentRow = this.studentRepo.findByEmail(email);
    if (studentRow == null) {
      sheetLog("Student not found " + email);
      if (isDomain) {
        this.emailService.sendNotRegistered(email);
      } else {
        this.emailService.sendEmailNotFound(email);
      }
      return;
    }

    if (!isDomain && studentRow.data.personalkey !== personalkey) {
      sheetLog("Wrong key for student " + JSON.stringify(studentRow));
      this.emailService.sendWrongKeyPA(
        email,
        studentRow.data.personalkey,
        editUrl,
      );
      return;
    }

    if (studentRow.data.projectkey !== projectkey) {
      sheetLog(
        "Student not in project: '" +
          studentRow.data.projectkey +
          "' '" +
          projectkey +
          "'",
      );
      return;
    }

    this.emailService.sendSubmission(studentRow.data, pa.name, editUrl);
    this.studentRepo.setSubmittedPA(studentRow, pakey, true);
    sheetLog("PA Submitted");
  }

  /**
   * Handles a registration form submission.
   * In domain mode: immediately marks the student verified.
   * In non-domain mode: sends a confirmation email and waits for verification.
   */
  registerStudent(
    student: Student,
    verificationUrl: string,
    isDomain: boolean,
  ): void {
    if (isDomain) {
      this.studentRepo.add(student);
      const row = this.studentRepo.findByEmail(student.email);
      if (row == null) {
        sheetLog(
          "registerStudent: No student found after insert for email " +
            student.email,
        );
        return;
      }
      this.studentRepo.setVerified(row, true);
      this.emailService.sendSuccess(row.data);
      Logger.log("REG domain: " + student.email + " registered and verified");
    } else {
      this.emailService.sendConfirmation(student, verificationUrl);
      this.studentRepo.add(student);
      sheetLog("REG: Student " + student.lname + " added");
    }
  }

  /**
   * Handles a verification form submission.
   * Validates the personal key and marks the student verified if it matches.
   */
  verifyStudent(email: string, personalkey: string): void {
    const student = this.studentRepo.findByEmail(email);
    if (student == null) {
      sheetLog("VER: Student not found " + email);
      this.emailService.sendVerificationEmailNotFound(email);
      return;
    }

    if (student.data.verified) {
      sheetLog("VER: Student " + email + " already verified");
      return;
    }

    if (student.data.personalkey !== personalkey) {
      sheetLog("VER: Wrong key for student " + JSON.stringify(student));
      this.emailService.sendWrongKeyVerification(email);
      return;
    }

    this.studentRepo.setVerified(student, true);
    this.emailService.sendSuccess(student.data);
    Logger.log("VER: " + email + " Verified");
  }
}
