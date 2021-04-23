const {SiteChecker} = require('broken-link-checker');
const {SMTPClient} = require('emailjs');

let timeoutTimer;
const siteUrl = process.env["URL"];
const blacklist = process.env["IGNORE"].split(",");
const timeout = parseInt(process.env["TIMEOUT"]);
const broken = {};

function buildEmailTemplate(site, broken) {
    let html =
        '<html lang="en">Hi there,<p>I found the following broken links when scanning <a href="' + site + '">' + site + '</a>.</p><ul>';
    for (const page in broken) {
        html += '<li><a href="' + page + '">'+ page +'</a><ul>';
        for (const brokenLink of broken[page]) {
            html += '<li>'+brokenLink+'</li>';
        }
        html += '</ul></li>';
    }
    html += '</ul><p>Thanks,<br>broken-link-checker</p></html>';
    return html;
}

function email(site, broken) {
    const sender = process.env["SENDER_EMAIL"];
    const senderPassword = process.env["SENDER_PASSWORD"];
    const recipient = process.env["RECIPIENT"];

    const client = new SMTPClient({
        user: sender,
        password: senderPassword,
        host: 'smtp.gmail.com',
        ssl: true,
    });

    const htmlString = buildEmailTemplate(site, broken);

    client.send(
        {
            from: 'broken-link-checker <' + sender + '>',
            to: recipient,
            subject: 'Broken links found while parsing ' + site,
            attachment: [
                {
                    data: htmlString,
                    alternative: true
                },
            ],
        },
        (err, message) => {
            console.log(err || message);
        }
    );
}

function isBlacklisted(urlObj, blacklist) {
    let url;
    try {
        // I've seen cases of the original URL missing the protocol
        url = new URL(urlObj.original);
    } catch (e) {
        url = new URL(urlObj.resolved);
    }
    return blacklist.includes(url.host);
}

function handleLink(result, customData) {
    // todo what if the status code is 200 but it's actually a page displaying a 404 or other error?
    // todo what if the link isn't broken but is redirecting to somewhere which is not the content intended as the link?
    // todo improve blacklist performance
    console.log(result)
    if (result.broken && !isBlacklisted(result.url, customData.blacklist)) {
        const sourceUrl = result.base.original;
        const brokenLinks = broken[sourceUrl] || [];
        brokenLinks.push(result.url.original);
        broken[sourceUrl] = brokenLinks;
    }
}

function handleCheckCompletion() {
    clearTimeout(timeoutTimer);
    let msg = "Checks completed. ";
    if (Object.keys(broken).length > 0) {
        msg += "The following broke:"
        console.log(msg, broken);
        email(siteUrl, broken);
    } else {
        msg += "No broken links found.";
        console.log(msg);
    }
}

const options = {
    acceptedSchemes: ["http","https"],
    cacheExpiryTime: 3600000,
    cacheResponses: true,
    excludedKeywords: [],
    excludedSchemes: ["data","geo","javascript","mailto","sms","tel"],
    excludeInternalLinks: false,
    excludeLinksToSamePage: true,
    filterLevel: 0,
    honorRobotExclusions: true,
    rateLimit: 1,
};
const siteChecker = new SiteChecker(options, {
    link: handleLink,
    end: handleCheckCompletion,
});

console.log(`Checking site URLs. Beginning with ${siteUrl}`)
timeoutTimer = setTimeout(() => {
    console.log("Timed out when crawling.");
    process.exit(1);
}, timeout * 1000);

siteChecker.enqueue(siteUrl, {blacklist: blacklist});

if (Object.keys(broken).length > 0) {
    console.log("Broken links found. Notifying the site owner.");
}