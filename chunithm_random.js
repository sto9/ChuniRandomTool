let user_id = "";
let records;
let records_all; // 未プレイを含む
let musics_all;

async function loadAllMusicsData() {
    const URL = "https://api.chunirec.net/2.0/music/showall.json?region=jp2&token=0cc61074c6f6ccf038b3c62be917be3ef317458be49bd3cd68c78a80b4d024b144db12e7f941a8c043f3ac8b4b0c610740e8960baf53f5469de414d6588fa6b5";
    const res = await fetch(URL);
    musics_all = await res.json();
}

// クッキーを読み込み、設定を反映
function loadCookie() {
    for (let target of ['user_id', 'level_lower', 'level_upper', 'display_number']) {
        let cookie;
        if (cookie = Cookies.get(target))
            document.getElementById(target).value = cookie;
    }
    for (let target of ['ultima', 'genre_pa', 'genre_nico', 'genre_toho', 'genre_var', 'genre_iro', 'genre_geki', 'genre_ori', 'radio_AJC', 'radio_99AJ', 'radio_AJ', 'exclude_unplayed']) {
        let cookie;
        if (cookie = Cookies.get(target))
            document.getElementById(target).checked = (cookie === 'on');
    }
}
// 設定を保存
function saveCookie() {
    for (let target of ['user_id', 'level_lower', 'level_upper', 'display_number']) {
        Cookies.set(target, document.getElementById(target).value);
    }
    for (let target of ['ultima', 'genre_pa', 'genre_nico', 'genre_toho', 'genre_var', 'genre_iro', 'genre_geki', 'genre_ori', 'radio_AJC', 'radio_99AJ', 'radio_AJ', 'exclude_unplayed']) {
        Cookies.set(target, (document.getElementById(target).checked ? 'on' : 'off'));
    }
}

// 前と同じ ID なら呼ばない
// 成功したかどうかを返す
async function callApi() {
    if (user_id !== "" && user_id === document.getElementById('user_id').value) return true;
    if (document.getElementById('user_id').value === "") {
        document.getElementById('user_id_error').innerHTML = "<b>ユーザー ID を入力してください。</b>";
        return false;
    }
    const BASE_URL = "https://api.chunirec.net/2.0/records/showall.json?region=jp2&token=0cc61074c6f6ccf038b3c62be917be3ef317458be49bd3cd68c78a80b4d024b144db12e7f941a8c043f3ac8b4b0c610740e8960baf53f5469de414d6588fa6b5&user_name=";
    const URL = BASE_URL + document.getElementById('user_id').value;
    const res = await fetch(URL);
    if (!res.ok) {
        document.getElementById('user_id_error').innerHTML = "<b>不正なユーザー ID です。</b>";
        user_id = "";
        return false;
    }
    document.getElementById('user_id_error').innerHTML = "";
    const json = await res.json();
    records = await json["records"];
    user_id = document.getElementById('user_id').value;
    return true;
}

function genre_to_id(genre) {
    if (genre === "POPS&ANIME") return "genre_pa";
    if (genre === "niconico") return "genre_nico";
    if (genre === "東方Project") return "genre_toho";
    if (genre === "VARIETY") return "genre_var";
    if (genre === "イロドリミドリ") return "genre_iro";
    if (genre === "ゲキマイ") return "genre_geki";
    if (genre === "ORIGINAL") return "genre_ori";
    return ""; // WE など
}

function isValidRecord(record) {
    // 難易度
    let ultima = document.getElementById('ultima').checked;
    if (!(record["diff"] === "MAS" || (record["diff"] === "ULT" && ultima))) return false;
    // レベル
    let lower = document.getElementById('level_lower').value;
    let upper = document.getElementById('level_upper').value;
    if (record["level"] < lower || record["level"] > upper) return false;
    // ジャンル
    genre_id = genre_to_id(record["genre"]);
    if (genre_id === "" || !document.getElementById(genre_id).checked) return false;
    // 目標
    if (document.getElementById('radio_AJC').checked) {
        if (record["score"] == "1010000") return false;
    } else if (document.getElementById('radio_99AJ').checked) {
        if (record["is_alljustice"] && record["score"] >= 1009900) return false;
    } else if (document.getElementById('radio_AJ').checked) {
        if (record["is_alljustice"]) return false;
    }

    return true;
}

