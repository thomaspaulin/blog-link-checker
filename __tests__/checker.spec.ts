"use strict";

import {CheckerReport, PageReport} from "../reports";
import {CustomData, handleLink, handlePage} from "../checker";

function buildCrawlResult(pageUrl: string, link: string, linkText: string, broken: boolean) {
    return {
        base: {
            original: pageUrl,
        },
        url: {
            original: link,
            parsed: new URL(link),
        },
        html: {
            text: linkText,
        },
        broken: broken,
    };
}

describe("Broken link checking", () => {
    const url = "http://localhost:1313/2021/03/deckgl-displaying-live-flight-info/";
    const l1 = "https://www.mapadsbox.com/mapbox-gljs";
    const l2 = "https://cors-anywhere.herokuapp.com/";
    let data: CustomData;

    beforeEach(() => {
        data = {
            blacklist: new Set<string>(),
            ignorableLinks: new Set<string>(),
            pageReports: new Map<string, PageReport>(),
            report: new CheckerReport(url),
        };
    });

    describe("Link handling", () => {
        it("should report each link as checked within the page report", () => {
            const result = buildCrawlResult(url, l1, "", false)

            handleLink(result, data);

            expect(data.pageReports.size).toEqual(1);
            expect(data.pageReports.has(url)).toBeTruthy();
            expect(data.pageReports.get(url)?.checked.size).toEqual(1);
        });

        it("should report broken links", () => {
            const link = "https://dfiadjfkalsdjfad.asdads/asdasdad290435sdgfg/asdfasdlkj34.lfkjgs";
            const linkText = "The link text";
            const result = buildCrawlResult(url, link, linkText, true);

            handleLink(result, data);

            expect(data.pageReports.size).toEqual(1);
            expect(data.pageReports.has(url)).toBeTruthy();

            const pr = data.pageReports.get(url);
            expect(pr?.broken.size).toEqual(1);
            expect(pr?.broken.has(link)).toBeTruthy();
            expect(pr?.brokenInfo.get(link)?.linkText).toEqual(linkText);
        });

        it("should ignore links if in the ignore list", () => {
            const apollo = "https://en.wikipedia.org/wiki/Apollo_11";
            const result = buildCrawlResult(url, apollo, "", true);
            data.ignorableLinks.add(apollo);

            handleLink(result, data)

            expect(data.pageReports.has(url)).toBeTruthy();

            const pr = data.pageReports.get(url);
            expect(pr?.ignored.size).toEqual(1);
            expect(pr?.ignored.has(apollo)).toBeTruthy();
        });

        it("should not ignore links if the host is not in the ignore list", () => {
            const apollo = "https://en.wikipedia.org/wiki/Apollo_11";
            const result = buildCrawlResult(apollo, l1, "", true);
            data.ignorableLinks.add("https://example.org");

            handleLink(result, data)

            expect(data.pageReports.has(apollo)).toBeTruthy();

            const pr = data.pageReports.get(apollo);
            expect(pr?.ignored.size).toEqual(0);
        })

        it("should ignore links if the host in the blacklist", () => {
            const apollo = "https://en.wikipedia.org/wiki/Apollo_11";
            const result = buildCrawlResult(url, apollo, "", true);
            data.blacklist.add("en.wikipedia.org");

            handleLink(result, data)

            expect(data.pageReports.has(url)).toBeTruthy();

            const pr = data.pageReports.get(url);
            expect(pr?.checked.size).toEqual(1);
            expect(pr?.ignored.size).toEqual(0);
            expect(pr?.broken.size).toEqual(0);
        });

        it("should not ignore links if the host is not in the blacklist", () => {
            const apollo = "https://en.wikipedia.org/wiki/Apollo_11";
            const result = buildCrawlResult(apollo, l1, "", true);
            data.blacklist.add("example.org");

            handleLink(result, data)

            expect(data.pageReports.has(apollo)).toBeTruthy();

            const pr = data.pageReports.get(apollo);
            expect(pr?.checked.size).toEqual(1);
            expect(pr?.ignored.size).toEqual(0);
            expect(pr?.broken.size).toEqual(1);
        });

        it("should catch errors and save them", () => {
            const apollo = "https://en.wikipedia.org/wiki/Apollo_11";
            const result = buildCrawlResult(apollo, l1, "", true);
            data.blacklist = undefined as unknown as Set<string>;   // force an error

            handleLink(result, data)

            expect(data.pageReports.has(apollo)).toBeTruthy();

            const pr = data.pageReports.get(apollo);
            expect(pr?.errors.size).toEqual(1);
            expect(Array.from(pr?.errors.values() as Iterable<Error>)[0].message).toMatch(`Cannot read property 'has' of undefined`);
        });
    });

    describe("Page handling", () => {
        let data: CustomData;
        let pr: PageReport;

        beforeEach(() => {
            data = {
                blacklist: new Set<string>(),
                ignorableLinks: new Set<string>(),
                pageReports: new Map<string, PageReport>(),
                report: new CheckerReport(url),
            };
            pr = new PageReport(l1);
        });

        it("should save the page report on the overall report, once a page has completed, and errors were not present", () => {
            pr.reportBroken(l2, "foo", "HTTP_404");
            data.pageReports.set(l1, pr);

            handlePage(undefined, l1, data);

            expect(data.report.pageReports.size).toEqual(1);
            expect(data.report.pageReports.get(l1)).toEqual(pr);
        });

        it("should log errors if they occur", () => {
            data.pageReports.set(l1, pr);
            const e = new Error("test error");

            handlePage(e, l1, data);

            expect(data.pageReports.get(l1)?.errors.size).toEqual(1);
            expect(data.pageReports.get(l1)?.errors.has(e)).toBeTruthy();
        });
    });
});
