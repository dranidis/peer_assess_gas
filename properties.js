/*

you can also do:

  PropertiesService.getScriptProperties().deleteAllProperties()

*/
function deleteAllProperties() {
  var keys = PropertiesService.getScriptProperties().getKeys()
  for(var i =0; i< keys.length; i++) {
    var key = keys[i]
    PropertiesService.getScriptProperties().deleteProperty(key)
  }
  Logger.log(PropertiesService.getScriptProperties().getKeys())
  PropertiesService.getScriptProperties().deleteAllProperties()
}
