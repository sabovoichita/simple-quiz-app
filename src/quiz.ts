import { JsQuiz } from "./generators/js";
import { MathQuiz } from "./generators/math";
import { BibleQuiz } from "./generators/bible";
import { JsHomework } from "./generators/js-homework";
import { setLanguage, getEl, getUserName, hideEl, setText, debounce, download } from "./common/common";
import {
  Quiz,
  getParam,
  getLevel,
  getQuestionIndexes,
  getPublicTestLink,
  initTime,
  submitTest,
  setParam,
  setParams,
  collectAnswers,
  getPreviewQuestions
} from "./common/utilities";
import { simplePrompt } from "./components/simplePrompt";

// =============================

function getQuestionsByIdx(generator: QuizGenerator, indexes: number[]) {
  let questions = indexes.map(i => generator.ALL_QUESTIONS[i]);
  if (generator.shuffle) {
    //@ts-ignore
    questions.shuffle();
  }
  return questions;
}

function getGenerator(domain: string): QuizGenerator {
  switch (domain) {
    case "js":
      return JsQuiz;
    case "js-homework":
      return JsHomework;
    case "math":
      return MathQuiz;
    case "bible":
      return BibleQuiz;
    default:
      return JsQuiz;
  }
}

function initGeneratorParams(generator: QuizGenerator) {
  const limit = getParam("limit");
  if (limit) {
    generator.displayLimit = parseInt(limit);
  }
  const shuffle = getParam("shuffle");
  if (shuffle) {
    generator.shuffle = shuffle === "true" || shuffle === "1";
  }
  const correct = getParam("correct");
  if (correct === "true" || correct === "1") {
    generator.showCorrectAnswers = true;
  }
}

function applyUserName(type: string, day: string, ask: boolean) {
  const studentName = getUserName(ask);
  document.title = `${type}-test-${day}-${studentName}`;
  setText("#student-name", studentName);
}

function previewQuestions(value: string, generator: QuizGenerator, lastId: number, level: number) {
  const questions = getPreviewQuestions(value, lastId, level);
  Quiz.removeAll();
  Quiz.render(questions, generator);
}

function initAddQuestionInput(generator: QuizGenerator, btn: HTMLButtonElement) {
  const lastQ = generator.ALL_QUESTIONS.slice(-1)[0];
  const lastId = lastQ ? parseInt(lastQ.id as string) : 0;
  const level = getLevel();
  const addInput = getEl<HTMLInputElement>("#addQuestions");
  addInput.style.display = "block";
  const storageKey = "quiz-add-questions";
  addInput.value = localStorage.getItem(storageKey) || "";
  addInput.addEventListener(
    "input",
    debounce(e => {
      // @ts-ignore
      const value = e.target.value;
      previewQuestions(value, generator, lastId, level);
      btn.disabled = value.trim() === "";
      localStorage.setItem(storageKey, value);
    }, 1000)
  );
}

