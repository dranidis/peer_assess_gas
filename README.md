# peer_assess_gas
A peer assessment tool written in Google App Script

## How to install to a new Google spreadsheet

**Prerequisite:** clasp https://developers.google.com/apps-script/guides/clasp

Create a new Google spreadsheet and click Tools-> Script editor

On the script editor window click File -> Project properties. 
Enter a name for the script when asked. 
Then copy the Script ID. Click Save.

Locally, go to the directory where you have the script project. Create a .clasp.json file and edit it:

```
{"scriptId":"xxxxxxxxxxxxxxxx"}
```

Paste the new Script ID.


```
clasp login
```


A window will appear at the browser: Choose an account to continue to clasp.
Choose the account and click "allow". Then "Logged in! You may close this page." will appear.

If you have not already done so, enable for your account
the Apps Script API by visiting 
https://script.google.com/home/usersettings 
Click on Off and enable it to On.


```
clasp push
```

Go to the Sheet script page.
Refresh if necessary the script editor window.

Refresh the google spreadsheet

A new menu will appear "PA"

The script is ready to be used.