import { bank } from "./data.js";

const LETTERS = ["A", "B", "C", "D"];
const $ = (id) => document.getElementById(id);

const els = {
  picker: $("picker"),
  pickTitle: $("pick-title"),
  list: $("topic-list"),
  view: $("quiz-view"),
  title: $("quiz-title"),
  form: $("quiz"),
  result: $("result"),
  meter: $("meter"),
  count: $("count"),
  submit: $("submit"),
  retry: $("retry"),
  back: $("back"),
};

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const swap = (change) =>
  document.startViewTransition && !reduced() ? document.startViewTransition(change) : change();

let current = null;
let items = [];

const shuffle = (list) => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const el = (tag, props = {}, ...children) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
};

const renderTopics = () => {
  els.list.replaceChildren(
    ...Object.entries(bank).map(([name, questions]) => {
      const button = el("button", { type: "button" }, name, el("small", { textContent: `${questions.length} questions` }));
      button.addEventListener("click", () => start(name));
      return el("li", {}, button);
    })
  );
};

const updateProgress = () => {
  const answered = els.form.querySelectorAll("input:checked").length;
  const total = items.length || 1;
  els.meter.style.setProperty("--p", answered / total);
  els.meter.setAttribute("aria-valuemax", total);
  els.meter.setAttribute("aria-valuenow", answered);
  els.count.value = `${answered}/${items.length}`;
};

const buildQuestion = (item, index) => {
  const set = el(
    "fieldset",
    {},
    el("legend", { textContent: `${index + 1}. ${item.q}` }),
    ...item.options.map((option, k) =>
      el(
        "label",
        { className: "choice" },
        el("input", { type: "radio", name: `q${index}`, value: String(k) }),
        el("span", {}, el("b", { textContent: `${LETTERS[k]}.` }), ` ${option}`)
      )
    )
  );
  set.style.setProperty("--i", index);
  return set;
};

const start = (name) => {
  current = name;
  items = bank[name].map(([q, correct, ...wrong]) => ({ q, correct, options: shuffle([correct, ...wrong]) }));
  swap(() => {
    els.title.textContent = name;
    els.form.replaceChildren(...items.map(buildQuestion));
    els.result.replaceChildren();
    els.result.hidden = true;
    els.retry.hidden = true;
    els.submit.hidden = false;
    els.picker.hidden = true;
    els.view.hidden = false;
    updateProgress();
    scrollTo({ top: 0, behavior: "instant" });
    els.title.focus({ preventScroll: true });
  });
};

const countUp = (node, target, total) => {
  if (reduced()) {
    node.textContent = `${target} / ${total}`;
    return;
  }
  const began = performance.now();
  const tick = (now) => {
    const t = Math.min((now - began) / 1100, 1);
    node.textContent = `${Math.round((1 - Math.pow(1 - t, 4)) * target)} / ${total}`;
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

const grade = () => {
  let score = 0;
  items.forEach((item, i) => {
    const set = els.form.children[i];
    const picked = set.querySelector("input:checked");
    set.querySelectorAll("input").forEach((input) => (input.disabled = true));
    set.querySelectorAll(".choice").forEach((label, k) => {
      if (item.options[k] === item.correct) label.classList.add("ok");
      else if (picked && label.contains(picked)) label.classList.add("no");
    });
    const right = Boolean(picked) && item.options[Number(picked.value)] === item.correct;
    if (right) score++;
    const letter = LETTERS[item.options.indexOf(item.correct)];
    set.append(
      el("p", {
        className: `note ${right ? "yes" : "nope"}`,
        textContent: right ? "Correct!" : `${picked ? "Incorrect" : "Not answered"}. Correct answer: ${letter}. ${item.correct}`,
      })
    );
  });

  const total = items.length;
  const skipped = total - els.form.querySelectorAll("input:checked").length;
  const figure = el("strong", { textContent: `0 / ${total}` });
  els.result.replaceChildren(
    figure,
    `${Math.round((score / total) * 100)}% correct.${skipped ? ` ${skipped} unanswered.` : ""} Green marks the correct answer; red marks your incorrect choice.`
  );
  els.result.hidden = false;
  els.submit.hidden = true;
  els.retry.hidden = false;
  countUp(figure, score, total);
  scrollTo({ top: 0, behavior: reduced() ? "auto" : "smooth" });
};

els.form.addEventListener("change", updateProgress);
els.form.addEventListener("submit", (event) => {
  event.preventDefault();
  grade();
});
els.retry.addEventListener("click", () => start(current));
els.back.addEventListener("click", () =>
  swap(() => {
    els.view.hidden = true;
    els.picker.hidden = false;
    scrollTo({ top: 0, behavior: "instant" });
    els.pickTitle.focus({ preventScroll: true });
  })
);

renderTopics();
