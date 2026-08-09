# TOLQYN AI — Тапсыруға дайындық толық нұсқаулығы

**Дедлайн: 7 тамыз, 12:00** · Email: sh.dauletkalikyzy@astanahub.com
**Команда:** BluePulse

Бұл құжат — хаттың соңғы жіберілуіне дейінгі барлық қадамдарды жабады.
Реттілікпен орындаңыз, шамамен **40–50 минут** алады.

---

## ҚАДАМ 1 — GitHub репозиторийін жасау (10 минут)

1. https://github.com/new бетіне кіріңіз (аккаунт керек — жоқ болса,
   тегін тіркеліңіз).
2. Repository name: `tolqyn-ai-BluePulse-`
3. **Public** таңдаңыз (жюри көре алуы үшін — Private болса қолжетімсіз болады!)
4. "Add README" **белгілемеңіз** (бізде дайын README бар, қайшылық
   болмау үшін).
5. "Create repository" басыңыз.
6. Терминалда (`tolqyn-ai-mvp.zip` файлын ашқан қалтада):

   ```bash
   cd tolqyn-ai-BluePulse-
   git init
   git add .
   git commit -m "TOLQYN AI — Caspian Hackathon MVP (BluePulse)"
   git branch -M main
   git remote add origin https://github.com/<GITHUB_USERNAME>/tolqyn-ai-BluePulse-.git
   git push -u origin main
   ```

   `<GITHUB_USERNAME>` орнына нақты GitHub логиніңізді жазыңыз.
   Парольді сұраса — GitHub енді парольді емес, **Personal Access
   Token** сұрайды: https://github.com/settings/tokens → "Generate new
   token (classic)" → `repo` құқығымен → сол токенді пароль орнына
   қойыңыз.

7. Тексеріңіз: `https://github.com/<username>/tolqyn-ai-BluePulse-` ашылып,
   барлық файлдар (README.md, src/, backend/ т.б.) көрінуі керек.

---

## ҚАДАМ 2 — Backend-ті Render.com-ға деплой ету (15 минут)

1. https://render.com → "Get Started" → GitHub аккаунтыңызбен кіріңіз
   (карта нөмірі СҰРАЛМАЙДЫ).
2. Dashboard-та **New +** → **Web Service**.
3. "Build and deploy from a Git repository" → `tolqyn-ai-BluePulse-` репозиторийін
   таңдаңыз (алдымен GitHub-қа Render-ге рұқсат беру керек болуы мүмкін
   — "Configure account" арқылы).
4. Параметрлер:
   - **Name:** `tolqyn-ai-backend`
   - **Root Directory:** `backend`
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** Free
5. **Create Web Service** басыңыз. 2–5 минут күтіңіз (алғашқы build).
6. Деплой аяқталған соң жоғарыда сілтеме көрінеді:
   `https://tolqyn-ai-backend.onrender.com` (нақты атауы сәл өзгеше
   болуы мүмкін — Render автоматты қосымша жасайды).
7. Тексеру: сол сілтемеге `/api/health` қосып ашыңыз:
   `https://tolqyn-ai-backend.onrender.com/api/health` →
   `{"status":"ok","service":"tolqyn-ai-backend"}` шығуы керек.
8. Swagger құжаттамасы: `https://tolqyn-ai-backend.onrender.com/docs`
   (жюриге көрсетуге өте әсерлі — барлық endpoint интерактивті).

**Ескерту:** тегін tier 15 минут белсенді болмаса ұйықтайды, келесі
сұраныс 30–60 секунд "ояту" алады. Хатты жібермес бұрын және қорғау
алдында `/api/health` сілтемесіне бір рет кіріп, "оятып" қойыңыз.

---

## ҚАДАМ 3 — Frontend-ті GitHub Pages-ке деплой ету (10 минут)

1. `vite.config.ts` файлын ашып, мына жолды тексеріңіз/өзгертіңіз:
   ```ts
   base: '/tolqyn-ai-BluePulse-/',   // GitHub username емес, РЕПО атауы болуы керек
   ```
2. Backend URL-ін көрсету үшін жоба түбірінде `.env.production`
   файлын жасаңыз:
   ```
   VITE_API_BASE_URL=https://tolqyn-ai-backend.onrender.com
   ```
   (2-қадамда алған нақты Render сілтемеңізді қойыңыз, соңында `/` **жоқ**)
3. Терминалда:
   ```bash
   npm install
   npm run deploy
   ```
   Бұл `npm run build` жасап, `gh-pages` арқылы `dist/` қалтасын
   `gh-pages` branch-ына автоматты жібереді.
4. GitHub-та: репозиторий → **Settings** → **Pages** → "Build and
   deployment" → Source: **Deploy from a branch** → Branch: **gh-pages**
   / `(root)` → **Save**.
5. 1–2 минуттан кейін сілтеме белсенді болады:
   `https://<username>.github.io/tolqyn-ai-BluePulse-/`
6. Ашып тексеріңіз: карта жүктелуі, "Дерек көзі" жанында жасыл нүкте
   ("backend қосылған") көрінуі керек. Көрінбесе — Render backend-і
   ұйықтап қалған болуы мүмкін, 1 минут күтіп қайта жүктеңіз.

---

## ҚАДАМ 4 — Соңғы тексеру (5 минут)

