/**
 *
 * Calculates the PA results for each question, plus the average.
 * Non-submissions are treated with same grades for all students
 *
 * @param formId
 * @param projectkey
 * @param self
 * @param debug
 */
function getPAresults(formId: string, projectkey: string, self: boolean, debug: boolean) {
  // offset 2: when no google accounts are used the form contains extra  2 responses: email and personalkey
  let offset = 2;
  if (getSettings().domain) {
    offset = 0;
  }

  let responseMap = getPAResponses_(formId);
  let questions = getQuestions();
//  Logger.log(questions);
  let students = getStudents(projectkey);

  var debugLog = function() {
    if (debug) {
      for (let student of students) {
        Logger.log("getPAresults:" + student.email + ":" + responseMap[student.email]);
      }
    }
  }

  debugLog();
  var penalty = []

  if (!self) {
    // dealing with non-submsissions
    for (let i=0; i < students.length; i++) {
      let e = students[i].email;
      penalty[e] = false;

      if (responseMap[e] == null) {
        penalty[e] = true;
        responseMap[e] = []
        for(let q = 0; q < questions.length; q++) {
          responseMap[e][offset+q]=[]
          for (let s=0; s < students.length; s++) {
            responseMap[e][offset+q][s] = 3; // for non submissions we set all grades to 3
          }
        }
      }
    }

      debugLog();

    // not taking into account self assessment
    for (let i=0; i < students.length; i++) {
      let e = students[i].email;
      if (responseMap[e] != null) {
        for(let q = 0; q < questions.length; q++) {
          responseMap[e][offset+q][i] = 0;
        }
      }
    }

  }


  let submitted = 0;
  // normalize values
  for (let i=0; i < students.length; i++) {
    let e = students[i].email;
    if (responseMap[e] != null) {
      submitted++;

      for(let q = 0; q < questions.length; q++) {
        let sum = 0.0;
        for(let s = 0; s < responseMap[e][offset+q].length; s++) {
          sum += Number(responseMap[e][offset+q][s]);
        }
        for(let s = 0; s < responseMap[e][offset+q].length; s++) {
          responseMap[e][offset+q][s] = Number(responseMap[e][offset+q][s]) / sum;
        }
      }
    }
  }

  let factor = students.length / submitted;

  debugLog();

  let score = []
  for (let i=0; i < students.length; i++) {
    let e = students[i].email;
    score[e] = [];
    for(let q = 0; q < questions.length; q++) {
      let sum = 0.0;
      for (let j=0; j < students.length; j++) {
        let r = students[j].email;
        if (responseMap[r] != null) {
          sum += Number(responseMap[r][offset+q][i]);
        }
      }
      score[e][q] = sum * factor;
    }
  }

  // calculating avg
  for (let i=0; i < students.length; i++) {
    let e = students[i].email;
    let avg = 0;
    for (let q = 0; q < score[e].length; q++) {
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

/**
 * Returns the final adjusted grade
 * taking under consideration the pa score
 * the weight percentage and the penalty.
 *
 * @param grade
 * @param pascore
 * @param weight
 * @param penalty
 */
function calculateGrade(grade: number, pascore: number, weight: number, penalty: number) {
  let adjgrade = grade * weight;
  let fixedgrade = grade - adjgrade;
  let pagrade = adjgrade * pascore + fixedgrade;
  pagrade = pagrade - pagrade * penalty;
  return pagrade;
}

function getPAResponses_(formId) {
  let emailresponses = getFormResponses(formId)
  let emails = emailresponses.emails;
  let responses = emailresponses.responses;

  let responseMap = [];
  for (let i = 0; i < responses.length; i++) {
    if (emails[i] == "") {
      let email: string = responses[i][0].getResponse();
      Logger.log("getPAResponses_ email:" + email);
      responseMap[email] = [];
      for (let j = 0; j < responses[i].length; j++) {
        responseMap[email][j] = responses[i][j].getResponse();
      }
    } else {
      let email = emails[i];
      Logger.log("getPAResponses_ email (google):" + email);
      responseMap[email] = [];
      for (let j = 0; j < responses[i].length; j++) {
        responseMap[email][j] = responses[i][j].getResponse();
      }
    }
  }
  return responseMap;
}

function getFormResponses(formId): {emails: string[], responses: any[][]} {
  let form = FormApp.openById(formId);
  let formResponses = form.getResponses();
  let responses = [];
  let emails = [];
  for (let i = 0; i < formResponses.length; i++) {
    responses[i] = []
    let formResponse = formResponses[i];
    let email = "";
    if (getSettings().domain) {
      email = formResponse.getRespondentEmail();
      Logger.log("getFormResponses Respondents email: " + email);
    }
    let itemResponses = formResponse.getItemResponses();
    for (let j = 0; j < itemResponses.length; j++) {
      responses[i][j] = itemResponses[j];
    }
    Logger.log("getFormResponses responses: " + responses[i])
    emails[i] = email;
  }
  return {emails: emails, responses: responses}
}