export const startQuiz = async () => {
  let questions;
  let indexes = getQuestionIndexes();
  const domain = getParam("domain") || "js";
  const generator = getGenerator(domain);
  initGeneratorParams(generator);
  await generator.init();
  document.title = generator.defaultTitle;
  const isAdd = getParam("add") === "true";
  if (isAdd) {
    generator.shuffle = false;
    getEl("#submit-test").style.display = "none";
  }
  let level = getLevel();

  const day = initTime();

  const questionsEl = getEl("#questions");

  const type = getParam("type") || "theoretical";
  if (indexes) {
    if (indexes.length === 1) {
      console.info("Generate Test link...");
      const key = `quiz-${domain}-${type}`;
      const defaultTest = localStorage.getItem(key) || "";

      const minutes = await simplePrompt("Expire after (minutes)", "5"); // TODO not working yet...
      const enterMinutes = prompt("Expire after (minutes)", "5") || "5";
      const expire = parseInt(enterMinutes.trim()) || 5;
      const ids = prompt("Enter questions IDS (comma separated)", defaultTest).split(/\s*,\s*/gi);
      // const ids = defaultTest.split(/\s*,\s*/gi);

      console.debug("ids", ids);
      localStorage.setItem(key, ids.join(", "));

      const test = getPublicTestLink(generator, ids, expire);
      indexes = getQuestionIndexes(test);
      console.debug("indexes", indexes);
      setParams({ domain, type, test });
    }
    applyUserName(type, day, false);

    hideEl("#reset");
    questions = getQuestionsByIdx(generator, indexes);
    //console.info("questions", questions);
  } else {
    questions = await generator.generateQuestions(level);
  }

  if (!indexes) {
    const LevelSelector = generator.getLevelSelector(level, async (e: any) => {
      level = parseInt(e.target.value);
      setParam("level", level);
      if (isAdd) {
        window.location.reload();
        return;
      }
      questions = await generator.generateQuestions(level);
      Quiz.reset(questions);
      generator.reset();
    });
    questionsEl.appendChild(LevelSelector);
  }

  Quiz.render(questions, generator);

  // init events
  getEl("#reset").addEventListener("click", () => {
    Quiz.reset();
  });
  getEl("#submit-test").addEventListener("click", () => {
    if (getUserName()) {
      submitTest(generator);
    } else {
      applyUserName(type, day, true);
    }
  });
  getEl("#language-selector").addEventListener("click", e => {
    const target: any = e.target;
    if (target.matches("a")) {
      setLanguage(target.innerText);
    }
  });
  getEl("#student-name").addEventListener("click", () => {
    applyUserName(type, day, true);
  });

  if (isAdd) {
    hideEl("#reset");
    const btn = createAddQuestionsButton(generator);
    createClearEntersButton(generator);
    initAddQuestionInput(generator, btn);
  }

  const index = getParam("index");
  const showId = index === "id";
  if (showId) {
    const copyIdsBtn = createCopyIdsBtn();
    const loadIdsBtn = createButton({
      text: "Select ID's",
      disabled: false,
      cls: ["primary", "hide-on-print"]
    });
    loadIdsBtn.addEventListener("click", () => {
      const ids = prompt("Enter questions IDS (comma separated)", "1, 2").split(/\s*,\s*/gi);
      ids.forEach(id => {
        const article = getEl(`#q-${id}`);
        article.classList.add("selected");
        getEl<HTMLInputElement>("input.select", article).checked = true;
      });
      copyIdsBtn.disabled = getSelectedIds().length === 0;
    });
    getEl("#footer-actions").appendChild(loadIdsBtn);

    questionsEl.addEventListener("click", e => {
      const target: any = e.target;
      if (target.matches("article .select")) {
        const article = target.closest("article");
        article.classList.toggle("selected");
        copyIdsBtn.disabled = getSelectedIds().length === 0;
      }
    });
  }
};

type ButtonConfig = {
  text: string;
  disabled: boolean;
  cls?: string[];
};
function createButton({ text, disabled, cls = [] }: ButtonConfig) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.classList.add(...cls);
  btn.innerHTML = text;
  btn.disabled = disabled;
  return btn;
}

function getSelectedIds() {
  const ids = Array.from(document.querySelectorAll<HTMLInputElement>("input[type=checkbox].select:checked")).map(
    input => input.value
  );
  console.warn("copy", ids);
  return ids;
}

function createClearEntersButton(generator: QuizGenerator) {
  const btn = createButton({
    text: "Remove Enters",
    disabled: false,
    cls: ["hide-on-print"]
  });
  btn.addEventListener("click", () => {
    const lastId = parseInt(generator.ALL_QUESTIONS.slice(-1)[0].id as string);
    const level = getLevel();
    const addInput = getEl<HTMLInputElement>("#addQuestions");
    addInput.value = addInput.value.replace(/\n{2,}/gi, "\n");
    previewQuestions(addInput.value, generator, lastId, level);
  });
  getEl("#footer-actions").appendChild(btn);
}

function createAddQuestionsButton(generator: QuizGenerator) {
  const btn = createButton({
    text: "Add Questions",
    disabled: true,
    cls: ["primary", "hide-on-print"]
  });
  btn.addEventListener("click", async () => {
    const response = await fetch(generator.answersUrl);
    const correctAnswers = await response.json();
    const answers = collectAnswers();
    Object.entries(answers).forEach(([key, value]) => {
      const correctValues = value.filter(v => v.checked).map(v => v.value);
      correctAnswers[key] = correctValues.length === 1 ? correctValues[0] : correctValues;
    });
    const all = [
      ...generator.ALL_QUESTIONS,
      // simplified version of answers
      ...Quiz.renderedQuestions.map(question => {
        return {
          ...question,
          answers: question.answers.map(answer => answer.text)
        };
      })
    ];

    // console.warn("out", all, correctAnswers);
    const questionsStr = JSON.stringify(all, null, 2);
    const answersStr = JSON.stringify(correctAnswers, null, 2);
    // navigator.clipboard.writeText(questionsStr);
    download(questionsStr, "questions.json", "application/json");
    download(answersStr, "answers.json", "application/json");
  });
  getEl("#footer-actions").appendChild(btn);
  return btn;
}

function createCopyIdsBtn() {
  const btn = createButton({
    text: "Copy ID's",
    disabled: true,
    cls: ["primary", "hide-on-print"]
  });
  btn.addEventListener("click", () => {
    const ids = getSelectedIds();
    navigator.clipboard.writeText(ids.join(", "));
  });
  getEl("#footer-actions").appendChild(btn);
  return btn;
}
