const APP_LANGUAGE = "app-language";
const USER_NAME = `quiz-user-name`;

export function getLanguage() {
  return localStorage.getItem(APP_LANGUAGE) || "en";
}
export function setLanguage(language: "en" | "ro") {
  localStorage.setItem(APP_LANGUAGE, language);
}

export function getUserName(ask?: boolean) {
  const defaultName = localStorage.getItem(USER_NAME) || "";
  if (defaultName && !ask) {
    return defaultName;
  }
  let name = prompt("Enter you full name (firstname & lastname)", defaultName) || defaultName;
  name = name.trim();
  setUserName(name);
  return name;
}

export function setUserName(name: string) {
  localStorage.setItem(USER_NAME, name);
}

export function getEl(selector: string, parent?: Element) {
  return (parent || document).querySelector(selector);
}

export function setText(selector: string, text: string) {
  getEl(selector).innerHTML = text;
}

export function hideEl(selector: string) {
  //@ts-ignore
  getEl(selector).style.display = "none";
}
