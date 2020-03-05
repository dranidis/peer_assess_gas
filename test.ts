/**
 * to run the tests first
 * execute PA -> Install -> Install sheets
 * and PA -> Install ->
 */

/**
 * uncomment the following lines to enable testing for development.
 *
 * The lines are commented to allow menu installation easily for users.
 */
// if ((typeof GasTap) === 'undefined') { // GasT Initialization. (only if not initialized yet.)
//   let cs = CacheService.getScriptCache().get('gast');
//   if (!cs) {
//     cs = UrlFetchApp.fetch('https://raw.githubusercontent.com/zixia/gast/master/src/gas-tap-lib.js').getContentText();
//     CacheService.getScriptCache().put('gast', cs, 21600);
//   }
//   eval(cs);
// } // Class GasTap is ready for use now!

// let test = new GasTap();

/**
 * IMPORTANT:
 *
 * SET TO TRUE for executing e2e tests
 * REMEMBER to reset to false afterwards!!
 */
let testMode: boolean = false;
/**
 *
 *
 *
 */


function gastTestRunner() {
  testgetProjects();
  testGetGroup();
  testIsProjectkey();
  testGetProjectKeys();
  testGetStudents();
  testGetStudent();
  testCalculateGrade();
  testNotVerifiedStudents();
  testFillWithUnderScore();
  testState();
  testGetPaProjects();
  testGetQuestions();
  testGetSettings();
  testGetLinks();
  test.finish();
}

let testStudents: Student[] = [
  {
    fname: 'Dimitris',
    lname: 'Dranidis',
    email: 'dranidis@gmail.com',
    projectkey: 'PROJ123',
    personalkey: 'aaaaa',
    verified: true,
    submittedpa: {}
  },
  {
    fname: 'DD',
    lname: 'Tomail',
    email: 'ddtomail@gmail.com',
    projectkey: 'PROJ456',
    personalkey: '',
    verified: false,
    submittedpa: {}
  },
  {
    fname: 'Dimi',
    lname: 'Dran',
    email: 'dranidis@citycollege.sheffield.eu',
    projectkey: 'PROJ123',
    personalkey: '',
    verified: false,
    submittedpa: {}
  }
];

let testProjects: Project[] = [
  {
    name: 'Project1',
    key: 'PROJ123',
  },
  {
    name: 'Project2',
    key: 'PROJ456',
  },
  {
    name: 'Project3',
    key: 'PROJ789',
  }
];

let testPAs: PeerAssessment[] = [
  {
    name: "Peer Assessment 1",
    id: "PA1",
    deadline: new Date((new Date()).getTime() + 15 * my_MILLIS_PER_MINUTE),
    state: PaState.INACTIVE
  }
]

function preSetupPA() {
  let ss = SpreadsheetApp.getActive().getSheetByName(PAS.sheet);
  ss.getDataRange().offset(1, 0).clearContent();

  for (let i = 0; i < testPAs.length; i++)
    addPa(testPAs[i]);
}

function preSetupStudents_() {
  let ss = SpreadsheetApp.getActive().getSheetByName(STUDENTS.sheet);
  ss.getDataRange().offset(1, 0).clearContent();

  for (let i = 0; i < testStudents.length; i++)
    addStudent(testStudents[i]);
}

function preSetupProjects_() {
  let ss = SpreadsheetApp.getActive().getSheetByName(PROJECTS.sheet);
  ss.getDataRange().offset(1, 0).clearContent();

  for (let project of testProjects)
    addProject(project);
}

function testgetProjects() {
  preSetupProjects_();

  test('getProjects', function (t) {
    let act = getProjects();
    t.equal(act.length, testProjects.length, 'number is right')
    for (let i = 0; i < act.length; i++) {
      t.equal(act[i].data.name, testProjects[i].name, 'getProjects name' + i);
      t.equal(act[i].data.key, testProjects[i].key, 'getProjects key' + i);
    }
  });
}

function testGetProjectKeys() {
  preSetupProjects_();

  test('testGetProjectKeys', function (t) {
    let act = getProjectKeys();
    t.equal(act.length, testProjects.length, 'length');

    for (let i = 0; i < act.length; i++) {
      t.equal(act[i], testProjects[i].key, 'key' + i);
    }
  });
}

function testIsProjectkey() {
  preSetupProjects_();

  test('isProjectkey', function (t) {
    let isKey = isProjectkey(testProjects[0].key);
    t.ok(isKey, 'isProjectkey')
  });

  test('isProjectkey', function (t) {
    let isKey = isProjectkey("projX");
    t.notOk(isKey, 'not isProjectkey')
  });
}

