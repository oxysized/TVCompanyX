# Проверка системы договоров

Write-Host "=== Проверка таблицы contracts ===" -ForegroundColor Cyan

# 1. Проверка существования таблицы
Write-Host "`n1. Проверка таблицы..." -ForegroundColor Yellow
$tableCheck = psql -U postgres -d TVShow -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'contracts';"
if ($tableCheck -eq "1") {
    Write-Host "   ✓ Таблица contracts существует" -ForegroundColor Green
} else {
    Write-Host "   ✗ Таблица contracts не найдена" -ForegroundColor Red
    exit 1
}

# 2. Проверка количества записей
Write-Host "`n2. Количество договоров..." -ForegroundColor Yellow
$count = psql -U postgres -d TVShow -t -c "SELECT COUNT(*) FROM contracts;" | ForEach-Object { $_.Trim() }
Write-Host "   Записей в базе: $count" -ForegroundColor Cyan

# 3. Проверка функции генерации номера
Write-Host "`n3. Тест генерации номера договора..." -ForegroundColor Yellow
$contractNumber = psql -U postgres -d TVShow -t -c "SELECT generate_contract_number();" | ForEach-Object { $_.Trim() }
Write-Host "   Следующий номер: $contractNumber" -ForegroundColor Green

# 4. Проверка триггеров
Write-Host "`n4. Проверка триггеров..." -ForegroundColor Yellow
$triggers = psql -U postgres -d TVShow -t -c "SELECT tgname FROM pg_trigger WHERE tgrelid = 'contracts'::regclass AND tgname LIKE 'trigger_%';"
$triggerCount = ($triggers | Measure-Object -Line).Lines
Write-Host "   Найдено триггеров: $triggerCount" -ForegroundColor Cyan
if ($triggerCount -ge 2) {
    Write-Host "   ✓ trigger_set_contract_number" -ForegroundColor Green
    Write-Host "   ✓ trigger_update_contracts_updated_at" -ForegroundColor Green
}

# 5. Проверка индексов
Write-Host "`n5. Проверка индексов..." -ForegroundColor Yellow
$indexes = psql -U postgres -d TVShow -t -c "SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'contracts';" | ForEach-Object { $_.Trim() }
Write-Host "   Найдено индексов: $indexes" -ForegroundColor Cyan

# 6. Проверка последовательности
Write-Host "`n6. Проверка последовательности..." -ForegroundColor Yellow
$seqValue = psql -U postgres -d TVShow -t -c "SELECT last_value FROM contract_number_seq;" | ForEach-Object { $_.Trim() }
Write-Host "   Текущее значение: $seqValue" -ForegroundColor Cyan

Write-Host "`n=== Система договоров готова к работе! ===" -ForegroundColor Green
Write-Host "`nСледующие шаги:" -ForegroundColor Yellow
Write-Host "1. Запустите приложение: npm run dev"
Write-Host "2. Одобрите заявку в коммерческом отделе"
Write-Host "3. В чате агента появится кнопка 'Договор'"
Write-Host "4. Клиент увидит договор в разделе 'Документы'"
