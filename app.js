// app.js
// Plain global JS, no modules.

// -------------------
// Data generator
// -------------------
const TAGS = [
  "Coffee","Hiking","Movies","Live Music","Board Games","Cats","Dogs","Traveler",
  "Foodie","Tech","Art","Runner","Climbing","Books","Yoga","Photography"
];
const FIRST_NAMES = [
  "Alex","Sam","Jordan","Taylor","Casey","Avery","Riley","Morgan","Quinn","Cameron",
  "Jamie","Drew","Parker","Reese","Emerson","Rowan","Shawn","Harper","Skyler","Devon"
];
const CITIES = [
  "Brooklyn","Manhattan","Queens","Jersey City","Hoboken","Astoria",
  "Williamsburg","Bushwick","Harlem","Lower East Side"
];
const JOBS = [
  "Product Designer","Software Engineer","Data Analyst","Barista","Teacher",
  "Photographer","Architect","Chef","Nurse","Marketing Manager","UX Researcher"
];
const BIOS = [
  "Weekend hikes and weekday lattes.",
  "Dog parent. Amateur chef. Karaoke enthusiast.",
  "Trying every taco in the city — for science.",
  "Bookstore browser and movie quote machine.",
  "Gym sometimes, Netflix always.",
  "Looking for the best slice in town.",
  "Will beat you at Mario Kart.",
  "Currently planning the next trip."
];

const UNSPLASH_SEEDS = [
  "1515462277126-2b47b9fa09e6",
  "1520975916090-3105956dac38",
  "1519340241574-2cec6aef0c01",
  "1554151228-14d9def656e4",
  "1548142813-c348350df52b",
  "1517841905240-472988babdf9",
  "1535713875002-d1d0cf377fde",
  "1545996124-0501ebae84d0",
  "1524504388940-b1c1722653e1",
  "1531123897727-8f129e1688ce",
];

