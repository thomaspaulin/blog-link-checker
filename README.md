# blog-link-checker
Uses [broken-link-checker](https://github.com/stevenvachon/broken-link-checker) to check for dead links, and then emails a report using [emailjs via Gmail](https://www.npmjs.com/package/emailjs).

## Running
1. Install Node.js
2. Run `npm install` and `npm link`
3. Run `./link-checker` following the usage instructions. If you wish to provide values as environment variables instead you may use the following:
    - `URL` - the website to crawl for broken links (robots.txt is honoured)
    - `IGNORE` - a comma separated lists of hosts considered reliable. These hosts will be ignored and not checked.
    - `TIMEOUT` - the crawler timeout in seconds
    - `SENDER_EMAIL` - The Gmail email address to send the report from
    - `SENDER_PASSWORD` - The password of the Gmail account sending the email. Use App passwords if you have them.
    - `RECIPIENT` - The recipient of the report
