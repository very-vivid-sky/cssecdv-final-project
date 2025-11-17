# STSWENG - SAFFRON POS

## How to Setup Enviornment

1. Clone the repo
```bash
git clone https://github.com/enriquezduane/STSWENG-G9-SAFFRON_POS.git
```

2. Install dependencies
```bash
npm run setup
```

3. Setup the .env file in the backend directory
    - Set 'MONGODB_URI' to your local MongoDB instance
    - Set 'JWT_SECRET' to any random string

4. Seed the database
```bash
npm run seed
```

4. Run the app
```bash
npm run dev
```

## How to Contribute

### Branching Strategy

Always branch off the `development` branch when creating new branches.

```bash
git switch development
git checkout -b your-new-branch-name
```

Create branches based on the type of work you're doing:

- For features: `feature/your-feature-name`
- For fixes: `fix/issue-you-are-fixing`
- For refactors: `refactor/what-you-are-refactoring`
- For tests: `test/what-tests-you-are-implementing`

Example:

```bash
git checkout -b feature/user-authentication
```



### Opening a Pull Request

When opening a pull request, please include bullet point descriptions of what you did. For example:

```markdown
- End-to-end test for user registration process
- Integration test for email verification
- Unit tests for password validation
```
