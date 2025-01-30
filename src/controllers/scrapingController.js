import puppeteer from 'puppeteer';
import { crawlWebsite, scrapeAllPages, scrapeBodyContent } from '../services/scrapingService.js';

export const scrapeWebsiteController = async (req, res) => {
  const { url, choice } = req.body;

  if (!req.user || !req.user.userId) {
    return res.status(400).json({ error: "User not authenticated" });
  }

  const userid = req.user.userId;  // Access the authenticated user's userid
  
  // Validation
  if (!url) {
    return res.status(400).json({ error: "URL is required for scraping" });
  }

  if (choice !== "all" && choice !== "current") {
    return res.status(400).json({ error: 'Invalid choice. It must be "all" or "current".' });
  }

  const browser = await puppeteer.launch({ headless: true });

  try {
    const startTime = Date.now();
    console.log(
      choice === "all" ? "Scraping the entire site..." : "Scraping the current page..."
    );

    let result;
    if (choice === "all") {
      // Crawl the website for all links and scrape them
      const { links: allLinks } = await crawlWebsite(url, browser);
      const s3Url = await scrapeAllPages(browser, allLinks, userid);

      result = {
        message: "Scraping completed successfully.",
        s3Url: s3Url
      };
    } else {
      // Scrape only the current page
      const pageData = await scrapeBodyContent(browser, url, userid);
      result = {
        message: "Scraping completed successfully.",
        pagesData: {
          paragraphs: pageData.paragraphs,
          links: pageData.links,
          urls: [url],
        },
      };
    }

    const endTime = Date.now();
    const timeTaken = (endTime - startTime) / 1000;

    console.log("\n--- Scraping Summary ---");
    console.log(`Time Taken: ${timeTaken.toFixed(2)} seconds`);

    res.status(200).json({
      message: result.message,
      data: result.pagesData || result.s3Url,
      timeTaken: timeTaken.toFixed(2),
    });
  } catch (error) {
    console.error("Scraping error:", error);
    res.status(500).json({ error: "Scraping failed" });
  } finally {
    await browser.close();
  }
};