function testGetGroup() {
  preSetupStudents_();

  test('getGroup', function (t) {
    let group = getGroup(testStudents[0].email);
    t.equal(group, testStudents[0].projectkey, 'getGroup first row')
  });

  test('getGroup', function (t) {
    let group = getGroup("whos@citycollege.sheffield.eu");
    t.equal(group, null, 'getGroup not existing')
  });
}

function testGetStudents() {
  preSetupStudents_();

  test('getStudents', function (t) {
    let act = getStudents(testStudents[0].projectkey);
    t.equal(act[0].email, testStudents[0].email, 'getStudents 0')
    t.equal(act[1].email, testStudents[2].email, 'getStudents 2')
  });
}

function testGetStudent() {
  preSetupStudents_();

  test('getStudent', function (t) {
    let act = getStudent(testStudents[2].email);
    Logger.log(act);
    t.equal(act.data.email, testStudents[2].email, 'getStudent');
  });

  test('getStudent', function (t) {
    let act = getStudent("some@gmail.com");
    t.equal(act, null, 'getStudent null');
  });
}

function testCalculateGrade() {
  test('calculateGrade', function (t) {
    let grade = calculateGrade(80, 0.41, .5, .1)
    t.equal(grade, 50.76, 'calculateGrade a');
    grade = calculateGrade(70, 1.05, .7, .2)
    t.equal(grade, 57.96, 'calculateGrade b');
  });
}

function testFillWithUnderScore() {

  test('fillWithUnderScore', function (t) {
    let filled = fillWithUnderScore('name', 10);
    t.equal(filled, 'name______', 'filled with 6 _');

    filled = fillWithUnderScore('name', 4);
    t.equal(filled, 'name', 'filled with 0 _');

    filled = fillWithUnderScore('name', 3);
    t.equal(filled, 'name', 'filled with 0 _');

  });
}

function testState() {

  test('state enum', function (t) {
    t.equal(PaState.OPEN, 'OPEN', 'OPEN');
  });
}

function testNotVerifiedStudents() {
  preSetupProjects_();
  preSetupStudents_();

  let projs = getProjects();
  let notVstuds = notVerifiedStudents();

  test('allProjects', function (t) {
    t.equal(projs.length, 3, '3 projects');
    t.equal(projs[0].data.name, 'Project1');
    t.equal(projs[1].data.name, 'Project2');
    t.equal(projs[2].data.name, 'Project3');
  });

  test('notVerifiedStudents', function (t) {
    t.equal(notVstuds.length, 2, '2 not verified');
    t.equal(notVstuds[0].lname, 'Dran');
    t.equal(notVstuds[1].lname, 'Tomail');
  });

}

function testGetQuestions() {
  let questions = getQuestions();
  test('getQuestions', function (t) {
    t.equal(questions.length, 12, '12 questions');
  });
}

function testGetSettings() {
  let settings = getSettings();
  test('getSettings', function (t) {
    t.equal(settings.weight, 0.6);
    t.equal(settings.penalty, 0.2);
    t.equal(settings.self, false);
    t.equal(settings.reminder1, 24);
    t.equal(settings.reminder2, 6);
    t.equal(settings.timeunit, 'hour');
    t.equal(settings.mailpa, true);
    t.equal(settings.mailgrade, true);
    t.equal(settings.domain, false);
  });
}

function testGetLinks() {
  let links = getLinks();
  test('getLinks', function (t) {
    t.ok(links.Registration);
    t.ok(links.Verification);
  });
}
}

/**
 * e2e test
 */
function testOpenPA() {

  preSetupProjects_();
  preSetupStudents_();
  preSetupPA();

  deletePASheets();

  let pas = getPAs();
  openPA(pas[0]);

  let updatedPa = getPA(pas[0].id);

  test('peer assesment', function (t) {
    t.equal(updatedPa.state, PaState.OPEN, 'is opened');
  });

  testGetPaProjects();
}

function testGetPaProjects() {
  let paProjects = getPaProjects();
  test('pa projects', function (t) {
    t.equal(paProjects.length, 1, ' on pa project');
    t.equal(paProjects[0].data.pakey, getPAs()[0].id, 'pa key is correct');
    t.equal(paProjects[0].data.projectkey, testProjects[0].key, 'project key is correct');
    t.ok(paProjects[0].data.formId, 'there is a form id');
  }

}