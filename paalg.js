//  USE THIS FOR THE PEER ASSESSMENT results
/**

Calculates the PA results for each question, plus the average.
Non-submissions are treated with same grades for all students

*/
function getPAresults(formId, projectkey, self, debug) {
  // offset 2: when no google accounts are used the form contains extra  2 responses: email and personalkey  
  var offset = 2;
  if (getSettings().domain) {
    offset = 0;
  }

  var responseMap = getPAResponses_(formId)
  var questions = getQuestions();
//  Logger.log(questions);
  var students = getStudents(projectkey);

  var debugLog = function() {
    if (debug) {
      for (var i=0; i < students.length; i++) {
        var e = students[i].email;
        Logger.log("getPAresults:" + e + ":" + responseMap[e]);
      }
    }
  }
  
  debugLog();
  var penalty = []

  if (!self) {
    // dealing with non-submsissions
    for (var i=0; i < students.length; i++) {
      var e = students[i].email;
      penalty[e] = false;
      
      if (responseMap[e] == null) {
        penalty[e] = true;
        responseMap[e] = []
        for(var q = 0; q < questions.length; q++) {
          responseMap[e][offset+q]=[]
          for (var s=0; s < students.length; s++) {
            responseMap[e][offset+q][s] = 3; // for non submissions we set all grades to 3
          }
        }
      }
    } 
      
      debugLog();

    // not taking into account self assessment
    for (var i=0; i < students.length; i++) {
      var e = students[i].email;
      if (responseMap[e] != null) {
        for(var q = 0; q < questions.length; q++) {
          responseMap[e][offset+q][i] = 0;
        }
      }
    }
    
  }

  
  submitted = 0;
  // normalize values
  for (var i=0; i < students.length; i++) {
    var e = students[i].email;
    if (responseMap[e] != null) {
      submitted++;
      
      for(var q = 0; q < questions.length; q++) {
        var sum = 0.0;
        for(var s = 0; s < responseMap[e][offset+q].length; s++) {
          sum += Number(responseMap[e][offset+q][s]);
        }
        for(var s = 0; s < responseMap[e][offset+q].length; s++) {
          responseMap[e][offset+q][s] = Number(responseMap[e][offset+q][s]) / sum;
        }
      }
    }
  }
  
  var factor = students.length / submitted;
  
  debugLog();
  
  var score = []
  for (var i=0; i < students.length; i++) {
    var e = students[i].email;
    score[e] = [];
    for(var q = 0; q < questions.length; q++) {
      var sum = 0.0;
      for (var j=0; j < students.length; j++) {
        var r = students[j].email;
        if (responseMap[r] != null) {
          sum += Number(responseMap[r][offset+q][i]);
        }
      }
      score[e][q] = sum * factor;
    }
  }
  
  // calculating avg
  for (var i=0; i < students.length; i++) {
    var e = students[i].email;
    var avg = 0;
    for (q = 0; q < score[e].length; q++) {
      avg += score[e][q];
    }
    avg /= score[e].length
    // add average as first number
    score[e].unshift(avg)
    if (debug) {
      Logger.log("AVG " + avg);
      Logger.log(score[e]);
    }
  }
  return {scores:score, penalty:penalty};
}

function calculateGrade(grade, pascore, weight, penalty) {
  var adjgrade = grade * weight;
  var fixedgrade = grade - adjgrade;
  var grade = adjgrade * pascore + fixedgrade;
  grade = grade - grade * penalty;
  return grade;
}

function getPAResponses_(formId) {
  var emailresponses = getFormResponses(formId)
  var emails = emailresponses.emails;
  var responses = emailresponses.responses;
  
  var responseMap = []
  for (var i = 0; i < responses.length; i++) {
    if (emails[i] == "") {
      var email = responses[i][0].getResponse();
      Logger.log("getPAResponses_ email:" + email)
      responseMap[email] = []
      for (var j = 0; j < responses[i].length; j++) {
        responseMap[email][j] = responses[i][j].getResponse()
      }
    } else {
      var email = emails[i];
      Logger.log("getPAResponses_ email (google):" + email)
      responseMap[email] = []
      for (var j = 0; j < responses[i].length; j++) {
        responseMap[email][j] = responses[i][j].getResponse()
      }
    }
  }
  return responseMap;
}

function getFormResponses(formId) {
  var form = FormApp.openById(formId);
  var formResponses = form.getResponses();
  var responses = [];
  var emails = [];
  for (var i = 0; i < formResponses.length; i++) {
    responses[i] = []
    var formResponse = formResponses[i];
    var email = "";
    if (getSettings().domain) {
      email = formResponse.getRespondentEmail();
      Logger.log("getFormResponses Respondents email: " + email);
    }
    var itemResponses = formResponse.getItemResponses();
    for (var j = 0; j < itemResponses.length; j++) {
      responses[i][j] = itemResponses[j];
    }
    Logger.log("getFormResponses responses: " + responses[i])
    emails[i] = email;
  }
  return {emails: emails, responses: responses}
}

