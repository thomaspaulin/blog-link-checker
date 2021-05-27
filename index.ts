#!/usr/bin/env ts-node
import {checkLinks} from "./checker";
import argParser from "args-parser";
import {SenderDetails} from "./email";

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

const args = argParser(process.argv);

const defaultTimeout = 600;

const siteUrl = args.url || process.env["URL"];
const blacklist = new Set<string>((args.reliable_hosts || process.env["RELIABLE_HOSTS"] || "").split(","));
const ignoreList = new Set<string>((args.ignore || process.env["IGNORE"] || "").split(","));
const timeout = args.timeout || parseInt(process.env["TIMEOUT"] || `${defaultTimeout}`);
const sender = args.sender_email || process.env["SENDER_EMAIL"];
const senderPassword = args.sender_password || process.env["SENDER_PASSWORD"];
const recipient = args.recipient || process.env["RECIPIENT"];

if (!siteUrl || !sender || !senderPassword || !recipient) {
    printUsage();
}

checkLinks(siteUrl, recipient, new SenderDetails(sender, senderPassword), blacklist, ignoreList, timeout);
