"use strict";

import {PageReport} from "../reports";
import {buildPageSummary} from "../email";
import exp from "constants";

describe("Email sending and formatting", () => {
    const url = "http://localhost:1313/2021/03/deckgl-displaying-live-flight-info/";
    const l = "https://www.mapadsbox.com/mapbox-gljs";
    const l2 = "https://cors-anywhere.herokuapp.com/";
    const l3 = "https://hgis.uw.edu/";
    const l4 = "https://www.colourhunt.com/palettadsfe/cjf74j2eqdg3w0119my22vt6f/";
    const l5 = "https://www.awix.com/blog/2017/10/how-to-choose-the-perfect-color-palette-for-your-business";

    describe("The summary line for a page", () => {
        describe("when reporting how many links checked", () => {
            let pr: PageReport;

            beforeEach(() => {
                pr = new PageReport(url);
            })

            it("should use the correct singular grammar", () => {
                pr.reportChecked(l);

                const summary = buildPageSummary(url, pr);
                expect(summary).toMatch("I checked <strong>1</strong> link.");
            });

            it("should use the correct plural grammar", () => {
                pr.reportChecked(l);
                pr.reportChecked(l2);

                const summary = buildPageSummary(url, pr);
                expect(summary).toMatch("I checked <strong>2</strong> links.");
            });
        });

        describe("when reporting how many links broken", () => {
            let pr: PageReport;

            beforeEach(() => {
                pr = new PageReport(url);
            })

            it("should use the correct singular grammar", () => {
                pr.reportBroken(l, "title", "HTTP_404");

                const summary = buildPageSummary(url, pr);
                expect(summary).toMatch("I checked <strong>1</strong> link. <strong>1</strong> was broken");
            });
            it("should use the correct plural grammar", () => {
                pr.reportBroken(l, "title", "HTTP_404");
                pr.reportBroken(l2, "title 2", "UNKNOWN");

                const summary = buildPageSummary(url, pr);
                expect(summary).toMatch("I checked <strong>2</strong> links. <strong>2</strong> were broken");
            });
        });

        describe("when reporting how many links were ignored", () => {
            let pr: PageReport;

            beforeEach(() => {
                pr = new PageReport(url);
            })

            it("should use the correct singular grammar", () => {
                pr.reportIgnored(l);

                const summary = buildPageSummary(url, pr);
                expect(summary).toMatch("<strong>1</strong> was reported as ignorable");
            });
            it("should use the correct plural grammar", () => {
                pr.reportIgnored(l);
                pr.reportIgnored(l2);

                const summary = buildPageSummary(url, pr);
                expect(summary).toMatch("<strong>2</strong> were reported as ignorable");
            });
        });

        describe("and reporting how many links used reliable hosts", () => {
            let pr: PageReport;

            beforeEach(() => {
                pr = new PageReport(url);
            })

            it("should use the correct singular grammar", () => {
                pr.reportBlacklisted(l);

                const summary = buildPageSummary(url, pr);
                expect(summary).toMatch("<strong>1</strong> was from a reliable host");
            });
            it("should use the correct plural grammar", () => {
                pr.reportBlacklisted(l);
                pr.reportBlacklisted(l2);

                const summary = buildPageSummary(url, pr);
                expect(summary).toMatch("<strong>2</strong> were from reliable hosts");
            });
        });

        describe("and stringing all the clauses together", () => {
            let pr: PageReport;

            beforeEach(() => {
                pr = new PageReport(url)
                pr.reportBroken(l, "title", "HTTP_404");
                pr.reportChecked(l2);
            })

            it("should use proper grammar and ordering (ignorable includes, no reliable hosts clause)", () => {
                pr.reportIgnored(l3);
                pr.reportIgnored(l4)
                const summary = buildPageSummary(url, pr);
                expect(summary).not.toMatch("reliable");
                expect(summary).toMatch("I checked <strong>4</strong> links. <strong>1</strong> was broken, and <strong>2</strong> were reported as ignorable.");
            });

            it("should use proper grammar and ordering (reliable hosts includes, no ignorable clause)", () => {
                pr.reportBlacklisted(l3);
                pr.reportBlacklisted(l4);
                const summary = buildPageSummary(url, pr);
                expect(summary).not.toMatch("ignorable");
                expect(summary).toMatch("I checked <strong>4</strong> links. <strong>1</strong> was broken, and <strong>2</strong> were from reliable hosts.");
            });

            it("should use proper grammar and ordering (no ignorable, no reliable hosts)", () => {
                pr.reportChecked(l3);
                const summary = buildPageSummary(url, pr);
                expect(summary).toMatch("I checked <strong>3</strong> links. <strong>1</strong> was broken.");
            });
        });
    });

    describe("The summary list", () => {
        it("should mention the link text, and the reference", () => {
            const pr = new PageReport(url);
            pr.reportBroken(l, "link title", "HTTP_404");
            const summary = buildPageSummary(url, pr);
            expect(summary).toMatch(`<li>"link title" - ${l} (HTTP_404)</li>`);
        });
    });
});
