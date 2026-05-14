# VM Production Runbook для vnutri.live

Этот runbook описывает дешевый production v1 на одной Ubuntu VM `111.88.144.52`: Nginx, Next.js через PM2, локальный PostgreSQL, Certbot и PostgreSQL backup в Yandex Object Storage. Production не переключается на VM до явного cutover.

## Где что лежит

- Код приложения: `/opt/vnutri/app`
- PM2 wrapper: `/opt/vnutri/run.sh`
- App env с секретами: `/etc/vnutri/app.env`
- Backup env с секретами Object Storage: `/etc/vnutri/backup.env`
- Локальные PostgreSQL backup: `/var/backups/vnutri/postgres`
- Safety dump перед импортом: `/var/backups/vnutri/pre-import`
- Логи автоматизаций: `/var/log/vnutri/*.log`
- PM2 logs: `/opt/vnutri/.pm2/logs`
- Nginx config: `/etc/nginx/sites-available/vnutri.live.conf`

Секреты не должны попадать в git. В репозитории есть только шаблоны:

- `infra/vm/app.env.example`
- `infra/vm/backup.env.example`

## Первый setup VM

Скопируйте bootstrap script на VM, затем выполните:

```bash
sudo bash /tmp/bootstrap-vm.sh --ssh-allow <your-ip>/32
```

Скрипт устанавливает Node.js 22, Corepack/Yarn, PM2, PostgreSQL, Nginx, Certbot, awscli и базовые утилиты. Он создает пользователя `vnutri`, директории `/opt/vnutri/app`, `/etc/vnutri`, `/var/backups/vnutri`, `/var/log/vnutri` и включает UFW с закрытым наружу PostgreSQL.

Создайте deploy key:

```bash
sudo -iu vnutri
ssh-keygen -t ed25519 -C "vnutri-prod-deploy" -f ~/.ssh/vnutri-prod-deploy
cat ~/.ssh/vnutri-prod-deploy.pub
```

Добавьте публичный ключ в GitHub как read-only deploy key, затем:

```bash
sudo -iu vnutri
git clone --branch develop git@github.com:estenza/psy-prototype.git /opt/vnutri/app
```

Заполните env на VM:

```bash
sudo install -d -o root -g vnutri -m 750 /etc/vnutri
sudo nano /etc/vnutri/app.env
sudo nano /etc/vnutri/backup.env
sudo chown root:vnutri /etc/vnutri/*.env
sudo chmod 640 /etc/vnutri/*.env
```

## PostgreSQL

Создайте локальную роль и БД:

```bash
sudo /opt/vnutri/app/scripts/server/setup-postgres.sh
```

Скрипт запросит пароль для роли `vnutri_app`, создаст БД `vnutri`, выдаст права и настроит PostgreSQL на `localhost`.

Проверка, что PostgreSQL не слушает публичный интерфейс:

```bash
sudo ss -lntp | grep 5432
sudo ufw status verbose
```

## Nginx

```bash
sudo cp /opt/vnutri/app/infra/vm/nginx/vnutri.live.conf /etc/nginx/sites-available/vnutri.live.conf
sudo ln -sfn /etc/nginx/sites-available/vnutri.live.conf /etc/nginx/sites-enabled/vnutri.live.conf
sudo nginx -t
sudo systemctl reload nginx
```

Nginx проксирует `vnutri.live` на `http://127.0.0.1:3000`, а `www.vnutri.live` редиректит на apex. До cutover HTTPS не выпускается.

## Deploy

Локально: закоммитить изменения и push в `origin/develop`.

На VM:

```bash
sudo -iu vnutri
/opt/vnutri/app/scripts/server/deploy-production-vm.sh
```

Deploy делает:

- `git fetch origin`
- `git reset --hard origin/develop`
- `yarn install --immutable`
- `AUTH_DATABASE_PATH=/tmp/vnutri-build-auth.db yarn build`
- `yarn migrate:auth:postgres:schema`
- проверку миграции `0015_specialist_contact_links`
- установку `/opt/vnutri/run.sh`
- `pm2 reload vnutri --update-env` или `pm2 start`
- финальный healthcheck

PM2 autostart:

```bash
sudo -iu vnutri
pm2 save
pm2 startup systemd -u vnutri --hp /opt/vnutri
```