- [ ] `https://github.com/<username>/tolqyn-ai-BluePulse-` — публикалық, барлық файл бар
- [ ] `https://tolqyn-ai-backend.onrender.com/api/health` — `{"status":"ok"}` қайтарады
- [ ] `https://<username>.github.io/tolqyn-ai-BluePulse-/` — ашылады, карта көрінеді
- [ ] Сайтта "Симуляцияны бастау" басыңыз — нәтиже панелі толады
- [ ] "Live Data" таңдап қайта іске қосыңыз — жұмыс істейді (немесе adal
      fallback хабары шығады, бұл да қалыпты)
- [ ] "Спутник суретін талдау (AI)" ашып, `backend/sample_data/demo_satellite.jpg`
      жүктеп көріңіз — аномалия анықталады

---

## ҚАДАМ 5 — Хатты жіберу

**Кімге:** sh.dauletkalikyzy@astanahub.com
**Тақырыбы:** `Hackathon – BluePulse`

**Хат мәтіні (дайын үлгі — өзгертіп қолданыңыз):**

```
Сәлеметсіз бе!

«Caspian Hackathon» I Халықаралық хакатонына BluePulse командасының
TOLQYN AI жобасын ұсынамыз.

Жоба атауы: TOLQYN AI — Caspian Environmental Drift Prediction and
Response System
Команда: BluePulse (Бердібек Мейірбек, Алхамқайыр Бекзат,
Жанкелді Бексұлтан)

Қоса берілгендер:
1. Жоба презентациясы (қоса тіркелген PDF/PPTX)
2. GitHub репозиторийі: https://github.com/<username>/tolqyn-ai-BluePulse-
3. Деплойланған MVP: https://<username>.github.io/tolqyn-ai-BluePulse-/
   (Backend API: https://tolqyn-ai-backend.onrender.com/docs)

Құрметпен,
BluePulse командасы
```

**Тіркейтін файлдар:**
- `TOLQYN_AI_presentation.pptx` (немесе экспортталған PDF нұсқасы)
- Жоба сипаттамасы (`TOLQYN_AI_жоба_сипаттамасы.md` — қаласаңыз Word/PDF-ке
  түрлендіріп қоса аласыз)

**Жіберместен бұрын:** екі сілтемені де (GitHub, деплой) жаңа
инкогнито/жеке шолғыш терезесінде ашып, шынымен қоғамдық қолжетімді
екенін тексеріңіз.

---

## ҚАДАМ 6 — Жюри сұрақтарына жедел дайындық (қорғау алдында оқып шығыңыз)

**"Дрейф қалай есептеледі?"**
Лагранж бөлшек әдісі: әр виртуалды бөлшекке сағат сайын ағыс векторы +
(windage коэффициенті × жел векторы) + кездейсоқ турбуленттілік
қосылып, жаңа GPS позициясы есептеледі. `backend/app/drift_model.py`,
`run_drift()` функциясы.

**"Interception Point қалай табылады?"**
Бөлшектер бұлтының таралу радиусы (75-персентиль) 6 км-ден аз әрі
жағалаудан әлі 4 км-ден алыс болатын **соңғы** уақыт сәті таңдалады —
яғни бөлшектер әлі "жиналған" күйдегі соңғы мүмкіндік.

**"Risk score қалай есептеледі?"**
`risk_model.py`: ықтималдық × сектор сезімталдығы (қорғалатын
аймақ=1.4, порт=1.15, қала=1.0) × жеделдік коэффициенті. Салмақтар
эксперттік бағамен қойылған — статистикалық калибрленбегенін ашық
айтамыз (адалдық).

**"Anomaly Detection нейрондық желі ме?"**
Жоқ — классикалық computer vision (OpenCV): жергілікті контрасттан
қараңғылық картасы + Лаплас операторымен текстура анализі, контур
табу. Терең үйретуге дерек жинағы болмағандықтан әдейі осылай —
классикалық әдіс түсіндірілетін және тексерілетін.

**"Live Data нақты ма, әлде жалған ба?"**
Нақты — Open-Meteo Forecast API (жел) және Marine API (ағыс), екеуі де
тегін және кілтсіз. Каспий кейбір жаһандық мұхит модельдерінде толық
қамтылмағандықтан, ағыс дерегі кейде демо-моделге ауысады — бұл
интерфейсте әрдайым ашық көрсетіледі ("Жел: Live/Demo", "Ағыс:
Live/Demo" белгісі).

**"Неге backend бөлек, frontend жеткіліксіз бе?"**
Frontend-те толық жұмыс істейтін дербес демо-нұсқа бар (интернетсіз
жұмыс істеу талабы үшін). Backend күрделірек есептеулерге (numpy,
көбірек бөлшек), нақты API интеграциясына және Anomaly Detection-ге
арналған (браузерде OpenCV орындау мүмкін емес).

**"AI құралдарын (Claude/ChatGPT) қолдандыңыздар ма?"**
Иә, код жазуға көмекші құрал ретінде — бұл Ережеде рұқсат етілген
(7-тармақ). Команда архитектураны, әр модульдің логикасын және неге
дәл осылай жасалғанын толық түсінеді әрі түсіндіре алады (жоғарыдағы
жауаптар — дәл осының дәлелі).

---

## Егер уақыт тапшы болса — минималды жол

Егер 40–50 минут таппасаңыз, **міндетті минимум**:
1. GitHub push (Қадам 1) — **МІНДЕТТІ**, репо сілтемесі талап етіледі
2. Render backend деплой (Қадам 2) — жоқ болса, MVP тек localhost-та
   жұмыс істейді, жюри көре алмайды
3. GitHub Pages frontend (Қадам 3) — сол себепті МІНДЕТТІ

Docker/CI/қосымша күшейтулерсіз де осы үшеуі болса, хатты жіберуге
жеткілікті.
