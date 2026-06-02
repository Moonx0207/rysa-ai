const chatMessages = document.getElementById("chatMessages");
const chatForm = document.getElementById("chatForm");
const userPrompt = document.getElementById("userPrompt");
const sendButton = chatForm.querySelector("button");
const heroHeading = document.querySelector(".hero h1");

const API_URL = "https://rysa-ai.onrender.com";
const PLACEHOLDER_TEXTS = [
  "Pergunte sobre variáveis, loops ou funções...",
  "Como começo na programação do zero?",
  "O que faz um if no código?",
  "Me explique Python de um jeito simples.",
];

let placeholderIndex = 0;
let placeholderTimer = null;

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

marked.setOptions({
  breaks: true,
  gfm: true,
});

function renderMarkdown(text) {
  return DOMPurify.sanitize(marked.parse(text));
}

function animateHeroHeading() {
  if (!heroHeading) {
    return;
  }

  const headingText = heroHeading.textContent || "";
  heroHeading.setAttribute("aria-label", headingText);
  heroHeading.textContent = "";

  for (const character of headingText) {
    if (character === " ") {
      const space = document.createElement("span");
      space.className = "hero-letter hero-space";
      space.innerHTML = "&nbsp;";
      heroHeading.appendChild(space);
      continue;
    }

    const letter = document.createElement("span");
    letter.className = "hero-letter";
    letter.textContent = character;
    heroHeading.appendChild(letter);
  }
}

function addMessage(text, role) {
  const message = document.createElement("div");
  message.className = `message ${role}`;

  if (role === "ai") {
    message.innerHTML = renderMarkdown(text);
  } else {
    message.textContent = text;
  }

  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return message;
}

function splitReplyIntoLines(text) {
  const normalized = text.replace(/\r\n/g, "\n").trim();

  if (normalized.includes("\n")) {
    return normalized.split("\n");
  }

  const sentences = normalized.match(/[^.!?]+[.!?]?/g);

  if (sentences && sentences.length > 1) {
    return sentences.map((sentence) => sentence.trim()).filter(Boolean);
  }

  return [normalized];
}

async function revealReplyLineByLine(text, message) {
  const lines = splitReplyIntoLines(text);
  const visibleLines = [];

  for (const line of lines) {
    visibleLines.push(line);
    message.innerHTML = renderMarkdown(visibleLines.join("\n\n"));
    chatMessages.scrollTop = chatMessages.scrollHeight;
    await wait(260);
  }
}

function addTypingIndicator() {
  const typing = document.createElement("div");
  typing.className = "message ai typing";
  typing.innerHTML =
    '<span>Rysa está pensando</span><span class="dots" aria-hidden="true"><span></span><span></span><span></span></span>';
  chatMessages.appendChild(typing);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return typing;
}

async function sendQuestion(question) {
  const response = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: question }),
  });

  const data = await response.json();

  if (!response.ok) {
    const detail = data?.detail || "Não foi possível consultar o backend.";
    throw new Error(detail);
  }

  return data.reply;
}

function autoGrowTextarea() {
  userPrompt.style.height = "auto";
  userPrompt.style.height = `${Math.min(userPrompt.scrollHeight, 180)}px`;
}

function setPlaceholder(text) {
  userPrompt.classList.add("placeholder-fade-out");

  window.setTimeout(() => {
    userPrompt.placeholder = text;
    userPrompt.classList.remove("placeholder-fade-out");
  }, 240);
}

function advancePlaceholder() {
  if (userPrompt.value.trim() !== "") {
    return;
  }

  placeholderIndex = (placeholderIndex + 1) % PLACEHOLDER_TEXTS.length;
  setPlaceholder(PLACEHOLDER_TEXTS[placeholderIndex]);
}

function startPlaceholderCycle() {
  if (placeholderTimer) {
    return;
  }

  placeholderTimer = window.setInterval(() => {
    if (
      document.activeElement === userPrompt &&
      userPrompt.value.trim() === ""
    ) {
      return;
    }

    advancePlaceholder();
  }, 8000);
}

function stopPlaceholderCycle() {
  if (!placeholderTimer) {
    return;
  }

  window.clearInterval(placeholderTimer);
  placeholderTimer = null;
}

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const question = userPrompt.value.trim();

  if (!question) {
    userPrompt.focus();
    return;
  }

  addMessage(question, "user");
  userPrompt.value = "";
  autoGrowTextarea();

  const typingIndicator = addTypingIndicator();
  sendButton.disabled = true;

  try {
    const reply = await sendQuestion(question);
    typingIndicator.remove();
    const replyMessage = addMessage("", "ai");
    await revealReplyLineByLine(reply, replyMessage);
  } catch (error) {
    typingIndicator.remove();
    addMessage(
      error instanceof Error
        ? `Erro ao conectar com o backend JSON: ${error.message}`
        : "Erro ao conectar com o backend JSON.",
      "ai",
    );
  } finally {
    sendButton.disabled = false;
    userPrompt.focus();
  }
});

userPrompt.addEventListener("input", autoGrowTextarea);
userPrompt.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

addMessage("Olá! Eu sou a Rysa AI. Como posso te ajudar?", "ai");

userPrompt.placeholder = PLACEHOLDER_TEXTS[placeholderIndex];
startPlaceholderCycle();
animateHeroHeading();
