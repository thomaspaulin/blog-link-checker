export interface BreakageInformation {
    linkText: string;
    reason?: string;
}

export class PageReport {
    readonly url: string;
    checked: Set<string>;
    broken: Set<string>;
    brokenInfo: Map<string, BreakageInformation>;
    ignored: Set<string>;
    blacklisted: Set<string>;
    errors: Set<Error>;

    constructor(url: string) {
        this.url = url;
        this.checked = new Set<string>();
        this.broken = new Set<string>();
        this.brokenInfo = new Map<string, BreakageInformation>();
        this.ignored = new Set<string>();
        this.blacklisted = new Set<string>();
        this.errors = new Set<Error>();
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

    reportError(error: Error) {
        this.errors.add(error);
    }
}

export class CheckerReport {
    readonly baseUrl: string;
    pageReports: Map<string, PageReport>;

    startedAt: Date | undefined;
    finishedAt: Date | undefined;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
        this.pageReports = new Map<string, PageReport>();
    }

    setStartTime(d: Date) {
        this.startedAt = d;
    }

    setEndTime(d: Date) {
        this.finishedAt = d;
    }

    getDuration() {
        if (!this.finishedAt || !this.startedAt) {
            return -1
        }
        return this.finishedAt?.getTime() - this.startedAt?.getTime();
    }

    savePageReport(pageReport: PageReport) {
        if (!this.pageReports.has(pageReport.url)) {
            this.pageReports.set(pageReport.url, pageReport);
        }
    }

    areBrokenLinksPresent(): boolean {
        let ok = true;
        for (const report of this.pageReports.values()) {
            ok = ok && report.broken.size === 0;
        }
        return !ok;
    }

    encounteredErrors(): boolean {
        let ok = true;
        for (const pageReport of this.pageReports.values()) {
            ok = ok && pageReport.errors.size === 0;
        }
        return !ok;
    }
}
