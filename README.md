# Bootcamp 13.0 Website

An interactive promotional website built for **Bootcamp 13.0**, a Computer Science freshman event in UP Diliman.

<img width="1668" height="945" alt="image" src="https://github.com/user-attachments/assets/7c1d096a-8e96-4329-81ad-4355773dce8b" />

## Features

### Score Tracker

The **Score Tracker** displays the current standings of all eight houses in a bar chart. Scores are loaded from a Google Sheet and sorted from highest to lowest.

<img width="1686" height="956" alt="image" src="https://github.com/user-attachments/assets/e44c2db5-7485-4ffb-b2e0-da0773365d07" />

### Whispers of the Arcane

The **Whispers of the Arcane** page is a small card-drawing advice page. Users can click or press Enter/Space on the card to reveal a random premonition/advice from higher batches.

I wonder what the cards tell?

<img width="1673" height="917" alt="image" src="https://github.com/user-attachments/assets/e5b605b8-95b0-43b5-a50a-5ef60aaf6ecb" />

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

<img width="1676" height="972" alt="image" src="https://github.com/user-attachments/assets/827a43d3-65b8-48a2-8a1f-16c5d2730b23" />

### Program & Events

The **Program & Events** page presents the three-day Bootcamp schedule as a visual roadmap covering **The Past, The Present, and The Future**. A full-size version of the roadmap can also be opened from the page.

<img width="1685" height="972" alt="image" src="https://github.com/user-attachments/assets/632a9133-449d-43b1-a0d6-4ba0b3f84ef6" />

### Battle of Wits

An online game inspired by the mechanics of the game of trust. House can choose to cooperate with each other or betray each other, gaining some number of points depending on the outcome. Each house can login using their respective account. Admin accounts have the access to choose which matchups will occur per round.

<img width="1227" height="725" alt="image" src="https://github.com/user-attachments/assets/8628adc4-dcbf-4776-be84-fa1cdacdeacc" />

<img width="949" height="631" alt="image" src="https://github.com/user-attachments/assets/67a5d403-1772-4074-9f78-032b93630dd0" />

### Amazing Race

Station handlers can choose which house is currently utilizing their respective station. House handlers can see through the dashboard which stations are occupied, allowing for easy facilitation of stations during the Amazing Race. Station handlers and houses each have their own accounts that can log in.

<img width="1512" height="892" alt="image" src="https://github.com/user-attachments/assets/44a15d19-8efb-4958-9999-1fd14558fa97" />

<img width="1527" height="897" alt="image" src="https://github.com/user-attachments/assets/fb73386c-3b47-4c91-b8db-c129b01ac3ed" />

<img width="1507" height="888" alt="image" src="https://github.com/user-attachments/assets/0394db2f-d02f-4fc1-b651-e92ba3bc5ba3" />

## Stack

* HTML
* CSS
* JavaScript
* Google Sheets
* Node.js / npm for the project's dependency setup
* Supabase

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

```bash
npx serve .
```

Then open the local address shown by the server.

## Live Site

The deployed site is available at:

[Bootcamp 13.0](https://bootcamp-130.vercel.app/?utm_source=chatgpt.com)


