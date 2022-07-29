import * as fs from 'fs';
import puppeteer from "puppeteer"
export class listingsScraper {
    constructor(browser,page,selectors,baseurl,imagebase) {
        // this.browser = browser
        // page = page
        this.selectors = selectors
        this.baseurl = baseurl
        this.imagebase = imagebase
        this.listings = []
    }
    async first(URL) {
        let browser = await puppeteer.launch({headless: true})
        let page = await browser.newPage()
        await page.goto(URL);
        const links = await page.$$eval(this.selectors.listingurlselector, (els) =>
            els.map((el) => el.href))
        // ( or this.selectors.listingurlselectors )
        // ( Loop Over Links / Listings and add them to db/list/json file )
        for (var i = 0; i < links.length; i++) {
            // ( Optionally add an if else to make sure it contains this.baseurl to remove
            // false listings and errors )
            // (code to push (links.url) to db / etc)
            if (links[i].includes(this.baseurl)) {
                this.listings.push(links[i])
            }
        }
        await browser.close()
    }
    async update(URL,id,type) {
        let browser = await puppeteer.launch({headless: true})
        let page = await browser.newPage()
        await page.setDefaultNavigationTimeout(0);
        var results = JSON.parse(fs.readFileSync("results.json"));
        let res = {}
        res[id] = {}
        res[id]["results"] = []
        await page.goto(URL);

        const links = await page.$$eval(this.selectors.listingurlselector, (els) =>
            els.map((el) => el.href))
        // ( or this.selectors.listingurlselectors )
        // ( Loop Over Links / Listings and add them to db/list/json file )
        for (var i = 0; i < links.length; i++) {
            // ( Optionally add an if else to make sure it contains this.baseurl to remove
            // false listings and errors )
            // (code to push (links.url) to db / etc)
            if (links[i].includes(this.baseurl)) {
                if (!this.listings.includes(links[i])) {
                    res[id]["results"].push(await this.getdetails(links[i],type,browser,page))
                }
            }
        }
        res[id]["timeUpdated"] = Date.now();
        if (res[id]["results"].length > 0 && typeof res[id]["results"] != 'undefined') {
            results = {...results, ...res}
            fs.writeFile("results.json", JSON.stringify(results), (err) => {
                if (err) throw err;
            });
        }
        await browser.close()
    }
    async getdetails(URL,type,browser,page) {
        try {
            // console.log(URL)
            await page.goto(URL, {
                waitUntil: 'load',
                // Remove the timeout
                timeout: 0
            });
            if (this.selectors.hasOwnProperty("waitFor")) {
                await page.waitForSelector(this.selectors.waitFor)
            }
            let res = {}
            res["url"] = URL
            for (const [key, value] of Object.entries(this.selectors["others"])) {
                if (key !== "images") {
                    if (key === "km" && type !== "cars") {
                        continue;
                    }
                    let query = await page.$(value)
                    if (await query === null || await query === undefined) {
                        res[key] = "Not Specified"
                    } else {
                        res[key] = await page.evaluate(el => el.innerText.replace(/\s+/g, " "), await
                            query);
                    }
                } else {
                    res[key] = await page.evaluate(function (value, imagebase) {
                        let getSrc = (el) => {
                            if (el.hasAttribute("srcset")) {
                                return el.getAttribute("srcset")
                            } else if (el.hasAttribute("data-srcset")) {
                                return el.getAttribute("data-srcset");
                            } else if (el.hasAttribute("src")) {
                                return el.getAttribute("src");
                            }
                            return "Not Src"
                        }
                        return [...document.querySelectorAll(value)].filter(x =>
                            getSrc(x).includes(imagebase)).map(x => getSrc(x))
                    }, value, this.imagebase)
                }
            }
            return res
        } catch (err) {
            console.log("error at " + URL)
            console.log("error is: ", err)
        }
    }
}