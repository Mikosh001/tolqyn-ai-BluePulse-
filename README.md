# TOLQYN AI — Caspian Drift Intelligence

Каспийдегі мұнай, қалқымалы қоқыс және биологиялық объектілердің келесі
6–72 сағатта қай жағалауға жететінін болжайтын, ең тиімді тоқтату нүктесін
(Interception Point) ұсынатын және кері есептеу (Reverse Drift) арқылы
ықтимал бастапқы көзін анықтайтын толық жұмыс істейтін MVP.

**Команда:** BluePulse

> TOLQYN AI желді, су ағысын және спутниктік деректерді талдап, ластану мен
> қауіпті объектілердің қайда тарайтынын, қашан жетерін және қай жерде
> тоқтатқан тиімді екенін болжайды.

---

## 1. Жүйе не істейді (толық тізім)

| Мүмкіндік | Күйі | Қайда |
|---|---|---|
| Forward Drift (таралуды болжау, 12–72 сағ) | ✅ жұмыс істейді | backend + frontend |
| Reverse Drift (бастапқы көзді кері есептеу) | ✅ жұмыс істейді | backend + frontend |
| Interception Point (тоқтату нүктесі + есептелген аудан қатынасы) | ✅ жұмыс істейді | backend + frontend |
| Жағалау секторлары бойынша қауіп ықтималдығы | ✅ жұмыс істейді | backend + frontend |
| **Risk Prediction** — түсіндірілетін salmaqты баллдау моделі | ✅ жұмыс істейді | `backend/app/risk_model.py` |
| **Satellite Anomaly Detection** — нақты computer-vision (OpenCV) | ✅ жұмыс істейді | `backend/app/anomaly_detection.py` |
| **Action Copilot** — жедел ұсыныс генерациясы (template-based) | ✅ жұмыс істейді | backend + frontend |
| **Live Data** — нақты Open-Meteo Forecast/Marine API | ✅ жұмыс істейді (fallback-пен) | `backend/app/weather_client.py` |
| Demo Data — интернетсіз жұмыс істейтін синтетикалық модель | ✅ жұмыс істейді | frontend + backend |
| Backend қолжетімсіз болғанда клиент жағына automatты ауысу | ✅ жұмыс істейді | `src/App.tsx` |
| Уақыт бойынша анимацияланған карта (Leaflet + canvas) | ✅ жұмыс істейді | frontend |
| 22 automatтандырылған backend тесті (pytest) | ✅ барлығы өтеді | `backend/tests/` |
| Sentinel Hub нақты спутник суреттерімен интеграция | ⏳ TODO (төменде) | — |
| Copernicus Marine ресми клиенті (нақты сертификатталған ағыс дерегі) | ⏳ TODO (төменде) | — |
| PostGIS/дерекқор (қазір JSON конфигурация) | ⏳ қажет емес (MVP көлемінде) | — |

**Маңызды:** «Live Data» деп белгіленгеннің бәрі — шынымен нақты, тегін, ашық
API-дан алынған дерек (Open-Meteo). Ешбір сан қатырылған (hardcoded) емес —
барлық ықтималдық, ETA, Interception Point координаттары әр сұраныста нақты
есептеледі.

---

## 2. Архитектура

```
┌─────────────────────┐        HTTP/JSON        ┌──────────────────────────┐
│   Frontend (React)  │ ───────────────────────▶│   Backend (FastAPI)      │
│   Leaflet карта     │ ◀─────────────────────── │   numpy drift-симуляция │
│   GitHub Pages      │                          │   Render.com             │ 
└─────────────────────┘                          └───────────┬──────────────┘
        │  желі жоқ болса                                    │
        │  demo-симуляция жұмыс істейді                      ▼
        ▼                                            ┌──────────────────────┐
┌─────────────────────┐                              │   Open-Meteo API     │
│src/lib/simulation.ts│                              │ (жел + ағыс есептеу) │
└─────────────────────┘                              └──────────────────────┘
```

Екі тәуелсіз орындалу ортасы жасалған:

1. **Frontend-client симуляция** (`src/lib/simulation.ts`) — TypeScript-те
   толығымен дербес жұмыс істейді, backend/интернет мүлдем болмаса да
   (Ереженің 9.1-тармағы: "Демо интернетсіз де жұмыс істеуі тиіс").
