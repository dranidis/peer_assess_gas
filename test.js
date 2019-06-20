/**
 * to run the tests first
 * execute PA -> Install -> Install sheets
 * and PA -> Install -> 
 */

if ((typeof GasTap) === 'undefined') { // GasT Initialization. (only if not initialized yet.)
  var cs = CacheService.getScriptCache().get('gast');
  if (!cs) {
    cs = UrlFetchApp.fetch('https://raw.githubusercontent.com/zixia/gast/master/src/gas-tap-lib.js').getContentText();
    CacheService.getScriptCache().put('gast', cs, 21600);
  }
  eval(cs);
} // Class GasTap is ready for use now!

var test = new GasTap()

function gastTestRunner() {
  testgetProjects();
  testGetGroup();
  testIsProjectkey();
  testGetStudents();
  testGetStudent();
  testCalculateGrade();
  test.finish();
}

var testStudents = [
  {
    fname: 'Dimitris',
    lname: 'Dranidis',
    email: 'dranidis@gmail.com',
    projectkey: 'PROJ123',
    personalkey: '',
    verified: '',
  },
  {
    fname: 'Some',
    lname: 'Else',
    email: 'else@citycollege.sheffield.eu',
    projectkey: 'PROJ456',
    personalkey: '',
    verified: '',
  },
  {
    fname: 'Dimi',
    lname: 'Dran',
    email: 'dranidis@citycollege.sheffield.eu',
    projectkey: 'PROJ123',
    personalkey: '',
    verified: '',
  }
];

var testProjects = [
  {
    name: 'Project1',
    key: 'PROJ123',
  },
  {
    name: 'Project2',
    key: 'proj2',
  },
  {
    name: 'Project3',
    key: 'proj3',
  }
];

function preSetupStudents_() {
  var ss = SpreadsheetApp.getActive().getSheetByName(STUDENTS.sheet);
  ss.getDataRange().offset(1, 0).clearContent();

  for (var i = 0; i < testStudents.length; i++)
    addStudent(testStudents[i]);
}

function preSetupProjects_() {
  var ss = SpreadsheetApp.getActive().getSheetByName(PROJECTS.sheet);
  ss.getDataRange().offset(1, 0).clearContent();

  for (var i = 0; i < testProjects.length; i++)
    addProject(testProjects[i]);
}

function testgetProjects() {
  preSetupProjects_();

  test('getProjects', function (t) {
    var act = getProjects();
    for (i = 0; i < act.length; i++) {
      t.equal(act[i].data.name, testProjects[i].name, 'getProjects name' + i);
      t.equal(act[i].data.key, testProjects[i].key, 'getProjects key' + i);
    }
  });
}

function testIsProjectkey() {
  preSetupProjects_();

  test('isProjectkey', function (t) {
    var isKey = isProjectkey("PROJ123");
    t.ok(isKey, 'isProjectkey')
  });

  test('isProjectkey', function (t) {
    var isKey = isProjectkey("projX");
    t.notOk(isKey, 'not isProjectkey')
  });
}

function testGetGroup() {
  preSetupStudents_();

  test('getGroup', function (t) {
    var group = getGroup("dranidis@gmail.com");
    t.equal(group, "PROJ123", 'getGroup first row')
  });

  test('getGroup', function (t) {
    var group = getGroup("dranidis@citycollege.sheffield.eu");
    t.equal(group, "PROJ123", 'getGroup last row')
  });

  test('getGroup', function (t) {
    var group = getGroup("whos@citycollege.sheffield.eu");
    t.equal(group, null, 'getGroup not existing')
  });
}

function testGetStudents() {
  preSetupStudents_();

  test('getStudents', function (t) {
    var act = getStudents("PROJ123");
    t.equal(act[0].email, testStudents[0].email, 'getStudents 0')
    t.equal(act[1].email, testStudents[2].email, 'getStudents 2')
  });
}

function testGetStudent() {
  preSetupStudents_();

  test('getStudent', function (t) {
    var act = getStudent(testStudents[2].email);
    Logger.log(act);
    t.equal(act.data.email, testStudents[2].email, 'getStudent');
  });

  test('getStudent', function (t) {
    var act = getStudent("some@gmail.com");
    t.equal(act, null, 'getStudent null');
  });
}

function testCalculateGrade() {
  test('calculateGrade', function (t) {
    var grade = calculateGrade(80, 0.41, .5, .1)
    t.equal(grade, 50.76, 'calculateGrade a');
    var grade = calculateGrade(70, 1.05, .7, .2)
    t.equal(grade, 57.96, 'calculateGrade b');
  });
}

