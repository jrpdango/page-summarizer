# Page Summarizer

This is a proof-of-concept application for summarizing a website's text by passing it to an LLM. <br />
For demo purposes, only Lifewire articles are supported.

## Explanation

For a more in-depth look, see [the Explanation document](https://github.com/jrpdango/page-summarizer/blob/main/Explanation.md).

## Quick Start

- Create a `.env` file in the project root directory with an `API_KEY` entry for a Gemini API key. For example:
```
# .env
API_KEY=YOUR_GEMINI_KEY_HERE
```
- Run `npm install` to install dependencies
- Run `npm run dev` to start a development server