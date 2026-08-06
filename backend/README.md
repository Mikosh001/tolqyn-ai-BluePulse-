# TOLQYN AI — Backend

FastAPI негізіндегі drift-симуляция API-і. Толық жоба контексті үшін
түбірдегі `README.md` файлын қараңыз.

## Орнату

```bash
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Swagger UI: http://localhost:8000/docs
ReDoc: http://localhost:8000/redoc

## Модульдер

| Файл | Жауапкершілігі |
|---|---|
| `main.py` | FastAPI app, маршруттар, CORS, қате өңдеу |
| `schemas.py` | Pydantic сұраныс/жауап модельдері (валидация) |
| `config.py` | Жағалау секторлары, объект түрлері (frontend-пен синхрон) |
| `synthetic_field.py` | Детерминирленген демо жел/ағыс моделі |
| `weather_client.py` | Open-Meteo Forecast/Marine API клиенті, TTL-кэш, fallback |
| `drift_model.py` | numpy бөлшек симуляциясы, тәуекел, Interception, Reverse Origin |
| `risk_model.py` | Түсіндірілетін (explainable) risk-scoring моделі |
| `action_copilot.py` | Нәтижеден қысқа жедел ұсыныс мәтінін генерациялау |
| `anomaly_detection.py` | OpenCV классикалық computer-vision аномалия анықтау |

## Live vs Demo дерек көзі — қалай жұмыс істейді

`weather_client.fetch_hourly_field()` әр сұраныста:

1. Open-Meteo Forecast API-ға жел үшін сұраныс жібереді (жаһандық
   атмосфералық модель — Каспийді толық қамтиды, әдетте "live" қайтарады).
2. Open-Meteo Marine API-ға ағыс/толқын үшін сұраныс жібереді. Каспий
   жабық су айдыны болғандықтан, кейбір жаһандық мұхит модельдері оны
   қамтымауы мүмкін — сол жағдайда API `null`/`0` қайтарады.
3. Әр компонент (жел, ағыс) ТӘУЕЛСІЗ түрде тексеріледі: нақты мән келсе
   `source="live"`, келмесе (қате, timeout, null) — `synthetic_field`
   модуліндегі демо моделіне ауысып, `source="demo"` деп белгіленеді.
4. Нәтиже 15 минутқа жады-кэштелінеді (`_CACHE_TTL_SECONDS`) — қайталама
   сұраныстарды азайту үшін.

Бұл — жауапта "Live" деп көрсетілгеннің бәрі шынымен нақты API дерегі
екеніне кепілдік беретін дизайн (интерфейс ешқашан демо дерегін жасырын
"live" деп көрсетпейді).

## Тестілеу

```bash
pytest -v                    # барлық тест
pytest tests/test_drift_model.py -v      # тек физика
pytest tests/test_api.py -v               # тек API endpoint-тер
pytest --cov=app tests/                    # coverage (pytest-cov орнатылған болса)
```

## Қоршаған орта айнымалылары

Backend қазіргі уақытта міндетті env var талап етпейді (Open-Meteo кілт
қажет етпейді). CORS үшін рұқсат етілген доменд `app/config.py`
ішіндегі `ALLOWED_ORIGINS` тізіміне қосыңыз.

## Демо спутник суретін қайта генерациялау

```bash
python3 sample_data/generate_demo_satellite.py
```

Бұл синтетикалық "теңіз + мұнай дағы + кеме ізі" суретін жасайды —
нақты спутник суреті емес, `anomaly_detection.py` алгоритмін сынау
үшін арнайы құрастырылған.

## Белгілі шектеулер (ашық түрде)

- **Ағыс дерегі**: Open-Meteo Marine API Каспийді әр уақытта толық
  қамтымауы мүмкін — сол жағдайда демо моделіне сенімді ауысады
  (жоғарыда сипатталған).
- **Anomaly Detection**: классикалық CV (терең оқыту емес) — нақты
  Sentinel-1/2 SAR суреттерінде оптикалық RGB суреттегіге қарағанда
  басқаша алгоритм қажет болуы мүмкін (SAR-да мұнай дағы керісінше
  **тегіс, қараңғы** пиксель ретінде көрінеді — біздің эвристика
  дәл осындай жағдайлар үшін жобаланған, бірақ нақты SAR деректерінде
  қосымша валидация қажет).
- **Risk model**: салмақтары эксперттік болжаммен қойылған (сектор
  сезімталдығы: protected=1.4, port=1.15, city=1.0) — нақты тарихи
  оқиғалар дерегі болмағандықтан статистикалық түрде калибрленбеген.
