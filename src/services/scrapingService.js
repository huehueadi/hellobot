import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import ScrapedData from '../models/scrappedDataModel.js';
import dotenv from 'dotenv';

// Load environment variables from the .env file
dotenv.config();

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const BUCKET_NAME = 'webscrappedjsondata';

// Function to crawl a website and get all linked pages
export const crawlWebsite = async (url, browser, visitedUrls = new Set()) => {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 }); // 120 seconds timeout

  const links = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a'));
    return anchors
      .map(anchor => anchor.href)
      .filter(href => href.startsWith(window.location.origin));
  });

  await page.close();
  visitedUrls.add(url);

  const newLinks = links.filter(link => !visitedUrls.has(link));
  newLinks.forEach(link => visitedUrls.add(link));

  return { links: newLinks, visitedUrls };
};

// Function to scrape body content (paragraphs and links) from a page
export const scrapeBodyContent = async (browser, url) => {
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 120000 }); // 120 seconds timeout
    await page.waitForSelector('body');

    const content = await page.evaluate(() => {
      const body = document.querySelector('body');
      const paragraphs = Array.from(body.querySelectorAll('p')).map(p => p.innerText) || [];
      const links = Array.from(body.querySelectorAll('a')).map(a => a.href) || [];
      return { paragraphs, links };
    });

    await page.close();
    return content;
  } catch (error) {
    console.error(`Error scraping content from ${url}: ${error.message}`);
    await page.close();
    throw error; // Rethrow to handle it in the calling function
  }
};

// Function to retry scraping a page if it fails due to a timeout or error
const scrapeWithRetry = async (browser, url, retries = 3) => {
  let attempts = 0;
  while (attempts < retries) {
    try {
      return await scrapeBodyContent(browser, url); // Try scraping the page
    } catch (error) {
      attempts += 1;
      if (attempts >= retries) {
        console.error(`Failed to scrape ${url} after ${retries} attempts`);
        throw error;
      }
      console.log(`Retrying ${url} (Attempt ${attempts + 1})`);
    }
  }
};

// Upload scraped data to S3
const uploadToS3 = async (data, fileName) => {
  const params = {
    Bucket: BUCKET_NAME,
    Key: fileName,
    Body: JSON.stringify(data, null, 2),
    ContentType: 'application/json',
  };

  try {
    const s3Response = await s3.upload(params).promise();
    return s3Response.Location;
  } catch (error) {
    console.error(`Error uploading to S3: ${error.message}`);
    throw new Error('Failed to upload to S3');
  }
};

// Function to scrape all pages and save the result
export const scrapeAllPages = async (browser, links, userid) => {
  const allParagraphs = new Set();
  const allLinks = new Set();
  const allUrls = new Set();

  const promises = links.map(async (link) => {
    try {
      const content = await scrapeWithRetry(browser, link); // Retry logic included

      content.paragraphs.forEach(paragraph => allParagraphs.add(paragraph));
      content.links.forEach(link => allLinks.add(link));

      allUrls.add(link);
    } catch (error) {
      console.error(`Error scraping ${link}: ${error.message}`);
    }
  });

  // Wait for all scraping promises to resolve or reject
  await Promise.all(promises);

  const uniqueParagraphs = Array.from(allParagraphs);
  const uniqueLinks = Array.from(allLinks);
  const uniqueUrls = Array.from(allUrls);

  const data = {
    paragraphs: uniqueParagraphs,
    links: uniqueLinks,
    urls: uniqueUrls
  };

  const fileName = `scraped_data_${uuidv4()}.json`;

  let s3Url;
  try {
    s3Url = await uploadToS3(data, fileName);
  } catch (error) {
    console.error(`Failed to upload data to S3: ${error.message}`);
    throw new Error('Error uploading data to S3');
  }

  // Ensure UUID is generated and MongoDB doesn't have duplicates
  const scrapedData = new ScrapedData({
    userid: userid,
    s3Url: s3Url,
    uuid: uuidv4(),  // Generate a unique UUID for each record
  });

  try {
    await scrapedData.save();
    console.log(`Scraped data saved to MongoDB with S3 URL: ${s3Url}`);
  } catch (error) {
    console.error(`Error saving to MongoDB: ${error.message}`);
    throw new Error('Error saving scraped data to MongoDB');
  }

  return s3Url;
};

// Batch Processing to scrape in smaller chunks
const scrapeInBatches = async (browser, allLinks, batchSize = 10) => {
  let batchCount = 0;
  let currentBatch = [];
  const results = [];

  for (let i = 0; i < allLinks.length; i++) {
    currentBatch.push(allLinks[i]);

    if (currentBatch.length === batchSize || i === allLinks.length - 1) {
      batchCount += 1;
      console.log(`Scraping batch ${batchCount}`);
      const batchResult = await scrapeAllPages(browser, currentBatch);
      results.push(batchResult);
      currentBatch = []; // Reset batch after scraping
    }
  }

  return results;
};

// Example of how to call scrapeInBatches from your controller or other place in your code
export const scrapeWebsiteController = async (req, res) => {
  try {
    const { startUrl, userid } = req.body; // Assuming you're passing startUrl and userid in the request

    // Initialize Puppeteer and the browser
    const browser = await puppeteer.launch({ headless: true });

    // Start the crawling process
    const { links } = await crawlWebsite(startUrl, browser);

    // Scrape in batches to avoid overloading with too many links
    const allScrapedData = await scrapeInBatches(browser, links);

    res.json({ message: 'Scraping completed successfully!', data: allScrapedData });
  } catch (error) {
    console.error('Error during scraping process:', error.message);
    res.status(500).json({ message: 'Scraping failed', error: error.message });
  }
};
