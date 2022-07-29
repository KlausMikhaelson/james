import puppeteer from "puppeteer"
import {listingsScraper} from "./lS.js";
import fs from "fs";

let listings = [];
let doneFetching = [];
let browser;
let page;
let kijiji;
async function runRespectiveFunction(url,classes,functionName,args) {
    // (code to run respective function)
    // switch case based on checking if url contains kijiji or others
    if (url.includes("kijiji.ca")) {
        await classes["kijiji"][functionName](...args);
    }
    if (url.includes("varagesale.com")) {
        await classes["varagesale"][functionName](...args);
    }
}
(async () => {
    browser = await puppeteer.launch({headless: true})
    page = await browser.newPage();
    const classes = {
        kijiji: new listingsScraper(await browser,await page,{
            listingurlselector: ".title a",
            timeselector: ".date",
            waitFor: "div#ViewItemPage h1",
            others: {
                title:"div#ViewItemPage h1",
                description:"[itemprop=description]",
                images: "source"
            }
        },"kijiji.ca","kijiji"),
        varagesale: new listingsScraper(await browser,await page,{
            listingurlselector: ".js-analytics-click-item",
            others: {
                title:".font-md.font-base.b-margin-sm.break-word.black",
                description:".font-md.font-base.b-margin-sm.break-word.black",
                price: ".font-xl.green.bold.b-margin-sm"
            }
        },"varagesale.com","pixl.varagesale.com"),
        facebook: "facebook",
    }
    // run async function every ten seconds
    setInterval(async () => {
// read json file
        console.log("every 10 seconds")
        let inputs = JSON.parse(fs.readFileSync("inputs.json"));
        // loop through each result
        for (var i = 0; i < inputs.length; i++) {
            // check if items .url is in listings
            if (!listings.includes(inputs[i].url)) {
                // if not, add it to listings
                listings.push(inputs[i].url)
                // run first function
                await runRespectiveFunction(inputs[i].url,classes,"first",[inputs[i].url])
                // run update function
                await runRespectiveFunction(inputs[i].url,classes,"update",[inputs[i]["url"],inputs[i]["id"],inputs[i]["type"]]).then(()=> {
                    doneFetching.push(inputs[i].url)
                })
            }
            if (doneFetching.includes(inputs[i].url)) {
                // if it is, run update function
                await runRespectiveFunction(inputs[i].url,classes,"update",[inputs[i]["url"],inputs[i]["id"],inputs[i]["type"]])
            }
        }
    },30000);

})();

