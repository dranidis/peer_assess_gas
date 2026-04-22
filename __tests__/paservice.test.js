"use strict";
// PaService and PaState are placed in global scope by jest.setup.js.
// ── Test-data factories ───────────────────────────────────────────────────────
function makePa(id) {
  return {
    name: "PA Test",
    id,
    deadline: new Date("2099-01-01"),
    state: PaState.OPEN,
  };
}
function makeStudent(email, opts = {}) {
  var _a, _b, _c, _d, _e, _f;
  return {
    fname: (_a = opts.fname) !== null && _a !== void 0 ? _a : "Test",
    lname: (_b = opts.lname) !== null && _b !== void 0 ? _b : "User",
    email,
    projectkey: (_c = opts.projectkey) !== null && _c !== void 0 ? _c : "proj1",
    personalkey:
      (_d = opts.personalkey) !== null && _d !== void 0 ? _d : "KEY12",
    verified: (_e = opts.verified) !== null && _e !== void 0 ? _e : true,
    submittedpa: (_f = opts.submittedpa) !== null && _f !== void 0 ? _f : {},
  };
}
function makeRow(data, row = 1) {
  return { data, row };
}
function makePaProject(pakey, projectkey, formId = "form-id-1") {
  return { pakey, projectkey, grade: 80, formId };
}
// ── Mock dependency builders ──────────────────────────────────────────────────
function makeMocks() {
  const studentRepo = {
    getAll: jest.fn(() => []),
    findByEmail: jest.fn(() => null),
    findByProject: jest.fn(() => []),
    add: jest.fn(),
    save: jest.fn(),
    setVerified: jest.fn(),
    setSubmittedPA: jest.fn(),
    getHeading: jest.fn(() => []),
    addPAColumn: jest.fn(() => 1),
    sort: jest.fn(),
  };
  const projectRepo = {
    getAll: jest.fn(() => []),
    getRows: jest.fn(() => []),
    add: jest.fn(),
    isValidKey: jest.fn(() => true),
    getKeys: jest.fn(() => ["proj1"]),
  };
  const paRepo = {
    getAll: jest.fn(() => []),
    findById: jest.fn(() => null),
    add: jest.fn(),
    setState: jest.fn(),
  };
  const paProjectRepo = {
    getAll: jest.fn(() => []),
    find: jest.fn(() => null),
    findByFormId: jest.fn(() => null),
    getGroupGrade: jest.fn(() => null),
    getProjectkeyFromFormId: jest.fn(() => null),
    add: jest.fn(() => null),
    saveLinks: jest.fn(),
    deleteLinks: jest.fn(),
  };
  const emailService = {
    sendConfirmation: jest.fn(),
    sendSuccess: jest.fn(),
    sendSubmission: jest.fn(),
    sendReminder: jest.fn(),
    sendResults: jest.fn(),
    sendClosedToInstructor: jest.fn(),
    sendNotRegistered: jest.fn(),
    sendEmailNotFound: jest.fn(),
    sendWrongKeyPA: jest.fn(),
    sendVerificationEmailNotFound: jest.fn(),
    sendWrongKeyVerification: jest.fn(),
  };
  const formAdapter = {
    getPublishedUrl: jest.fn(() => "https://forms.example.com/pa"),
    setAcceptingResponses: jest.fn(),
  };
  const logger = { log: jest.fn() };
  return {
    studentRepo,
    projectRepo,
    paRepo,
    paProjectRepo,
    emailService,
    formAdapter,
    logger,
  };
}
// ── PaService ─────────────────────────────────────────────────────────────────
describe("PaService", () => {
  let mocks;
  let service;
  beforeEach(() => {
    mocks = makeMocks();
    service = new PaService(
      mocks.studentRepo,
      mocks.projectRepo,
      mocks.paRepo,
      mocks.paProjectRepo,
      mocks.emailService,
      mocks.formAdapter,
      mocks.logger,
    );
  });
  // ── closePA ─────────────────────────────────────────────────────────────────
  describe("closePA", () => {
    it("disables accepting responses on the project form", () => {
      const pa = makePa("pa1");
      const pp = makeRow(makePaProject("pa1", "proj1", "form-123"));
      mocks.paProjectRepo.find.mockReturnValue(pp);
      service.closePA(pa, "instructor@x.com", "https://sheet.url");
      expect(mocks.formAdapter.setAcceptingResponses).toHaveBeenCalledWith(
        "form-123",
        false,
        expect.stringContaining(pa.name),
      );
    });
    it("notifies the instructor by email", () => {
      const pa = makePa("pa1");
      service.closePA(pa, "instructor@x.com", "https://sheet.url");
      expect(mocks.emailService.sendClosedToInstructor).toHaveBeenCalledWith(
        pa,
        "instructor@x.com",
        "https://sheet.url",
      );
    });
    it("marks the PA as CLOSED in the repository", () => {
      const pa = makePa("pa1");
      service.closePA(pa, "instructor@x.com", "https://sheet.url");
      expect(mocks.paRepo.setState).toHaveBeenCalledWith(pa, PaState.CLOSED);
    });
    it("skips the instructor email when instructorEmail is an empty string", () => {
      service.closePA(makePa("pa1"), "", "https://sheet.url");
      expect(mocks.emailService.sendClosedToInstructor).not.toHaveBeenCalled();
    });
    it("logs a warning and continues when no PA-project row exists for a project", () => {
      mocks.paProjectRepo.find.mockReturnValue(null);
      expect(() =>
        service.closePA(makePa("pa1"), "i@x.com", "https://sheet.url"),
      ).not.toThrow();
      expect(mocks.logger.log).toHaveBeenCalled();
    });
  });
  // ── setFormsAcceptingResponses ───────────────────────────────────────────────
  describe("setFormsAcceptingResponses", () => {
    it("opens all project forms when enabled=true", () => {
      const pp = makeRow(makePaProject("pa1", "proj1", "form-abc"));
      mocks.paProjectRepo.find.mockReturnValue(pp);
      service.setFormsAcceptingResponses("pa1", true);
      expect(mocks.formAdapter.setAcceptingResponses).toHaveBeenCalledWith(
        "form-abc",
        true,
        undefined,
      );
    });
    it("closes all project forms with a message when enabled=false", () => {
      const pp = makeRow(makePaProject("pa1", "proj1", "form-abc"));
      mocks.paProjectRepo.find.mockReturnValue(pp);
      service.setFormsAcceptingResponses("pa1", false, "My PA");
      const [, enabled, msg] =
        mocks.formAdapter.setAcceptingResponses.mock.calls[0];
      expect(enabled).toBe(false);
      expect(msg).toMatch("My PA");
    });
  });
  // ── getStudentsWhoDidNotSubmit ───────────────────────────────────────────────
  describe("getStudentsWhoDidNotSubmit", () => {
    it("returns only verified students who have not submitted", () => {
      const pa = makePa("pa1");
      mocks.studentRepo.findByProject.mockReturnValue([
        makeStudent("submitted@x.com", {
          verified: true,
          submittedpa: { pa1: true },
        }),
        makeStudent("pending@x.com", { verified: true, submittedpa: {} }),
        makeStudent("unverified@x.com", { verified: false, submittedpa: {} }),
      ]);
      const result = service.getStudentsWhoDidNotSubmit(pa);
      expect(result).toHaveLength(1);
      expect(result[0].email).toBe("pending@x.com");
    });
    it("returns an empty array when every verified student has submitted", () => {
      const pa = makePa("pa1");
      mocks.studentRepo.findByProject.mockReturnValue([
        makeStudent("s1@x.com", { verified: true, submittedpa: { pa1: true } }),
      ]);
      expect(service.getStudentsWhoDidNotSubmit(pa)).toHaveLength(0);
    });
  });
  // ── sendPaReminders ─────────────────────────────────────────────────────────
  describe("sendPaReminders", () => {
    it("sends a reminder email to each student using the form URL", () => {
      const pa = makePa("pa1");
      const students = [makeStudent("s1@x.com"), makeStudent("s2@x.com")];
      mocks.paProjectRepo.find.mockReturnValue(
        makeRow(makePaProject("pa1", "proj1", "fid1")),
      );
      mocks.formAdapter.getPublishedUrl.mockReturnValue(
        "https://forms.example.com/pa",
      );
      service.sendPaReminders(pa, students);
      expect(mocks.emailService.sendReminder).toHaveBeenCalledTimes(2);
      expect(mocks.formAdapter.getPublishedUrl).toHaveBeenCalledWith("fid1");
    });
    it("skips a student and logs when no PA-project row is found", () => {
      const pa = makePa("pa1");
      mocks.paProjectRepo.find.mockReturnValue(null);
      service.sendPaReminders(pa, [makeStudent("s@x.com")]);
      expect(mocks.emailService.sendReminder).not.toHaveBeenCalled();
      expect(mocks.logger.log).toHaveBeenCalled();
    });
  });
  // ── notVerifiedStudents ──────────────────────────────────────────────────────
  describe("notVerifiedStudents", () => {
    it("returns students who are not yet verified", () => {
      mocks.studentRepo.findByProject.mockReturnValue([
        makeStudent("verified@x.com", { verified: true }),
        makeStudent("unverified@x.com", { verified: false }),
      ]);
      const result = service.notVerifiedStudents();
      expect(result).toHaveLength(1);
      expect(result[0].email).toBe("unverified@x.com");
    });
  });
  // ── handlePaSubmission ───────────────────────────────────────────────────────
  describe("handlePaSubmission", () => {
    it("sends a submission email and marks the student on a valid non-domain submission", () => {
      const pa = makePa("pa1");
      const student = makeStudent("s@x.com", {
        projectkey: "proj1",
        personalkey: "ABCDE",
      });
      mocks.studentRepo.findByEmail.mockReturnValue(makeRow(student));
      service.handlePaSubmission(
        pa,
        "proj1",
        "pa1",
        "s@x.com",
        "ABCDE",
        "https://edit.url",
        false,
      );
      expect(mocks.emailService.sendSubmission).toHaveBeenCalledWith(
        student,
        pa.name,
        "https://edit.url",
      );
      expect(mocks.studentRepo.setSubmittedPA).toHaveBeenCalledWith(
        expect.anything(),
        "pa1",
        true,
      );
    });
    it("accepts a submission without a personal-key check in domain mode", () => {
      const pa = makePa("pa1");
      const student = makeStudent("s@x.com", {
        projectkey: "proj1",
        personalkey: "SECRET",
      });
      mocks.studentRepo.findByEmail.mockReturnValue(makeRow(student));
      service.handlePaSubmission(
        pa,
        "proj1",
        "pa1",
        "s@x.com",
        null,
        "https://edit.url",
        true,
      );
      expect(mocks.emailService.sendSubmission).toHaveBeenCalled();
    });
    it("sends a wrong-key email and does not register the submission when the personal key is wrong", () => {
      const pa = makePa("pa1");
      const student = makeStudent("s@x.com", { personalkey: "CORRECT" });
      mocks.studentRepo.findByEmail.mockReturnValue(makeRow(student));
      service.handlePaSubmission(
        pa,
        "proj1",
        "pa1",
        "s@x.com",
        "WRONG",
        "https://edit.url",
        false,
      );
      expect(mocks.emailService.sendWrongKeyPA).toHaveBeenCalled();
      expect(mocks.studentRepo.setSubmittedPA).not.toHaveBeenCalled();
    });
    it("sends a not-registered email in domain mode when the student is not found", () => {
      mocks.studentRepo.findByEmail.mockReturnValue(null);
      service.handlePaSubmission(
        makePa("pa1"),
        "proj1",
        "pa1",
        "unknown@x.com",
        null,
        "url",
        true,
      );
      expect(mocks.emailService.sendNotRegistered).toHaveBeenCalledWith(
        "unknown@x.com",
      );
    });
    it("sends an email-not-found email in non-domain mode when the student is not found", () => {
      mocks.studentRepo.findByEmail.mockReturnValue(null);
      service.handlePaSubmission(
        makePa("pa1"),
        "proj1",
        "pa1",
        "ghost@x.com",
        "KEY",
        "url",
        false,
      );
      expect(mocks.emailService.sendEmailNotFound).toHaveBeenCalledWith(
        "ghost@x.com",
      );
    });
    it("does nothing when the student is in a different project", () => {
      const pa = makePa("pa1");
      const student = makeStudent("s@x.com", {
        projectkey: "other-proj",
        personalkey: "KEY12",
      });
      mocks.studentRepo.findByEmail.mockReturnValue(makeRow(student));
      service.handlePaSubmission(
        pa,
        "proj1",
        "pa1",
        "s@x.com",
        "KEY12",
        "url",
        false,
      );
      expect(mocks.emailService.sendSubmission).not.toHaveBeenCalled();
      expect(mocks.studentRepo.setSubmittedPA).not.toHaveBeenCalled();
    });
  });
  // ── verifyStudent ────────────────────────────────────────────────────────────
  describe("verifyStudent", () => {
    it("verifies the student and sends a success email when the key matches", () => {
      const student = makeStudent("s@x.com", {
        verified: false,
        personalkey: "MYKEY",
      });
      mocks.studentRepo.findByEmail.mockReturnValue(makeRow(student));
      service.verifyStudent("s@x.com", "MYKEY");
      expect(mocks.studentRepo.setVerified).toHaveBeenCalledWith(
        expect.anything(),
        true,
      );
      expect(mocks.emailService.sendSuccess).toHaveBeenCalledWith(student);
    });
    it("sends a wrong-key-verification email when the key does not match", () => {
      const student = makeStudent("s@x.com", {
        verified: false,
        personalkey: "CORRECT",
      });
      mocks.studentRepo.findByEmail.mockReturnValue(makeRow(student));
      service.verifyStudent("s@x.com", "WRONG");
      expect(mocks.emailService.sendWrongKeyVerification).toHaveBeenCalledWith(
        "s@x.com",
      );
      expect(mocks.studentRepo.setVerified).not.toHaveBeenCalled();
    });
    it("sends a not-found email when the student does not exist", () => {
      mocks.studentRepo.findByEmail.mockReturnValue(null);
      service.verifyStudent("nobody@x.com", "KEY12");
      expect(
        mocks.emailService.sendVerificationEmailNotFound,
      ).toHaveBeenCalledWith("nobody@x.com");
    });
    it("does nothing if the student is already verified", () => {
      const student = makeStudent("s@x.com", {
        verified: true,
        personalkey: "KEY12",
      });
      mocks.studentRepo.findByEmail.mockReturnValue(makeRow(student));
      service.verifyStudent("s@x.com", "KEY12");
      expect(mocks.studentRepo.setVerified).not.toHaveBeenCalled();
      expect(mocks.emailService.sendSuccess).not.toHaveBeenCalled();
    });
  });
  // ── registerStudent ──────────────────────────────────────────────────────────
  describe("registerStudent", () => {
    it("adds the student, verifies them, and sends a success email in domain mode", () => {
      const student = makeStudent("s@x.com", { verified: false });
      const row = makeRow(student);
      mocks.studentRepo.findByEmail.mockReturnValue(row);
      service.registerStudent(student, "https://verify.url", true);
      expect(mocks.studentRepo.add).toHaveBeenCalledWith(student);
      expect(mocks.studentRepo.setVerified).toHaveBeenCalledWith(row, true);
      expect(mocks.emailService.sendSuccess).toHaveBeenCalled();
    });
    it("adds the student and sends a confirmation email in non-domain mode", () => {
      const student = makeStudent("s@x.com", { verified: false });
      service.registerStudent(student, "https://verify.url", false);
      expect(mocks.studentRepo.add).toHaveBeenCalledWith(student);
      expect(mocks.emailService.sendConfirmation).toHaveBeenCalledWith(
        student,
        "https://verify.url",
      );
      expect(mocks.studentRepo.setVerified).not.toHaveBeenCalled();
    });
  });
});
