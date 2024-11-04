## Preface

Before we begin, I want to preface this by saying that all of the text below is written by me -- **none of it is AI generated.**

## The Problem

Sometimes we need to read some information from a website but don't necessarily want to read it all from top to bottom. We want to be able to feed text to a program and have it summarize things for us, so it's easier and faster to get the main points.

## A Possible Solution

The program in this repository is a proof-of-concept solution for the problem above. It is designed to receive a URL, retrieve the text content, have it summarized by AI, and display back the output to the user. It stores all results and errors in a database that users can reference through the available API.

## Technical Specs

This program was built with Node.js and JavaScript. The following is a short list of other technologies used and why they were chosen:

- I chose to use [**Express**](https://expressjs.com/) as the web framework since this is a small app. It's relatively straightforward to set up, and something like [**NestJS**](https://nestjs.com/) would've been a bit overkill for what I needed to do. 
- My database of choice is [**SQLite**](https://www.sqlite.org/). It's lightweight and easy to use, even allowing an existing database file to be included in the `db/` directory of this repository, for reference.
- Following recommendations, the app uses [**Puppeteer**](https://pptr.dev/) to browse and scrape data.
- I picked the [**Gemini**](https://gemini.google.com) API for summaries because it's free and I already had a key beforehand.
- I used [**Jest**](https://jestjs.io/) to create tests. It's used in many different JS frameworks so you can learn it to use in other projects. Plus, it doesn't need much config to get up and running.
- Lastly, [**ESLint**](https://eslint.org/) is the code linter used for syntax checking and issue catching.

The GitHub repository automatically runs the linter and tests when pushing to the `main` branch.

## Limitations

For the purposes of this demo, the application is limited to reading [Lifewire](https://www.lifewire.com/) articles to keep the scope simple. 

I chose Lifewire because their articles have consistent structuring, usually containing something like this:

```html
<div class="loc article-content">
	<!-- article text here -->
</div>
```

This makes it easy to scrape the article with Puppeteer, only needing us to select the `article-content` class to get the text we want to summarize. 

That said, If we really wanted to make the AI summarize *any* given URL, we can theoretically just take the contents of any website's `<body>` tag and pass that to the LLM and ask for a summary. 

Something to think about, however, is that any given website will not only have a variable amount of text in its `<body>`, it will also vary in the actual structure and content. Thus, if we'd ever want to expand this program to accept all URLs, it'd have to be able to handle possibly thousands of lines of HTML, cleaning it up, managing API rate limits, etc. 

## Usage

### Prerequisites
- A `.env` file with an `API_KEY` entry for a Gemini API key.
- If you want to manually create the `jobs` table in `db/data.db`, a `.sql` file is provided. Otherwise, the app will automatically create it for you. 
- Don't forget to run `npm install` to install the project dependencies.
### Scripts
- `npm run dev` - run development server
- `npm test` - run tests
- `npm lint` - run linter 
### Other Notes
- To read the database outside the application, you need `sqlite3` installed on your system. Assuming you're in the `db/` directory, for Linux, the command to open the `sqlite` shell is as follows:
```bash
$ sqlite3 data.db 
```
- SQLite may rarely crash the app with the error: `SQLITE_READONLY: attempt to write a readonly database`. This may likely be caused by multiple processes accessing the db file at the same time (e.g. `sqlite` shell is active while the server is interacting with the database). If we need better concurrency, one option is to enable [WAL journal mode](https://www.sqlite.org/wal.html). I opted to not do that for now as concurrency isn't the biggest concern for the scope of this project and that it also creates `-wal` and `-shm` files that make git commits a little more complex than they need to be.
### How It Works
This app has two endpoints: a POST to create a job, and a GET to retrieve info about that job. I created a handler class called `JobHandler` that has the methods to perform both tasks, `createJob` and  `getJob`. I also created a `Job` model that can interact with the database. Whilst each job has its own integer ID for a primary key, I opted to also add in a UUID to more easily identify jobs since getting the last inserted ID requires waiting for a callback from a recent query, and simply returning the generated UUID is faster than waiting for the callback to finish. 

When a valid POST is made, `createJob` inserts a pending job into the database and immediately responds to the request. It then scrapes the desired text using the `scrapePage` function and passes it to the AI with `summarize`. The job created earlier is then updated in the database with the result and then logged. We can create a separate method for updating the pending job if more code separation is needed, but I decided to leave it be since it's only a few lines long.  

#### Example POST body:
```json
{
  "url": "https://www.lifewire.com/google-maps-gemini-ai-enhancements-8737295"
}
```

#### Example response:
```json
{
  "uuid":"c4ab9318-0220-421f-b04a-213a68f58c33",
  "url":"https://www.lifewire.com/google-maps-gemini-ai-enhancements-8737295",
  "status":"pending"
}
```
A valid GET request can be made any time to check the status and result of an existing job. If a job failed, it will also show an error message.

#### Example GET url:
```
http://127.0.0.1:3000/?uuid=2251d971-12ec-4e91-a522-a25062646c6f
```

#### Example response:
```json
{
  "uuid": "2251d971-12ec-4e91-a522-a25062646c6f",
  "url": "https://www.lifewire.com/google-maps-gemini-ai-enhancements-8737295",
  "result": "Google Maps is integrating Gemini AI to enhance its capabilities, making it more helpful for planning outings and adventures. Users can now ask Maps for \"inspiration\" by providing a few parameters, and the app will suggest \"thematically curated\" locations based on real user reviews and information.  Gemini's suggestions are fact-checked for accuracy, and users can interact with them by making reservations, getting directions, and discovering additional stops along the route.  New features include route navigation assistance, parking information, weather disruptions, and more. These updates are being rolled out gradually, starting today, October 31st. \n",
  "status": "completed"
}
```

Both methods have error checking and utilize the `handleError` function to send responses and log when they occur. Error messages are also saved to the database, and the actual errors are logged to the console. If needed, the storing of actual errors can also be implemented in the future.

#### Example failed response:
```json
{
  "uuid": "583d6345-2115-4097-8584-4a27dbfbb6d6",
  "url": "https://www.lifewire.com/not-a-real-article",
  "result": null,
  "status": "failed",
  "error": "Failed to retrieve text content"
}
```
## Other Possible Improvements

Of course, this list is not going to be exhaustive, but there are some things I'd want to do if this were to become a large-scale application:

### Application

- As mentioned in an earlier section, to be able to handle all URLs instead of just Lifewire articles, we'll have to parse the `<body>` of a given site. It's important to get an AI plan with better rate limits and tokens per request. We can try to reduce the amount of text passed to the AI by removing elements from the body that aren't text, like `<img>`. 
- Replace SQLite with a dedicated database server like PostgreSQL or MongoDB, set up for concurrency. This is also important because the current SQLite implementation might allow SQL injection attacks.
- Clustering can allow scaling by utilizing multiple worker processes to handle loads.
- Create a caching system with something like [Redis](https://redis.io/). This is useful for jobs that are commonly called for in the GET endpoint, so the server doesn't need to get the info from the database over and over again.

### Development

- Use [TypeScript](https://www.typescriptlang.org/). It's a lot safer than plain JavaScript thanks to strong typing that helps prevent runtime errors. It greatly helps the development process as well by improving readability and syntax.
- Use a more fleshed-out framework like NestJS. Express is great for smaller to medium-sized projects, but it does tend to get confusing or a little messy as it gets bigger. NestJS helps manage project structure for you, allows you to easily add or remove features thanks to modular resources, has dependency injection, and more. Otherwise, something like [Fastify](https://fastify.dev/) would also be nice if we still want to use a more minimalist framework.

### Deployment

- If deploying using NGINX, that can also be used as a load balancer.