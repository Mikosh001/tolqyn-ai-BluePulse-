# Бұл Dockerfile ЛОКАЛДЫ ДЕМО/ӘЗІРЛЕУ ыңғайлылығы үшін (docker-compose арқылы
# бір командамен frontend+backend көтеру). Нақты продакшн деплойы үшін
# GitHub Pages қолданылады (README.md → "Деплой" бөлімін қараңыз) — сол жерде
# бұл Dockerfile қатыспайды.
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "--port", "5173"]
