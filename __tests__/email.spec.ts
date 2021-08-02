"use strict";

import {CheckerReport, PageReport} from "../reports";
import {buildEmail, buildEmailTemplate, buildErrorReport, buildPageSummary, SenderDetails} from "../email";

describe("Email sending and formatting", () => {
    const url = "http://localhost:1313/2021/03/deckgl-displaying-live-flight-info/";
    const l = "https://www.mapadsbox.com/mapbox-gljs";
    const l2 = "https://cors-anywhere.herokuapp.com/";
    const l3 = "https://hgis.uw.edu/";
    const l4 = "https://www.colourhunt.com/palettadsfe/cjf74j2eqdg3w0119my22vt6f/";

    const url2 = "http://localhost:1313/2021/07/ullage-rockets/";
    const u2_l = "https://en.wikipedia.org/wiki/Saturn_V";
    const u2_l2 = "https://en.wikipedia.org/wiki/Ullage_motor";
    const u2_l3 = "https://en.wikipedia.org/wiki/Ullage_(wine)";
    const u2_l4 = "https://unece.org/DAM/trans/doc/2011/wp29grpe/LNG_TF-02-06e.pdf";

    describe("The introduction", () => {
        const cr = new CheckerReport("http://localhost:1313");

        beforeEach(() => {
            const pr = new PageReport(url);
            pr.reportChecked(l);
            pr.reportChecked(l2);
            pr.reportChecked(l3);

            pr.reportBroken(l, "title", "HTTP_404");
            cr.savePageReport(pr);

            const pr2 = new PageReport(url2)
            pr2.reportChecked(u2_l);
            pr2.reportChecked(u2_l2);
            pr2.reportChecked(u2_l3);
            pr2.reportChecked(u2_l4);

            pr2.reportBroken(u2_l2, "ullage rockets", "HTTP_403");
            cr.savePageReport(pr2);
        });

        it("should mention how many pages were scanned", () => {
            const template = buildEmailTemplate(cr);
            expect(template).toContain("In doing so I scanned <strong>2</strong> pages");
        });

        it("should mention how many links were checked across all pages", () => {
            const template = buildEmailTemplate(cr);
            expect(template).toContain("which contained a total of <strong>7</strong> links")
        });

        it("should mention how many links broken across all pages", () => {
            const template = buildEmailTemplate(cr);
            expect(template).toContain(" links. Of these, <strong>2</strong> were broken links")
        });

        describe("should mention the scan duration", () => {
            it("should mention the time in milliseconds", () => {
                const start = new Date();
                const end = new Date(start.getTime() + 100);
                const localCr = new CheckerReport(url);
                localCr.setStartTime(start);
                localCr.setEndTime(end)
                const template = buildEmailTemplate(localCr);
                expect(template).toContain("The scan took <strong>100ms</strong>.");
            });

            it("should use -1 if there's no end time", () => {
                // because a -1 duration is not possible and signals something off like the times are not present, or
                // time when backwards.
                const start = new Date();
                const localCr = new CheckerReport(url);
                localCr.setStartTime(start);
                const template = buildEmailTemplate(localCr);
                expect(template).toContain("The scan took <strong>-1ms</strong>.");
            });
        });
    });

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
            expect(summary).toMatch(`<li>"link title" - <a href="${l}">${l}</a> (HTTP_404)</li>`);
        });
    });

    describe("The error report", () => {
        let cr: CheckerReport;
        let pr: PageReport;
        let e: Error;

        beforeEach(() => {
            cr = new CheckerReport(url);
            pr = new PageReport(l);
            e = new Error("test error");
        });

       it("should have one header per page, and one list item per error with the stack track printed", () => {
           pr.reportError(e);
           cr.savePageReport(pr);

           const errorReport = buildErrorReport(cr);
           expect(errorReport.data).toMatch(`<h1>Errors Reported When Checking ${url}</h1>`);
           expect(errorReport.data).toMatch(`<h2>${l}</h2>`);
           expect(errorReport.data).toMatch("test error");
       });

       it("should be an attachment with the filename of 'reported-errors.html'", () => {
           pr.reportError(e);

           const errorReport = buildErrorReport(cr);
           expect(errorReport.name).toMatch("reported-errors.html");
       });
    });

    describe("Constructing the email", () => {
        const recipient = "bar@example.com";

        let sd: SenderDetails;
        let cr: CheckerReport;
        let e: Error;

       beforeEach(() => {
          sd = new SenderDetails("foo@example.com", "str0ng_p4ssword_r_us");
           cr = new CheckerReport(url);
           e = new Error("test error");
       });

        it("should be sent from the given sender", () => {
           const email = buildEmail(sd, recipient, cr);
           expect(email.header.from).toMatch("broken-link-checker");
           expect(email.header.from).toMatch("<foo@example.com>");
       });

       it("should be sent to the given recipient", () => {
           const email = buildEmail(sd, recipient, cr);
           expect(email.header.to).toMatch(recipient);
       });

       it("should mention the site URL in the subject line", () => {
           const email = buildEmail(sd, recipient, cr);
           // the transforms do some encoding. For now checking for this path is good enough
           // todo match the encoding to have a more representational test
           expect(email.header.subject).toMatch(`2021/03/deckgl-displaying-live-flight-info/`);
       });

       it("should add the HTML body as the message data", () => {
           const pr = new PageReport(l);
           pr.reportChecked(l2);
           pr.reportBroken(l3, "title", "HTTP_404");
           cr.savePageReport(pr)
          const email = buildEmail(sd, recipient, cr);
          const html = buildPageSummary(l, pr);

          expect(email.text).toMatch(html);
       });

        it("should add a text file attachment with the stack traces for any errors encountered", () => {
            const pr = new PageReport(l);
            // hack to represent an error occurred
            pr.errors.add(e);
            cr.savePageReport(pr);
            const email = buildEmail(sd, recipient, cr);

            expect(email.attachments.length).toEqual(1);
            expect(email.attachments[0].name).toEqual("reported-errors.html");
            expect(email.attachments[0].data).toMatch(e.message);
        });

        it("should not attach a text file for errors if none were encountered", () => {
            const email = buildEmail(sd, recipient, cr);
            expect(email.attachments.length).toEqual(0);
        });
    });
});
