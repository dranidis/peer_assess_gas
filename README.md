# peer_assess_gas
A peer assessment tool written in Google App Script. The aim of the tool is to allows differentiation of student's grages in a group assigment. 
The script uses the WebPA algorithm for adjusting the group grade to individual
student grades depending on their assessment of their peers in a provided set of questions.

The script utilizes:
* Google Forms for all students' inputs, 
* Google Spreadsheets for storage and operation by the lecturer, and 
* Gmail for sending reminders to students. 

## How to install the script to a new Google spreadsheet

**Prerequisite:** clasp https://developers.google.com/apps-script/guides/clasp

Time to complete: 5-15 minutes.

1. Create a new Google spreadsheet and 

    * click **Extensions -> Apps Script**. 

    * On the script editor window that appeared, click on the left of the page on **Project Settings**. 
    
    * Copy the Script ID.

1. Clone the script project in a local folder.
    ```
    git clone https://github.com/dranidis/peer_assess_gas.git
    ```

1. Locally, inside the directory where you have the script project, create a **.clasp.json** file with the following content. 

    ```
    {"scriptId":"xxxxxxxxxxxxxxxx"}
    ```

    In the place of the x's paste the new Script ID and save the file as **.clasp.json**.

1. Execute:

    ```
    clasp login
    ```


    A window will appear in the browser: Choose a google account to continue to clasp.
Choose the account and click "Allow". Then "Logged in! You may close this page." will appear. Close the browser window.

1. Enable for your account the Apps Script API by visiting 
https://script.google.com/home/usersettings. 
Click on Off and enable it to On. (This might already be enabled if you used scripts in the past)

1. Execute:
    ```
    clasp push -f
    ```

    This copies all local files to script.google.com.

1. Refresh the google spreadsheet. 
    * A new menu "PA" will appear and a message for the start of the installation. **Click OK**. 
    
    * The installation will create several sheets in the spreadsheets.
    
    * Wait for the message **"Installation is complete"**. 


        * At some point, a browser window may appear **Authorization Required**. Click **Continue**. Choose your account and click **Allow**. 

    ***IMPORTANT:***

    If the message "Installation is complete" does not appear, refresh the Google spreadsheet page and click OK for the above installation procedure to repeat. *(Google scripts have a timeout of about 30 seconds. Reloading the page will allow the installation to continue and complete)*.


## QUICKSTART FOR PEER ASSESSMENT

1. Go to the **Settings** spreadsheet and set the **Google Domain emails** setting.

    * If students are going to use google domain emails leave the value to TRUE.

    * If students are going to use emails outside a google domain set the value to FALSE.

2. Select **PA -> Install -> Install Registration & Verification form** 

3. Go to the **Projects** spreadsheet and enter projects information. Enter one row  per team: the team's name and a unique key (see help).
4. Enter students (see help).
5. Enter the questions for the peer assessment (see help).

If not-domain emails are used:
    Click PA -> e-Mails -> Send emails to those who did not verify the account
    Students will receive an email and they will have to verify their accounts.

In the settings set the email reminders before the deadline.

Create the peer assessment (see help) and PA -> Open.
and send email to those who did not fill it (see help).

The peer asssessment will close automatically. At any time you can click PA -> Calculate to see the peer assessment results.

More info can be found in the help file: **PA -> Help**.      

* At some point, a browser window may appear **Authorization Required**. Click **Continue**. Choose your account and click **Allow**. 
