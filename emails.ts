// ── Email Service ──────────────────────────────────────────────────────────────
//
// Sends all PA-related emails.
// Has no dependency on Google APIs: all GAS calls are behind IEmailAdapter.

class EmailService {
  constructor(private readonly adapter: IEmailAdapter) {}

  private sendTemplate(
    templateFile: string,
    vars: Record<string, unknown>,
    to: string,
    subject: string,
    plainText: string,
  ): void {
    const html = this.adapter.renderTemplate(templateFile, vars);
    this.adapter.send(to, subject, plainText, { htmlBody: html });
  }

  /** Sent to a newly-registered student who needs to confirm their email. */
  sendConfirmation(student: Student, verificationUrl: string): void {
    this.sendTemplate(
      "html/confirmation.html",
      { name: student.fname, link: verificationUrl, key: student.personalkey },
      student.email,
      "PA: Confirm your registration",
      "In order to complete your registration please visit this " +
        verificationUrl,
    );
  }

  /** Sent to a student after their registration has been verified. */
  sendSuccess(student: Student): void {
    this.sendTemplate(
      "html/successful.html",
      { name: student.fname, key: student.personalkey },
      student.email,
      "PA: Successful registration",
      "Congratulations! You have successfully completed your registration.\nKeep your " +
        student.personalkey +
        " for completing peer assessments.",
    );
  }

  /** Sent to a student after they submit their peer assessment. */
  sendSubmission(student: Student, paname: string, editUrl: string): void {
    this.sendTemplate(
      "html/pasubmission.html",
      {
        email: student.email,
        name: student.fname,
        link: editUrl,
        pa: paname,
        project: student.projectkey,
      },
      student.email,
      "PA: Successful submission of peer assessment",
      "Congratulations! You have successfully completed your peer assessment",
    );
  }

  /** Sent to students who have not yet submitted before the deadline. */
  sendReminder(pa: PeerAssessment, student: Student, formUrl: string): void {
    const vars: Record<string, unknown> = {
      name: student.fname,
      link: formUrl,
      key: "",
      deadline: new Date(pa.deadline),
      paname: pa.name,
    };
    if (!getSettings().domain) {
      vars.key = "Your personal key is: " + student.personalkey + ". ";
    }
    this.sendTemplate(
      "html/reminder.html",
      vars,
      student.email,
      "PA: Reminder for peer assessment: " + pa.name,
      "This is a reminder that you need to complete your peer assessment. " +
        "Note that there is a penalty for not completing the peer assessment.",
    );
  }

  /** Sent to students when PA results are announced. */
  sendResults(
    pa: PeerAssessment,
    student: Student,
    grade: number,
    pascore: number,
  ): void {
    const settings = getSettings();
    this.sendTemplate(
      "html/announce.html",
      {
        name: student.fname,
        pa: pa.name,
        pascore: settings.mailpa
          ? "Your peer assessment score is " + pascore + "."
          : "",
        grade: settings.mailgrade
          ? "Your peer adjusted grade is " + grade + "."
          : "",
      },
      student.email,
      "PA: Results for peer assessment: " + pa.name,
      "",
    );
  }

  /** Sent to the instructor when a PA closes (triggered or manual). */
  sendClosedToInstructor(
    pa: PeerAssessment,
    instructorEmail: string,
    spreadsheetUrl: string,
  ): void {
    this.adapter.send(
      instructorEmail,
      `PA: Assessment  ${pa.name}  has closed.`,
      spreadsheetUrl,
    );
  }

  // ── Registration / verification error emails ───────────────────────────────
  // These are plain-text; no HTML template needed.

  /** Sent when a PA form submission arrives for an unrecognised email (domain mode). */
  sendNotRegistered(email: string): void {
    this.adapter.send(
      email,
      "PA: Not registered",
      "You have to register first to use the peer assessment. ",
    );
  }

  /** Sent when a PA form submission arrives for an unrecognised email (non-domain mode). */
  sendEmailNotFound(email: string): void {
    this.adapter.send(
      email,
      "PA: email not found",
      "Your email was not found. If you are sure you have used the correct email please contact the administrator of the system.",
    );
  }

  /** Sent when a PA form submission carries an incorrect personal key. */
  sendWrongKeyPA(email: string, correctKey: string, editUrl: string): void {
    this.adapter.send(
      email,
      "PA: Wrong personal key",
      "Your personal key is: " +
        correctKey +
        ". Edit your response in " +
        editUrl,
    );
  }

  /** Sent during verification when the email is not in the system. */
  sendVerificationEmailNotFound(email: string): void {
    this.adapter.send(
      email,
      "PA: this email is not registered in the system",
      "Please use the registered email. Contact the administrator of the PA system in case you dont know how to proceed.",
    );
  }

  /** Sent during verification when the personal key is wrong. */
  sendWrongKeyVerification(email: string): void {
    this.adapter.send(
      email,
      "Wrong personal key",
      "Please check your registration email",
    );
  }
}