function sample(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickTags() { return Array.from(new Set(Array.from({length:4}, ()=>sample(TAGS)))); }
function imgFor(seed) {
  return `https://images.unsplash.com/photo-${seed}?auto=format&fit=crop&w=1200&q=80`;
}

function generateProfiles(count = 12) {
  const profiles = [];
  for (let i = 0; i < count; i++) {
    profiles.push({
      id: `p_${i}_${Date.now().toString(36)}`,
      name: sample(FIRST_NAMES),
      age: 18 + Math.floor(Math.random() * 22),
      city: sample(CITIES),
      title: sample(JOBS),
      bio: sample(BIOS),
      tags: pickTags(),
      img: imgFor(sample(UNSPLASH_SEEDS)),
    });
  }
  return profiles;
}

// -------------------
// UI rendering
// -------------------
const deckEl = document.getElementById("deck");
const shuffleBtn = document.getElementById("shuffleBtn");
const likeBtn = document.getElementById("likeBtn");
const nopeBtn = document.getElementById("nopeBtn");
const superLikeBtn = document.getElementById("superLikeBtn");

let profiles = [];
let activeDrag = null;
let isAnimatingOut = false;
let lastTap = { time: 0, x: 0, y: 0 };

const SWIPE_X_THRESHOLD = 90;
const SWIPE_UP_THRESHOLD = -110;
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_DISTANCE = 28;

const ACTION_LABELS = {
  left: "NOPE",
  right: "LIKE",
  up: "SUPER",
};

function renderDeck() {
  deckEl.setAttribute("aria-busy", "true");
  deckEl.innerHTML = "";

  profiles.forEach((p, idx) => {
    const card = document.createElement("article");
    card.className = "card";

    const img = document.createElement("img");
    img.className = "card__media";
    img.src = p.img;
    img.alt = `${p.name} — profile photo`;

    const body = document.createElement("div");
    body.className = "card__body";

    const titleRow = document.createElement("div");
    titleRow.className = "title-row";
    titleRow.innerHTML = `
      <h2 class="card__title">${p.name}</h2>
      <span class="card__age">${p.age}</span>
    `;

    const meta = document.createElement("div");
    meta.className = "card__meta";
    meta.textContent = `${p.title} • ${p.city}`;

    const chips = document.createElement("div");
    chips.className = "card__chips";
    p.tags.forEach((t) => {
      const c = document.createElement("span");
      c.className = "chip";
      c.textContent = t;
      chips.appendChild(c);
    });

    body.appendChild(titleRow);
    body.appendChild(meta);
    body.appendChild(chips);

    const swipeBadge = document.createElement("div");
    swipeBadge.className = "swipe-badge";

    card.appendChild(img);
    card.appendChild(body);
    card.appendChild(swipeBadge);
    card.style.zIndex = String(idx + 1);

    deckEl.appendChild(card);
  });

  deckEl.removeAttribute("aria-busy");
  bindTopCardInteractions();
}

function resetDeck() {
  profiles = generateProfiles(12);
  activeDrag = null;
  isAnimatingOut = false;
  lastTap = { time: 0, x: 0, y: 0 };
  renderDeck();
}

function getTopCard() {
  return deckEl.lastElementChild;
}

function resetCardPosition(card) {
  card.style.transition = "transform 200ms ease";
  card.style.transform = "translate3d(0, 0, 0) rotate(0deg)";
  clearSwipeBadge(card);
}

function getSwipeBadge(card) {
  return card.querySelector(".swipe-badge");
}

function clearSwipeBadge(card) {
  const badge = getSwipeBadge(card);
  if (!badge) return;
  badge.classList.remove("show", "left", "right", "up");
  badge.style.opacity = "";
  badge.textContent = "";
}

function showSwipeBadge(card, direction, strength = 1) {
  const badge = getSwipeBadge(card);
  if (!badge) return;

  const opacity = Math.max(0.25, Math.min(strength, 1));
  badge.classList.remove("left", "right", "up");
  badge.classList.add("show", direction);
  badge.textContent = ACTION_LABELS[direction] || "";
  badge.style.opacity = String(opacity);
}

function getDragDirection(dx, dy) {
  const upCandidate = dy < 0 && Math.abs(dy) > Math.abs(dx) * 0.8;
  if (upCandidate && Math.abs(dy) > 36) return "up";
  if (dx > 36) return "right";
  if (dx < -36) return "left";
  return null;
}

function updateSwipeBadgeFromDrag(card, dx, dy) {
  const direction = getDragDirection(dx, dy);
  if (!direction) {
    clearSwipeBadge(card);
    return;
  }

  const strength = direction === "up"
    ? Math.abs(dy) / Math.abs(SWIPE_UP_THRESHOLD)
    : Math.abs(dx) / SWIPE_X_THRESHOLD;
  showSwipeBadge(card, direction, strength);
}

function animateOutCard(card, direction) {
  let x = 0;
  let y = 0;
  let rot = 0;

  if (direction === "right") {
    x = window.innerWidth * 1.1;
    y = 20;
    rot = 18;
  } else if (direction === "left") {
    x = -window.innerWidth * 1.1;
    y = 20;
    rot = -18;
  } else if (direction === "up") {
    x = 0;
    y = -window.innerHeight * 1.1;
    rot = 0;
  }

  showSwipeBadge(card, direction, 1);
  card.style.transition = "transform 260ms ease, opacity 260ms ease";
  requestAnimationFrame(() => {
    card.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rot}deg)`;
    card.style.opacity = "0";
  });
}

function performAction(direction) {
  if (isAnimatingOut) return;
  const card = getTopCard();
  if (!card) return;

  isAnimatingOut = true;
  animateOutCard(card, direction);

  window.setTimeout(() => {
    card.remove();
    profiles.pop();
    isAnimatingOut = false;
    bindTopCardInteractions();
  }, 280);
}

function bindTopCardInteractions() {
  const topCard = getTopCard();
  if (!topCard || topCard.dataset.gestureBound === "true") return;

  topCard.dataset.gestureBound = "true";
  topCard.addEventListener("pointerdown", onCardPointerDown);
  topCard.addEventListener("pointermove", onCardPointerMove);
  topCard.addEventListener("pointerup", onCardPointerUp);
  topCard.addEventListener("pointercancel", onCardPointerCancel);
  topCard.addEventListener("dblclick", onPhotoDoubleClick);
}

function onCardPointerDown(event) {
  if (isAnimatingOut || event.button !== 0) return;

  const card = getTopCard();
  if (!card || card !== event.currentTarget) return;

  activeDrag = {
    card,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    moved: false,
  };

  card.setPointerCapture(event.pointerId);
  card.classList.add("is-dragging");
}

function onCardPointerMove(event) {
  if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;

  const dx = event.clientX - activeDrag.startX;
  const dy = event.clientY - activeDrag.startY;
  const movedEnough = Math.hypot(dx, dy) > 8;

  if (movedEnough) {
    activeDrag.moved = true;
  }

  if (!activeDrag.moved) return;

  const tilt = dx / 14;
  activeDrag.card.style.transform = `translate3d(${dx}px, ${dy}px, 0) rotate(${tilt}deg)`;
  updateSwipeBadgeFromDrag(activeDrag.card, dx, dy);
}

function isOnPhoto(target) {
  return Boolean(target.closest(".card__media"));
}

function withinDoubleTapDistance(x, y) {
  return Math.hypot(x - lastTap.x, y - lastTap.y) <= DOUBLE_TAP_DISTANCE;
}

function onPhotoDoubleClick(event) {
  if (!isOnPhoto(event.target)) return;
  performAction("right");
}

function onCardPointerUp(event) {
  if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;

  const drag = activeDrag;
  const card = drag.card;
  const dx = event.clientX - drag.startX;
  const dy = event.clientY - drag.startY;

  card.classList.remove("is-dragging");
  activeDrag = null;

  if (!drag.moved) {
    if (isOnPhoto(event.target)) {
      const now = Date.now();
      const isDoubleTap = (now - lastTap.time) <= DOUBLE_TAP_MS && withinDoubleTapDistance(event.clientX, event.clientY);

      if (isDoubleTap) {
        performAction("right");
      }

      lastTap = { time: now, x: event.clientX, y: event.clientY };
    }
    resetCardPosition(card);
    return;
  }

  const isStrongUp = dy < SWIPE_UP_THRESHOLD && Math.abs(dy) > Math.abs(dx) * 0.8;

  if (dx > SWIPE_X_THRESHOLD) {
    performAction("right");
  } else if (dx < -SWIPE_X_THRESHOLD) {
    performAction("left");
  } else if (isStrongUp) {
    performAction("up");
  } else {
    resetCardPosition(card);
  }
}

function onCardPointerCancel(event) {
  if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;

  const card = activeDrag.card;
  activeDrag = null;
  card.classList.remove("is-dragging");
  resetCardPosition(card);
}

likeBtn.addEventListener("click", () => performAction("right"));
nopeBtn.addEventListener("click", () => performAction("left"));
superLikeBtn.addEventListener("click", () => performAction("up"));
shuffleBtn.addEventListener("click", resetDeck);

// Boot
resetDeck();
