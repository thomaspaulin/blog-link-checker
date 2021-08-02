import {SMTPClient, Message, MessageHeaders, MessageAttachment} from "emailjs";
import {CheckerReport, PageReport} from "./reports";

export class SenderDetails {
    constructor(readonly email: string, readonly password: string) {
        this.email = email;
        this.password = password;
    }
}

function wasWere(n: number) {
    return n === 1 ? "was" : "were";
}

export function buildSummaryLine(pageReport: PageReport) {
    const checkCount = pageReport.checked.size;
    const brokenCount = pageReport.broken.size;
    const ignoreCount = pageReport.ignored.size;
    const reliableCount = pageReport.blacklisted.size;

    const addS = checkCount !== 1;
    const checkedClause = `I checked <strong>${checkCount}</strong> link${addS ? 's' : ''}.`;
    const brokenClause = `<strong>${brokenCount}</strong> ${wasWere(brokenCount)} broken`;
    let ignorableClause = '';
    if (ignoreCount > 0 && reliableCount > 0) {
        ignorableClause = ', ';
    } else if (ignoreCount > 0 && reliableCount === 0) {
        ignorableClause = ", and "
    }
    if (ignoreCount > 0) {
        ignorableClause += `<strong>${ignoreCount}</strong> ${wasWere(ignoreCount)} reported as ignorable`
    }
    let reliableClause = '';
    if (reliableCount > 0 && reliableCount === 1) {
        reliableClause = `, and <strong>${reliableCount}</strong> was from a reliable host`;
    } else if (reliableCount > 0 && reliableCount !== 1) {
        reliableClause = `, and <strong>${reliableCount}</strong> were from reliable hosts`;
    }
    return `${checkedClause} ${brokenClause}${ignorableClause}${reliableClause}.`;
}

export function buildPageSummary(pageUrl: string, pageReport: PageReport) {
    const pageIntro = `On the page <a href="${pageUrl}">${pageUrl}</a><br>`;

    let listItems = '';

    for (const broken of pageReport.broken) {
        const info = pageReport.brokenInfo.get(broken);
        const linkText = info?.linkText || "Link text unknown";
        const breakageReason = info?.reason || "Reason for breaking is unknown";

        // Ordinarily, it wouldn't make sense to link to a broken link, but in this case there are a fair number of
        // false positives until I iron out the kinks in the system. As such it's much more convenient to have the
        // hyperlink present in the email so I can investigate whether or not it is indeed broken.
        listItems += `<li>"${linkText}" - <a href="${broken}">${broken}</a> (${breakageReason})</li>`;
    }

    return `<li>${pageIntro}${buildSummaryLine(pageReport)}<h4>Broken Links:</h4><ul>${listItems}</ul></li><hr>`;
}

export function buildEmailTemplate(report: CheckerReport) {
    const site = report.baseUrl;
    const header = `<html lang="en"><head><title>Broken links found while parsing ${site}</title><style>.no-bullets { list-style-type: none; } .no-bullets > li { margin-bottom: 1.5em; } li > h5 { margin: 1em 0 1em 0; }</style></head><body>`;

    let scannedPageCount = 0;
    let totalCheckedCount = 0;
    let totalBrokenCount = 0;
    for (const [, pageReport] of report.pageReports) {
        scannedPageCount++;
        totalCheckedCount += pageReport?.checked?.size || 0;
        totalBrokenCount += pageReport?.broken?.size || 0;
    }

    const intro = `${header}Hi there,<br><p>I scanned <a href="${site}">${site}</a>. In doing so I scanned <strong>${scannedPageCount}</strong> pages which contained a total of <strong>${totalCheckedCount}</strong> links. Of these, <strong>${totalBrokenCount}</strong> were broken links. The scan took <strong>${report.getDuration()}ms</strong>.</p>`;
    let html = `${intro}<ul class="no-bullets">`;
    for (const [pageUrl , pageReport] of report.pageReports) {
        if (pageReport.broken.size > 0) {
            html += buildPageSummary(pageUrl, pageReport);
        }
    }
    html += '</ul><p>Thanks,<br>broken-link-checker</p></body></html>';
    return html;
}

export function buildErrorReport(report: CheckerReport): MessageAttachment {
    let data = `<html lang="en"><head><title>Errors Reported When Checking ${report.baseUrl}</title></head><body>`;

    data += `<h1>Errors Reported When Checking ${report.baseUrl}</h1>`;

    for (const [k, v] of report.pageReports) {
        data += `<p><h2>${k}</h2><ul>`;
        for (const e of v.errors) {
            data += `<li><pre>${e.stack}</pre></li>`;
        }
        data += `</ul></p>`;
    }

    data += "</body></html>"

    return {
        name: "reported-errors.html",
        type: "text/html",
        charset: "utf-8",
        data: data,
    }
}

export function buildEmail(senderDetails: SenderDetails, recipient: string, report: CheckerReport): Message {
    const htmlString = buildEmailTemplate(report);

    let attachment;
    if (report.encounteredErrors()) {
        attachment = buildErrorReport(report);
    }

    const headers: Partial<MessageHeaders> = {
        from: 'broken-link-checker <' + senderDetails.email + '>',
        to: recipient,
        "content-type": 'text/html; charset=UTF-8',
        subject: 'Broken links found while parsing ' + report.baseUrl,
        text: htmlString,
    };

    if (attachment) {
        headers.attachment = attachment;
    }

    return new Message(headers);
}

export function sendEmail(senderDetails: SenderDetails, recipient: string, report: CheckerReport) {
    const client = new SMTPClient({
        user: senderDetails.email,
        password: senderDetails.password,
        host: 'smtp.gmail.com',
        ssl: true,
    });

    client.send(buildEmail(senderDetails, recipient, report),
        (err, message) => {
            console.log(err || message);
        }
    );
}
