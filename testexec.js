/*
used for testing the difference between two function calls
during refactoring
*/
function testFunctionDiff_(fold, fnew) {
  var old = JSON.stringify(fold());
  var newd = JSON.stringify(fnew());
  if (old != newd) {
    Logger.log("Test failed! ")
    Logger.log("\t" + fold.name + ": " + old);
    Logger.log("\t" + fnew.name + ": " + newd);
  } else {
    Logger.log("PASS:" + fold.name + ", " + fnew.name);
  }
}

function testAllFunctionDiff() {
//  testFunctionDiff_(getQuestionsOld, getQuestions);
//  testFunctionDiff_(getProjectsOld, getProjects);
//  testFunctionDiff_(getPaProjectsOld, getPaProjects);
//  testFunctionDiff_(getPAsOld, getPAs);
//  testFunctionDiff_(getSettingsOld, getSettings);
//  testFunctionDiff_(getRegistrationFormIdOld, getRegistrationFormId);
//  testFunctionDiff_(getVerificationFormIdOld, getVerificationFormId);
}




function testGetQuestions() {
  var act = getQuestions();
  for(i=0; i < act.length; i++)
      Logger.log("testGetQuestions: " + act[i]);
}

function testGetProjectkeyFromFormId() {
  Logger.log(getProjectkeyFromFormId("1z4zsCIVv7QC_3wg3TE97WQsOYwg_BHVse3Fo3SuIbFk")); 
}


function testGetPAresultsDebug() {
  getPAresults("13as2R61syxjVnbDKEj_ZUokg50K5sgHqZKBB9BRpsUM", "PROJ123", false, true)
}

function testGetPAresults() {
  var pares = getPAresults("133oN6_obERXhBW6KyuxVcMypPA_a3aba5Ypq07eSnp4", "PROJ123", false, false)
  var students = getStudents("PROJ123");

  for (var i=0; i < students.length; i++) {
    var e = students[i].email;
    Logger.log(pares.scores[e]);
  }
}

function testSort() {
  var sheet = SpreadsheetApp.getActive().getSheetByName("Students") 
  sheet.getDataRange().sort([{column: 4, ascending: true}, {column: 2, ascending: true}])
}

function testSetAcceptingResponses() { 
  var projects = getProjects();
  for(var p=0; p < projects.length; p++) {
    var form = FormApp.openById(projects[p].data.paFormId);
    form.setAcceptingResponses(true);
  }
}

function testReadArray() {
  var values = SpreadsheetApp.getActive().getSheetByName("Peer Assessments").getRange("C1").getValue();
  Logger.log(values);
  Logger.log(values.length);
}

function testTriggersInfo() {
  var triggers = ScriptApp.getProjectTriggers();
  for(var i = 0; i < triggers.length; i++) {
    Logger.log(triggers[i].getHandlerFunction());
      //ScriptApp.deleteTrigger(triggers[i])
  }
}

function testCreateDeadlineTriggers() {
  var pa = readPA(2);
  createPATriggers_(pa)
  Logger.log(pa.deadline);
}

function testReadPA() {
  var pa = readPA(2);
  Logger.log(pa);
}

function testRenameResponseSheet() {
  var sh = getFormResponseSheet_("1-P4TC2ku7WQmz-qn42oDB0p_YWkzU61aAiAehfBZPyk")
  Logger.log(sh.getName())
  //sh.setName("VERIF")
}

function testOPenPAsetTRUE() {
  openPeerAssessment(1, true);
  finishPeerAssessment(1, false);
}

function processTest() {
  var projectkey = "PROJ123"
  var questions = getQuestions();
  var students = getStudents(projectkey);
  
  for(var q=0; q < questions.length; q++) {
    for (var s=0; s < students.length; s++) {
      var string = questions[q] + " [" + students[s].fname + " " + students[s].lname + "]"
      Logger.log(string)
    }
  }
}

function testgetGroupGrade() {
  var g = getGroupGrade("pa1", "PROJ123");
  Logger.log(g);
}

function testgetPAs() {
  var pas = getPAs();
  for (var i=0; i<pas.length; i++) {
    Logger.log(pas[i].name + " " + pas[i].id + " " + pas[i].deadline);
  }
}

function testAddstudent() {
  var reg = {
      fname:   "First",
      lname: "Last", 
      email: "mail@com", 
      projectkey: "aProjKey",
      personalkey: generateUniqueKey()
    }
  addStudent(reg)
}


function execGetFormId() {
  var name = "PA PROJ123 responses"
  var sh = SpreadsheetApp.getActive().getSheetByName(name);
  var url = sh.getFormUrl();
  var form = FormApp.openByUrl(url)
  var id = form.getId();
  Logger.log(id);
}

function testsortStudents() {
  sortStudents()
}

function execgetSettings() {
  var settings = getSettings();
    var self = settings.self;
    var weight = settings.weight;
    var penalty = settings.penalty;
  Logger.log(self + " " + weight + " " + penalty);
}

function testgetPaProject() {
  var pp = getPaProject("pa1", "PROJ123") 
  Logger.log(pp.row)
  Logger.log(pp.data)
}

function testfunctionsavePeerAssessmentLinks() {
  savePeerAssessmentLinks("pa1", "PROJ123", FormApp.openById("102713RRBqfUucvudWs682-0k2FC2puLBq_-AqvYYiIc"))
}
function testGetVerURL() {
  Logger.log( link = FormApp.openById(getVerificationFormId()).getPublishedUrl());
}  

function testgetPA() {
  Logger.log(getPA("pa1"))
}

function testsetAcceptingResponsesForProjects() {
  setAcceptingResponsesForProjects("pa1", true)
}

function testcreatePATriggers() {
  createPATriggers_(getPA("pa1"))
}

function testGetProperties() {
  var keys = PropertiesService.getScriptProperties().getKeys()
  var obj = PropertiesService.getScriptProperties().getProperties()
  Logger.log(keys)
  Logger.log(obj)
}

function testaddPaProject() {
  Logger.log(addPaProject("pa2", "PROJ123"))
}

  
function testgetPaProjects() {
  var pp = getPaProjects()
  for(var i=0; i < pp.length; i++)
    Logger.log(pp[i])
}

function testSaveStudent() {
  var student = getStudent("ddtomail@gmail.com");
  Logger.log(student);
  student.data.fname = "DD";
  student.data.lname = "Tomail";
  student.data.projectkey = "PROJ123";
  student.data.personalkey = generateUniqueKey();
  student.data.verified = false;
  student.data.submitted = false;
  saveStudent(student, student.row);
}





function testgetReminderTime() {
  Logger.log(new Date("2019-06-05"));
  Logger.log(getReminderTime(new Date("2019-06-05"), 1));
  Logger.log(getReminderTime(new Date("2019-06-05"), 2));
}

function testnumStudentsSubmitted() {
  var n = numStudentsSubmitted("PROJ123", "pa1") 
  Logger.log(n)
}

