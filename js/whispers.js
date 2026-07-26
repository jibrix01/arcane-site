const PREMONITIONS = [
  "Consult frequently! you learn a lot from constant back and forth feedback more than you think - hinayupak",
  "Gameify your studies! - hinayupak",
  "Make lots of good friends, they will be your lifeline - jiogn mortera",
  "Join a home org! - barkbarkbark",
  "Don't be afraid to make mistakes. College becomes more worthwhile if you try new things. you're bound to make mistakes here and there, but that's when we grow - suspiciously joel-shaped tarsier",
  "Balance your breadth and depth when it comes to trying things - jiogn mortera",
  "For group works: set boundaries early on/sign a contract to make sure everyone agrees with how you all plan to deal with task distribution, misunderstandings, and accountability - hinayupak",
  'The motto of our university is "Honor and Excellence" and honor must always precede excellence - jonvictor remulla',
  "Treat sleep as a non-negotiable. If need mo magpuyat, sanayin mo matulog at least 3hrs - JJ",
  "Rest is productive, dont forget rest please (hypocrite toh guys) - aebtastic",
  "Explore spaces in UP! malay mo makakita ka ng magandang food spots, resting spots, 5 star cr spots with bidet, or goated libraries to study in - Aebtastic",
  "Dont hesitate to ask anyone! youll be surprised at how accommodating everyone is in the university, from profs, higher batchs, batchmates, orgmates, basically anyone - Aebtastic",
  "Be kind to yourself. College is wayyyyy different from high school! - Reuter the router",
  "Learn email etiquette! it's a good habit to develop as early as possible as it can help you in the long run (from emailing profs, to job hunting - Drey",
  "Wag murahin yung mga profs - hinayupak",
  "Wag matakot sumali sa orgs, as long as you're genuinely interested pero mauuna parin dapat ang acads before any orgwork - Enzo"
];


(function () {
  const card = document.getElementById("whisper-card");
  const textEl = document.getElementById("whisper-text");
  const hintEl = document.getElementById("whisper-hint");
  const drawBtn = document.getElementById("draw-btn");

  let lastIndex = -1;
  let hasDrawnOnce = false;

  function pickPremonition() {
    let i;
    do {
      i = Math.floor(Math.random() * PREMONITIONS.length);
    } while (i === lastIndex && PREMONITIONS.length > 1);
    lastIndex = i;
    return PREMONITIONS[i];
  }

  function draw() {
    const flipping = card.classList.contains("is-flipped");

    if (flipping) {
      card.classList.remove("is-flipped");
      setTimeout(() => {
        textEl.textContent = pickPremonition();
        card.classList.add("is-flipped");
      }, 450);
    } else {
      textEl.textContent = pickPremonition();
      card.classList.add("is-flipped");
    }

    hasDrawnOnce = true;
    hintEl.textContent = "Click the card to draw again";
    drawBtn.textContent = "Draw Again";
  }

  card.addEventListener("click", draw);
  drawBtn.addEventListener("click", draw);
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      draw();
    }
  });
})();
