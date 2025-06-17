# AI Frontend Development Automation System

Система AI агентов для полной автоматизации разработки фронтенда на основе задач из Jira и дизайнов из Figma.

## 🎯 Цель

Полностью автоматизировать работу фронтенд разработчика:
1. Получение и анализ задач из Jira
2. Извлечение дизайн-спецификаций из Figma
3. Генерация кода компонентов
4. Создание тестов
5. Создание Pull Request в GitHub

## 🏗️ Архитектура

Система состоит из главного координирующего агента и специализированных агентов:

```
┌─────────────────────────────────────┐
│        Main Coordinator Agent       │
│         (LangChain + GPT-4)         │
└─────────────┬───────────────────────┘
              │
    ┌─────────┼─────────┬─────────┐
    │         │         │         │
    ▼         ▼         ▼         ▼
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│  Jira   │ │ Figma   │ │   QA    │ │ GitHub  │
│Analyzer │ │Designer │ │ Tester  │ │Manager  │
│ Agent   │ │ Agent   │ │ Agent   │ │ Agent   │
└─────────┘ └─────────┘ └─────────┘ └─────────┘
    │         │         │         │
    ▼         ▼         ▼         ▼
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│   MCP   │ │   MCP   │ │Visual   │ │   Git   │
│  Jira   │ │ Figma   │ │Testing  │ │   API   │
└─────────┘ └─────────┘ └─────────┘ └─────────┘
```

### Агенты

#### 🎯 Main Coordinator Agent
- **Роль**: Координация всех процессов
- **Технологии**: LangChain, GPT-4
- **Функции**:
  - Распределение задач между агентами
  - Управление workflow
  - Контроль качества и ошибок
  - Координация зависимостей между задачами

#### 📋 Jira Analyzer Agent
- **Роль**: Анализ задач из Jira
- **Технологии**: Jira REST API, GPT-3.5-turbo
- **Функции**:
  - Получение задач из Jira по номерам
  - Извлечение требований и acceptance criteria
  - Определение сложности задач
  - Поиск ссылок на Figma дизайны

#### 🎨 Figma Designer Agent
- **Роль**: Работа с дизайнами Figma
- **Технологии**: Figma API, GPT-3.5-turbo
- **Функции**:
  - Извлечение дизайн-спецификаций
  - Создание дизайн-токенов
  - Анализ компонентов и их состояний
  - Генерация CSS свойств

#### 💻 Code Generator Agent
- **Роль**: Генерация кода компонентов
- **Технологии**: GPT-4, шаблоны кода
- **Функции**:
  - Создание React/Vue/Angular компонентов
  - Генерация стилей (CSS/SCSS/Styled Components)
  - Создание TypeScript типов
  - Настройка конфигураций

#### ✅ QA Tester Agent
- **Роль**: Визуальное тестирование и сравнение с дизайном
- **Технологии**: Puppeteer, Pixelmatch, Jest
- **Функции**:
  - Сравнение сгенерированной верстки с дизайном из Figma
  - Создание скриншотов компонентов
  - Pixel-perfect анализ визуальных различий
  - Проверка accessibility и производительности
  - Генерация отчетов о качестве
- **Функции**:
  - Генерация unit тестов
  - Создание интеграционных тестов
  - E2E тестирование
  - Accessibility тестирование

#### 🔄 GitHub Manager Agent
- **Роль**: Управление версиями и PR
- **Технологии**: GitHub API, Git
- **Функции**:
  - Создание веток
  - Коммиты изменений
  - Создание Pull Request
  - Управление reviewers

## 🚀 Установка и настройка

### Предварительные требования

- Node.js 18+
- npm или yarn
- Доступ к Jira, Figma, GitHub
- API ключи для OpenAI/Anthropic

### Установка

```bash
# Клонирование репозитория
git clone <repository-url>
cd ai-frontend-automation

# Установка зависимостей
npm install

# Копирование файла окружения
cp env.example .env

# Заполнение переменных окружения
nano .env
```

### Конфигурация окружения

Создайте файл `.env` на основе `env.example`:

```env
# AI Model Configuration
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Jira Configuration
JIRA_HOST=your-domain.atlassian.net
JIRA_USERNAME=your_jira_username
JIRA_API_TOKEN=your_jira_api_token
JIRA_PROJECT_KEY=your_project_key

# Figma Configuration
FIGMA_ACCESS_TOKEN=your_figma_access_token
FIGMA_TEAM_ID=your_figma_team_id

# GitHub Configuration
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_OWNER=your_github_username_or_org
GITHUB_REPO=your_repository_name

# Agent Configuration
MAIN_AGENT_MODEL=gpt-4-turbo-preview
SPECIALIZED_AGENT_MODEL=gpt-3.5-turbo
MAX_PARALLEL_AGENTS=3
TASK_TIMEOUT_MINUTES=30

# Logging
LOG_LEVEL=info
LOG_FILE=logs/ai-agents.log
```

### Получение API ключей

