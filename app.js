// Интерфейс тестового fullscreen Mini App. Логику полного экрана см. в fullscreen.js.
const tg = window.Telegram && window.Telegram.WebApp;
const $ = (id) => document.getElementById(id);
let presses = 0;

const has = (v) => !!(tg && tg.isVersionAtLeast && tg.isVersionAtLeast(v));
const log = (text) => { $("log").textContent = text; };
const px = (n) => (typeof n === "number" ? Math.round(n) + " px" : "—");

function row(label, value) {
  const div = document.createElement("div");
  div.className = "row";
  const dt = document.createElement("dt");
  dt.textContent = label;
  const dd = document.createElement("dd");
  dd.textContent = value;
  div.append(dt, dd);
  return div;
}

function renderUser() {
  // initDataUnsafe НЕ проверен: настоящий бэкенд обязан проверить подпись initData токеном бота.
  const user = tg && tg.initDataUnsafe && tg.initDataUnsafe.user;
  if (!user) return;
  const full = [user.first_name, user.last_name].filter(Boolean).join(" ");
  $("name").textContent = full || "Без имени";
  $("handle").textContent = user.username ? "@" + user.username : "id " + user.id;
  const avatar = $("avatar");
  if (user.photo_url) {
    const img = new Image();
    img.src = user.photo_url;
    img.alt = "";
    avatar.textContent = "";
    avatar.append(img);
  } else {
    avatar.textContent = (full[0] || "?").toUpperCase();
  }
}

function renderScreen() {
  const on = window.FS.isOn;
  const badge = $("badge");
  badge.textContent = on ? "fullscreen" : "окно";
  badge.classList.toggle("on", on);
  $("fs").textContent = on ? "Выйти из полного экрана" : "Войти в полный экран";

  const safe = (tg && tg.safeAreaInset) || {};
  const content = (tg && tg.contentSafeAreaInset) || {};
  const status = !tg ? "нет Telegram"
    : !window.FS.supported ? "клиент старше API 8.0"
    : on ? "включён"
    : window.FS.lastError ? "отказ: " + window.FS.lastError
    : "выключен";

  $("screen").replaceChildren(
    row("Полный экран", status),
    row("Safe area сверху", px(safe.top)),
    row("Зона кнопок Telegram", px(content.top)),
    row("Safe area снизу", px(safe.bottom)),
  );
}

function renderSession() {
  const dark = matchMedia("(prefers-color-scheme: dark)").matches;
  $("session").replaceChildren(
    row("Платформа", tg ? tg.platform : "браузер"),
    row("Версия Mini App API", tg ? tg.version : "—"),
    row("Тема", tg ? tg.colorScheme : dark ? "dark" : "light"),
    row("Высота окна", Math.round(tg ? tg.viewportHeight : innerHeight) + " px"),
  );
}

function renderSwatches() {
  const box = $("swatches");
  const params = tg ? Object.entries(tg.themeParams || {}) : [];
  if (!params.length) {
    box.className = "note";
    box.textContent = "Откройте страницу внутри Telegram, чтобы увидеть цвета темы.";
    return;
  }
  box.className = "swatches";
  box.replaceChildren(...params.map(([key, value]) => {
    const el = document.createElement("div");
    el.className = "sw";
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.style.background = value;
    const name = document.createElement("b");
    name.textContent = key.replace(/_color$/, "");
    const hex = document.createElement("span");
    hex.textContent = value;
    el.append(chip, name, hex);
    return el;
  }));
}

function renderButtons() {
  if (!tg) return;
  $("swipe").textContent = tg.isVerticalSwipesEnabled
    ? "Отключить свайп вниз" : "Включить свайп вниз";
  $("orient").textContent = tg.isOrientationLocked
    ? "Разблокировать ориентацию" : "Зафиксировать ориентацию";
  $("main").textContent = tg.MainButton.isVisible
    ? "Скрыть главную кнопку" : "Показать главную кнопку";
}

function renderAll() {
  renderScreen();
  renderSession();
  renderButtons();
}

function setupActions() {
  $("fs").onclick = () => {
    if (!window.FS.supported) return log("Полный экран: нужен Telegram с Mini App API 8.0+ (лучше телефон)");
    window.FS.toggle();
  };

  $("swipe").onclick = () => {
    if (!has("7.7")) return log("Управление свайпом: нужен API 7.7+");
    tg.isVerticalSwipesEnabled ? tg.disableVerticalSwipes() : tg.enableVerticalSwipes();
    renderButtons();
  };

  $("orient").onclick = () => {
    if (!has("8.0")) return log("Фиксация ориентации: нужен API 8.0+");
    tg.isOrientationLocked ? tg.unlockOrientation() : tg.lockOrientation();
    renderButtons();
  };

  $("haptic").onclick = () =>
    tg && tg.HapticFeedback ? tg.HapticFeedback.impactOccurred("medium") : log("Вибро-отклик работает только в Telegram");

  $("alert").onclick = () =>
    tg && tg.showAlert ? tg.showAlert("Привет из fullscreen Mini App!") : alert("Привет из fullscreen Mini App!");

  $("main").onclick = () => {
    if (!tg) return log("Главная кнопка работает только в Telegram");
    const mb = tg.MainButton;
    if (mb.isVisible) mb.hide();
    else { mb.setText("Нажми меня"); mb.show(); }
    renderButtons();
  };

  $("close").onclick = () => (tg ? tg.close() : log("Закрыть можно только в Telegram"));

  if (tg) {
    tg.MainButton.onClick(() => {
      presses += 1;
      log("Нажатий главной кнопки: " + presses);
      if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred("success");
    });
    tg.onEvent("themeChanged", () => { renderSwatches(); renderSession(); });
    tg.onEvent("viewportChanged", renderSession);
  }
  window.FS.onChange(renderAll); // обновляем экран при входе/выходе из fullscreen и смене safe area
}

renderUser();
renderAll();
renderSwatches();
setupActions();
