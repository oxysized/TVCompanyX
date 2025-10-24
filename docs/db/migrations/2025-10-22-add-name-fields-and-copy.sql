-- Миграция: добавить поля first_name, middle_name, last_name в таблицу users
-- Автор: automated assistant
-- Дата: 2025-10-22
-- Важно: Сделайте резервную копию БД перед выполнением этой миграции!
-- Эта миграция:
-- 1) добавляет nullable поля first_name, middle_name, last_name
-- 2) заполняет их из существующего поля name (best-effort: разделение по пробелам)
-- 3) (опционально) после ручной проверки можно удалить поле name — внизу показана команда для удаления, но она закомментирована

BEGIN;

-- 1) Добавить новые поля, если их ещё нет
ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS first_name text;

ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS middle_name text;

ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS last_name text;

-- 2) Попытаться разбить поле "name" на компоненты и заполнить новые колонки
-- Подход: если в name есть 3 и более слов — берем первое как first_name, последнее как last_name, всё между как middle_name
-- Если одно слово — запишем в first_name. Если два слова — first_name и last_name.

UPDATE users
SET
  first_name = CASE
    WHEN array_length(regexp_split_to_array(trim(coalesce(name, '')), '\\s+'), 1) = 1 THEN trim(name)
    WHEN array_length(regexp_split_to_array(trim(coalesce(name, '')), '\\s+'), 1) >= 2 THEN (regexp_split_to_array(trim(coalesce(name, '')), '\\s+'))[1]
    ELSE NULL
  END,
  last_name = CASE
    WHEN array_length(regexp_split_to_array(trim(coalesce(name, '')), '\\s+'), 1) = 1 THEN NULL
    WHEN array_length(regexp_split_to_array(trim(coalesce(name, '')), '\\s+'), 1) = 2 THEN (regexp_split_to_array(trim(coalesce(name, '')), '\\s+'))[2]
    WHEN array_length(regexp_split_to_array(trim(coalesce(name, '')), '\\s+'), 1) >= 3 THEN (regexp_split_to_array(trim(coalesce(name, '')), '\\s+'))[array_length(regexp_split_to_array(trim(coalesce(name, '')), '\\s+'), 1)]
    ELSE NULL
  END,
  middle_name = CASE
    WHEN array_length(regexp_split_to_array(trim(coalesce(name, '')), '\\s+'), 1) <= 2 THEN NULL
    WHEN array_length(regexp_split_to_array(trim(coalesce(name, '')), '\\s+'), 1) >= 3 THEN (
      array_to_string( (regexp_split_to_array(trim(coalesce(name, '')), '\\s+'))[2:array_length(regexp_split_to_array(trim(coalesce(name, '')), '\\s+'),1)-1], ' ')
    )
    ELSE NULL
  END
WHERE name IS NOT NULL AND (first_name IS NULL OR last_name IS NULL);

-- 3) Опционально: после ручной проверки можно удалить колонку name
-- ВНИМАНИЕ: Убедитесь, что все данные корректны и у вас есть бэкап перед выполнением удаления.
-- Команда для удаления (раскомментировать, если уверены):
-- ALTER TABLE users DROP COLUMN IF EXISTS name;

COMMIT;