2. **Backend симуляция** (`backend/app/drift_model.py`) — numpy негізінде,
   нақты Open-Meteo дерегімен ("Live Data"), көбірек бөлшекпен және
   Risk Prediction/Action Copilot/Anomaly Detection сияқты қосымша
   модульдермен.

Backend қолжетімсіз болса (желі жоқ, сервер ұйықтап жатыр — төмендегі
"Деплой" бөлімін қараңыз), frontend мұны `try/catch` арқылы automatты
байқап, ескерту көрсетіп, (1)-ге ауысады. Бұл ауысу `App.tsx`-те
Playwright арқылы сыналған.

---

## 3. Тез бастау

### Нұсқа A — Docker (ең оңай, бір команда)

```bash
docker compose up --build
```

Frontend: http://localhost:5173 · Backend Swagger: http://localhost:8000/docs

### Нұсқа B — dev.sh скрипті (Docker-сіз)

```bash
./dev.sh
```

### Нұсқа C — қолмен

```bash
# Backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Жаңа терминалда — Frontend
npm install
npm run dev
```

Ашыңыз: http://localhost:5173. Панельдегі "Дерек көзі" жанындағы жасыл
нүкте backend қосылғанын білдіреді — сол кезде "Live Data" батырмасы
белсенді болады.

---

## 4. демо сценарийі 

1. **Forward Drift**: әдепкі оқиға нүктесімен (мұнай дағы) тікелей
   «Симуляцияны бастау» басыңыз. Нәтиже панелінде ең қауіпті сектор,
   ықтималдық, Interception Point пайда болады. Уақыт слайдерін ойнатыңыз.
2. **Live Data**-ға ауысып, қайта іске қосыңыз — backend нақты Open-Meteo
   API-ға сұраныс жібереді (Network tab-та көруге болады).
3. **Reverse Drift** режиміне ауысып, "табылған объект" нүктесін өзгертіп
   көрсетіңіз — жүйе ықтимал бастапқы аймақты кері есептейді.
4. **«Спутник суретін талдау (AI)»** батырмасын басып,
   `backend/sample_data/demo_satellite.jpg` файлын жүктеңіз — нақты
   OpenCV алгоритмі аномалияны тауып, сенімділік пайызымен белгілейді.
5. Backend-ті өшіріп көрсетіңіз (Ctrl+C) — "Demo Data" режимі әлі де
   толық жұмыс істейтінін көрсетіңіз (интернетсіз/backend-сіз талап).




---

## 5. Жоба құрылымы

```
tolqyn-ai/
├── src/                        # Frontend (React + TypeScript + Vite)
│   ├── data/geo.ts              # жағалау секторлары, объект түрлері
│   ├── lib/
│   │   ├── simulation.ts         # клиент жағындағы demo-симуляция (backend-сіз)
│   │   ├── vectorField.ts         # синтетикалық жел/ағыс өрісі
│   │   ├── api.ts                  # backend клиенті (graceful error handling)
│   │   ├── adapters.ts              # backend жауабын frontend түріне бейімдеу
│   │   └── actionCopilot.ts          # клиент жағындағы ұсыныс мәтіні
│   └── components/                    # MapView, ControlPanel, ResultsPanel,
│                                       # TimeSlider, AnomalyPanel
├── backend/                     # Backend (FastAPI + Python)
│   ├── app/
│   │   ├── main.py                # API маршруттары, CORS
│   │   ├── drift_model.py          # numpy бөлшек симуляциясы
│   │   ├── weather_client.py        # Open-Meteo интеграциясы + fallback
│   │   ├── synthetic_field.py        # демо жел/ағыс моделі
│   │   ├── risk_model.py              # түсіндірілетін risk-scoring
│   │   ├── action_copilot.py           # ұсыныс мәтіні
│   │   ├── anomaly_detection.py         # OpenCV аномалия анықтау
│   │   └── config.py                     # секторлар, объект түрлері
│   ├── tests/                    # 22 pytest тесті
│   ├── sample_data/               # демо "спутник" суреті + генератор
│   ├── requirements.txt
│   └── Dockerfile
├── docker-compose.yml
├── dev.sh
└── HACKATHON_COMPLIANCE.md    # Ереже/ТЗ талаптарымен салыстыру
```

---

## 6. API қысқаша анықтамалығы