Команду, которую выведет `pm2 startup`, выполните через `sudo`.

## Healthcheck

Локально на VM:

```bash
/opt/vnutri/app/scripts/server/healthcheck.sh
curl -fsS http://127.0.0.1:3000/api/health
```

После cutover:

```bash
curl -fsS https://vnutri.live/api/health
```

Health endpoint возвращает `200`, если приложение живо, env загружен, PostgreSQL доступен и миграция `0015_specialist_contact_links` применена. При ошибке возвращает `503` без секретов в response.

## Backup

Ручной запуск:

```bash
sudo -iu vnutri
/opt/vnutri/app/scripts/server/backup-postgres.sh
```

Скрипт делает `pg_dump -Fc`, сохраняет dump локально, загружает его в Object Storage и оставляет 2 последних локальных dump.

Установите systemd timers:

```bash
sudo cp /opt/vnutri/app/infra/vm/systemd/*.service /etc/systemd/system/
sudo cp /opt/vnutri/app/infra/vm/systemd/*.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now vnutri-postgres-backup.timer
sudo systemctl enable --now vnutri-restore-check.timer
sudo systemctl enable --now vnutri-disk-check.timer
systemctl list-timers | grep vnutri
```

Lifecycle policy для Object Storage на 30 дней:

```bash
aws --endpoint-url https://storage.yandexcloud.net s3api put-bucket-lifecycle-configuration \
  --bucket vnutri-prod-db-backups-b1ghrmp0mr8mr0jcj9gc \
  --lifecycle-configuration file:///opt/vnutri/app/infra/vm/object-storage-lifecycle.json
```

Для backup используйте отдельный service account/static key с минимальными правами на bucket.

## Restore Check

Ручной запуск:

```bash
sudo /opt/vnutri/app/scripts/server/test-restore-postgres.sh
```

Скрипт скачивает последний backup, восстанавливает его в `vnutri_restore_test`, проверяет чтение основных таблиц и удаляет тестовую БД. Для debug:

```bash
sudo /opt/vnutri/app/scripts/server/test-restore-postgres.sh --keep-db
```

## Logs

```bash
sudo -iu vnutri pm2 logs vnutri
sudo journalctl -u nginx -n 200 --no-pager
sudo journalctl -u postgresql -n 200 --no-pager
sudo tail -n 200 /var/log/vnutri/backup-postgres.log
sudo tail -n 200 /var/log/vnutri/restore-check.log
sudo tail -n 200 /var/log/vnutri/disk-check.log
```

Перезапуск приложения:

```bash
sudo -iu vnutri pm2 reload vnutri --update-env
sudo -iu vnutri pm2 restart vnutri --update-env
```

## Disk и logrotate

Ручная проверка диска:

```bash
sudo /opt/vnutri/app/scripts/server/check-disk.sh
df -h
```

Установка logrotate:

```bash
sudo cp /opt/vnutri/app/infra/vm/logrotate/vnutri /etc/logrotate.d/vnutri
sudo logrotate -d /etc/logrotate.d/vnutri
```

`check-disk.sh` предупреждает при 80%, возвращает ошибку при 90%. Если в `/etc/vnutri/app.env` заданы `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID`, предупреждения отправляются в Telegram.

## Certbot

После DNS cutover:

```bash
sudo certbot --nginx -d vnutri.live -d www.vnutri.live --redirect
sudo certbot renew --dry-run
systemctl list-timers | grep certbot
curl -I https://vnutri.live
curl -I https://www.vnutri.live
```

Если `certbot.timer` не включен:

```bash
sudo systemctl enable --now certbot.timer
```

## Rollback

Откат к commit SHA:

```bash
sudo -iu vnutri
/opt/vnutri/app/scripts/server/rollback-to-commit.sh <commit-sha>
```

Rollback к старому коду возможен, но миграции БД автоматически не откатываются. Rollback БД требует отдельный dump/restore. После пользовательских записей в новую БД откат DNS на старую инфраструктуру опасен без обратной миграции данных.

## Cutover Checklist

Pre-cutover:

