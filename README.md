# peer_assess_gas
A peer assessment tool written in Google App Script

## How to install the script to a new Google spreadsheet

**Prerequisite:** clasp https://developers.google.com/apps-script/guides/clasp

Clone the script project in a local folder.
```
git clone https://github.com/dranidis/peer_assess_gas.git
```

Create a new Google spreadsheet and click Tools-> Script editor

On the script editor window click File -> Project properties. 
Enter a name for the script when asked. 
Then copy the Script ID. Click Save.

Locally, go to the directory where you have the script project. Create a .clasp.json file and edit it:

```
{"scriptId":"xxxxxxxxxxxxxxxx"}
```

Paste the new Script ID and execute:


```
clasp login
```


A window will appear at the browser: Choose an account to continue to clasp.
Choose the account and click "allow". Then "Logged in! You may close this page." will appear.

If you have not already done so, enable for your account
the Apps Script API by visiting 
https://script.google.com/home/usersettings 
Click on Off and enable it to On.

Execute:
```
clasp push
```

Go to the Sheet script page.
Refresh if necessary the script editor window.

Refresh the google spreadsheet

A new menu will appear "PA"

The script is ready to be used.

## QUICKSTART FOR PEER ASSESSMENT

Select PA -> Install -> Install all sheets

A browser window will appear Authorization Required. Click Continue.
Choose your account and click Allow.

The script will execute and several spreadsheets will be created.

Go to Settings spreadsheet and set the Google Domain setting.
If students are going to use domain emails leave it to TRUE.
If students are going to use emails outside the domain set it to FALSE.

Select PA -> Install -> Install Registration and Verification 

Enter project information (see help)
Enter students (see help)
Enter the questions for the peer assessment.

If not-domain emails are used:
    Click PA -> e-Mails -> Send emails to those who did not verify the account
    Students will receive an email and they will have to verify their accounts.

In the settings set the email reminders before the deadline.

Create the peer assessment (see help) and PA -> Open.
and send email to those who did not fill it (see help).

The peer asssessment will close automatically. At any time you can click PA -> Calculate to see the peer assessment results.

More info can be found in the help file: PA -> Help.