export const scrapePage = async ({ browser, url }) => {
    const page = await browser.newPage();
    await page.goto(url);

    let article; 
    try {
        // Lifewire uses this class on the article itself,
        // so we can get that instead of the entire page's body
        article = await page.waitForSelector('.article-content');
    } catch(error) {
        page.close();
        throw error;
    }

    const text = article.evaluate(el => el.textContent);
    page.close();

    return text;
};