// Mord im Orientexpress 2026 – Spielzentrale. Alles läuft auf dem Telefon, nichts wird verschickt.
(function () {
  "use strict";
  var OE = window.OE;
  var PRE = "oe2026-";
  var app = document.getElementById("app");

  // ---------- Speicher ----------
  function lies(k) { try { return window.localStorage.getItem(PRE + k); } catch (e) { return null; } }
  function schreib(k, v) { try { window.localStorage.setItem(PRE + k, v); } catch (e) { /* privat */ } }
  function liesJson(k, d) { try { return JSON.parse(lies(k)) || d; } catch (e) { return d; } }

  // ---------- Zeit ----------
  var testParam = (function () {
    if (!OE.test) return null;
    var q = new URLSearchParams(location.search);
    if (q.get("testdatum")) return new Date(q.get("testdatum") + "T" + (q.get("testzeit") || "08:00") + ":00");
    var tt = parseInt(lies("testtag") || "1", 10);
    return new Date(OE.tage[Math.min(Math.max(tt, 1), 12) - 1].oeffnet.replace("06:00", "08:00"));
  })();
  function testband() {
    if (!OE.test) return "";
    var n = aktuellerTag(), opt = "";
    for (var i = 1; i <= 12; i++) opt += '<option value="' + i + '"' + (i === n ? " selected" : "") + ">Tag " + i + " · " + OE.tage[i - 1].datum + "</option>";
    var spur = OE.testSpur ? OE.testSpur[n] : null;
    return '<div class="testband">Vorschau für Mike · <select id="testtag" aria-label="Spieltag wählen">' + opt + "</select>" +
      (spur ? ' · <a href="#' + spur + '">Spur von Tag ' + n + " öffnen</a>" : "") +
      ' · <button type="button" id="testreset" class="leise">Spielstand löschen</button></div>';
  }
  function jetzt() { return testParam || new Date(); }
  function datumOffen(tag) { return jetzt() >= new Date(OE.tage[tag - 1].oeffnet); }
  function offen(tag) { return OE.allesOffen || datumOffen(tag); }
  function aktuellerTag() { var n = 0; for (var i = 1; i <= 12; i++) if (datumOffen(i)) n = i; return n; }
  function nachEnde() { return jetzt() >= new Date(OE.ende); }
  function geloest(tag) { return lies("geloest-" + tag) === "1" || (!OE.allesOffen && (aktuellerTag() > tag || nachEnde())); }
  function passagiereOffen() { return OE.allesOffen || geloest(1) || aktuellerTag() >= 2; }

  // ---------- Hilfen ----------
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function norm(s) {
    return String(s).toUpperCase().replace(/Ä/g, "AE").replace(/Ö/g, "OE").replace(/Ü/g, "UE").replace(/ẞ/g, "SS").replace(/[^A-Z0-9]/g, "");
  }
  function person(id) { for (var i = 0; i < OE.personen.length; i++) if (OE.personen[i].id === id) return OE.personen[i]; return null; }
  function datumText(tag) { return OE.tage[tag - 1].datum; }

  function filmeHtml(filme) {
    return filme.map(function (f) {
      var h = f.src ? '<video class="film" controls playsinline preload="metadata"' + (f.poster ? ' poster="' + esc(f.poster) + '"' : "") + ' src="' + esc(f.src) + '"></video>'
            : f.bild ? '<figure class="portraet"><img src="' + esc(f.bild) + '" alt=""></figure>'
            : '<div class="film-platzhalter">Der Film folgt, Madame. Lesen Sie einstweilen mit.</div>';
      return h + '<div class="abschrift">' + f.text.map(function (t) { return "<p>" + esc(t) + "</p>"; }).join("") + "</div>";
    }).join("");
  }
  function zugHtml() {
    var h = '<div class="zug" role="img" aria-label="Zug mit zwölf Wagen, ein Wagen je Verdächtigem"><span class="wagen lok">▣</span>';
    OE.personen.forEach(function (p) {
      var kl = "wagen";
      if (p.tag === 12) { var t = taeter(); if (t) kl += (p.id === t) ? " taeter" : " aus"; }
      else if (geloest(p.tag)) kl += " aus";
      h += '<span class="' + kl + '">' + esc(p.kuerzel) + "</span>";
    });
    return h + "</div>";
  }
  // ---------- Bilder (selbst gezeichnet, keine fremden Dateien) ----------
  var SYM = {
    start: '<path d="M3 15h13l3-4V8h-4V5h-2v3H6v7"/><circle cx="7" cy="18" r="2"/><circle cx="15" cy="18" r="2"/><path d="M2 21h20"/>',
    heute: '<rect x="3" y="6" width="18" height="13" rx="1"/><path d="M3 7l9 7 9-7"/>',
    passagiere: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 14.2c2.9.2 5 2.5 5 5.8"/>',
    akte: '<path d="M3 6h6l2 2h10v11H3z"/><path d="M7 13h10M7 16h6"/>',
    geschichte: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 9h8M8 12h8M8 15h5"/>',
    regeln: '<circle cx="11" cy="11" r="6"/><path d="M15.5 15.5L20 20"/>',
    menue: '<path d="M4 7h16M4 12h16M4 17h16"/>'
  };
  function sym(n) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + SYM[n] + "</svg>";
  }
  function startbild() {
    if (OE.bilder && OE.bilder.start) {
      return '<figure class="bild foto"><img src="' + esc(OE.bilder.start) + '" alt="Der Orientexpress steht nachts im Schnee"><figcaption>Hinter Belgrad, in der Nacht zum 25. November 1934</figcaption></figure>';
    }
    return '<div class="titelblock" aria-hidden="true"><span>Istanbul</span><b>Orient&#8209;Express</b><span>Paris</span></div>';
  }
  function medaillon(p, groesse) {
    var strahlen = "";
    for (var a = 200; a <= 340; a += 10) {
      var r = a * Math.PI / 180;
      strahlen += '<path d="M50 70L' + (50 + Math.cos(r) * 70).toFixed(1) + " " + (70 + Math.sin(r) * 70).toFixed(1) + '"/>';
    }
    return '<svg class="avatar medaillon ' + groesse + '" viewBox="0 0 100 100" aria-hidden="true">' +
      '<rect x="2" y="2" width="96" height="96" rx="18" fill="#1d2a44"/>' +
      '<g stroke="#a8874a" stroke-width="0.8" opacity="0.5">' + strahlen + "</g>" +
      '<rect x="7" y="7" width="86" height="86" rx="14" fill="none" stroke="#a8874a" stroke-width="1.2"/>' +
      '<text x="50" y="62" text-anchor="middle" font-family="Baskerville, Iowan Old Style, Georgia, serif" font-size="30" fill="#f4ecd8" letter-spacing="1">' + esc(p.monogramm) + "</text>" +
      '<path d="M34 74h32" stroke="#a8874a" stroke-width="1"/></svg>';
  }

  var MENUE = [["start", "#/", "Start"], ["heute", "#/heute", "Heute"], ["geschichte", "#/geschichte", "Die Geschichte"],
    ["passagiere", "#/passagiere", "Die Passagiere"], ["akte", "#/akte", "Fallakte und Fahrplan"], ["regeln", "#/regeln", "So ermitteln Sie"]];

  function seite(titel, unter, inhalt, aktiv, karte) {
    document.title = titel ? titel + " · Orientexpress" : "Orientexpress";
    var menue = MENUE.map(function (m) {
      var aus = m[0] === "passagiere" && !passagiereOffen();
      return '<a href="' + m[1] + '" class="' + (m[0] === aktiv ? "aktiv" : "") + (aus ? " aus" : "") + '">' + sym(m[0]) + "<span>" + esc(m[2]) + "</span></a>";
    }).join("");
    var leiste = [["start", "#/", "Start"], ["heute", "#/heute", "Heute"], ["passagiere", "#/passagiere", "Passagiere"], ["akte", "#/akte", "Fallakte"]]
      .map(function (m) { return '<a href="' + m[1] + '"' + (m[0] === aktiv ? ' class="aktiv" aria-current="page"' : "") + ">" + sym(m[0]) + "<span>" + m[2] + "</span></a>"; }).join("");
    app.innerHTML =
      '<a class="skip" href="#inhalt-start">Zum Inhalt</a>' +
      testband() +
      '<div class="oben"><button type="button" class="menueknopf" id="menue-auf" aria-label="Menü öffnen" aria-expanded="false">' + sym("menue") + "</button>" +
      '<header class="kopf"><a href="#/" aria-label="Compagnie Internationale des Wagons-Lits, zur Startseite">Wagons-Lits</a><small>Istanbul – Paris · November 1934</small></header><span></span></div>' +
      zugHtml() +
      '<div id="inhalt-start" class="einblenden">' +
      (karte || ((titel ? "<h1>" + esc(titel) + "</h1>" : "") + (unter ? '<p class="unterzeile">' + esc(unter) + "</p>" : "") + (titel ? '<div class="zier" aria-hidden="true"></div>' : ""))) +
      inhalt + "</div>" +
      '<nav class="leiste" aria-label="Hauptmenü">' + leiste + "</nav>" +
      '<div class="menue" id="menue" hidden><button type="button" class="schleier" id="menue-zu" aria-label="Menü schließen"></button>' +
      '<nav aria-label="Alle Bereiche"><h2>An Bord</h2>' + menue + "</nav></div>";
    if (OE.test) {
      document.getElementById("testtag").addEventListener("change", function () { schreib("testtag", this.value); location.hash = "#/"; location.reload(); });
      document.getElementById("testreset").addEventListener("click", function () {
        try { Object.keys(localStorage).filter(function (k) { return k.indexOf(PRE) === 0 && k !== PRE + "testtag"; }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
        location.reload();
      });
    }
    var auf = document.getElementById("menue-auf"), m = document.getElementById("menue");
    function zu(fokus) { m.hidden = true; auf.setAttribute("aria-expanded", "false"); if (fokus) auf.focus(); }
    auf.addEventListener("click", function () { m.hidden = false; auf.setAttribute("aria-expanded", "true"); m.querySelector("nav a").focus(); });
    document.getElementById("menue-zu").addEventListener("click", function () { zu(true); });
    Array.prototype.forEach.call(m.querySelectorAll("nav a"), function (a) {
      a.addEventListener("click", function (ev) {
        var hier = a.getAttribute("href") === (location.hash || "#/");
        if (hier) ev.preventDefault();
        zu(hier);
      });
    });
    window.scrollTo(0, 0);
  }
  function fahrkarte(tag, zeile1, zeile2) {
    return '<div class="fahrkarte"><div class="links"><span>' + esc(zeile2) + "</span><strong>" + esc(zeile1) + '</strong></div>' +
      '<div class="rechts"><span>Tag<b>' + (tag < 10 ? "0" : "") + tag + "</b>von 12</span></div></div>";
  }
  function gesperrt(tag) {
    seite("Geduld, Madame", null, '<div class="sperre"><p>Der Zug hält noch.</p><p>Diese Seite öffnet am ' + esc(datumText(tag)) + " um 6 Uhr morgens.</p></div>", "heute");
  }

  // ---------- Verschlüsselte Auflösungen ----------
  function bytes(str) { return new TextEncoder().encode(str); }
  function hex(b) { return Array.prototype.map.call(b, function (x) { return ("0" + x.toString(16)).slice(-2); }).join(""); }
  function vonHex(h) { var o = new Uint8Array(h.length / 2); for (var i = 0; i < o.length; i++) o[i] = parseInt(h.substr(i * 2, 2), 16); return o; }
  function sha(b) { return crypto.subtle.digest("SHA-256", b).then(function (r) { return new Uint8Array(r); }); }
  function entschluessle(k, b64) {
    var roh = Uint8Array.from(atob(b64), function (c) { return c.charCodeAt(0); });
    var jobs = [];
    for (var i = 0; i < Math.ceil(roh.length / 32); i++) {
      var e = new Uint8Array(36); e.set(k, 0);
      e[32] = (i >>> 24) & 255; e[33] = (i >>> 16) & 255; e[34] = (i >>> 8) & 255; e[35] = i & 255;
      jobs.push(sha(e));
    }
    return Promise.all(jobs).then(function (strom) {
      var out = new Uint8Array(roh.length);
      for (var j = 0; j < roh.length; j++) out[j] = roh[j] ^ strom[Math.floor(j / 32)][j % 32];
      return JSON.parse(new TextDecoder().decode(out));
    });
  }
  function pruefe(tag, v) {
    var spur = OE.tage[tag - 1].spur;
    return sha(bytes("oe-pruef:" + tag + ":" + v)).then(function (h) {
      var hh = hex(h), t = null;
      spur.pruef.forEach(function (p) { if (p.h === hh) t = p; });
      if (!t) return null;
      return sha(bytes("oe-wrap:" + tag + ":" + v)).then(function (w) {
        var g = vonHex(t.w), k = new Uint8Array(32);
        for (var i = 0; i < 32; i++) k[i] = g[i] ^ w[i];
        return entschluessle(k, spur.geheim);
      });
    });
  }

  // ---------- Ansichten ----------
  function start() {
    var n = aktuellerTag(), h = startbild();
    if (n === 0 && !OE.allesOffen) {
      h += '<div class="sperre"><p>Der Zug fährt am 25. November ab.</p><p>Bis dahin, Madame: Geduld.</p></div>';
    } else {
      h += '<p class="einleitung">Madame la Détective, willkommen an Bord.</p>';
      h += '<div class="knoepfe">';
      h += '<a class="knopf" href="#/heute">' + sym("heute") + (nachEnde() ? "Der letzte Tag" : "Poirots Nachricht von heute") + (nachEnde() ? "" : ' <span class="nr">Tag ' + n + "</span>") + "</a>";
      h += '<a class="knopf leise' + (passagiereOffen() ? "" : " aus") + '" href="#/passagiere">' + sym("passagiere") + "Die Passagiere</a>";
      h += '<a class="knopf leise" href="#/akte">' + sym("akte") + "Fallakte und Fahrplan</a>";
      h += '<a class="knopf leise" href="#/geschichte">' + sym("geschichte") + "Die Geschichte</a>";
      h += '<a class="knopf leise" href="#/regeln">' + sym("regeln") + "So ermitteln Sie</a>";
      h += "</div>";
      if (OE.allesOffen) {
        h += '<h2>Regie: alle Tage</h2><ol class="regie">';
        OE.tage.forEach(function (t) {
          h += '<li><a href="#/tag/' + t.tag + '">Tag ' + t.tag + " · " + esc(t.titel) + '</a> · <a href="#/spur/' + t.tag + '">Spur</a>' + (geloest(t.tag) ? " · gelöst" : "") + "</li>";
        });
        h += '</ol><p class="leise-text">Extras: ' + Object.keys(OE.extras).map(function (k) { return '<a href="#' + OE.extrasCode[k] + '">' + esc(OE.extras[k].titel) + "</a>"; }).join(" · ") + "</p>";
      }
    }
    seite("Mord im Orientexpress", "Ein Fall für Hercule Poirot – und für Sie", h, "start");
  }

  function geschichte() {
    var h = startbild() + '<div class="brief">' + OE.geschichte.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") + "</div>";
    h += '<p class="mitte"><a class="knopf leise" href="#/regeln">' + sym("regeln") + "So ermitteln Sie</a></p>";
    seite("Die Geschichte", null, h, "geschichte");
  }
  function regeln() {
    var h = '<ol class="regeln">' + OE.regeln.map(function (r) { return "<li>" + esc(r) + "</li>"; }).join("") + "</ol>";
    h += '<p class="mitte"><a class="knopf" href="#/heute">' + sym("heute") + "Zu Poirots Nachricht</a></p>";
    seite("So ermitteln Sie", "Ordnung und Methode, Madame", h, "regeln");
  }

  function heute() {
    var n = aktuellerTag();
    if (n === 0) return gesperrt(1);
    location.replace("#/tag/" + n);
  }

  function tagAnsicht(tag) {
    if (!(tag >= 1 && tag <= 12)) return start();
    if (!offen(tag)) return gesperrt(tag);
    var t = OE.tage[tag - 1], h = "", bildTag = OE.bilder && OE.bilder["tag" + (tag < 10 ? "0" : "") + tag];
    if (bildTag) h += '<figure class="bild foto"><img src="' + esc(bildTag) + '" alt="' + esc(t.titel) + '"></figure>';
    h += "<h2>Poirots Nachricht</h2>" + filmeHtml(t.siegel.filme);
    h += '<details class="brief-klapp"><summary>Poirots Brief lesen</summary><div class="brief">' +
      t.brief.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") + "</div></details>";
    h += '<div class="status">';
    if (lies("spur-" + tag) === "1" || OE.allesOffen) {
      h += '<a class="knopf" href="#/spur/' + tag + '">Zur Spur des Tages</a>';
    } else {
      h += "<p>Die Spur des Tages liegt irgendwo im Haus. Wenn Sie sie finden, halten Sie Ihr Telefon darüber.</p>";
    }
    if (t.person) h += '<a class="knopf leise" href="#/p/' + t.person + '">' + esc(person(t.person).name) + " befragen</a>";
    h += "</div>";
    seite("Tag " + tag + " · " + t.titel, null, h, "heute", fahrkarte(tag, t.titel, datumText(tag)));
  }

  function beweisHtml(b) {
    if (!b) return "";
    var h = '<div class="beweis"><h2>' + esc(b.titel) + "</h2>";
    if (b.zeilen) h += "<ol>" + b.zeilen.map(function (z) { return "<li>" + esc(z) + "</li>"; }).join("") + "</ol>";
    if (b.text) h += "<p>" + esc(b.text) + "</p>";
    if (b.rand) h += '<p class="rand">' + esc(b.rand) + "</p>";
    return h + "</div>";
  }

  function formHtml(tag, e) {
    var h = '<form id="frage-form" class="frage" autocomplete="off">';
    h += '<label for="f1">' + esc(e.frage) + "</label>";
    if (e.formhinweis) h += '<p class="formhinweis">' + esc(e.formhinweis) + "</p>";
    if (e.typ === "text") {
      h += '<input id="f1" type="text" autocapitalize="characters" spellcheck="false">';
    } else if (e.typ === "tisch") {
      h += '<div class="auswahl-zeile"><select id="f1" aria-label="Tisch"><option value="">Tisch …</option><option value="1">Tisch 1</option><option value="2">Tisch 2</option><option value="3">Tisch 3</option><option value="4">Tisch 4 (Fenster)</option></select></div>';
      h += '<div class="auswahl-zeile"><select id="f2" aria-label="Getränk"><option value="">Getränk …</option><option>Cognac</option><option>Tee</option><option>Kaffee</option><option>Sherry</option></select></div>';
      h += '<div class="auswahl-zeile"><select id="f3" aria-label="Uhrzeit"><option value="">Uhrzeit …</option><option>21:00</option><option>21:30</option><option>22:00</option><option>23:00</option></select></div>';
    } else if (e.typ === "anklage") {
      h += '<select id="f1" aria-label="Der Mörder"><option value="">Der Mörder ist …</option><option value="ROCHARD">Mademoiselle Rochard</option><option value="MOREL">Monsieur Morel</option></select>';
      h += '<p class="formhinweis">Welche Aussagen sind gelogen? Kreuzen Sie an.</p><div class="kreuze">';
      e.aussagen.forEach(function (a) { h += '<label><input type="checkbox" value="' + esc(a.id) + '"><span>' + esc(a.wer + " (" + a.nr + "): " + a.text) + "</span></label>"; });
      h += "</div>";
    }
    h += '<button type="submit">Antwort an Poirot</button>';
    h += '<p id="meldung" class="antwort" aria-live="polite"></p>';
    h += '<button type="button" id="hinweis-knopf" class="leise">Poirot um Rat fragen</button>';
    h += '<p id="hinweis1" class="hinweis" hidden>' + esc(e.hinweise[0] || "") + "</p>";
    h += '<p id="hinweis2" class="hinweis" hidden>' + esc(e.hinweise[1] || "") + "</p>";
    return h + "</form>";
  }

  function eingabeWert(e) {
    if (e.typ === "text") return norm(document.getElementById("f1").value);
    if (e.typ === "tisch") return norm("TISCH" + document.getElementById("f1").value + document.getElementById("f2").value + document.getElementById("f3").value);
    var k = Array.prototype.filter.call(document.querySelectorAll(".kreuze input"), function (x) { return x.checked; }).map(function (x) { return x.value; }).sort().join("");
    return norm(document.getElementById("f1").value + k);
  }

  var FALSCH = ["Non, non, Madame. Die kleinen grauen Zellen – noch einmal.", "Hm. Das überzeugt Poirot nicht.", "Beinahe, vielleicht. Aber nicht ganz.", "Ordnung und Methode, Madame. Versuchen Sie es erneut."];

  function merkeNachLoesung(tag, inhalt) {
    schreib("nachloesung-" + tag, JSON.stringify(inhalt.verhoer || {}));
    if (inhalt.taeter) schreib("taeter", inhalt.taeter);
  }
  // Ältere Spielstände: gelöste Tage ohne gemerkte Nachlösung still nachholen
  function nachLoesungNachholen() {
    if (!window.crypto || !crypto.subtle) return;
    OE.tage.forEach(function (t) {
      var alt = lies("loesung-" + t.tag);
      if (alt && lies("nachloesung-" + t.tag) === null && t.spur.pruef)
        pruefe(t.tag, alt).then(function (i) { if (i) merkeNachLoesung(t.tag, i); }).catch(function () {});
    });
  }
  function zeigeLoesung(tag, inhalt, fokus) {
    var box = document.getElementById("geloest");
    box.innerHTML = '<h2 tabindex="-1">' + esc(inhalt.titel) + "</h2>" + filmeHtml(inhalt.filme) + (inhalt.extra ? '<p class="extra">' + esc(inhalt.extra) + "</p>" : "");
    box.hidden = false;
    var f = document.getElementById("frage-form"); if (f) f.hidden = true;
    if (fokus) box.querySelector("h2").focus();
    schreib("geloest-" + tag, "1");
    if (inhalt.akte) schreib("akte-" + tag, inhalt.akte);
    merkeNachLoesung(tag, inhalt);
    var z = document.querySelector(".zug"); if (z) z.outerHTML = zugHtml();
  }

  function spurAnsicht(tag) {
    if (!offen(tag)) return gesperrt(tag);
    var t = OE.tage[tag - 1], s = t.spur;
    var h = filmeHtml(s.filme) + beweisHtml(s.beweis);
    if (t.person) h += '<p class="mitte"><a class="knopf leise" href="#/p/' + t.person + '">' + esc(person(t.person).name) + " befragen</a></p>";
    if (s.eingabe) h += formHtml(tag, s.eingabe);
    else if (s.ohneEingabe) h += '<p class="hinweis">' + esc(s.ohneEingabe) + "</p>";
    h += '<section id="geloest" class="geloest" hidden></section>';
    seite("Tag " + tag + " · " + t.titel, null, h, "heute", fahrkarte(tag, t.titel, "Die Spur · " + datumText(tag)));
    if (!s.eingabe) return;
    var e = s.eingabe, meldung = document.getElementById("meldung"), h2 = document.getElementById("hinweis2");
    var fehl = parseInt(lies("fehl-" + tag) || "0", 10);
    if (fehl >= 3) h2.hidden = false;
    document.getElementById("hinweis-knopf").addEventListener("click", function () { document.getElementById("hinweis1").hidden = false; this.hidden = true; });
    document.getElementById("frage-form").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var v = eingabeWert(e);
      meldung.className = "antwort";
      if (!v) { meldung.textContent = "Madame, Sie haben nichts eingetragen."; return; }
      if (!window.crypto || !crypto.subtle) { meldung.textContent = "Dieses Telefon kann die Antwort nicht prüfen. Bitte die Seite über https öffnen."; return; }
      pruefe(tag, v).then(function (inhalt) {
        if (inhalt) { schreib("loesung-" + tag, v); meldung.textContent = ""; zeigeLoesung(tag, inhalt, true); return; }
        fehl += 1; schreib("fehl-" + tag, String(fehl));
        meldung.className = "antwort falsch";
        meldung.textContent = FALSCH[(fehl - 1) % FALSCH.length];
        if (fehl >= 3) h2.hidden = false;
      }).catch(function () { meldung.textContent = "Eine Störung im Telegrafen. Bitte noch einmal."; });
    });
    var alt = lies("loesung-" + tag);
    if (alt && window.crypto && crypto.subtle) pruefe(tag, alt).then(function (i) { if (i) zeigeLoesung(tag, i); }).catch(function () {});
  }

  function extraAnsicht(x) {
    if (!offen(x.tag)) return gesperrt(x.tag);
    if (x.markiertGeloest) { schreib("geloest-" + x.tag, "1"); if (x.akte) schreib("akte-" + x.tag, x.akte); }
    seite(x.titel, null, filmeHtml(x.filme) + (x.extra ? '<p class="extra">' + esc(x.extra) + "</p>" : ""), "heute", fahrkarte(x.tag, x.titel, datumText(x.tag)));
  }

  function passagiere() {
    if (!passagiereOffen()) {
      return seite("Die Passagiere", null, '<div class="sperre"><p>Poirot hat Ihnen die Passagierliste noch nicht gegeben.</p><p>Lösen Sie zuerst das Rätsel der Fahrkarte.</p></div>', "passagiere");
    }
    var h = '<ul class="karten">';
    OE.personen.forEach(function (p) {
      var st = statusText(p);
      h += '<li><a class="karte" href="#/p/' + p.id + '">' + avatarHtml(p, "klein") +
        '<span><strong>' + esc(p.nr + ". " + p.name) + "</strong><br><small>" + esc(p.wer) + "</small>" +
        (st ? '<br><em class="stempel ' + st[1] + '">' + esc(st[0]) + "</em>" : "") + '</span><span class="pfeil" aria-hidden="true">›</span></a></li>';
    });
    seite("Die Passagiere", "Wagen Istanbul – Calais", h + "</ul>", "passagiere");
  }
  // Wer der Täter ist, steht nur im verschlüsselten Inhalt von Tag 12 und wird beim Lösen gemerkt
  function taeter() { return lies("taeter") || OE.taeterOffen || null; }
  function statusText(p) {
    if (p.tag === 12) { var t = taeter(); return t ? (p.id === t ? ["überführt", "rot"] : ["entlastet", ""]) : null; }
    if (geloest(p.tag)) return ["entlastet", ""];
    return null;
  }
  function avatarHtml(p, groesse) {
    if (p.bild) return '<img class="avatar ' + groesse + '" src="' + esc(p.bild) + '" alt="Porträt von ' + esc(p.name) + '">';
    return medaillon(p, groesse);
  }

  // Verhör: Stichwörter in der Frage suchen, längste Treffer gewinnen
  // Antworten nach der Lösung kommen aus dem entschlüsselten Tagesinhalt (siehe zeigeLoesung)
  // Eine Person kann Texte aus mehreren Tagen haben (eine Antwort kann erst mit einem späteren Tag öffnen)
  function nachLoesung(p) {
    var d = { nach: {}, neu: [] }, gefunden = false;
    for (var t = 1; t <= 12; t++) {
      var nl = liesJson("nachloesung-" + t, null) || (OE.nachLoesungOffen && OE.nachLoesungOffen[t]) || null;
      var e = nl && nl[p.id];
      if (!e) continue;
      gefunden = true;
      Object.keys(e.nach || {}).forEach(function (k) { d.nach[k] = e.nach[k]; });
      d.neu = d.neu.concat(e.neu || []);
    }
    return gefunden ? d : null;
  }
  function fragenVon(p) {
    var d = nachLoesung(p);
    return d && d.neu ? p.fragen.concat(d.neu) : p.fragen;
  }
  function verfuegbar(p, f) {
    var tg = aktuellerTag(), gl = geloest(p.tag), d = nachLoesung(p);
    if (f.nurNachLoesung && !gl) return null;
    if (f.abTag && tg < f.abTag) return f.vorher || null;
    if (d && d.nach && d.nach[f.titel]) return d.nach[f.titel];
    if (gl && f.nachLoesung) return f.nachLoesung;
    return f.antwort;
  }
  function frageStellen(p, text) {
    var n = norm(text), best = null, bestPunkte = 0;
    fragenVon(p).forEach(function (f) {
      var antwort = verfuegbar(p, f);
      if (!antwort) return;
      var pkt = 0;
      f.kw.forEach(function (k) { if (k && n.indexOf(k) >= 0) pkt += k.length; });
      if (pkt > bestPunkte) { bestPunkte = pkt; best = antwort; }
    });
    if (best) return best;
    var z = parseInt(lies("ausweichen-" + p.id) || "0", 10);
    schreib("ausweichen-" + p.id, String(z + 1));
    return p.ausweichen[z % p.ausweichen.length];
  }
  function personAnsicht(id) {
    var p = person(id);
    if (!p) return start();
    if (!passagiereOffen()) return passagiere();
    var log = liesJson("verhoer-" + id, []);
    var st = statusText(p);
    var h = '<div class="profil">' + avatarHtml(p, "gross") + "<p>" + esc(p.wer) + "</p>" + (st ? '<p><em class="stempel ' + st[1] + '">' + esc(st[0]) + "</em></p>" : "") + "</div>";
    h += '<div id="verlauf" class="verlauf">' + log.map(function (e) {
      return '<p class="f">' + esc(e.q) + '</p><p class="a">' + esc(e.a) + "</p>";
    }).join("") + "</div>";
    var vorschlaege = fragenVon(p).filter(function (f) { return f.zeigen && verfuegbar(p, f); });
    h += '<div class="vorschlaege">' + vorschlaege.map(function (f) { return '<button type="button" class="chip">' + esc(f.titel) + "</button>"; }).join("") + "</div>";
    h += '<form id="verhoer" class="frage" autocomplete="off"><label for="vf">Ihre Frage an ' + esc(p.name) + '</label>' +
      '<p class="formhinweis">Fragen Sie, was Sie wissen wollen. Wer das richtige Stichwort kennt, erfährt mehr.</p>' +
      '<input id="vf" type="text" spellcheck="false"><button type="submit">Fragen</button></form>';
    seite(p.name, null, h, "passagiere");
    function stelle(text) {
      if (!text.trim()) return;
      var a = frageStellen(p, text);
      log.push({ q: text.trim(), a: a });
      schreib("verhoer-" + id, JSON.stringify(log.slice(-60)));
      var v = document.getElementById("verlauf");
      v.insertAdjacentHTML("beforeend", '<p class="f">' + esc(text.trim()) + '</p><p class="a">' + esc(a) + "</p>");
      v.lastElementChild.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    document.getElementById("verhoer").addEventListener("submit", function (ev) {
      ev.preventDefault(); var i = document.getElementById("vf"); stelle(i.value); i.value = "";
    });
    Array.prototype.forEach.call(document.querySelectorAll(".chip"), function (b) { b.addEventListener("click", function () { stelle(b.textContent); }); });
  }

  function akte() {
    var n = aktuellerTag();
    var h = '<ol class="akte">';
    OE.tage.forEach(function (t) {
      var zeile, kl = !offen(t.tag) ? "zu" : (lies("geloest-" + t.tag) === "1" ? "erledigt" : (t.tag === n ? "heute" : ""));
      var nr = "Tag " + t.tag + " · ", marke = t.tag === n ? '<span class="heute-marke">heute</span>' : "";
      if (!offen(t.tag)) zeile = '<span class="datum">' + esc(nr + t.datum) + '</span><span class="titel leise-text">noch verschlossen</span>';
      else {
        var eintrag = lies("akte-" + t.tag);
        zeile = '<a href="#/tag/' + t.tag + '"><span class="datum">' + esc(nr + t.datum) + marke + '</span><span class="titel">' + esc(t.titel) + "</span>" +
          (lies("geloest-" + t.tag) === "1" && eintrag ? "<em>" + esc(eintrag) + "</em>" : (t.tag < n ? "<em>ungelöst – die Geschichte lief weiter</em>" : "")) + "</a>";
      }
      h += '<li class="' + kl + '">' + zeile + "</li>";
    });
    seite("Ihre Fallakte", "Der Fahrplan Ihrer Ermittlung", h + "</ol>", "akte");
  }

  // ---------- Router ----------
  function route() {
    var h = decodeURIComponent(location.hash.replace(/^#/, ""));
    if (h && h.charAt(0) !== "/") {
      var c = OE.codes[h.toLowerCase()];
      if (!c) return seite("Eine falsche Spur", null, '<div class="sperre"><p>Diese Spur führt ins Leere, Madame.</p><p><a class="knopf leise" href="#/">Zurück an Bord</a></p></div>');
      if (c.art === "siegel") { if (offen(c.tag)) schreib("siegel-" + c.tag, "1"); return tagAnsicht(c.tag); }
      if (c.art === "spur") { if (offen(c.tag)) schreib("spur-" + c.tag, "1"); return spurAnsicht(c.tag); }
      if (c.art === "extra") return extraAnsicht(OE.extras[c.id]);
    }
    var teile = h.split("/").filter(Boolean);
    switch (teile[0]) {
      case undefined: return start();
      case "geschichte": return geschichte();
      case "regeln": return regeln();
      case "heute": return heute();
      case "tag": return tagAnsicht(parseInt(teile[1], 10));
      case "spur":
        var tg = parseInt(teile[1], 10);
        if (lies("spur-" + tg) !== "1" && !OE.allesOffen) return seite("Noch nicht gefunden", null, '<div class="sperre"><p>Diese Spur haben Sie noch nicht gefunden, Madame.</p></div>');
        return spurAnsicht(tg);
      case "passagiere": return passagiere();
      case "p": return personAnsicht(teile[1]);
      case "akte": return akte();
      default: return start();
    }
  }
  // Escape schließt das Menü, egal wo der Fokus gerade steht
  document.addEventListener("keydown", function (ev) {
    var m = document.getElementById("menue"), auf = document.getElementById("menue-auf");
    if (ev.key === "Escape" && m && !m.hidden) { m.hidden = true; if (auf) { auf.setAttribute("aria-expanded", "false"); auf.focus(); } }
  });
  window.addEventListener("hashchange", route);
  route();
  nachLoesungNachholen();
})();
