const PREMONITIONS = [
  "Comment your code before you sleep, not after \u2014 the you of tomorrow trusts the you of tonight less than you think.",
  "Read the error message. All of it. The line you skipped is where the answer was hiding.",
  "A study group of three moves faster than five and further than one.",
  "Version control is not for when things break. Commit before you're afraid you'll need to.",
  "The bug is almost never where you're looking. Widen the search before you rewrite the world.",
  "Ask the question in section before it becomes the question you whisper before an exam.",
  "Rubber duck it. Say the problem out loud before you say it's impossible.",
  "Sleep debt compounds faster than technical debt, and it's the one that gets you first.",
  "Write the test before the fix. You'll know exactly when you're done.",
  "The professor's office hours are emptier than the anxiety in your chest suggests.",
  "Group projects reward the first message, not the smartest one. Send it.",
  "Your first solution rarely needs to be your best one. Ship it, then sharpen it.",
  "Print statements are not cheating. They are a lantern in a dark function.",
  "The syllabus is a map, not a prophecy. Check it before you assume the worst.",
  "A clean desk won't fix a messy codebase, but it helps you notice which is which.",
  "Deadlines fear the student who starts messy more than the one who waits for clarity.",
  "Every senior you admire once stared at a blank file for an hour. That part never fully goes away.",
  "Save your work in threes: locally, remotely, and in the memory of a friend who saw you do it.",
  "The Stack Overflow answer with one upvote is sometimes the one written for exactly your case.",
  "Take the walk. The compiler will still be wrong when you get back, but so will your patience be renewed.",
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