Толық интерактивті құжаттама: `http://localhost:8000/docs` (Swagger UI,
FastAPI automatты генерациялайды).

| Endpoint | Әдіс | Сипаттамасы |
|---|---|---|
| `/api/health` | GET | Denсаулық тексеру |
| `/api/sectors` | GET | Жағалау секторларының тізімі |
| `/api/object-types` | GET | Объект түрлері (windage коэффициенттерімен) |
| `/api/weather?lat&lng&hours` | GET | Сағаттық жел/ағыс өрісі (live/demo) |
| `/api/simulate` | POST | Толық дрейф симуляциясы (forward/reverse) |
| `/api/detect-anomaly` | POST | Спутник суретін жүктеп, аномалия анықтау |

## 7. Тестілеу

```bash
cd backend
pytest -v          # 22 тест: drift моделі, risk scoring, API, CV
```

```bash
npm run build       # TypeScript type-check + Vite build
```

## 8. Технологиялар

**Frontend:** React 19, TypeScript, Vite, Leaflet/react-leaflet, lucide-react
**Backend:** FastAPI, NumPy, httpx, OpenCV (opencv-python-headless), Pydantic
**Дерек көздері:** Open-Meteo Forecast API, Open-Meteo Marine API (екеуі де
тегін, кілтсіз) — Каспий дерек бермесе синтетикалық fallback
**Инфрақұрылым:** GitHub Pages (frontend) + Render.com free tier (backend) —
толық нөлдік бюджет

## 9. Одан әрі даму

Толық тізім `HACKATHON_COMPLIANCE.md` файлында. Қысқаша:

- Sentinel Hub OAuth интеграциясы (нақты спутник суреттері)
- Copernicus Marine ресми клиенті (Каспийге арналған валидацияланған ағыс дерегі)
- Тарихи оқиғалар негізінде Risk Prediction моделін калибрлеу
- PWA/офлайн-кэштеу (Service Worker)
- Мобильді далалық қосымша (жағалау қызметтеріне арналған)

## 10. Жүлде қорын пайдалану жоспары

Хакатон жеңімпаздары жобаны 2026 жылғы 31 желтоқсанға дейін дамытуды
жалғастыру міндеттемесін алады (Ереже, 17-тармақ). Жүлде қаражатын
BluePulse келесідей бөлуді жоспарлап отыр:

| Бағыт | Үлесі | Мақсаты |
|---|---|---|
| Backend инфрақұрылымы және нақты дерек API-лары | 35% | Sentinel Hub/Copernicus Marine коммерциялық tier, тұрақты сервер хостингі (Render Free-тен ақылы жоспарға көшу — cold start мәселесін шешу) |
| Далалық пилот (IoT сенсорлар) | 25% | Ақтау/Баутино жағалауында 1–2 нақты бақылау нүктесін орнату — модельді нақты өлшеммен валидациялау |
| Команданың дамыту уақыты | 20% | 2026 жылдың соңына дейін жобаны қолдау және жетілдіру (жеңімпаз міндеттемесі) |
| UX және мобильді қосымша | 15% | Жағалау қызметтері үшін далалық мобильді нұсқа |
| Құқықтық/әріптестік ресімдеу | 5% | Маңғыстау облысының жастар саясаты басқармасымен және эко-ұйымдармен ынтымақтастықты ресми бекіту |

**Хакатоннан кейінгі жол картасы:**
1. **Тамыз–қыркүйек 2026** — Sentinel Hub/Copernicus Marine интеграциясы, GitHub Actions CI
2. **Қазан 2026** — Мангистау облысының экология басқармасымен пилоттық қолдану келісімі
3. **Қараша 2026** — 1 нақты бақылау нүктесінде IoT сенсор пилоты
4. **Желтоқсан 2026** — Тарихи деректер негізінде risk-модельді қайта калибрлеу, қорытынды есеп

## Ескерту

MVP ашық метеорологиялық/теңіз деректерін біріктіріп, ықтималдық болжам
көрсетеді — толық ғылыми гидродинамикалық модельдің орнына жүрмейді.
Барлық сандық нәтижелер (пайыз, аудан қатынасы, т.б.) симуляция кезінде
нақты есептеледі, алдын ала қатырылған мән емес.

## Команда

**BluePulse**

- Бердібек Мейірбек
- Алхамқайыр Бекзат
- Жанкелді Бексұлтан
