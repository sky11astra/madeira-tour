// Генерує повну HTML-сторінку для однієї мови.
export const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const heart = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8.2 3.4 4.8 6.8 4.6c2-.1 3.6 1 5.2 3 1.6-2 3.2-3.1 5.2-3 3.4.2 5.3 3.6 4.1 6.7-1.8 4.6-9.3 9.2-9.3 9.2z"/></svg>';
const plane = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.5 15.2v-2l-8-5V3.3a1.5 1.5 0 0 0-3 0v4.9l-8 5v2l8-2.5v5.4l-2 1.5v1.6l3.5-1 3.5 1v-1.6l-2-1.5v-5.4z"/></svg>';
const chev = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>';

export function render(ctx) {
  const { lang, c, cfg, base, places, routes, apts, mapSvg, jsonLd, urls, css, js, data, credits, yacht, mainIdx } = ctx;
  const brand = cfg.brand, S = c.spots, T = c.trips;
  const t = (s) => esc(String(s).replace(/\{brand\}/g, brand));
  const name = (id) => S[id]?.t || c.stops[id] || id;
  const self = cfg.langs.find((l) => l.code === lang);
  const others = cfg.langs.filter((l) => l.code !== lang);
  const langLinks = (cls) => cfg.langs.map((l) => `<a class="${cls}" href="${urls.rel[l.code]}" hreflang="${l.hreflang}" lang="${l.code}"${l.code === lang ? ' aria-current="page"' : ""}>${cls === "lname" ? esc(l.name) : `<b>${l.label}</b><span>${esc(l.name)}</span>`}</a>`).join("");

  const services = c.services.items.map(([m, u, h, p]) => `
        <div class="mrow"><p class="metric">${esc(m)}<small>${esc(u)}</small></p><h3>${esc(h)}</h3><p>${esc(p)}</p></div>`).join("");

  const filters = Object.entries(c.regions).map(([k, v], i) =>
    `<button class="chip" type="button" data-filter="${k}" aria-pressed="${i === 0}">${esc(v)}</button>`).join("");

  const atlas = places.map((p) => {
    const L = S[p.id];
    return `
        <article class="pcard" data-id="${p.id}" data-region="${p.region}">
          <button class="pimg" type="button" data-open="${mainIdx[p.id]}" aria-label="${esc(c.places.openPhoto)}: ${esc(L.t)}">
            <img src="${p.img.card}" srcset="${p.img.cardSet}" sizes="(max-width:768px) 84vw, (max-width:1100px) 46vw, 30vw" width="960" height="720" loading="lazy" decoding="async" alt="${esc(L.t)} — ${esc(L.area)}">
          </button>
          <div class="pbody">
            <p class="parea">${esc(L.area)}</p>
            <h3>${esc(L.t)}</h3>
            <p class="pstory">${esc(L.story)}</p>
            <p class="pfact"><span>${esc(c.factLabel)}</span>${esc(L.fact)}</p>
            <button class="want" type="button" data-want="${p.id}" aria-pressed="false">${heart}<span>${esc(c.add)}</span></button>
          </div>
        </article>`;
  }).join("");

  const rtabs = routes.map((r, i) => `
        <button class="rtab" type="button" role="tab" id="t-${r.id}" data-route="${r.id}" aria-selected="${i === 0}" aria-controls="r-${r.id}" tabindex="${i === 0 ? 0 : -1}">
          <span class="rname">${esc(T[r.id].name)}</span><span class="rmeta">${esc(T[r.id].days)}</span>
        </button>`).join("");

  const rpanels = routes.map((r, i) => {
    const R = T[r.id];
    const days = r.plan.map((d, di) => `
            <li class="dayrow" data-day="${di}" tabindex="0">
              <div class="dhead"><span class="dnum">${esc(c.routes.day)} ${di + 1}</span><h3>${esc(R.plan[di].t)}</h3><span class="dkm">≈ ${d.km} ${esc(c.routes.km)}</span></div>
              <ol class="stops">${d.s.map(([id, w], si) => `
                <li><span class="tod">${esc(c.tod[w])}</span><span><b>${esc(name(id))}</b><span class="sdo">${esc(R.plan[di].s[si])}</span></span></li>`).join("")}
              </ol>
            </li>`).join("");
    return `
        <div class="rpanel" role="tabpanel" id="r-${r.id}" data-route="${r.id}" aria-labelledby="t-${r.id}"${i ? " hidden" : ""}>
          <dl class="rfacts">
            <div><dt>${esc(c.routes.length)}</dt><dd>${esc(R.days)}</dd></div>
            <div><dt>${esc(c.routes.pace)}</dt><dd>${esc(R.pace)}</dd></div>
            <div><dt>${esc(c.routes.bestFor)}</dt><dd>${esc(R.who)}</dd></div>
          </dl>
          <p class="why"><b>${esc(c.routes.why)}</b>${esc(R.why)}</p>
          <ol class="days">${days}
          </ol>
          <a class="btn solid" href="#book" data-prefill="${r.id}">${esc(c.routes.choose)}</a>
        </div>`;
  }).join("");

  const gallery = apts.map((a, i) => `
          <button class="g${i}" type="button" data-apt="${i}" aria-label="${esc(c.apts[a.src])}">
            <img src="${base}${a.img.mid}" srcset="${a.img.set}" sizes="${i === 0 ? "(max-width:768px) 92vw, 34vw" : "(max-width:768px) 46vw, 17vw"}" width="${a.w}" height="${a.h}" loading="lazy" decoding="async" alt="${esc(c.apts[a.src])}">
          </button>`).join("");

  const routeOpts = routes.map((r, i) => `<label class="opt"><input type="radio" name="route" value="${r.id}"${i === 0 ? " checked" : ""}><span>${esc(T[r.id].name)}</span></label>`).join("")
    + `<label class="opt"><input type="radio" name="route" value="custom"><span>${esc(c.routes.custom)}</span></label>`;
  const extras = Object.entries(c.book.ex).map(([k, v]) => `<label class="opt"><input type="checkbox" name="extra" value="${k}"${k === "transfer" || k === "stay" ? " checked" : ""}><span>${esc(v)}</span></label>`).join("");
  const faq = c.faq.items.map(([q, a], i) => `
          <details${i === 0 ? " open" : ""}><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("");
  const nav = c.nav.map(([h, l]) => `<a href="${h}">${esc(l)}</a>`).join("");
  const wa = `https://wa.me/${cfg.contacts.whatsapp}`;

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${t(c.title)}</title>
<meta name="description" content="${t(c.description)}">
<link rel="canonical" href="${urls.abs[lang]}">
${cfg.langs.map((l) => `<link rel="alternate" hreflang="${l.hreflang}" href="${urls.abs[l.code]}">`).join("\n")}
<link rel="alternate" hreflang="x-default" href="${urls.abs.en}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="geo.region" content="${cfg.geo.region}">
<meta name="geo.placename" content="${cfg.geo.place}">
<meta name="geo.position" content="${cfg.geo.lat};${cfg.geo.lon}">
<meta name="ICBM" content="${cfg.geo.lat}, ${cfg.geo.lon}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(brand)}">
<meta property="og:title" content="${t(c.ogTitle)}">
<meta property="og:description" content="${t(c.description)}">
<meta property="og:url" content="${urls.abs[lang]}">
<meta property="og:image" content="${cfg.siteUrl}/img/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="${self.ogLocale}">
${others.map((l) => `<meta property="og:locale:alternate" content="${l.ogLocale}">`).join("\n")}
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#052b30">
<link rel="icon" href="${base}favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${base}img/apple-touch-icon.png">
<link rel="manifest" href="${base}site.webmanifest">
<link rel="preconnect" href="https://upload.wikimedia.org">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;1,400&amp;family=Inter:wght@300;400;500&amp;display=swap">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;1,400&amp;family=Inter:wght@300;400;500&amp;display=swap" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;1,400&amp;family=Inter:wght@300;400;500&amp;display=swap"></noscript>
<script>document.documentElement.classList.add("js")</script>
<style>${css}</style>
<script type="application/ld+json">${jsonLd}</script>
</head>
<body class="locked">
<a class="skip" href="#main">${esc(c.skip)}</a>

<div id="splash" aria-hidden="true">
  <div class="mark">Madeira<em>Tour</em></div>
  <div class="bar"><s id="bar"></s></div>
  <div class="tag">${esc(c.tag)}</div>
</div>

<div class="topfade" aria-hidden="true"></div>
<header class="chrome">
  <a class="wordmark" href="#" aria-label="${esc(brand)}">Madeira<em>Tour</em></a>
  <div class="hright">
    <details class="langs">
      <summary aria-label="${esc(c.langMenu)}: ${esc(self.name)}">${self.label}${chev}</summary>
      <div class="langlist">${langLinks("lopt")}</div>
    </details>
    <button id="menuBtn" class="menu-btn" type="button" aria-expanded="false" aria-controls="menu" aria-label="${esc(c.menuOpen)}">
      <span class="menu-label">${esc(c.menu)}</span><span class="bars"><i></i><i></i></span>
    </button>
  </div>
</header>

<div id="stage">
  <canvas id="sky" aria-hidden="true"></canvas>
  <i class="shoot" aria-hidden="true"></i>
  <div id="world"><div id="orb" aria-hidden="true"></div></div>
</div>
<h1 class="sr" id="headline">${esc(c.headline.join(" "))}</h1>
<div class="vig"></div>
<div id="grid" aria-hidden="true"><div class="rows"></div></div>

<aside class="bio chrome" aria-label="${esc(brand)}">
  <div class="who"><img id="avatar" src="${base}img/avatar.webp" width="52" height="52" alt=""><b>${esc(brand)}</b></div>
  <p>${esc(c.bio)}</p>
  <div class="acts"><a class="btn solid sm" href="#book">${esc(c.bioCta)}</a><a class="btn sm" href="#routes">${esc(c.bioCta2)}</a></div>
</aside>
<p class="colophon chrome">${esc(c.colophon)}</p>
<button id="gridBtn" class="gridbtn" type="button" aria-label="${esc(c.gridAria)}" aria-pressed="false"><b></b><b></b><b></b><b></b></button>
<div class="cue chrome" aria-hidden="true"><s></s>${esc(c.cue)}</div>
<p class="hint" id="hint" aria-hidden="true">${esc(c.hint)}</p>
<a class="down chrome" href="#services" aria-label="${esc(c.nav[0][1])}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9.5 12 15.5l6-6" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></a>

<main id="main">
  <div class="hero-space" aria-hidden="true"></div>
  <div class="fade" aria-hidden="true"></div>

  <section class="sec" id="services" aria-labelledby="h-services">
    <div class="wrap">
      <div class="head2">
        <div><p class="label">${esc(c.services.label)}</p><h2 class="h2" id="h-services">${esc(c.services.h2)}</h2></div>
        <p class="lead">${esc(c.services.lead)}</p>
      </div>
      <div class="manifest">${services}
      </div>
    </div>
  </section>

  <section class="sec" id="places" aria-labelledby="h-places">
    <div class="wrap">
      <div class="head2">
        <div><p class="label">${esc(c.places.label)}</p><h2 class="h2" id="h-places">${esc(c.places.h2)}</h2></div>
        <p class="lead">${esc(c.places.lead)}</p>
      </div>
      <div class="filters" role="group" aria-label="${esc(c.places.label)}">${filters}<p class="wantcount" aria-live="polite"><b id="wantN">0</b>${esc(c.places.counter)}</p></div>
      <div class="atlas" id="atlas">${atlas}
      </div>
      <p class="acount" aria-hidden="true"><b id="aIdx">1</b> / <span id="aTot">${places.length}</span></p>
    </div>
  </section>

  <section class="sec" id="routes" aria-labelledby="h-routes">
    <div class="wrap">
      <div class="head2">
        <div><p class="label">${esc(c.routes.label)}</p><h2 class="h2" id="h-routes">${esc(c.routes.h2)}</h2></div>
        <p class="lead">${esc(c.routes.lead)}</p>
      </div>
      <div class="rtabs" role="tablist" aria-label="${esc(c.routes.label)}">${rtabs}
      </div>
      <div class="rgrid">
        <figure class="map">${mapSvg}</figure>
        <div>${rpanels}
        </div>
      </div>
    </div>
  </section>

  <section class="sec" id="stay" aria-labelledby="h-stay">
    <div class="wrap stay-grid">
      <div>
        <p class="label">${esc(c.stay.label)}</p>
        <h2 class="h2" id="h-stay">${esc(c.stay.h2)}</h2>
        <p class="lead">${esc(c.stay.lead)}</p>
        <ul class="feat">${c.stay.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
      </div>
      <div class="gallery">${gallery}
      </div>
    </div>
  </section>

  <section class="sec" id="transfer" aria-labelledby="h-transfer">
    <div class="wrap">
      <p class="label">${esc(c.transfer.label)}</p>
      <h2 class="h2" id="h-transfer">${esc(c.transfer.h2)}</h2>
      <div class="duo">
        <article class="panel">
          <div class="ticket">${c.transfer.ticket.map(([b, s]) => `<div><b>${esc(b)}</b><span>${esc(s)}</span></div>`).join("")}</div>
          <p class="big">${esc(c.transfer.busBig)}</p>
          <h3>${esc(c.transfer.busTitle)}</h3>
          <p>${esc(c.transfer.bus)}</p>
        </article>
        <article class="panel photo">
          <img src="${yacht.mid}" srcset="${yacht.set}" sizes="(max-width:900px) 92vw, 46vw" width="960" height="640" loading="lazy" decoding="async" alt="">
          <p class="big">${esc(c.transfer.yachtBig)}</p>
          <h3>${esc(c.transfer.yachtTitle)}</h3>
          <p>${esc(c.transfer.yacht)}</p>
        </article>
      </div>
    </div>
  </section>

  <section class="sec" id="events" aria-labelledby="h-events">
    <div class="wrap events">
      <div>
        <p class="label">${esc(c.events.label)}</p>
        <h2 class="h2" id="h-events">${esc(c.events.h2)}</h2>
        <p class="lead">${esc(c.events.lead)}</p>
      </div>
      <div>
        <ul class="elist">${c.events.list.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
        <a class="btn solid" href="#book" data-prefill="team" data-extra="event">${esc(c.events.cta)}</a>
      </div>
    </div>
  </section>

  <section class="sec" id="book" aria-labelledby="h-book">
    <div class="wrap">
      <div class="head2">
        <div><p class="label">${esc(c.book.label)}</p><h2 class="h2" id="h-book">${esc(c.book.h2)}</h2></div>
        <p class="lead">${esc(c.book.lead)}</p>
      </div>
      <div class="bgrid">
        <form class="form" id="bookForm" novalidate>
          <div class="field"><label for="fArr">${esc(c.book.arrival)}</label><input class="inp" type="date" id="fArr" name="arrival" required></div>
          <div class="field"><label for="fDep">${esc(c.book.departure)}</label><input class="inp" type="date" id="fDep" name="departure" required></div>
          <div class="field full"><label for="fGuests">${esc(c.book.guests)}</label>
            <div class="step"><button type="button" data-step="-1" aria-label="${esc(c.book.less)}">−</button><input id="fGuests" name="guests" type="number" inputmode="numeric" min="1" max="99" value="2"><button type="button" data-step="1" aria-label="${esc(c.book.more)}">+</button></div>
          </div>
          <fieldset class="field full"><legend>${esc(c.book.route)}</legend><div class="opts">${routeOpts}</div></fieldset>
          <fieldset class="field full"><legend>${esc(c.book.extras)}</legend><div class="opts">${extras}</div></fieldset>
          <div class="field full"><p class="flabel" id="pickedLbl">${esc(c.book.picked)}</p><div class="picked" id="picked" aria-labelledby="pickedLbl"></div></div>
          <div class="field full"><label for="fFrom">${esc(c.book.from)}</label><input class="inp" id="fFrom" name="from" autocomplete="address-level2" placeholder="${esc(c.book.fromPh)}"></div>
          <div class="field"><label for="fName">${esc(c.book.name)}</label><input class="inp" id="fName" name="name" autocomplete="name" required></div>
          <div class="field"><label for="fPhone">${esc(c.book.phone)}</label><input class="inp" id="fPhone" name="phone" type="tel" autocomplete="tel" inputmode="tel"></div>
          <div class="field full"><label for="fEmail">${esc(c.book.email)}</label><input class="inp" id="fEmail" name="email" type="email" autocomplete="email"></div>
          <div class="field full"><label for="fNotes">${esc(c.book.notes)}</label><textarea class="inp" id="fNotes" name="notes" placeholder="${esc(c.book.notesPh)}"></textarea></div>
          <p class="err" id="formErr" role="alert"></p>
        </form>
        <aside class="pass" aria-labelledby="passTitle">
          <div class="pass-top"><span id="passTitle">${esc(c.book.summary)}</span><span>${esc(brand)}</span></div>
          <div class="pass-route">
            <div><b id="pFrom">EU</b><span id="pFromSub">${esc(c.book.europe)}</span></div>
            ${plane}
            <div><b>FNC</b><span>Funchal</span></div>
          </div>
          <dl class="pass-grid">
            <div class="wide"><dt>${esc(c.book.dates)}</dt><dd id="pDates">—</dd></div>
            <div><dt>${esc(c.book.nightsLbl)}</dt><dd id="pNights">—</dd></div>
            <div><dt>${esc(c.book.pax)}</dt><dd id="pPax">2</dd></div>
            <div class="wide"><dt>${esc(c.book.routeLbl)}</dt><dd id="pRoute">—</dd></div>
            <div><dt>${esc(c.book.buses)}</dt><dd id="pBuses">—</dd></div>
            <div><dt>${esc(c.book.sailings)}</dt><dd id="pSail">—</dd></div>
          </dl>
          <p class="pass-note" id="pBig" hidden>${esc(c.book.big)}</p>
          <div class="pass-acts">
            <button class="btn solid" type="button" data-send="${cfg.formEndpoint ? "post" : "wa"}">${esc(cfg.formEndpoint ? c.book.summary : c.book.sendWa)}</button>
            <div class="pass-row">
              <button class="btn" type="button" data-send="${cfg.formEndpoint ? "wa" : "mail"}">${esc(cfg.formEndpoint ? "WhatsApp" : c.book.sendMail)}</button>
              <button class="btn" type="button" data-send="tg">${esc(c.book.sendTg)}</button>
            </div>
          </div>
          <p class="pass-msg" id="passMsg" aria-live="polite"></p>
          <p class="pass-note">${esc(c.book.note)}</p>
        </aside>
      </div>
    </div>
  </section>

  <section class="sec" id="faq" aria-labelledby="h-faq">
    <div class="wrap faq">
      <div class="sticky"><p class="label">${esc(c.faq.label)}</p><h2 class="h2" id="h-faq">${esc(c.faq.h2)}</h2></div>
      <div class="qa">${faq}
      </div>
    </div>
  </section>

  <footer class="sec" id="contact" aria-labelledby="h-contact">
    <div class="wrap">
      <div class="fgrid">
        <div><p class="label">${esc(brand)}</p><h2 class="h2" id="h-contact">${esc(c.footer.h2)}</h2><p class="lead">${esc(c.footer.lead)}</p></div>
        <address class="contacts">
          <a href="${wa}" rel="noopener" target="_blank"><span>WhatsApp</span><b>${esc(cfg.contacts.phone)}</b></a>
          <a href="https://t.me/${esc(cfg.contacts.telegram)}" rel="noopener" target="_blank"><span>Telegram</span><b>@${esc(cfg.contacts.telegram)}</b></a>
          <a href="mailto:${esc(cfg.contacts.email)}"><span>Email</span><b>${esc(cfg.contacts.email)}</b></a>
          <a href="tel:${esc(cfg.contacts.phone.replace(/\s/g, ""))}"><span>${esc(c.footer.phone)}</span><b>${esc(cfg.contacts.phone)}</b></a>
          <div><span>${esc(c.footer.addressLbl)}</span><b>${esc(c.footer.address)}</b></div>
        </address>
      </div>
      <p class="giant" aria-hidden="true">Madeira<em>Tour</em></p>
      <nav class="flangs" aria-label="${esc(c.langMenu)}">${langLinks("lname")}</nav>
      <div class="fbottom">
        <span>© ${new Date().getFullYear()} ${esc(brand)}. ${esc(c.footer.rights)}</span>
        <span>${esc(c.footer.creditsSummary)}</span>
      </div>
      <details class="credits"><summary>${esc(c.footer.creditsTitle)}</summary><ol>${credits}</ol></details>
    </div>
  </footer>
</main>

<a class="fab btn solid" href="#book">${esc(c.fab)}</a>

<div id="menu" aria-hidden="true">
  <nav aria-label="${esc(c.menu)}">${nav}</nav>
  <div class="addr"><span>${esc(c.addr)}<br>${esc(cfg.contacts.email)} · ${esc(cfg.contacts.phone)}</span><span class="mlangs">${cfg.langs.map((l) => `<a href="${urls.rel[l.code]}" hreflang="${l.hreflang}" lang="${l.code}"${l.code === lang ? ' aria-current="page"' : ""}>${l.label}</a>`).join("")}</span></div>
</div>

<div id="lit" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="litTitle">
  <div class="scrim" data-close></div>
  <div class="plate"><div class="slide">
    <div class="shot"><img alt="" decoding="async"><button class="xbtn" type="button" data-close>${esc(c.close)}</button></div>
    <div class="meta">
      <div><h2 id="litTitle"></h2><p class="where" id="litWhere"></p></div>
      <div>
        <p class="note" id="litNote"></p>
        <p class="lfact" id="litFact"></p>
        <div class="lfoot"><p class="credit"><span class="lcount" id="litCount"></span><span id="litCredit"></span></p><button class="want" type="button" id="litWant" data-want="" aria-pressed="false">${heart}<span>${esc(c.add)}</span></button></div>
      </div>
    </div>
  </div></div>
</div>

<div id="dot" aria-hidden="true"></div>
<script type="application/json" id="app-data">${data}</script>
<script>${js}</script>
</body>
</html>
`;
}
