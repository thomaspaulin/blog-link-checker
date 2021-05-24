export interface BrokenInformation {
    linkText: string;
    reason?: string;
}

export class PageReport {
    readonly url: string;
    checked: Set<string>;
    broken: Set<string>;
    brokenInfo: Map<string, BrokenInformation>;
    ignored: Set<string>;
    blacklisted: Set<string>;

    constructor(url: string) {
        this.url = url;
        this.checked = new Set<string>();
        this.broken = new Set<string>();
        this.brokenInfo = new Map<string, BrokenInformation>();
        this.ignored = new Set<string>();
        this.blacklisted = new Set<string>();
    }

    reportBroken(link: string, linkText: string, reason: string) {
        this.reportChecked(link);
        this.broken.add(link);
        this.brokenInfo.set(link, {
            linkText: linkText,
            reason: reason,
        });
    }

    reportIgnored(link: string) {
        this.reportChecked(link);
        this.ignored.add(link);
    }

    reportBlacklisted(link: string) {
        this.reportChecked(link);
        this.blacklisted.add(link);
    }

    reportChecked(link: string) {
        this.checked.add(link);
    }
}

export class CheckerReport {
    readonly baseUrl: string;
    pageReports: Map<string, PageReport>;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
        this.pageReports = new Map<string, PageReport>();
    }

    savePageReport(pageReport: PageReport) {
        if (!this.pageReports.has(pageReport.url)) {
            this.pageReports.set(pageReport.url, pageReport);
        }
    }

    areBrokenLinksPresent() {
        let ok = true;
        for (const report of this.pageReports.values()) {
            ok = ok && report.broken.size === 0;
        }
        return !ok;
    }
}
