// ===== 1. DFA: state -> { jenis token : state berikutnya } =====
const dfa = {
  q0: { KEYWORD: "q1", ID: "q2" },
  q1: { ID: "q2" },
  q2: { ASSIGN: "q3" },
  q3: { NUM: "q4", ID: "q4", STR: "q4" },
  q4: { OP: "q3", SEMI: "q5" },
  q5: {}
};
const akhir = "q5";
const daftarState = Object.keys(dfa);

// ===== 2. Jenis token =====
function jenis(t) {
  if (["let", "var", "const"].includes(t)) return "KEYWORD";
  if (/^[A-Za-z_]\w*$/.test(t)) return "ID";
  if (/^\d+$/.test(t)) return "NUM";
  if (/^".*"$/.test(t)) return "STR";
  if (t === "=") return "ASSIGN";
  if ("+-*/".includes(t)) return "OP";
  if (t === ";") return "SEMI";
  return "UNKNOWN";
}

// ===== 3. Ambil elemen halaman =====
const $ = (id) => document.getElementById(id);
if (!$("peta")) throw new Error("index.html belum versi terbaru. Ganti ketiga file sekaligus.");
const kode = $("kode"), tokenBox = $("token"), peta = $("peta"), info = $("info");

// ===== 4. Gambar diagram state (SVG) =====
const X = (i) => 60 + i * 115;   // posisi x tiap state
const jalurTitik = {};           // jalur yang diikuti titik saat bergerak

function gambarDiagram() {
  let svg = '<defs><marker id="p" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">' +
            '<path d="M0,0 L8,4 L0,8 z" fill="context-stroke"/></marker></defs>';

  // kumpulkan panah: "q0,q1" -> ["KEYWORD", ...]
  const panah = {};
  for (const s in dfa) {
    for (const j in dfa[s]) {
      const k = s + "," + dfa[s][j];
      panah[k] = panah[k] || [];
      panah[k].push(j);
    }
  }

  for (const k in panah) {
    const [dari, ke] = k.split(",");
    const a = +dari.slice(1), b = +ke.slice(1);
    const x1 = X(a), x2 = X(b), tengah = (x1 + x2) / 2, teks = panah[k].join("/");
    let d, ly;
    if (b === a + 1) {            // panah lurus
      d = `M${x1 + 26} 100 L${x2 - 28} 100`;
      jalurTitik[k] = `M${x1} 100 L${x2} 100`;
      ly = 90;
    } else if (b > a) {           // melompat maju (lengkung atas)
      d = `M${x1} 74 Q${tengah} 0 ${x2} 72`;
      jalurTitik[k] = `M${x1} 100 L${x1} 74 Q${tengah} 0 ${x2} 72 L${x2} 100`;
      ly = 30;
    } else {                      // kembali ke belakang (lengkung bawah)
      d = `M${x1} 126 Q${tengah} 200 ${x2} 128`;
      jalurTitik[k] = `M${x1} 100 L${x1} 126 Q${tengah} 200 ${x2} 128 L${x2} 100`;
      ly = 185;
    }
    svg += `<path id="e-${dari}-${ke}" class="garis" d="${d}" marker-end="url(#p)"/>`;
    svg += `<text class="label" x="${tengah}" y="${ly}">${teks}</text>`;
  }

  daftarState.forEach((s, i) => {
    svg += `<g class="state" id="${s}"><circle cx="${X(i)}" cy="100" r="26"/>` +
           (s === akhir ? `<circle class="dalam" cx="${X(i)}" cy="100" r="21"/>` : "") +
           `<text x="${X(i)}" y="105">${s}</text></g>`;
  });

  // titik yang bergerak mengikuti panah
  svg += '<circle id="titik" r="8"><animateMotion id="gerak" fill="freeze"/></circle>';
  peta.innerHTML = svg;
  geser("M60 100 L60 100", 10);   // letakkan titik di q0
  $("q0").classList.add("now");
}

function geser(path, ms) {
  const g = $("gerak");
  g.setAttribute("path", path);
  g.setAttribute("dur", ms + "ms");
  g.beginElement();
}

// ===== 5. Simulasi =====
let timer;

function pindah(dari, ke, ms) {
  $(dari).classList.remove("now");
  $(dari).classList.add("visited");
  $(ke).classList.add("now");
  $("e-" + dari + "-" + ke).classList.add("dipakai");
  geser(jalurTitik[dari + "," + ke], ms);
}

function jalankan() {
  clearInterval(timer);
  gambarDiagram();
  peta.classList.remove("salah", "sukses");
  info.className = "info";

  const token = kode.value.match(/"[^"]*"|\w+|\S/g) || [];
  tokenBox.innerHTML = token.map((t) =>
    `<span class="chip"><b>${t.replace(/</g, "&lt;")}</b><small>${jenis(t)}</small></span>`).join("");
  if (token.length === 0) { info.textContent = "Tulis kode dulu."; return; }

  const chip = tokenBox.children;
  const ms = +$("kecepatan").value;
  let state = "q0", i = 0;

  timer = setInterval(() => {
    if (i > 0) chip[i - 1].className = "chip selesai";

    if (i === token.length) {          // semua token sudah dibaca
      clearInterval(timer);
      const ok = state === akhir;
      peta.classList.add(ok ? "sukses" : "salah");
      info.className = "info " + (ok ? "ok" : "bad");
      info.textContent = ok ? "Diterima: berhenti di q5 (state akhir)."
                            : "Ditolak: berhenti di " + state + ", belum sampai q5.";
      return;
    }

    const t = token[i], next = dfa[state][jenis(t)];
    chip[i].className = "chip aktif";

    if (!next) {                       // tidak ada jalur: tolak
      clearInterval(timer);
      chip[i].className = "chip salah";
      peta.classList.add("salah");
      info.className = "info bad";
      info.textContent = "Ditolak: token “" + t + "” (" + jenis(t) + ") tidak punya jalur dari " + state + ".";
      return;
    }

    info.textContent = "Baca “" + t + "” (" + jenis(t) + "): " + state + " → " + next;
    pindah(state, next, ms * 0.75);
    state = next;
    i++;
  }, ms);
}

// ===== 6. Tombol =====
$("jalan").onclick = jalankan;
kode.onkeydown = (e) => { if (e.key === "Enter") jalankan(); };
document.querySelectorAll(".contoh button").forEach((b) => {
  b.onclick = () => { kode.value = b.dataset.k; jalankan(); };
});

gambarDiagram();