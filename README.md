# Bootcamp 13.0 Website

An interactive promotional website built for **Bootcamp 13.0**, a Computer Science freshman event in UP Diliman.

<img width="1648" height="941" alt="image" src="https://github.com/user-attachments/assets/9dcfb1cd-007b-4f44-b192-9a9dda7f2d4c" />

## Features

### Score Tracker

The **Score Tracker** displays the current standings of all eight houses in a bar chart. Scores are loaded from a Google Sheet and sorted from highest to lowest.

<img width="1652" height="923" alt="image" src="https://github.com/user-attachments/assets/634dc521-0ebf-4bdd-88b2-cb8c45e65f42" />

### Whispers of the Arcane

The **Whispers of the Arcane** page is a small card-drawing advice page. Users can click or press Enter/Space on the card to reveal a random premonition/advice from higher batches.

I wonder what the cards tell?

<img width="1652" height="926" alt="image" src="https://github.com/user-attachments/assets/d8047c61-e3b5-45e8-a076-78523a6073ab" />

### The Houses

The **Houses** page introduces the eight Bootcamp houses through tarot-inspired cards. Each house is paired with an Arcana, an icon, a short description, and its own theme.

| House         | Arcana       |
| ------------- | ------------ |
| Planeswalkers | The Magician |
| Trailblazers  | The Star     |
| Conquerers    | The Emperor  |
| Heartweavers  | The Lovers   |
| Pathmakers    | The Chariot  |
| Truthseekers  | The Hermit   |
| Descenders    | The Fool     |
| Lightbearers  | The Sun      |

![Uploading image.png…]()

### Program & Events

The **Program & Events** page presents the three-day Bootcamp schedule as a visual roadmap covering **The Past, The Present, and The Future**. A full-size version of the roadmap can also be opened from the page.

## Stack

* HTML
* CSS
* JavaScript
* Google Sheets
* Node.js / npm for the project's dependency setup

The repository is primarily a static HTML/CSS/JavaScript site. Its `package.json` currently contains `dotenv` as its only dependency.

## Project Structure

```text
arcane-site/
├── assets/
│   ├── icons/
│   └── roadmap.png
├── components/
├── css/
├── js/
│   ├── embers.js
│   ├── load-nav.js
│   ├── sheets.js
│   ├── tracker.js
│   └── whispers.js
├── src/
├── houses.html
├── index.html
├── roadmap.html
├── tracker.html
├── whispers.html
├── package.json
└── README.md
```

The main pages are linked from the landing page, while shared navigation and visual effects are loaded through JavaScript.

## Running Locally

Clone the repository:

```bash
git clone https://github.com/jibrix01/arcane-site.git
cd arcane-site
```

Install the project dependency:

```bash
npm install
```

Since the site is made primarily from static files, you can serve it with any local HTTP server. For example:

```bash
npx serve .
```

Then open the local address shown by the server.

## Live Site

The deployed site is available at:

[Bootcamp 13.0](https://bootcamp-130.vercel.app/?utm_source=chatgpt.com)