- Локально закоммитить изменения и push в `origin/develop`.
- VM bootstrap выполнен.
- Deploy key добавлен.
- Repo склонирован в `/opt/vnutri/app`.
- `/etc/vnutri/app.env` заполнен.
- `/etc/vnutri/backup.env` заполнен.
- PostgreSQL создан.
- Свежий dump Managed PostgreSQL восстановлен на VM.
- `yarn migrate:auth:postgres:schema` OK.
- `yarn build` OK.
- Nginx config OK.
- PM2 app OK.
- `/opt/vnutri/app/scripts/server/healthcheck.sh` OK.
- `/opt/vnutri/app/scripts/server/backup-postgres.sh` OK.
- `/opt/vnutri/app/scripts/server/test-restore-postgres.sh` OK.

Cutover:

- Включить maintenance на старой production-инфраструктуре, чтобы остановить записи.
- Сделать финальный `pg_dump -Fc` старой Managed PostgreSQL.
- Передать dump на VM.
- Запустить:

```bash
sudo -iu vnutri
/opt/vnutri/app/scripts/server/import-managed-postgres-dump.sh --dump <final.dump> --confirm-overwrite
/opt/vnutri/app/scripts/server/deploy-production-vm.sh
```

- Обновить DNS:
  - `vnutri.live A -> 111.88.144.52`
  - `www.vnutri.live` на apex или тот же IP.
- Дождаться резолва на VM.
- Выпустить Certbot.
- Проверить `curl -I https://vnutri.live`, `curl -I https://www.vnutri.live`, `/api/health`.
- Выключить maintenance.

Post-cutover:

- Проверить auth / OTP.
- Проверить профиль.
- Проверить ленту.
- Проверить комментарии.
- Проверить загрузку аватаров/изображений.
- Проверить заявку специалиста.
- Проверить, что admin host отсутствует/закрыт.
- Проверить Nginx logs без 5xx.
- Проверить PM2 logs без crash loop.
- Проверить, что PostgreSQL доступен только локально.
- Проверить, что backup, restore-check и disk-check timers active.

Старую Yandex infra держать 7-14 дней. Удалять Serverless Container, Managed PostgreSQL и связанные ресурсы только после стабильной работы VM и успешного restore-check.

## Если сайт упал

1. Проверить health:

```bash
/opt/vnutri/app/scripts/server/healthcheck.sh
curl -I https://vnutri.live
```

2. Проверить процессы:

```bash
sudo -iu vnutri pm2 status
sudo systemctl status nginx --no-pager
sudo systemctl status postgresql --no-pager
```

3. Посмотреть последние логи:

```bash
sudo -iu vnutri pm2 logs vnutri --lines 200
sudo journalctl -u nginx -n 200 --no-pager
sudo journalctl -u postgresql -n 200 --no-pager
```

4. Если проблема в последнем deploy, откатиться к предыдущему commit SHA.
5. Если проблема в БД, не делать DNS rollback после новых записей без плана обратной миграции.

## Что остается ручным

- Создать и добавить GitHub deploy key.
- Заполнить `/etc/vnutri/app.env`.
- Создать Yandex Object Storage bucket и backup service account/static key.
- Заполнить `/etc/vnutri/backup.env`.
- Сделать финальный dump Managed PostgreSQL.
- Переключить DNS.
- Выпустить первый Certbot certificate после DNS cutover.
- Выполнить ручной smoke-test пользовательских сценариев.

## Регулярная эксплуатация

Автоматизировано:

- Deploy одной командой на VM.
- Миграции при deploy.
- Healthcheck.
- Daily PostgreSQL backup.
- Weekly restore-check.
- Hourly disk check.
- Log rotation.
- PM2 autorestart.
- Nginx/PostgreSQL autostart.
- Certbot auto-renew.

Что требует внимания владельца:

- Раз в неделю проверить restore-check, PM2 logs, Nginx 5xx и disk warnings.
- Через 7-14 дней после стабильного cutover удалить старую Yandex infra.
- Ротировать секреты, которые раньше жили в Serverless Container env.
- При росте нагрузки сначала увеличить CPU/RAM/disk VM, а не усложнять инфраструктуру.

Оценка обслуживания после автоматизации: 15-30 минут в неделю, если timers зеленые; 1-2 часа при failed restore-check, disk pressure или неудачном deploy.