#### Jira API Token
1. Перейдите в [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Нажмите "Create API token"
3. Скопируйте созданный токен

#### Figma Access Token
1. Перейдите в [Figma Account Settings](https://www.figma.com/settings)
2. В разделе "Personal access tokens" нажмите "Create new token"
3. Скопируйте созданный токен

#### GitHub Personal Access Token
1. Перейдите в [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Нажмите "Generate new token (classic)"
3. Выберите необходимые права (repo, workflow)
4. Скопируйте созданный токен

## 📖 Использование

### Командная строка

```bash
# Сборка проекта
npm run build

# Запуск в режиме разработки
npm run dev

# Обработка одной задачи Jira
npm run dev DEV-123

# Обработка нескольких задач
npm run dev DEV-123 DEV-124 DEV-125

# Запуск тестов
npm test

# Линтинг кода
npm run lint
```

### Программное использование

```typescript
import AIFrontendAutomationSystem from './src/index';

const system = new AIFrontendAutomationSystem();

async function automateTask() {
  try {
    // Инициализация системы
    await system.initialize();
    
    // Обработка задач
    await system.processJiraTasks(['DEV-123', 'DEV-124']);
    
    // Получение статуса
    const status = system.getStatus();
    console.log('System status:', status);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Остановка системы
    await system.stop();
  }
}

automateTask();
```

## 🔄 Workflow

### Полный цикл автоматизации

1. **Анализ Jira задачи**
   - Получение задачи по номеру
   - Извлечение требований и acceptance criteria
   - Поиск ссылок на Figma дизайны
   - Оценка сложности

2. **Извлечение дизайна из Figma**
   - Анализ дизайн-макетов
   - Создание дизайн-токенов
   - Извлечение спецификаций компонентов
   - Генерация style guide

3. **Генерация кода**
   - Создание компонентов на основе требований
   - Применение дизайн-спецификаций
   - Генерация TypeScript типов
   - Создание стилей

4. **Создание тестов**
   - Unit тесты для компонентов
   - Интеграционные тесты
   - Accessibility тесты
   - E2E тесты

5. **Создание Pull Request**
   - Создание новой ветки
   - Коммит всех изменений
   - Создание PR с описанием
   - Назначение reviewers

### Пример workflow для задачи

```typescript
// Workflow steps для задачи DEV-123
const workflowSteps = [
  {
    name: 'Analyze Jira Task',
    agent: 'JiraAnalyzerAgent',
    input: { taskNumber: 'DEV-123' },
    output: {
      jiraTask: { /* задача из Jira */ },
      analysis: { /* AI анализ */ },
      figmaLinks: ['https://figma.com/...'],
      complexity: 'Medium'
    }
  },
  {
    name: 'Extract Figma Design',
    agent: 'FigmaDesignerAgent',
    dependencies: ['Analyze Jira Task'],
    input: { figmaLinks: ['https://figma.com/...'] },
    output: {
      designs: [/* дизайны */],
      designTokens: [/* токены */],
      styleGuide: { /* стиль гайд */ }
    }
  },
  {
    name: 'Generate Code',
    agent: 'CodeGeneratorAgent',
    dependencies: ['Analyze Jira Task', 'Extract Figma Design'],
    input: { /* объединенные данные */ },
    output: {
      files: [/* созданные файлы */],
      tests: [/* тесты */],
      dependencies: ['react', 'styled-components']
    }
  },
  {
    name: 'Visual QA Testing',
    agent: 'QATesterAgent',
    dependencies: ['Generate Code', 'Extract Figma Design'],
    input: { /* код и дизайн-спецификации */ },
    output: {
      qaReport: {
        overallScore: 92,
        visualTests: [/* результаты сравнения */],
        recommendations: [/* рекомендации */]
      }
    }
  },
  {
    name: 'Create Pull Request',
    agent: 'GitHubManagerAgent',
    dependencies: ['Generate Code', 'Visual QA Testing'],
    input: { /* файлы для коммита и QA отчет */ },
    output: {
      pullRequestUrl: 'https://github.com/...',
      branchName: 'feature/DEV-123'
    }
  }
];
```

## 🧪 Тестирование

### Структура тестов

```
tests/
├── unit/                 # Unit тесты
│   ├── agents/          # Тесты агентов
│   ├── mcp/             # Тесты MCP клиентов
│   └── utils/           # Тесты утилит
├── integration/         # Интеграционные тесты
│   ├── workflows/       # Тесты workflow
│   └── api/             # Тесты API интеграций
├── visual/              # Визуальные тесты
│   ├── screenshots/     # Скриншоты компонентов
│   ├── references/      # Эталонные изображения из Figma
│   └── diffs/           # Изображения различий
└── e2e/                 # End-to-end тесты
    └── scenarios/       # Сценарии тестирования
```

### Визуальное тестирование

QA Tester Agent автоматически сравнивает сгенерированные компоненты с дизайном из Figma:

```typescript
// Пример отчета о визуальном тестировании
const qaReport = {
  overallScore: 92,           // Общий балл качества
  totalTests: 5,              // Количество протестированных компонентов
  passedTests: 4,             // Успешные тесты
  failedTests: 1,             // Неуспешные тесты
  
  visualTests: [
    {
      componentName: 'Button',
      passed: true,
      similarity: 98.5,        // Процент сходства с дизайном
      screenshotPath: './temp/screenshots/Button.png',
      issues: []               // Найденные проблемы
    },
    {
      componentName: 'Modal',
      passed: false,
      similarity: 87.2,
      issues: [
        {
          type: 'color',
          severity: 'major',
          description: 'Background color mismatch',
          expected: '#f8f9fa',
          actual: '#ffffff',
          suggestion: 'Update background-color to match design'
        }
      ]
    }
  ],
  
  recommendations: [
    'Modal component failed visual testing - review color implementation',
    'Consider updating design tokens for consistent color usage'
  ]
};
```

### Запуск тестов

```bash
# Все тесты
npm test

# Unit тесты
npm run test:unit

# Интеграционные тесты
npm run test:integration

# E2E тесты
npm run test:e2e

# Тесты с покрытием
npm run test:coverage
```

## 📊 Мониторинг и логирование

### Логи

Система использует Winston для логирования:

```typescript
// Уровни логирования
LOG_LEVEL=debug|info|warn|error

// Файл логов
LOG_FILE=logs/ai-agents.log
```

### Метрики

- Время выполнения задач
- Успешность выполнения workflow
- Использование API квот
- Статистика по агентам

## 🔧 Настройка и конфигурация

### Настройка агентов

```typescript
// Конфигурация главного агента
const coordinatorConfig = {
  model: 'gpt-4-turbo-preview',
  maxConcurrentTasks: 3,
  retryAttempts: 3,
  timeout: 1800000 // 30 минут
};

// Конфигурация специализированных агентов
const specializedConfig = {
  model: 'gpt-3.5-turbo',
  maxConcurrentTasks: 2,
  retryAttempts: 3,
  timeout: 900000 // 15 минут
};
```

### Кастомизация workflow

```typescript
// Добавление нового агента
class CustomAgent extends BaseAgent {
  protected async performTask(task: AgentTask): Promise<any> {
    // Кастомная логика
  }
}

// Регистрация агента
coordinatorAgent.registerAgent(customAgent);
```

## 🚨 Обработка ошибок

### Типы ошибок

1. **Ошибки конфигурации**: Неправильные API ключи, отсутствующие переменные
2. **Ошибки сети**: Проблемы с API Jira/Figma/GitHub
3. **Ошибки AI**: Превышение лимитов, некорректные ответы
4. **Ошибки workflow**: Неудачные зависимости, таймауты

### Стратегии обработки

- **Retry механизм**: Автоматические повторы при временных ошибках
- **Fallback**: Резервные варианты выполнения
- **Graceful degradation**: Частичное выполнение при ошибках
- **Подробное логирование**: Детальная информация для отладки

## 🔒 Безопасность

### Защита API ключей

- Использование переменных окружения
- Никогда не коммитить .env файлы
- Регулярная ротация токенов

### Валидация данных

- Проверка входных данных
- Санитизация пользовательского ввода
- Валидация API ответов

## 📈 Производительность

### Оптимизации

- Параллельное выполнение независимых задач
- Кэширование API ответов
- Batch обработка похожих запросов
- Умное использование AI моделей

### Лимиты API

- OpenAI: Учет rate limits и token limits
- Jira: Соблюдение API квот
- Figma: Ограничения на количество запросов
- GitHub: Лимиты на API calls

## 🤝 Вклад в проект

### Как помочь проекту

1. Создайте fork репозитория
2. Создайте feature ветку
3. Внесите изменения
4. Добавьте тесты
5. Создайте Pull Request

### Стандарты кода

- TypeScript strict mode
- ESLint + Prettier
- Комментарии на английском
- Git commit messages на английском
- Документация на русском

## 📝 Лицензия

MIT License - подробности в файле [LICENSE](LICENSE)

## 🆘 Поддержка

### Часто задаваемые вопросы

**Q: Как добавить поддержку новой AI модели?**
A: Расширьте BaseAgent.initializeModel() для поддержки новой модели.

**Q: Можно ли использовать с другими системами, кроме Jira?**
A: Да, создайте новый MCP клиент для вашей системы задач.

**Q: Как настроить для работы с Vue.js вместо React?**
A: Настройте Code Generator Agent для генерации Vue компонентов.

### Контакты

- GitHub Issues: [создать issue](https://github.com/your-repo/issues)
- Документация: [wiki](https://github.com/your-repo/wiki)
- Чат: [Telegram](https://t.me/your-chat)

---

**Важно**: Эта система находится в активной разработке. Используйте с осторожностью в продакшене и всегда проверяйте сгенерированный код перед развертыванием. 