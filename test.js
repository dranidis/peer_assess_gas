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
  test('calculation', function (t) {
    var i = 3 + 4
    t.equal(i, 7, 'calc 3 + 4 = 7 right')
  })

  test('number convertion', function (t) {
    var i = parseInt('0e0', 16)
    t.equal(i, 224, 'parseInt')
  })

  test('toLowerCase', function (t) {
    var email = "SomeEmail@gmail.COM".toLowerCase();
    t.equal(email, "someemail@gmail.com", 'tolower')

  })

  testGetGroup()


  test.finish()
}

function testGetGroup() {
  addStudent({
    fname: 'Dimitris',
    lname: 'Dranidis',
    email: 'dranidis@gmail.com',
    projectkey: 'PROJ123',
    personalkey: '',
    verified: '',
  }) 

  test('getGroup', function (t) {
    var group = getGroup("dranidis@gmail.com");
    t.equal(group, "PROJ123", 'getGroup')

  })

  // TODO: remove the student after the test

}

