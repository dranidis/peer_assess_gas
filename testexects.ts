function testNames() {
  let students = getAllStudents();
  let studentNames: string[] = students.map(s => s.fname + " " + s.lname);
  Logger.log(studentNames);
}