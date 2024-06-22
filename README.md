# peer_assess_gas

This is a peer assessment tool written in Google App Script. The aim of the tool is to allows differentiation of student's grades in a group assignment.
The script uses the WebPA algorithm for adjusting the group grade to individual
student grades depending on their assessment of their peers in a provided set of questions.

The script utilizes:

-   Google Forms for all students' inputs,
-   Google Spreadsheets for storage and operation by the lecturer, and
-   Gmail for sending reminders to students.

## How to install the script to a new Google spreadsheet

**Prerequisite:** clasp https://developers.google.com/apps-script/guides/clasp

Time to complete: 5-15 minutes.

1.  Clone the script project in a local folder. (Alternatively download the zip file and uncompress it)

    ```
    git clone https://github.com/dranidis/peer_assess_gas.git
    ```

1.  Create a new Google spreadsheet and

    - Select **Extensions-> Apps Script**.

    - On the Apps Script window that appears, hover on the settings wheel at the left toolbar and select **Project settings**.

    - Copy the Script ID.

1.  Locally, inside the directory where you have the script project, create a **.clasp.json** file with the following content:

    ```
    {"scriptId":"xxxxxxxxxxxxxxxx"}
    ```

    In the place of the x's paste the new Script ID and save the file as **.clasp.json**.

1.  In a terminal execute:

        ```
        clasp login
        ```

        A window will appear in the browser: Choose a google account to continue to clasp.

    Choose the account and click "Allow". Then "Logged in! You may close this page." will appear. Close the browser window.

1.  Enable for your account the Apps Script API by visiting
    https://script.google.com/home/usersettings.
    Click on Off and enable it to On. (This might already be enabled if you used scripts in the past)

1.  Execute:

    ```
    clasp push -f
    ```

    This copies all local files to script.google.com.

1.  Refresh the google spreadsheet.

    - A new menu "PA" will appear and a message for the start of the installation. **Click OK**.

    - The installation will create several sheets in the spreadsheets.

    - Wait for the message **"Installation is complete"**.

        - At some point, a browser window may appear **Authorization Required**. Click **Continue**. Choose your account and click **Allow**.

    **_IMPORTANT:_**

    If the message "Installation is complete" does not appear, refresh the Google spreadsheet page and click OK for the above installation procedure to repeat. _(Google scripts have a timeout of about 30 seconds. Reloading the page will allow the installation to continue and complete)_.

## Quickstart for peer assessment

### Student registration with Domain emails

1. Go to the **Projects** spreadsheet and enter projects information. Enter one row per team: the team's name and a unique key (e.g. `Student project` and `p1`).

2. Select **PA -> Install -> Install Registration & Verification form**

3. Select **PA -> Links -> Registration URL** and copy the URL.

4. Send the URL to students so that they register for peer assessment.

### Peer assessment

Once all students registered (check **Students** spreadsheet) you can initiate the peer assessment:

1. Examine and change (edit, delete, add more) the questions for the peer assessment (in the **Questions** spreadsheet).

2. Create a row int the **Peer Assessments** spreadsheet, e.g. Name: 'Iteration 1', Key: iter1, DEADLINE: 2023-03-12 (see help for more information)

3. Select **PA -> Peer Assessments -> Open**. Students will receive an email with the link to the peer assessment form.

You can check who filled the peer assessment by checking int the **Students** spreadsheet the column with the peer assessment key.

The system will send some reminders as specified in the **Settings** spreadsheet. Extra reminders can be sent by selecting **PA -> emails -> Send reminder to those who did not submit the peer assessment**

The peer asssessment will close automatically.

### Calculating grades

1. Open the **PAs Projects** spreadsheet and enter the group grade.

2. Select **PA -> Peer Assessments -> Calculate** to see the peer assessment results.

## Help

More info about using the Peer Assessment can be found in the help file: **PA -> Help**.

## Note

For groups of 2 students you need to set the setting **PA self-assessment calculated** to true in order to get differentiated results.
