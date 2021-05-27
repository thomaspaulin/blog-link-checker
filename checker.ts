import brokenLinkChecker from 'broken-link-checker';

import {sendEmail, SenderDetails} from "./email";
import {CheckerReport, PageReport} from "./reports";

const {SiteChecker} = brokenLinkChecker;


export interface CustomData {
    blacklist: Set<string>;
    ignorableLinks: Set<string>;
    report: CheckerReport;
    pageReports: Map<string, PageReport>;
}

function isBlacklisted(host: string, blacklist: Set<string>) {
    // improve blacklist performance - we are currently rate limited by the wait between websites though so this isn't urgent
    return blacklist.has(host);
}

function isIgnorable(url: string, ignorableList: Set<string>) {
    return ignorableList.has(url);
}

export function handleLink(result: any, customData: CustomData) {
    // todo what if the status code is 200 but it's actually an error page telling the user it wasn't found?
    // todo what if the link isn't broken but is redirecting to somewhere which is not the content intended as the link?

    const sourceUrl = result.base.original;
    const linkUrl = result.url.original;

    let pageReport = customData.pageReports.get(sourceUrl);
    if (!pageReport) {
        pageReport = new PageReport(sourceUrl);
    }

    try {
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
    } catch (e) {
        console.error("I encountered an error, logging it and proceeding");
        console.error(e)
        pageReport.errors.add(e);
    }

    customData.pageReports.set(sourceUrl, pageReport);
}

export function handlePage(error: any, pageUrl: string, customData: CustomData) {
    let pageReport = customData.pageReports.get(pageUrl);
    if (!pageReport) {
        pageReport = new PageReport(pageUrl);
    }
    if (!error) {
        customData.report.savePageReport(pageReport);
    } else {
        pageReport.reportError(error);
    }

    customData.pageReports.set(pageUrl, pageReport);
}

export function checkLinks(siteUrl: string, recipient: string, sender: SenderDetails, blacklist: Set<string>, ignoreList: Set<string>, timeout: number) {
    let timeoutTimer: NodeJS.Timeout;

    function handleCheckCompletion() {
        clearTimeout(timeoutTimer);
        let msg = "Checks completed. ";
        if (report.areBrokenLinksPresent()) {
            msg += "The following broke:"
            console.log(msg, report);
            sendEmail(sender, recipient, report);
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
