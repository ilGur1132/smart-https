/*
 * Copyright 2024 ilGur Petter
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

{
  const INC = 50;
  const SORT = localStorage.getItem('explore-sort') ? Number(localStorage.getItem('explore-sort')) : 1;
  const COUNT = localStorage.getItem('explore-count') ? Number(localStorage.getItem('explore-count')) : (INC - 5);

  var randcolor = function () {
    var color = [
      "#D92121", "#E77200", "#5E8C31", "#00755E", "#C7A00F",
      "#0066FF", "#3F26BF", "#733380", "#BB3385", "#E30B5C",
      "#CA3435", "#87421F", "#299617", "#E936A7", "#DB91EF",
      "#214FC6", "#B56917", "#BB3385", "#652DC1", "#02A4D3"
    ];
    /*  */
    return color[Math.floor(Math.random() * color.length)];
  };

  const cload = () => fetch("explore/explore.json").then(r => r.json()).then(build);

  const shuffle = function (a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    /*  */
    return a;
  };

  const explore = () => {
    const root = document.getElementById('explore');
    const span = document.createElement('span');
    span.textContent = '◱';
    span.title = 'Explore more';
    span.classList.add('explore');
    root.appendChild(span);
    span.onclick = () => {
      root.textContent = '';
      localStorage.setItem('explore-count', INC);
      cload();
    };
  };

  const build = json => {
    if (json.length === 0) return;
    /*  */
    if (SORT % 4 === 0) {
      json = shuffle(json);
      localStorage.setItem('explore-sort', 1);
      localStorage.setItem('explore-json', JSON.stringify(json));
    } else {
      localStorage.setItem('explore-sort', SORT + 1);
      json = localStorage.getItem('explore-json') ? JSON.parse(localStorage.getItem('explore-json')) : json;
    }
    /*  */
    const root = document.getElementById('explore');
    root.textContent = 'Explore more';
    root.dataset.loaded = true;
    /*  */
    const table = document.createElement('table');
    const span = document.createElement('span');
    const tr = document.createElement('tr');
    /*  */
    table.setAttribute("class", "container");
    span.classList.add('close');
    span.textContent = '✕';
    /*  */
    span.onclick = () => {
      root.textContent = '';
      root.dataset.loaded = false;
      localStorage.setItem("explore-count", 0);
      explore();
    };
    /*  */
    root.appendChild(span);
    table.appendChild(tr);
    root.appendChild(table);
    /*  */
    json.slice(0, 4).forEach(({id, title}, index) => {
      if (id && title) {
        const a = document.createElement('a');
        const td = document.createElement('td');
        const short = chrome.runtime.getManifest().short_name;
        const homepage = chrome.runtime.getManifest().homepage_url;
        const url = homepage.split('/').slice(0, -1).join('/') + '/';
        a.href = url + id + ".html?context=explore&from=" + short;
        a.setAttribute("title", title);
        a.target = '_blank';
        /*  */
        const icon = document.createElement('span');
        icon.textContent = title.replace(' -', '').split(' ').map(e => e[0]).slice(0, 2).join('').toUpperCase();
        icon.style.backgroundColor = randcolor();
        icon.setAttribute("class", "icon");
        a.appendChild(icon);
        /*  */
        const name = document.createElement('span');
        name.setAttribute("class", "name");
        name.textContent = title;
        a.appendChild(name);
        /*  */
        if (index) td.setAttribute("class", "spacer");
        td.appendChild(a);
        tr.appendChild(td);
      }
    });
  };

  if (COUNT >= INC) {
    if (COUNT < INC + 4) cload(); else explore();
    /*  */
    if (COUNT > INC + 5) localStorage.setItem('explore-count', INC);
    else localStorage.setItem('explore-count', COUNT + 1);
  } else {
    explore();
    localStorage.setItem('explore-count', COUNT + 1);
  }
}
