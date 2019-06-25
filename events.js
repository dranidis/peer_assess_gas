var my_MILLIS_PER_DAY = 1000 * 60 * 60 * 24;
var my_MILLIS_PER_HOUR = 1000 * 60 * 60;
var my_MILLIS_PER_MINUTE = 1000 * 60;

function getReminderTime(deadline, reminderIndex) {
  const settings = getSettings();
  const x = settings['reminder' + reminderIndex];

  var unit = null;
  switch (settings.timeunit) {
    case 'min':
      unit = my_MILLIS_PER_MINUTE;
      break;
    case 'hour':
      unit = my_MILLIS_PER_HOUR;
      break;
    case 'day':
      unit = my_MILLIS_PER_DAY;
      break;
    default:
      Logger.log("getReminderTime: Unknown timeunit in settings. Using day as unit")
      unit = my_MILLIS_PER_DAY;
  }

  return new Date(deadline.getTime() - x * unit);
}

/*
https://stackoverflow.com/questions/32697653/how-can-i-pass-a-parameter-to-a-time-based-google-app-script-trigger
*/

var RECURRING_KEY = "recurring";
var ARGUMENTS_KEY = "arguments";

/**
 * Sets up the arguments for the given trigger.
 *
 * @param {Trigger} trigger - The trigger for which the arguments are set up
 * @param {*} functionArguments - The arguments which should be stored for the function call
 * @param {boolean} recurring - Whether the trigger is recurring; if not the 
 *   arguments and the trigger are removed once it called the function
 */
function setupTriggerArguments(trigger, functionArguments, recurring) {
  var triggerUid = trigger.getUniqueId();
  var triggerData = {};
  triggerData[RECURRING_KEY] = recurring;
  triggerData[ARGUMENTS_KEY] = functionArguments;

  PropertiesService.getScriptProperties().setProperty(triggerUid, JSON.stringify(triggerData));
}

/**
 * Function which should be called when a trigger runs a function. Returns the stored arguments 
 * and deletes the properties entry and trigger if it is not recurring.
 *
 * @param {string} triggerUid - The trigger id
 * @return {*} - The arguments stored for this trigger
 */
function handleTriggered(triggerUid) {
  var scriptProperties = PropertiesService.getScriptProperties();
  var triggerData = JSON.parse(scriptProperties.getProperty(triggerUid));

  if (!triggerData[RECURRING_KEY]) {
    deleteTriggerByUid(triggerUid);
  }

  return triggerData[ARGUMENTS_KEY];
}

/**
 * Deletes trigger arguments of the trigger with the given id.
 *
 * @param {string} triggerUid - The trigger id
 */
function deleteTriggerArguments(triggerUid) {
  PropertiesService.getScriptProperties().deleteProperty(triggerUid);
}

/**
 * Deletes a trigger with the given id and its arguments.
 * When no project trigger with the id was found only an error is 
 * logged and the function continues trying to delete the arguments.
 * 
 * @param {string} triggerUid - The trigger id
 */
function deleteTriggerByUid(triggerUid) {
  if (!ScriptApp.getProjectTriggers().some(function (trigger) {
    if (trigger.getUniqueId() === triggerUid) {
      ScriptApp.deleteTrigger(trigger);
      return true;
    }

    return false;
  })) {
    console.error("Could not find trigger with id '%s'", triggerUid);
  }

  deleteTriggerArguments(triggerUid);
}

/**
 * Deletes a trigger and its arguments.
 * 
 * @param {Trigger} trigger - The trigger
 */
function deleteTrigger(trigger) {
  ScriptApp.deleteTrigger(trigger);
  deleteTriggerArguments(trigger.getUniqueId());
}

function example() {
  var trigger = ScriptApp.newTrigger("exampleTriggerFunction").timeBased()
    .after(5 * 1000)
    .create();

  setupTriggerArguments(trigger, ["a", "b", "c"], false);
}

function exampleTriggerFunction(event) {
  var functionArguments = handleTriggered(event.triggerUid);
  console.info("Function arguments: %s", functionArguments);
}