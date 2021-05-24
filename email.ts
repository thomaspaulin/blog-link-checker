import {SMTPClient, Message} from "emailjs";
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
        listItems += `<li>"${pageReport.brokenLinkTitles.get(broken)}" - ${broken}</li>`;
    }

    return `<li>${pageIntro}${buildSummaryLine(pageReport)}<h4>Broken Links:</h4><ul>${listItems}</ul></li>`;
}

function buildEmailTemplate(report: CheckerReport) {
    const site = report.baseUrl;
    const header = `<html lang="en"><head><title>Broken links found while parsing ${site}</title><style>.no-bullets { list-style-type: none; } .no-bullets > li { margin-bottom: 1.5em; } li > h5 { margin: 1em 0 1em 0; }</style></head>`;
    const intro = `${header}Hi there,<br><p>I found the following broken links when scanning <a href="${site}">${site}</a>.</p>`;
    let html = `${intro}<ul class="no-bullets">`;
    for (const [pageUrl , pageReport] of report.pageReports) {
        if (pageReport.broken.size > 0) {
            html += buildPageSummary(pageUrl, pageReport);
        }
    }
    html += '</ul><p>Thanks,<br>broken-link-checker</p></html>';
    return html;
}

export function email(senderDetails: SenderDetails, recipient: string, report: CheckerReport) {
    const client = new SMTPClient({
        user: senderDetails.email,
        password: senderDetails.password,
        host: 'smtp.gmail.com',
        ssl: true,
    });

    const htmlString = buildEmailTemplate(report);

    const headers = {
        from: 'broken-link-checker <' + senderDetails.email + '>',
        to: recipient,
        "content-type": 'text/html; charset=UTF-8',
        subject: 'Broken links found while parsing ' + report.baseUrl,
        text: htmlString
    };

    client.send(new Message(headers),
        (err, message) => {
            console.log(err || message);
        }
    );
}