function addTable(record) {
    let level = String(record["level"]);
    if (level.length > 2)
        level = level.slice(0, 2) + "+";
    let lamp = "-";
    if (record["is_alljustice"]) lamp = "AJ"
    else if (record["is_fullcombo"]) lamp = "FC"

    let new_HTML = "<tr>";
    new_HTML += "<td>" + record["title"] + "</td>";
    new_HTML += "<td>" + record["diff"] + " " + level + "</td>";
    new_HTML += "<td>" + record["genre"] + "</td>";
    new_HTML += "<td>" + record["score"] + "</td>";
    new_HTML += "<td>" + lamp + "</td>";
    new_HTML += "</tr>";
    table.insertAdjacentHTML('beforeend', new_HTML);
}

function setAllRecords() {
    let played_music_id = new Set();
    for (let i = 0; i < records.length; i++) {
        played_music_id.add(records[i]["id"] + records[i]["diff"]);
    }
    records_all = records.slice();
    for (let i = 0; i < musics_all.length; i++) {
        let id = musics_all[i]["meta"]["id"];
        for (let diff of ["MAS", "ULT"]) {
            if (diff in musics_all[i]["data"]) {
                if (!played_music_id.has(id + diff)) {
                    let new_rec = { ...musics_all[i]["meta"], ...musics_all[i]["data"][diff] };
                    new_rec["score"] = 0;
                    new_rec["is_fullcombo"] = false;
                    new_rec["is_alljustice"] = false;
                    new_rec["diff"] = diff;
                    records_all.push(new_rec);
                }
            }
        }
    }
}

function setTable() {
    let table = document.getElementById("table");
    while (table.firstChild) table.removeChild(table.firstChild);
    let th = '<th scope="col" style="width: 30%%">曲名</th>';
    th += '<th scope="col" style="width: 13%">難易度</th>';
    th += '<th scope="col" style="width: 15%">ジャンル</th>';
    th += '<th scope="col" style="width: 15%">スコア</th>';
    th += '<th scope="col" style="width: 7%">ランプ</th>';
    table.insertAdjacentHTML('beforeend', th);

    let display_number = document.getElementById('display_number').value;
    let displayed_count = 0;
    let valid_music_count = 0;

    if (document.getElementById('exclude_unplayed').checked) {
        let idx = [...Array(records.length).keys()];
        // shuffle
        for (let i = idx.length - 1; i > 0; i--) {
            let k = Math.floor(Math.random() * i);
            [idx[i], idx[k]] = [idx[k], idx[i]];
        }
        for (let i = 0; i < idx.length; i++) {
            if (!isValidRecord(records[idx[i]])) continue;
            valid_music_count++;
            if (displayed_count == display_number) continue;
            displayed_count++;
            addTable(records[idx[i]]);
        }
    } else {
        setAllRecords();
        let idx = [...Array(records_all.length).keys()];
        // shuffle
        for (let i = idx.length - 1; i > 0; i--) {
            let k = Math.floor(Math.random() * i);
            [idx[i], idx[k]] = [idx[k], idx[i]];
        }
        for (let i = 0; i < idx.length; i++) {
            if (!isValidRecord(records_all[idx[i]])) continue;
            valid_music_count++;
            if (displayed_count == display_number) continue;
            displayed_count++;
            addTable(records_all[idx[i]]);
        }
    }
    let music_count_sentense = document.getElementById("music_count_sentense");
    music_count_sentense.innerHTML = "<b>" + valid_music_count + "</b> 曲中 ";
    music_count_sentense.innerHTML += displayed_count + " 曲を表示"
}

async function OnButtonClick() {
    if (!(await callApi())) return;
    setTable();
    saveCookie()
}

// 譜面保管所からデータを検索
