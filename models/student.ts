interface Student {
  fname: string,
  lname: string,
  email: string,
  projectkey: string,
  personalkey: string,
  verified: boolean,
  submittedpa: {[key:string]: boolean}
}