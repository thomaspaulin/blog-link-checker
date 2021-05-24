#!/usr/bin/env ts-node
import brokenLinkChecker from 'broken-link-checker';
const {SiteChecker} = brokenLinkChecker;
import argParser from "args-parser";

import { SenderDetails, email } from "./email";
import {CheckerReport, PageReport} from "./reports";


export interface CustomData {
    blacklist: string[];
    ignorableLinks: string[];
    report: CheckerReport;
    pageReports: Map<string, PageReport>;
}

function isBlacklisted(host: string, blacklist: string[]) {
    return blacklist.includes(host);
}

function isIgnorable(url: string, ignorableList: string[]) {
    return ignorableList.includes(url);
}

export function handleLink(result: any, customData: CustomData) {
    // todo what if the status code is 200 but it's actually a page displaying a 404 or other error?
    // todo what if the link isn't broken but is redirecting to somewhere which is not the content intended as the link?
    // todo improve blacklist performance - we are currently rate limited by the wait between websites though

    const sourceUrl = result.base.original;
    const linkUrl = result.url.original;

    let pageReport = customData.pageReports.get(sourceUrl);
    if (!pageReport) {
        pageReport = new PageReport(sourceUrl);
    }

    pageReport.reportChecked(linkUrl);
    const blacklisted = isBlacklisted(result.url.parsed.host, customData.blacklist);
    const ignored = isIgnorable(linkUrl, customData.ignorableLinks);

    if (blacklisted) {
        // we're considering this host reliable, don't even consider checking it
        pageReport.reportBlacklisted(linkUrl);
    } else if (result.broken && !blacklisted && ignored) {
        // e.g., a link which has broken in the past but we decided not to address for any number of reasons
        pageReport.reportIgnored(linkUrl);
    } else if (result.broken && !blacklisted) {
        // a broken link worth reporting
        pageReport.reportBroken(linkUrl, result.html.text, result.brokenReason);
    }

    customData.pageReports.set(sourceUrl, pageReport);
}

function handlePage(error: any, pageUrl: string, customData: CustomData) {
    if (!error) {
        const pageReport = customData.pageReports.get(pageUrl);
        if (pageReport) {
            customData.report.savePageReport(pageReport);
        }
    } else {
        console.error(error);
    }
}

function printUsage() {
    console.log(`Usage: link-checker --url=<url> --reliable_hosts=<host1>,<host2> --ignore=<url1>,<url2> --timeout=600 --sender_email=<sender@example.com> --sender_password=<password> --recipient=<recipient@example.com>
    --url               URL of the site to crawl for links.
    --reliable_hosts    A comma separated list of hosts considered reliable. Don't check these links.
    --ignore            A comma separated list of links than can be ignored. One use case would be to suppress false positives.
    --timeout           The timeout of the crawler in seconds.
    --sender_email      The Gmail account sending the report.
    --sender_password   The password of the Gmail account sending the report.
    --recipient         The Gmail account receiving the report.
    
    You may prefer to provide these values through environment variables of the same name (but in upper case).`);
    process.exit(1);
}

function main() {
    const args = argParser(process.argv);

    const siteUrl = args.url || process.env["URL"];
    const blacklist = (args.reliable_hosts || process.env["RELIABLE_HOSTS"] || "").split(",");
    const ignoreList = (args.ignore || process.env["IGNORE"] || "").split(",");
    const timeout = args.timeout || parseInt(process.env["TIMEOUT"] || "600");
    const sender = args.sender_email || process.env["SENDER_EMAIL"];
    const senderPassword = args.sender_password || process.env["SENDER_PASSWORD"];
    const recipient = args.recipient || process.env["RECIPIENT"];

    if (!siteUrl || !sender || !senderPassword || !recipient) {
        printUsage();
    }

    let timeoutTimer: NodeJS.Timeout;

    function handleCheckCompletion() {
        clearTimeout(timeoutTimer);
        let msg = "Checks completed. ";
        if (report.areBrokenLinksPresent()) {
            msg += "The following broke:"
            console.log(msg, report);
            email(new SenderDetails(sender, senderPassword), recipient, report);
        } else {
            msg += "No broken links found.";
            console.log(msg);
        }
    }

    const report = new CheckerReport(siteUrl)
    const options = {
        acceptedSchemes: ["http", "https"],
        cacheExpiryTime: 3600000,
        cacheResponses: true,
        excludedKeywords: [],
        excludedSchemes: ["data", "geo", "javascript", "mailto", "sms", "tel"],
        excludeInternalLinks: false,
        excludeLinksToSamePage: true,
        filterLevel: 0,
        honorRobotExclusions: true,
        rateLimit: 1,
    };
    const siteChecker = new SiteChecker(options, {
        link: handleLink,
        page: handlePage,
        end: handleCheckCompletion,
    });

    console.log(`Checking site URLs. Beginning with ${siteUrl}`)
    timeoutTimer = setTimeout(() => {
        console.log("Timed out when crawling.");
        process.exit(1);
    }, timeout * 1000);

    siteChecker.enqueue(siteUrl, <CustomData>{
        blacklist: blacklist,
        ignorableLinks: ignoreList,
        report: report,
        pageReports: new Map<string, PageReport>(),
    });
}

main();
