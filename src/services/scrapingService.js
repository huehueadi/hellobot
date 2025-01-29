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

export const crawlWebsite = async (url, browser, visitedUrls = new Set()) => {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

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

export const scrapeBodyContent = async (browser, url) => {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'load' });

  await page.waitForSelector('body');
  const content = await page.evaluate(() => {
    const body = document.querySelector('body');
    const paragraphs = Array.from(body.querySelectorAll('p')).map(p => p.innerText) || [];
    const links = Array.from(body.querySelectorAll('a')).map(a => a.href) || [];
    return { paragraphs, links };
  });

  await page.close();
  return content;
};

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
    console.error('Error uploading to S3:', error.message);
    throw new Error('Failed to upload to S3');
  }
};

export const scrapeAllPages = async (browser, links, userid) => {
  const allParagraphs = new Set();
  const allLinks = new Set();
  const allUrls = new Set();

  const promises = links.map(async (link) => {
    try {
      const content = await scrapeBodyContent(browser, link);

      content.paragraphs.forEach(paragraph => allParagraphs.add(paragraph));
      content.links.forEach(link => allLinks.add(link));

      allUrls.add(link);
    } catch (error) {
      console.error(Error `scraping ${link}: ${error.message}`);
    }
  });

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

  const s3Url = await uploadToS3(data, fileName);

  const scrapedData = new ScrapedData({
    userid:userid,
    s3Url: s3Url,
  });

  await scrapedData.save();
  console.log(`Scraped data saved to MongoDB with S3 URL: ${s3Url}`);

  return s3Url;
};